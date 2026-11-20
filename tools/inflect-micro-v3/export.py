#!/usr/bin/env python3
"""Export the pinned Inflect Micro v3 checkpoint to three browser ONNX graphs.

This is an export/build tool, not a server-side inference path. It deliberately
accepts only the public checkpoint at SOURCE_REVISION and verifies its upstream
weight and source files before loading them.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

SOURCE_REVISION = "c1a7db6ef44c931623fc2028cb0409659b83156c"
UPSTREAM_RELEASE_SCHEMA = "inflect-english-release-candidate-v2"
WEIGHTS_SHA256 = "e8121dcec34ea9560c785ba4608d5fa13e1b4d02288f0b76e22bb5d2a44ef328"
SAMPLE_RATE = 24_000
VOICE = "cassidy"
VOICE_ID = 2
DONOR_NAMES = ("af_heart", "af_heart", "af_sarah", "am_michael", "am_michael", "am_michael")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def pinned_file(root: Path, relative: str, expected: str | None = None) -> Path:
    path = root / relative
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"Missing or unsafe pinned source file: {relative}")
    if expected is not None and sha256(path) != expected:
        raise ValueError(f"Pinned source digest mismatch: {relative}")
    return path


def load_model(source: Path):
    import torch

    root = source.resolve(strict=True)
    model_root = root / "models" / "micro"
    pinned_file(model_root, "weights.pt", WEIGHTS_SHA256)
    release = json.loads(pinned_file(root, "release-manifest.json").read_text(encoding="utf-8"))
    if release.get("schema") != UPSTREAM_RELEASE_SCHEMA:
        raise ValueError("Upstream release schema does not match the pinned Micro v3 export")
    for relative, digest in release.get("files", {}).items():
        if not isinstance(digest, str) or len(digest) != 64:
            raise ValueError(f"Invalid upstream release digest: {relative}")
        pinned_file(root, relative, digest)

    code = model_root / "code"
    sys.path.insert(0, str(code))
    import fastmicro_inference_20261029 as fastmicro

    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    model = fastmicro.load_export(model_root, device="cpu", allow_cuda=False)
    if model.parameter_counts != {"text": 4_231_988, "joint": 7_555_646}:
        raise ValueError(f"Unexpected resident parameter count: {model.parameter_counts}")
    if sum(model.parameter_counts.values()) != 11_787_634:
        raise ValueError("Unexpected total parameter count")
    model.text.eval().requires_grad_(False)
    model.joint.eval().requires_grad_(False)
    return model, root, code


def duration_encode_unpadded(predictor, x, style):
    """Micro's DurationEncoder with packed-LSTM calls removed for batch-one ONNX.

    Every browser request is an unpadded single utterance, so direct LSTM calls
    produce the same valid-token result as pack/pad with length == token_count.
    """
    import torch
    import torch.nn.functional as F

    batch, hidden, tokens = x.shape
    mask = torch.zeros((batch, tokens), device=x.device, dtype=torch.bool)
    aligned_style = style.expand(tokens, batch, -1)
    x = x.permute(2, 0, 1)
    x = torch.cat((x, aligned_style), dim=-1)
    x = x.transpose(0, 1).transpose(-1, -2)
    for block in predictor.text_encoder.lstms:
        if type(block).__name__ == "AdaLayerNorm":
            x = block(x.transpose(-1, -2), style).transpose(-1, -2)
            x = torch.cat((x, aligned_style.permute(1, 2, 0)), dim=1)
        else:
            x = x.transpose(-1, -2)
            x, _ = block(x)
            x = F.dropout(x, p=predictor.text_encoder.dropout, training=False)
            x = x.transpose(-1, -2)
    return x.transpose(-1, -2)


def text_encoder_unpadded(encoder, ids):
    x = encoder.embedding(ids).transpose(1, 2)
    for layer in encoder.cnn:
        x = layer(x)
    x = x.transpose(1, 2)
    x, _ = encoder.lstm(x)
    return x.transpose(1, 2)


def make_graphs(model):
    import torch
    from torch import nn

    text = model.text
    joint = model.joint
    speaker_id = torch.tensor([VOICE_ID], dtype=torch.long)

    class TextFeatures(nn.Module):
        def __init__(self):
            super().__init__()
            self.text = text

        def forward(self, input_ids):
            batch, tokens = input_ids.shape
            lengths = torch.full((batch,), tokens, device=input_ids.device, dtype=torch.long)
            speakers = speaker_id.to(input_ids.device).expand(batch)
            style = self.text.speaker_embedding(speakers)
            attention_mask = torch.ones_like(input_ids)
            bert = self.text.bert(input_ids, attention_mask=attention_mask)
            d_en = self.text.bert_encoder(bert).transpose(-1, -2)
            d = duration_encode_unpadded(self.text.predictor, d_en, style)
            duration_hidden, _ = self.text.predictor.lstm(d)
            durations = torch.sigmoid(self.text.predictor.duration_proj(duration_hidden)).sum(-1)
            asr_tokens = self.text.asr_proj(
                text_encoder_unpadded(self.text.text_encoder, input_ids).transpose(1, 2)
            ).transpose(1, 2)
            return durations, d, asr_tokens

    class TextProsody(nn.Module):
        def __init__(self):
            super().__init__()
            self.text = text

        def forward(self, duration_features, asr_tokens, alignment):
            batch = duration_features.shape[0]
            speakers = speaker_id.to(duration_features.device).expand(batch)
            style = self.text.speaker_embedding(speakers)
            expanded = duration_features.transpose(-1, -2) @ alignment
            f0, noise = self.text.predictor.F0Ntrain(expanded, style)
            asr = asr_tokens @ alignment
            return asr, f0, noise

    class JointCoefficients(nn.Module):
        def __init__(self):
            super().__init__()
            self.joint = joint

        def forward(self, asr, f0, noise, style):
            bridge = self.joint.bridge
            trunk = bridge.trunk
            batch = asr.shape[0]
            speakers = speaker_id.to(asr.device).expand(batch)
            voice_style = bridge.speaker_embedding(speakers)
            f0_conv = trunk.F0_conv(f0[:, None])
            noise_conv = trunk.N_conv(noise[:, None])
            hidden = trunk.encode(torch.cat((asr, f0_conv, noise_conv), 1), voice_style)
            residual = trunk.asr_res(asr)
            use_residual = True
            for block in trunk.decode:
                if use_residual:
                    hidden = torch.cat((hidden, residual, f0_conv, noise_conv), 1)
                hidden = block(hidden, voice_style)
                if block.upsample_type != "none":
                    use_residual = False

            head = self.joint.head
            scale, shift = head.style_affine(style).chunk(2, -1)
            conditioned = hidden * (1 + 0.1 * torch.tanh(scale[:, :, None])) + shift[:, :, None]
            source = head.head
            _, _, frames = conditioned.shape
            time = frames * source.up
            h = source.norm0(source.inp(conditioned).transpose(1, 2)).transpose(1, 2)
            for block in source.blocks:
                h = block(h)
            hn = source.norm1(h.transpose(1, 2))
            raw = source.out(hn).view(batch, time, source.C * source.G + 1)
            raw = torch.cat((raw, raw[:, -1:]), dim=1)
            gains = (
                raw[..., :-1]
                .reshape(batch, time + 1, source.C, source.G)
                @ source.M.T
            ).permute(0, 2, 3, 1)
            pulse_shift = 0.5 * torch.tanh(raw[..., -1])
            burst = torch.exp(
                (source.out_b(hn).view(batch, frames * 4, source.Gb) @ source.Mb.T).clamp(max=6)
            ).transpose(1, 2)
            burst = torch.cat((burst, burst[..., -1:]), dim=-1)
            return gains, pulse_shift, burst

    return TextFeatures().eval(), TextProsody().eval(), JointCoefficients().eval()


def export_graphs(model, out: Path):
    import numpy as np
    import torch
    import onnx
    import onnxruntime as ort

    text_features, text_prosody, joint_coeffs = make_graphs(model)
    out.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(0)
    ids = torch.tensor([[0, 35, 42, 28, 61, 71, 39, 0]], dtype=torch.long)
    durations, token_features, token_asr = text_features(ids)
    frames = max(2, int(torch.round(durations).clamp(min=1).sum()))
    counts = torch.round(durations).clamp(min=1).long()
    if int(counts.sum()) < 2:
        counts[0, 0] += 2 - int(counts.sum())
    frame_ids = torch.repeat_interleave(torch.arange(ids.shape[1]), counts[0])
    alignment = torch.zeros((1, ids.shape[1], frames), dtype=torch.float32)
    alignment[0, frame_ids[:frames], torch.arange(frames)] = 1
    aligned_asr, f0, noise = text_prosody(token_features, token_asr, alignment)
    style_index = ids.shape[1] - 3
    style = (
        model.styles["banks"][DONOR_NAMES[VOICE_ID]][style_index]
        + model.styles["offsets"][VOICE_ID] * model.styles["strengths"][VOICE_ID]
    )[None]
    coeffs = joint_coeffs(aligned_asr, f0, noise, style)

    export_args = dict(opset_version=17, dynamo=False, do_constant_folding=True, verbose=False)
    torch.onnx.export(
        text_features,
        (ids,),
        out / "text-features.onnx",
        input_names=["input_ids"],
        output_names=["durations", "duration_features", "asr_tokens"],
        dynamic_axes={
            "input_ids": {1: "token_count"},
            "durations": {1: "token_count"},
            "duration_features": {1: "token_count"},
            "asr_tokens": {2: "token_count"},
        },
        **export_args,
    )
    torch.onnx.export(
        text_prosody,
        (token_features, token_asr, alignment),
        out / "text-prosody.onnx",
        input_names=["duration_features", "asr_tokens", "alignment"],
        output_names=["asr", "f0", "noise"],
        dynamic_axes={
            "duration_features": {1: "token_count"},
            "asr_tokens": {2: "token_count"},
            "alignment": {1: "token_count", 2: "frame_count"},
            "asr": {2: "frame_count"},
            "f0": {1: "double_frame_count"},
            "noise": {1: "double_frame_count"},
        },
        **export_args,
    )
    torch.onnx.export(
        joint_coeffs,
        (aligned_asr, f0, noise, style),
        out / "joint-coefficients.onnx",
        input_names=["asr", "f0", "noise", "style"],
        output_names=["gains", "pulse_shift", "burst_gains"],
        dynamic_axes={
            "asr": {2: "frame_count"},
            "f0": {1: "double_frame_count"},
            "noise": {1: "double_frame_count"},
            "gains": {3: "stft_frame_count"},
            "pulse_shift": {1: "stft_frame_count"},
            "burst_gains": {2: "burst_frame_count"},
        },
        **export_args,
    )

    for name in ("text-features.onnx", "text-prosody.onnx", "joint-coefficients.onnx"):
        path = out / name
        graph = onnx.load(path)
        onnx.checker.check_model(graph)

    # Exporter parity against the Python model is checked on several token
    # lengths before any artifact can be produced.
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    features_session = ort.InferenceSession(str(out / "text-features.onnx"), sess_options=options,
                                            providers=["CPUExecutionProvider"])
    prosody_session = ort.InferenceSession(str(out / "text-prosody.onnx"), sess_options=options,
                                           providers=["CPUExecutionProvider"])
    coeffs_session = ort.InferenceSession(str(out / "joint-coefficients.onnx"), sess_options=options,
                                          providers=["CPUExecutionProvider"])
    max_errors = {"durations": 0.0, "duration_features": 0.0, "asr_tokens": 0.0,
                  "asr": 0.0, "f0": 0.0, "noise": 0.0, "gains": 0.0,
                  "pulse_shift": 0.0, "burst_gains": 0.0}
    sample_ids = [
        ids,
        torch.tensor([[0, 35, 42, 0]], dtype=torch.long),
        torch.tensor([[0, 35, 42, 28, 61, 0]], dtype=torch.long),
    ]
    for test_ids in sample_ids:
        with torch.no_grad():
            expected_features = text_features(test_ids)
        actual_features = features_session.run(None, {"input_ids": test_ids.numpy()})
        feature_names = ("durations", "duration_features", "asr_tokens")
        for name, expected, actual in zip(feature_names, expected_features, actual_features, strict=True):
            error = float(np.max(np.abs(expected.numpy() - actual)))
            max_errors[name] = max(max_errors[name], error)
            if not math.isfinite(error) or error > 2e-4:
                raise ValueError(f"ONNX parity failed for {name}: max abs error {error}")
        durations_t = torch.from_numpy(actual_features[0])
        counts_t = torch.round(durations_t).clamp(min=1).long()
        frames_t = max(2, int(counts_t.sum()))
        if int(counts_t.sum()) < 2:
            counts_t[0, 0] += 2 - int(counts_t.sum())
        token_for_frame = torch.repeat_interleave(torch.arange(test_ids.shape[1]), counts_t[0])
        aln_t = torch.zeros((1, test_ids.shape[1], frames_t), dtype=torch.float32)
        aln_t[0, token_for_frame[:frames_t], torch.arange(frames_t)] = 1
        with torch.no_grad():
            expected_prosody = text_prosody(torch.from_numpy(actual_features[1]),
                                           torch.from_numpy(actual_features[2]), aln_t)
        actual_prosody = prosody_session.run(None, {
            "duration_features": actual_features[1],
            "asr_tokens": actual_features[2],
            "alignment": aln_t.numpy(),
        })
        for name, expected, actual in zip(("asr", "f0", "noise"), expected_prosody, actual_prosody, strict=True):
            error = float(np.max(np.abs(expected.numpy() - actual)))
            max_errors[name] = max(max_errors[name], error)
            if not math.isfinite(error) or error > 3e-4:
                raise ValueError(f"ONNX parity failed for {name}: max abs error {error}")
        style_row = test_ids.shape[1] - 3
        test_style = (
            model.styles["banks"][DONOR_NAMES[VOICE_ID]][style_row]
            + model.styles["offsets"][VOICE_ID] * model.styles["strengths"][VOICE_ID]
        )[None]
        with torch.no_grad():
            expected_coeffs = joint_coeffs(*[torch.from_numpy(actual_prosody[i]) for i in range(3)], test_style)
        actual_coeffs = coeffs_session.run(None, {
            "asr": actual_prosody[0], "f0": actual_prosody[1], "noise": actual_prosody[2],
            "style": test_style.numpy(),
        })
        for name, expected, actual in zip(("gains", "pulse_shift", "burst_gains"), expected_coeffs, actual_coeffs, strict=True):
            error = float(np.max(np.abs(expected.numpy() - actual)))
            max_errors[name] = max(max_errors[name], error)
            if not math.isfinite(error) or error > 5e-4:
                raise ValueError(f"ONNX parity failed for {name}: max abs error {error}")

    style_bank = model.styles["banks"][DONOR_NAMES[VOICE_ID]]
    effective_bank = style_bank + model.styles["offsets"][VOICE_ID][None] * model.styles["strengths"][VOICE_ID]
    style_path = out / "cassidy-style-bank.f32"
    effective_bank.detach().cpu().numpy().astype("<f4", copy=False).tofile(style_path)
    vocab_path = out / "vocab.json"
    vocab = model.vocab
    if not isinstance(vocab, dict) or not vocab or any(
        not isinstance(symbol, str) or len(symbol) != 1 or type(index) is not int or not 0 < index < 178
        for symbol, index in vocab.items()
    ) or len(set(vocab.values())) != len(vocab):
        raise ValueError("Pinned native 178-symbol vocabulary is invalid")
    vocab_path.write_text(json.dumps(vocab, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    metadata = {
        "schema": "inflect-micro-v3-browser-onnx-v1",
        "modelRevision": SOURCE_REVISION,
        "weightsSha256": WEIGHTS_SHA256,
        "voice": VOICE,
        "voiceId": VOICE_ID,
        "sampleRate": SAMPLE_RATE,
        "textTokensMax": 512,
        "maxFrames": 1200,
        "textChunkLimit": 220,
        "internalGapSamples": 2880,
        "precision": "FP32",
        "g2p": "English frontend supplied separately; native 178-symbol vocabulary exported and enforced strictly",
        "rng": "Browser seeded standard-normal noise; output source uses the pinned model's source-filter DSP; sequence differs from PyTorch generator",
        "parameterCounts": model.parameter_counts,
        "exporter": {"torch": torch.__version__, "onnxruntime": ort.__version__, "opset": 17},
        "parity": {"provider": "CPUExecutionProvider", "maximumAbsoluteErrors": max_errors},
    }
    files = {}
    for path in sorted(out.iterdir()):
        if path.is_file() and path.name != "manifest.json":
            files[path.name] = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    metadata["files"] = files
    (out / "manifest.json").write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Verified exact HF repository snapshot")
    parser.add_argument("--output", type=Path, required=True, help="New generated export directory")
    args = parser.parse_args()
    if args.output.exists() and any(args.output.iterdir()):
        parser.error("Output directory must be new or empty")
    model, _, _ = load_model(args.source)
    export_graphs(model, args.output)
    print((args.output / "manifest.json").read_text(encoding="utf-8"), end="")


if __name__ == "__main__":
    main()
