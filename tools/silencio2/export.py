#!/usr/bin/env python3
"""Build and verify a browser ONNX bundle from pinned Silencio-2 sources.

The checkpoint and inference code are downloaded from the immutable Hugging Face
revision recorded in `assets.lock.json`. Generated ONNX weights are not checked
into this repository; this script packages them for a versioned GitHub Release.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from huggingface_hub import snapshot_download
from sentencepiece import SentencePieceProcessor
from sentencepiece import sentencepiece_model_pb2 as sentencepiece_pb

MODEL_ID = "BlueRoseLabs/Silencio-2"
MODEL_REVISION = "20930f5f6a6bb564f2a8207152fd5c5d8eecff03"
MIMI_STATE_CAPACITY = 64
OPSET = 17


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def atomic_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def copy_provenance(model_root: Path, output_dir: Path) -> None:
    sources = {
        "MODEL-CARD.md": model_root / "README.md",
        "UPSTREAM-NOTICE.md": model_root / "NOTICE.md",
        "SILENCIO2-MIT-LICENSE.txt": model_root / "silencio2/core/LICENSE",
        "UPSTREAM-EXPORT-MIT-LICENSE.txt": Path(__file__).resolve().parent / "UPSTREAM-EXPORT-MIT-LICENSE.txt",
    }
    for destination, source in sources.items():
        if not source.is_file():
            raise FileNotFoundError(f"Pinned Silencio-2 provenance file is missing: {source}")
        shutil.copyfile(source, output_dir / destination)
    attribution = f"""Silencio-2 browser conversion attribution

Model: BlueRoseLabs/Silencio-2 at {MODEL_REVISION}.
Weights and converted ONNX graph files: CC BY 4.0.
License: https://creativecommons.org/licenses/by/4.0/legalcode.en

Silencio-2 is a fine-tune of Pocket TTS by Kyutai. Its upstream notice also
credits the Basis Global Emotions dataset at revision
57f26ff90a6240e54df94a2fabaf0f744df02575. The conversion exports FP32 ONNX
graphs from the pinned checkpoint and derives the bundled voice-260 state from
the pinned official voice WAV. The WAV itself is not included.

The explicit-state ONNX export approach is adapted from
lomotron/pocket-tts-onnx-export at commit
8f52199533098963fe1cbd90bed35bb20d871b5e; see the accompanying MIT license.

Please retain attribution and follow the pinned model card's guidance about
voice-owner permission, impersonation, deception and synthetic-speech disclosure.
"""
    (output_dir / "ATTRIBUTION.txt").write_text(attribution, encoding="utf-8")


def flatten_state(state: dict) -> list[torch.Tensor]:
    out: list[torch.Tensor] = []
    for key in sorted(state):
        value = state[key]
        out.extend(flatten_state(value) if isinstance(value, dict) else [value])
    return out


def state_structure(state: dict) -> dict:
    return {key: state_structure(value) if isinstance(value, dict) else "tensor" for key, value in sorted(state.items())}


def unflatten_state(flat: tuple[torch.Tensor, ...], structure: dict) -> dict:
    index = 0

    def visit(node: dict) -> dict:
        nonlocal index
        out = {}
        for key, value in sorted(node.items()):
            if isinstance(value, dict):
                out[key] = visit(value)
            else:
                out[key] = flat[index].clone()
                index += 1
        return out

    value = visit(structure)
    if index != len(flat):
        raise ValueError("State manifest does not account for every tensor input")
    return value


def tensor_fill(value: torch.Tensor) -> str:
    if value.numel() == 0:
        return "empty"
    if value.dtype == torch.bool:
        return "ones" if bool(torch.all(value)) else "zeros" if not bool(torch.any(value)) else "mixed"
    if value.dtype.is_floating_point and bool(torch.isnan(value).all()):
        return "nan"
    if bool(torch.all(value == 0)):
        return "zeros"
    if bool(torch.all(value == 1)):
        return "ones"
    return "mixed"


def manifest_for(state: dict) -> list[dict]:
    entries = []

    def visit(node: dict, prefix: str = "") -> None:
        for key in sorted(node):
            value = node[key]
            path = f"{prefix}/{key}" if prefix else key
            if isinstance(value, dict):
                visit(value, path)
            elif isinstance(value, torch.Tensor):
                module, tensor_key = path.rsplit("/", 1)
                dynamic_cache = tensor_key == "cache" and value.ndim == 5
                entries.append({
                    "module": module,
                    "key": tensor_key,
                    "path": path,
                    "dtype": str(value.dtype).removeprefix("torch."),
                    "shape": list(value.shape),
                    "fill": tensor_fill(value),
                    "dynamicAxis": 2 if dynamic_cache else None,
                })
            else:
                raise TypeError(f"Unsupported model-state value at {path}: {type(value).__name__}")

    visit(state)
    for index, entry in enumerate(entries):
        entry["index"] = index
        entry["input_name"] = f"state_{index}"
        entry["output_name"] = f"out_state_{index}"
    return entries


def get_by_path(root: dict, path: str) -> torch.Tensor:
    value: object = root
    for component in path.split("/"):
        value = value[component]  # type: ignore[index]
    if not isinstance(value, torch.Tensor):
        raise TypeError(f"Voice state entry {path} is not a tensor")
    return value


def write_voice_state(path: Path, state: dict, manifest: list[dict]) -> None:
    """Write one compressed, typed voice-state record with a deterministic header."""
    raw_path = path.with_suffix("")
    with raw_path.open("wb") as output:
        output.write(b"S2VS1")
        output.write(struct.pack("<I", len(manifest)))
        for entry in manifest:
            name = entry["path"].encode("utf-8")
            if len(name) > 65535:
                raise ValueError("Voice-state entry path is too long")
            value = get_by_path(state, entry["path"]).detach().cpu().contiguous()
            dtype = {torch.float32: 0, torch.int64: 1, torch.bool: 2}.get(value.dtype)
            if dtype is None:
                raise TypeError(f"Unsupported voice-state dtype: {value.dtype}")
            array = value.numpy()
            data = array.tobytes(order="C")
            output.write(struct.pack("<H", len(name)))
            output.write(name)
            output.write(struct.pack("<BB", dtype, value.ndim))
            for dim in value.shape:
                output.write(struct.pack("<I", int(dim)))
            output.write(struct.pack("<Q", len(data)))
            output.write(data)
    with raw_path.open("rb") as source, path.open("wb") as destination:
        with gzip.GzipFile(filename="", mode="wb", fileobj=destination, compresslevel=9, mtime=0) as gz:
            shutil.copyfileobj(source, gz)
    raw_path.unlink()


def build_tokenizer(model_root: Path, output_dir: Path) -> dict:
    """Convert official SentencePiece to the Transformers.js Unigram schema."""
    source = model_root / "tokenizer.model"
    raw = source.read_bytes()
    proto = sentencepiece_pb.ModelProto()
    proto.ParseFromString(raw)
    pieces = proto.pieces
    if len(pieces) != 4011:
        raise AssertionError(f"Expected Silencio-2's 4,011 token entries, found {len(pieces)}")
    trainer = proto.trainer_spec
    if trainer.model_type != sentencepiece_pb.TrainerSpec.UNIGRAM or trainer.unk_id != 0:
        raise AssertionError("Silencio-2 tokenizer is not the expected Unigram model")
    special_tokens = {"[sigh]", "[laugh]", "[gasp]", "[cough]", "[clear_throat]", "<happy>", "<sad>", "<angry>", "<fear>", "<surprised>", "<whisper>"}
    if not special_tokens.issubset({piece.piece for piece in pieces}):
        raise AssertionError("The pinned SentencePiece vocabulary is missing one or more Silencio tags")
    normalizer = proto.normalizer_spec
    if normalizer.precompiled_charsmap or not normalizer.add_dummy_prefix or not normalizer.escape_whitespaces:
        raise AssertionError("Unsupported SentencePiece normalization contract")
    metaspace = {"type": "Metaspace", "replacement": "▁", "prepend_scheme": "always", "split": True, "add_prefix_space": True}
    tokenizer = {
        "version": "1.0", "truncation": None, "padding": None,
        "added_tokens": [
            {"id": index, "content": pieces[index].piece, "single_word": False,
             "lstrip": False, "rstrip": False, "normalized": False, "special": True}
            for index in (trainer.unk_id, trainer.bos_id, trainer.eos_id, trainer.pad_id)
            if index >= 0
        ],
        "normalizer": None,
        "pre_tokenizer": metaspace,
        "post_processor": None,
        "decoder": {"type": "Sequence", "decoders": [metaspace, {"type": "ByteFallback"}, {"type": "Fuse"}]},
        "model": {"type": "Unigram", "unk_id": trainer.unk_id,
                  "vocab": [[piece.piece, piece.score] for piece in pieces],
                  "byte_fallback": bool(trainer.byte_fallback)},
    }
    tokenizer_path = output_dir / "tokenizer.json"
    atomic_json(tokenizer_path, tokenizer)
    tokenizer_config = {
        "tokenizer_class": "PreTrainedTokenizerFast",
        "model_max_length": 8192,
        "add_bos_token": False,
        "add_eos_token": False,
        "clean_up_tokenization_spaces": False,
        "padding_side": "right",
        "truncation_side": "right",
    }
    atomic_json(output_dir / "tokenizer_config.json", tokenizer_config)
    return {"sha256": sha256(tokenizer_path), "bytes": tokenizer_path.stat().st_size,
            "sourceTokenizerSha256": hashlib.sha256(raw).hexdigest(),
            "configSha256": sha256(output_dir / "tokenizer_config.json"),
            "configBytes": (output_dir / "tokenizer_config.json").stat().st_size,
            "vocabSize": len(pieces), "addedTagPieces": sorted(special_tokens)}


def verify_tokenizer(model_root: Path, output_dir: Path, fixture_root: Path) -> dict:
    """Require the browser JSON tokenizer to preserve official SentencePiece IDs."""
    from tokenizers import Tokenizer as JsonTokenizer

    official = SentencePieceProcessor(model_file=str(model_root / "tokenizer.model"))
    converted = JsonTokenizer.from_file(str(output_dir / "tokenizer.json"))
    meta_path = fixture_root / "en-20000.chunks.json"
    article_path = fixture_root / "en-20000.txt"
    texts = ["The weather is cloudy today.", "<happy> Hello, friend!", "[sigh] <whisper> keep it quiet."]
    if meta_path.is_file() and article_path.is_file():
        article = article_path.read_text(encoding="utf-8")
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        for span in metadata["chunks"]:
            texts.append(article[span["start"]:span["end"]])
    checks = []
    for index, text in enumerate(texts):
        expected = official.encode(text, out_type=int)
        actual = converted.encode(text).ids
        if actual != expected:
            raise AssertionError(f"Converted tokenizer ID mismatch for text case {index}: {len(actual)} != {len(expected)}")
        decoded_official = official.decode(expected)
        decoded_converted = converted.decode(actual)
        if decoded_converted != decoded_official:
            raise AssertionError(f"Converted tokenizer decode mismatch for text case {index}")
        checks.append({"case": index, "tokens": len(expected), "idsMatch": True, "decodeMatch": True})
    return {"cases": len(checks), "allIdsMatch": True, "allDecodesMatch": True, "checks": checks}


def verify_frontend(tts, fixture_root: Path) -> dict:
    """Record the official chunk plan for every canonical source span."""
    article_path = fixture_root / "en-20000.txt"
    manifest_path = fixture_root / "en-20000.chunks.json"
    if not article_path.is_file() or not manifest_path.is_file():
        raise FileNotFoundError("The canonical 20,000-character article and span manifest are required.")
    article = article_path.read_text(encoding="utf-8")
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if len(article) != 20000 or len(source_manifest["chunks"]) != 93:
        raise AssertionError("Unexpected canonical article size or span count")
    spans = []
    for span in source_manifest["chunks"]:
        text = article[span["start"]:span["end"]]
        if hashlib.sha256(text.encode("utf-8")).hexdigest() != span["sha256"]:
            raise AssertionError(f"Canonical source span {span['id']} checksum mismatch")
        chunks = tts.chunks(text)
        if not chunks:
            raise AssertionError(f"Silencio-2 frontend returned no chunks for span {span['id']}")
        plan = []
        for emotion, chunk in chunks:
            model_text = f"<{emotion}> {chunk}" if emotion else chunk
            tokens = tts.model.flow_lm.conditioner.tokenizer.encode(model_text)
            source_limit = 48 + (1 if emotion else 0)
            if not tokens or len(tokens) > source_limit:
                raise AssertionError(f"Official Silencio-2 chunk limit failed for source span {span['id']}: {len(tokens)} tokens")
            plan.append({"text": chunk, "emotion": emotion, "tokenCount": len(tokens)})
        spans.append({"id": span["id"], "sourceSpanSha256": span["sha256"], "utterances": plan})
    return {"sourceCharacters": len(article), "sourceSpans": len(spans), "allSpansChunked": True,
            "maxTokensPerChunk": max(item["tokenCount"] for span in spans for item in span["utterances"]),
            "spans": spans}


class FlowMainWrapper(torch.nn.Module):
    def __init__(self, flow_lm, structure: dict, eos_threshold: float):
        super().__init__()
        self.flow_lm = flow_lm
        self.structure = structure
        self.eos_threshold = eos_threshold

    def forward(self, sequence: torch.Tensor, text_embeddings: torch.Tensor, *flat_state: torch.Tensor):
        from torch.onnx import operators
        from silencio2.core.modules.stateful_module import increment_steps

        state = unflatten_state(flat_state, self.structure)
        sequence = torch.where(torch.isnan(sequence), self.flow_lm.bos_emb, sequence)
        input_ = self.flow_lm.input_linear(sequence)
        output = self.flow_lm.backbone(input_, text_embeddings, sequence, model_state=state).to(torch.float32)
        # At text-prefill, sequence is empty and official backbone keeps the text suffix.
        conditioning = output[:, -1]
        is_eos = self.flow_lm.out_eos(conditioning) > self.eos_threshold
        increment = operators.shape_as_tensor(sequence)[1] + operators.shape_as_tensor(text_embeddings)[1]
        increment_steps(self.flow_lm, state, increment=increment)
        return (conditioning, is_eos, *flatten_state(state))


class FlowHeadWrapper(torch.nn.Module):
    def __init__(self, flow_lm):
        super().__init__()
        self.flow_net = flow_lm.flow_net

    def forward(self, conditioning: torch.Tensor, noise: torch.Tensor):
        return self.flow_net(conditioning, noise)


class TextConditionerWrapper(torch.nn.Module):
    def __init__(self, conditioner):
        super().__init__()
        self.conditioner = conditioner

    def forward(self, token_ids: torch.Tensor):
        return self.conditioner(token_ids)


class MimiDecoderWrapper(torch.nn.Module):
    def __init__(self, mimi, flow_lm, structure: dict, steps_per_latent: int):
        super().__init__()
        self.mimi = mimi
        self.flow_lm = flow_lm
        self.structure = structure
        self.steps_per_latent = steps_per_latent

    def forward(self, latent: torch.Tensor, *flat_state: torch.Tensor):
        from torch.onnx import operators
        from silencio2.core.modules.stateful_module import increment_steps

        state = unflatten_state(flat_state, self.structure)
        decoded_input = latent * self.flow_lm.emb_std + self.flow_lm.emb_mean
        audio = self.mimi.decode_from_latent(decoded_input, state)
        increment = operators.shape_as_tensor(latent)[1] * self.steps_per_latent
        increment_steps(self.mimi, state, increment=increment)
        return (audio, *flatten_state(state))


def patch_for_onnx():
    """Replace in-place state updates with exportable, state-in/state-out operations."""
    from silencio2.core.modules.attention import _LinearKVCacheBackend
    from silencio2.core.modules.conv import StreamingConv1d, StreamingConvTranspose1d
    originals = (
        _LinearKVCacheBackend.append_and_get,
        StreamingConv1d.forward,
        StreamingConvTranspose1d.forward,
    )

    def append_and_get(self, key, value, state):
        if state is None:
            key_attention = key.permute(0, 2, 1, 3)
            value_attention = value.permute(0, 2, 1, 3)
            length = torch.onnx.operators.shape_as_tensor(key)[1]
            positions = torch.arange(length, device=key.device, dtype=torch.long)
            positions = positions.view(1, -1).expand(key.shape[0], -1)
            offset = torch.zeros(key.shape[0], device=key.device, dtype=torch.long)
            return key_attention, value_attention, positions, offset

        # The cache must leave the graph as an updated state tensor. Updating a
        # local clone and returning only sliced K/V (as complete_kv does) makes
        # the exported autoregressive graph reuse stale voice-only state.
        cache = state["cache"]
        offset = state["offset"]
        pos = offset.reshape(-1)[0]
        end = pos + torch.onnx.operators.shape_as_tensor(key)[1]
        keys = cache[0].clone()
        values = cache[1].clone()
        keys[:, pos:end] = key
        values[:, pos:end] = value
        state["cache"] = torch.stack((keys, values), dim=0)
        key_attention = state["cache"][0, :, :end].permute(0, 2, 1, 3)
        value_attention = state["cache"][1, :, :end].permute(0, 2, 1, 3)
        positions = torch.arange(end, device=key.device, dtype=torch.long)
        positions = positions.view(1, -1).expand(key.shape[0], -1)
        pad = state.get("pad")
        attention_offset = offset
        if pad is not None:
            positions = positions - pad[:, None]
            attention_offset = offset - pad
        return key_attention, value_attention, positions, attention_offset

    _LinearKVCacheBackend.append_and_get = append_and_get

    def conv1d_forward(self, x, model_state):
        batch, _, _ = x.shape
        state = self.init_state(batch, 0) if model_state is None else self.get_state(model_state)
        previous = state["previous"]
        length = previous.shape[-1]
        if length and self.pad_mode == "replicate":
            state["previous"] = torch.where(state["first"].view(-1, 1, 1), x[..., :1], previous)
            previous = state["previous"]
        if length:
            x = torch.cat([previous, x], dim=-1)
        result = self.conv(x)
        if length:
            state["previous"] = x[..., -length:]
            if self.pad_mode == "replicate":
                state["first"] = torch.zeros_like(state["first"])
        return result

    def conv_transpose_forward(self, x, model_state):
        state = self.get_state(model_state)
        partial = state["partial"]
        output = self.convtr(x)
        length = partial.shape[-1]
        if length:
            output = torch.cat([output[..., :length] + partial, output[..., length:]], dim=-1)
            bias = self.convtr.bias
            next_partial = output[..., -length:]
            if bias is not None:
                next_partial = next_partial - bias[:, None]
            state["partial"] = next_partial
            output = output[..., :-length]
        return output

    StreamingConv1d.forward = conv1d_forward
    StreamingConvTranspose1d.forward = conv_transpose_forward

    def restore() -> None:
        _LinearKVCacheBackend.append_and_get = originals[0]
        StreamingConv1d.forward = originals[1]
        StreamingConvTranspose1d.forward = originals[2]

    return restore


def save_states(path: Path, state: dict, manifest: list[dict]) -> None:
    np.savez(path, **{entry["input_name"]: get_by_path(state, entry["path"]).detach().cpu().numpy() for entry in manifest})


def compare(name: str, expected: np.ndarray, actual: np.ndarray, rtol: float = 4e-4, atol: float = 4e-5) -> dict:
    if expected.shape != actual.shape:
        raise AssertionError(f"{name} shape mismatch: {expected.shape} != {actual.shape}")
    diff = np.abs(expected.astype(np.float64) - actual.astype(np.float64))
    np.testing.assert_allclose(expected, actual, rtol=rtol, atol=atol, err_msg=name)
    finite = diff[np.isfinite(diff)]
    max_diff = float(finite.max(initial=0.0))
    mean_diff = float(finite.mean()) if finite.size else 0.0
    return {"name": name, "shape": list(expected.shape), "maxAbsError": max_diff, "meanAbsError": mean_diff,
            "rtol": rtol, "atol": atol}


def verify_stream_parity(tts, model, state_voice: dict, flow_manifest: list[dict], mimi_manifest: list[dict], out: Path) -> list[dict]:
    """Compare official streaming output with the exported graph cascade on two real spans."""
    import copy

    from silencio2.core.models.text_chunking import prepare_text_prompt
    from silencio2.core.modules.stateful_module import init_states

    fixture = Path("fixtures")
    article_path = fixture / "en-20000.txt"
    manifest_path = fixture / "en-20000.chunks.json"
    if not article_path.is_file() or not manifest_path.is_file():
        return []
    article = article_path.read_text(encoding="utf-8")
    spans = json.loads(manifest_path.read_text(encoding="utf-8"))["chunks"][:2]
    ort_options = ort.SessionOptions()
    ort_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    flow_session = ort.InferenceSession(str(out / "flow-main.onnx"), sess_options=ort_options, providers=["CPUExecutionProvider"])
    head_session = ort.InferenceSession(str(out / "flow-head.onnx"), sess_options=ort_options, providers=["CPUExecutionProvider"])
    text_session = ort.InferenceSession(str(out / "text-conditioner.onnx"), sess_options=ort_options, providers=["CPUExecutionProvider"])
    mimi_session = ort.InferenceSession(str(out / "mimi-decoder.onnx"), sess_options=ort_options, providers=["CPUExecutionProvider"])
    flow_output_names = [value.name for value in flow_session.get_outputs()]
    head_output_name = head_session.get_outputs()[0].name
    text_output_name = text_session.get_outputs()[0].name
    mimi_output_names = [value.name for value in mimi_session.get_outputs()]
    flow_inputs = [entry["input_name"] for entry in flow_manifest]
    mimi_inputs = [entry["input_name"] for entry in mimi_manifest]
    sample_rate = model.config.mimi.sample_rate
    fade_size = sample_rate // 200
    step_size = int(model.mimi.encoder_frame_rate / model.mimi.frame_rate)
    receipts = []

    def flow_run(sequence: np.ndarray, text_embeddings: np.ndarray, state: dict[str, np.ndarray]):
        feed = {"sequence": sequence, "text_embeddings": text_embeddings, **state}
        values = flow_session.run(flow_output_names, feed)
        return values[0], bool(values[1].reshape(-1)[0]), dict(zip(flow_inputs, values[2:]))

    def onnx_span(text: str) -> np.ndarray:
        torch.manual_seed(0)
        span_parts = []
        for emotion, chunk in tts.chunks(text):
            prepared_text, _ = prepare_text_prompt(
                f"<{emotion}> {chunk}" if emotion else chunk,
                model.pad_with_spaces_for_short_inputs,
                model.remove_semicolons,
                model.append_terminal_punctuation,
                model.capitalize_first_letter,
                model.replace_characters,
            )
            _, frames_after_eos_guess = prepare_text_prompt(
                chunk,
                model.pad_with_spaces_for_short_inputs,
                model.remove_semicolons,
                model.append_terminal_punctuation,
                model.capitalize_first_letter,
                model.replace_characters,
            )
            token_ids = model.flow_lm.conditioner.prepare(prepared_text).detach().cpu().numpy().astype(np.int64)
            token_count = int(token_ids.shape[1])
            max_gen_len = int(model._estimate_max_gen_len(token_count))
            tail = model.model_recommended_frames_after_eos
            if tail is None:
                tail = frames_after_eos_guess + 2
            state = copy.deepcopy(state_voice)
            capacity = model._flow_lm_current_end(state) + token_count + max_gen_len
            model._expand_kv_cache(state, capacity)
            flow_state = {
                entry["input_name"]: get_by_path(state, entry["path"]).detach().cpu().numpy().copy()
                for entry in flow_manifest
            }
            text_embeddings = text_session.run(text_output_name, {"token_ids": token_ids})[0]
            empty_sequence = np.empty((1, 0, model.flow_lm.ldim), dtype=np.float32)
            _, _, flow_state = flow_run(empty_sequence, text_embeddings, flow_state)
            # FlowLM.forward samples one latent during prefill, then discards it.
            torch.empty((1, model.flow_lm.ldim), dtype=torch.float32).normal_(mean=0.0, std=float(model.temp) ** 0.5)

            generated = []
            eos_step = None
            backbone_input = np.full((1, 1, model.flow_lm.ldim), np.nan, dtype=np.float32)
            for generation_step in range(max_gen_len):
                conditioning, is_eos, flow_state = flow_run(
                    backbone_input,
                    np.empty((1, 0, model.flow_lm.dim), dtype=np.float32),
                    flow_state,
                )
                noise = torch.empty((1, model.flow_lm.ldim), dtype=torch.float32).normal_(mean=0.0, std=float(model.temp) ** 0.5).numpy()
                if is_eos and eos_step is None and generation_step >= model._MIN_FRAMES_BEFORE_EOS:
                    eos_step = generation_step
                if eos_step is not None and generation_step >= eos_step + tail:
                    break
                latent = head_session.run(head_output_name, {"conditioning": conditioning, "noise": noise})[0]
                generated.append(latent)
                backbone_input = latent.reshape(1, 1, model.flow_lm.ldim)
            if not generated:
                raise AssertionError("Converted Silencio-2 stream produced no latent frames.")

            mimi_state = init_states(model.mimi, batch_size=1, sequence_length=max_gen_len * step_size)
            mimi_values = {
                entry["input_name"]: get_by_path(mimi_state, entry["path"]).detach().cpu().numpy().copy()
                for entry in mimi_manifest
            }
            max_batch = model.max_decoder_frames_per_call
            batches = [generated] if max_batch <= 0 else [generated[i:i + max_batch] for i in range(0, len(generated), max_batch)]
            first_audio = True
            for batch in batches:
                latents = np.concatenate(batch, axis=0)[None, :, :].astype(np.float32)
                feed = {"latent": latents, **mimi_values}
                values = mimi_session.run(mimi_output_names, feed)
                audio = values[0].reshape(-1).astype(np.float32, copy=True)
                mimi_values = dict(zip(mimi_inputs, values[1:]))
                if first_audio:
                    fade_length = min(len(audio), fade_size)
                    audio[:fade_length] *= np.linspace(0.0, 1.0, fade_length, dtype=np.float32)
                    first_audio = False
                span_parts.append(audio)
        return np.concatenate(span_parts).astype(np.float32, copy=False)

    for span in spans:
        text = article[span["start"]:span["end"]]
        native_parts = [np.asarray(chunk.detach().cpu().float().numpy()).reshape(-1) for chunk in tts.stream(text, voice="260", seed=0)]
        native = np.concatenate(native_parts).astype(np.float32, copy=False)
        converted = onnx_span(text)
        receipt = compare(f"native-versus-ONNX span {span['id']}", native, converted, rtol=2e-3, atol=2e-4)
        receipt.update({
            "sourceSpanId": span["id"],
            "sourceSpanSha256": span["sha256"],
            "sampleRate": sample_rate,
            "samples": int(native.size),
            "nativePcmSha256": hashlib.sha256(native.tobytes()).hexdigest(),
            "convertedPcmSha256": hashlib.sha256(converted.tobytes()).hexdigest(),
            "bitwiseEqual": bool(np.array_equal(native, converted)),
        })
        receipts.append(receipt)
    return receipts


def verify_graph(path: Path, wrapper: torch.nn.Module, args: tuple, input_names: list[str], output_names: list[str],
                 feeds: dict[str, np.ndarray], expected: tuple[torch.Tensor, ...], compare_names: list[str],
                 dynamic_axes: dict | None = None) -> list[dict]:
    torch.onnx.export(wrapper, args, path, input_names=input_names, output_names=output_names,
                      dynamic_axes=dynamic_axes, opset_version=OPSET, dynamo=False, external_data=False)
    onnx.checker.check_model(str(path))
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    output = session.run(output_names, feeds)
    checks = []
    for index, label in enumerate(compare_names):
        checks.append(compare(label, expected[index].detach().cpu().numpy(), output[index]))
    return checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model-root", type=Path)
    parser.add_argument("--source-commit", default="working-tree")
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        raise FileExistsError(f"Refusing to replace existing build output; choose a fresh isolated directory: {out}")

    model_root = args.model_root.resolve() if args.model_root else Path(snapshot_download(MODEL_ID, revision=MODEL_REVISION))
    if not (model_root / "model.safetensors").is_file():
        raise FileNotFoundError("Pinned Silencio-2 model.safetensors is missing")
    if sha256(model_root / "model.safetensors") != "c287646193537d3ca9c1fa536c0edf06b0b14bd0a5f8582caeb460a30f58fdc4":
        raise AssertionError("Pinned Silencio-2 checkpoint hash changed")
    if sha256(model_root / "tokenizer.model") != "c095fd76ad4f9a76d9c0702e188985349f7d7af7aa7af451f679c42a276b0e72":
        raise AssertionError("Pinned Silencio-2 SentencePiece hash changed")
    if sha256(model_root / "voices/260.wav") != "69df92e49522c52d424c18c1a560295523ca46ddc5e43e11829fed38118d4692":
        raise AssertionError("Pinned Silencio-2 voice 260 hash changed")
    copy_provenance(model_root, out)

    tokenizer_receipt = build_tokenizer(model_root, out)
    tokenizer_parity = verify_tokenizer(model_root, out, Path("fixtures"))
    sys.path.insert(0, str(model_root))
    from silencio2 import Silencio2TTS
    from silencio2.core.modules.stateful_module import init_states

    torch.set_num_threads(1)
    torch.manual_seed(0)
    tts = Silencio2TTS.from_pretrained(str(model_root), device="cpu")
    # Silencio2TTS.from_pretrained resets CPU inference to up to four threads.
    # Export and parity checks must remain bounded on shared hosted runners.
    torch.set_num_threads(1)
    model = tts.model.cpu().eval()
    if model.config.mimi.sample_rate != 24000 or model.flow_lm.flow_type != "drifting":
        raise AssertionError("Pinned Silencio-2 model config no longer matches the export adapter")

    # FlowLM cache state includes the exact, model-bound prompt for voice 260.
    state_voice = model.get_state_for_audio_prompt(str(model_root / "voices/260.wav"))
    tts._voices["260"] = state_voice
    frontend_parity = verify_frontend(tts, Path("fixtures"))
    # Keep the prompt state's real length in the downloadable asset. The
    # browser and parity runner expand it to the exact official generation
    # capacity for each text chunk.
    flow_manifest = manifest_for(state_voice)
    voice_path = out / "voice-260-state.bin.gz"
    write_voice_state(voice_path, state_voice, flow_manifest)
    flow_structure = state_structure(state_voice)
    flow_flat = tuple(flatten_state(state_voice))
    flow_names_in = [entry["input_name"] for entry in flow_manifest]
    flow_names_out = [entry["output_name"] for entry in flow_manifest]

    restore_patches = patch_for_onnx()

    # FlowLM main graph handles text prefill and each autoregressive step.
    flow_main = FlowMainWrapper(model.flow_lm, flow_structure, model.eos_threshold).eval()
    dummy_sequence = torch.randn(1, 1, model.flow_lm.ldim)
    dummy_text = torch.randn(1, 1, model.flow_lm.dim)
    flow_inputs = ["sequence", "text_embeddings", *flow_names_in]
    flow_outputs = ["conditioning", "is_eos", *flow_names_out]
    flow_dummy = (dummy_sequence, dummy_text, *flow_flat)
    with torch.no_grad():
        expected_flow = flow_main(*flow_dummy)
    flow_dynamic = {"sequence": {1: "sequence_length"}, "text_embeddings": {1: "text_length"}}
    for entry in flow_manifest:
        if entry["dynamicAxis"] is not None:
            flow_dynamic[entry["input_name"]] = {entry["dynamicAxis"]: "cache_length"}
            flow_dynamic[entry["output_name"]] = {entry["dynamicAxis"]: "cache_length"}
    flow_feeds = {name: value.detach().cpu().numpy() for name, value in zip(flow_inputs, flow_dummy)}
    flow_main_path = out / "flow-main.onnx"
    flow_checks = verify_graph(flow_main_path, flow_main, flow_dummy, flow_inputs, flow_outputs, flow_feeds,
                               expected_flow,
                               ["flow main conditioning", "flow main EOS", *[f"flow state {i}" for i in range(len(flow_manifest))]],
                               dynamic_axes=flow_dynamic)

    # Drifting is one step: no LSD Euler loop and no time-condition inputs.
    flow_head = FlowHeadWrapper(model.flow_lm).eval()
    dummy_condition = torch.randn(1, model.flow_lm.z_proj.out_features)
    dummy_noise = torch.randn(1, model.flow_lm.ldim)
    head_args = (dummy_condition, dummy_noise)
    with torch.no_grad():
        expected_head = flow_head(*head_args)
    head_path = out / "flow-head.onnx"
    flow_head_checks = verify_graph(head_path, flow_head, head_args, ["conditioning", "noise"], ["latent"],
                                    {"conditioning": dummy_condition.numpy(), "noise": dummy_noise.numpy()},
                                    (expected_head,), ["drifting flow head"])

    # Only the fixed benchmark voice is bundled. Other voices remain model-card
    # capabilities but are not part of this browser configuration.
    tokenizer_wrapper = TextConditionerWrapper(model.flow_lm.conditioner).eval()
    example_ids = torch.tensor([tts.model.flow_lm.conditioner.tokenizer.encode("The weather is cloudy today.")], dtype=torch.int64)
    with torch.no_grad():
        expected_text = tokenizer_wrapper(example_ids)
    text_path = out / "text-conditioner.onnx"
    text_checks = verify_graph(text_path, tokenizer_wrapper, (example_ids,), ["token_ids"], ["embeddings"],
                               {"token_ids": example_ids.numpy()}, (expected_text,), ["SentencePiece text lookup"])

    # Mimi state is parameterized by max-generation length. Cache axes are
    # dynamic; the browser allocates only the capacity needed by each text span.
    mimi_state = init_states(model.mimi, batch_size=1, sequence_length=MIMI_STATE_CAPACITY)
    mimi_manifest = manifest_for(mimi_state)
    write_voice_state(out / "mimi-initial-state.bin.gz", mimi_state, mimi_manifest)
    mimi_structure = state_structure(mimi_state)
    mimi_flat = tuple(flatten_state(mimi_state))
    mimi_steps_per_latent = int(model.mimi.encoder_frame_rate / model.mimi.frame_rate)
    mimi_wrapper = MimiDecoderWrapper(model.mimi, model.flow_lm, mimi_structure, mimi_steps_per_latent).eval()
    dummy_latent = torch.randn(1, 2, model.flow_lm.ldim)
    mimi_args = (dummy_latent, *mimi_flat)
    with torch.no_grad():
        expected_mimi = mimi_wrapper(*mimi_args)
    mimi_inputs = ["latent", *[entry["input_name"] for entry in mimi_manifest]]
    mimi_outputs = ["audio", *[entry["output_name"] for entry in mimi_manifest]]
    mimi_dynamic = {"latent": {1: "latent_length"}}
    for entry in mimi_manifest:
        if entry["dynamicAxis"] is not None:
            mimi_dynamic[entry["input_name"]] = {entry["dynamicAxis"]: "cache_length"}
            mimi_dynamic[entry["output_name"]] = {entry["dynamicAxis"]: "cache_length"}
    mimi_feeds = {name: value.detach().cpu().numpy() for name, value in zip(mimi_inputs, mimi_args)}
    mimi_path = out / "mimi-decoder.onnx"
    mimi_checks = verify_graph(mimi_path, mimi_wrapper, mimi_args, mimi_inputs, mimi_outputs, mimi_feeds,
                               expected_mimi, ["Mimi decoder audio", *[f"Mimi state {i}" for i in range(len(mimi_manifest))]],
                               dynamic_axes=mimi_dynamic)

    restore_patches()
    stream_parity = verify_stream_parity(tts, model, state_voice, flow_manifest, mimi_manifest, out)
    if len(stream_parity) != 2:
        raise AssertionError("Expected official native-versus-ONNX output checks for the first two canonical source spans")

    files = {}
    for path in sorted(out.iterdir()):
        if path.is_file() and path.name not in {"bundle.json", "SOURCE.json", "verification.json"}:
            files[path.name] = {"sha256": sha256(path), "bytes": path.stat().st_size}
    model_params = sum(parameter.numel() for parameter in model.parameters())
    bundle = {
        "schemaVersion": 1,
        "modelId": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "voice": "260",
        "voiceSource": {"path": "voices/260.wav", "sha256": "69df92e49522c52d424c18c1a560295523ca46ddc5e43e11829fed38118d4692"},
        "sampleRate": 24000,
        "frameRate": 12.5,
        "samplesPerFrame": 1920,
        "latentDim": model.flow_lm.ldim,
        "conditioningDim": model.flow_lm.dim,
        "flowConditioningDim": model.flow_lm.z_proj.out_features,
        "flowType": model.flow_lm.flow_type,
        "temperature": float(model.temp),
        "noiseClamp": model.noise_clamp,
        "eosThreshold": float(model.eos_threshold),
        "minFramesBeforeEos": int(model._MIN_FRAMES_BEFORE_EOS),
        "tokensPerSecondEstimate": float(model._TOKENS_PER_SECOND_ESTIMATE),
        "generationSecondsPadding": float(model._GEN_SECONDS_PADDING),
        "modelRecommendedFramesAfterEos": model.model_recommended_frames_after_eos,
        "mimiStepsPerLatent": mimi_steps_per_latent,
        "maxDecoderFramesPerCall": int(model.max_decoder_frames_per_call),
        "flowEmbeddingMean": model.flow_lm.emb_mean.detach().cpu().float().tolist(),
        "flowEmbeddingStd": model.flow_lm.emb_std.detach().cpu().float().tolist(),
        "text": {
            "maxTokensPerChunk": 48,
            "padWithSpacesForShortInputs": bool(model.pad_with_spaces_for_short_inputs),
            "removeSemicolons": bool(model.remove_semicolons),
            "appendTerminalPunctuation": bool(model.append_terminal_punctuation),
            "capitalizeFirstLetter": bool(model.capitalize_first_letter),
            "replaceCharacters": dict(model.replace_characters),
            "sounds": ["laugh", "sigh", "gasp", "cough", "clear_throat"],
            "emotions": ["happy", "sad", "angry", "fear", "surprised", "whisper"],
        },
        "flowStateCapacityAtExport": max(entry["shape"][2] for entry in flow_manifest if entry["dynamicAxis"] == 2),
        "mimiStateCapacityAtExport": MIMI_STATE_CAPACITY,
        "flowStateManifest": flow_manifest,
        "mimiStateManifest": mimi_manifest,
        "tokenizer": tokenizer_receipt,
        "tokenizerParity": tokenizer_parity,
        "frontendParity": frontend_parity,
        "parameterCount": model_params,
        "files": files,
    }
    atomic_json(out / "bundle.json", bundle)
    source = {
        "schemaVersion": 1,
        "sourceCommit": args.source_commit,
        "modelId": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "primaryBenchmarkReference": "https://erogol.com/small_tts_bench/",
        "referencedConfiguration": "Silencio-2 with bundled voice 260 on CPU; source benchmark only, not a result from this repository.",
        "modelFileSha256": sha256(model_root / "model.safetensors"),
        "modelFileBytes": (model_root / "model.safetensors").stat().st_size,
        "tokenizerModelSha256": sha256(model_root / "tokenizer.model"),
        "voiceReferenceSha256": sha256(model_root / "voices/260.wav"),
        "runtime": {"onnx": onnx.__version__, "onnxruntime": ort.__version__, "torch": torch.__version__},
        "opset": OPSET,
        "command": "python tools/silencio2/export.py --output generated/silencio2",
        "license": "Silencio-2 weights CC-BY-4.0; silencio2/core inference code MIT; exporter notices recorded in repository.",
    }
    atomic_json(out / "SOURCE.json", source)
    atomic_json(out / "verification.json", {
        "schemaVersion": 1,
        "graphParity": flow_checks + flow_head_checks + text_checks + mimi_checks,
        "allGraphOutputsMatched": True,
        "tokenizerParity": tokenizer_parity,
        "nativeVersusOnnxStreamParity": stream_parity,
        "allNativeSpanParityPassed": len(stream_parity) == 2,
        "frontendParity": {
            "sourceSpans": frontend_parity["sourceSpans"],
            "allSpansChunked": frontend_parity["allSpansChunked"],
            "maxTokensPerChunk": frontend_parity["maxTokensPerChunk"],
        },
        "parameterCount": model_params,
        "modelRevision": MODEL_REVISION,
    })
    print(json.dumps({"bundle": str(out / "bundle.json"), "parameterCount": model_params,
                      "files": files, "verification": str(out / "verification.json")}, indent=2))


if __name__ == "__main__":
    main()
