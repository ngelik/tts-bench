#!/usr/bin/env python3
"""Export pinned Inflect Mini v3 weights to the browser's dynamic FP32 ONNX graphs.

The official Python checkpoint remains the source of truth. This exporter does
not score audio; it builds three ONNX graphs and a fixed Cassidy length-style
table, then checks the assembled ONNX path against the pinned native inference
implementation before writing a bundle manifest.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn as nn
import torch.nn.functional as F
from huggingface_hub import snapshot_download


ROOT = Path(__file__).resolve().parents[1]
LOCK_PATH = ROOT / "tools" / "inflect-mini-v3-conversion.lock.json"
LOCK = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
SOURCE = ROOT / ".cache" / "inflect-mini-v3-source"
OUTPUT = ROOT / ".cache" / "inflect-mini-v3-onnx"
OPSET = LOCK["export"]["opset"]
VOICE = LOCK["export"]["voice"]
SPEAKER_ID = LOCK["export"]["speakerId"]
MAX_FRAMES = LOCK["export"]["maxFrames"]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


@contextmanager
def fixed_source_randomness(phase_uniform: torch.Tensor, harmonic_noise: torch.Tensor):
    """Feed the same explicit random arrays to native and exported source paths."""
    def randn_like(value: torch.Tensor, *args, **kwargs) -> torch.Tensor:
        if value.shape == harmonic_noise.shape and value.dtype == harmonic_noise.dtype:
            return harmonic_noise.to(device=value.device)
        return torch.zeros_like(value)

    with patch("torch.rand", return_value=phase_uniform), patch("torch.randn_like", side_effect=randn_like):
        yield


def download_pinned_source(source_dir: Path) -> Path:
    allow_patterns = [
        LOCK["upstreamReleaseManifest"]["path"],
        LOCK["miniManifest"]["path"],
        LOCK["checkpoint"]["path"],
        *LOCK["sourceFiles"].keys(),
        *LOCK["provenanceFiles"].keys(),
    ]
    snapshot_download(
        repo_id=LOCK["model"],
        revision=LOCK["modelRevision"],
        local_dir=str(source_dir),
        allow_patterns=allow_patterns,
    )
    return source_dir


def verify_source(source_dir: Path) -> None:
    release = source_dir / LOCK["upstreamReleaseManifest"]["path"]
    require(release.is_file(), "Pinned upstream release manifest is missing")
    require(release.stat().st_size == LOCK["upstreamReleaseManifest"]["bytes"]
            and sha256_file(release) == LOCK["upstreamReleaseManifest"]["sha256"],
            "Pinned upstream release manifest size/hash differs")
    release_manifest = json.loads(release.read_text(encoding="utf-8"))

    for relative, expected in LOCK["sourceFiles"].items():
        path = source_dir / relative
        require(path.is_file() and not path.is_symlink(), "Pinned conversion source missing: " + relative)
        require(sha256_file(path) == expected, "Pinned conversion source hash differs: " + relative)
        if relative.startswith("core/baseline/"):
            release_path = relative.removeprefix("core/baseline/")
            require(release_manifest.get("files", {}).get(release_path) == expected,
                    "Upstream release manifest does not bind: " + relative)

    for relative, expected in LOCK["provenanceFiles"].items():
        path = source_dir / relative
        require(path.is_file() and not path.is_symlink(), "Pinned license/provenance file missing: " + relative)
        require(sha256_file(path) == expected, "Pinned license/provenance hash differs: " + relative)

    mini_manifest_path = source_dir / LOCK["miniManifest"]["path"]
    require(mini_manifest_path.is_file(), "Pinned Mini manifest is missing")
    require(mini_manifest_path.stat().st_size == LOCK["miniManifest"]["bytes"]
            and sha256_file(mini_manifest_path) == LOCK["miniManifest"]["sha256"],
            "Pinned Mini manifest size/hash differs")
    mini_manifest = json.loads(mini_manifest_path.read_text(encoding="utf-8"))
    checkpoint_relative = LOCK["checkpoint"]["path"].removeprefix("core/baseline/models/mini/")
    require(mini_manifest.get("files", {}).get(checkpoint_relative) == LOCK["checkpoint"]["sha256"],
            "Mini manifest does not bind the pinned checkpoint")
    for relative, expected in mini_manifest.get("files", {}).items():
        path = mini_manifest_path.parent / relative
        require(path.is_file() and not path.is_symlink(), "Mini manifest source missing: " + relative)
        require(sha256_file(path) == expected, "Mini manifest source hash differs: " + relative)


def export_graph(module: nn.Module, args: tuple[torch.Tensor, ...], path: Path, *,
                 input_names: list[str], output_names: list[str], dynamic_axes: dict) -> None:
    torch.onnx.export(
        module,
        args,
        str(path),
        export_params=True,
        opset_version=OPSET,
        do_constant_folding=True,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes=dynamic_axes,
        dynamo=False,
    )
    graph = onnx.load(path, load_external_data=True)
    onnx.checker.check_model(graph, full_check=True)


class TextDurationGraph(nn.Module):
    """No-padding, batch-one equivalent of the pinned text forward path."""

    def __init__(self, text: nn.Module, speaker_id: int):
        super().__init__()
        self.text = text
        self.speaker_id = speaker_id

    @staticmethod
    def _duration_features(module: nn.Module, x: torch.Tensor, style: torch.Tensor) -> torch.Tensor:
        masks = torch.zeros((x.shape[0], x.shape[2]), dtype=torch.bool, device=x.device)
        x = x.permute(2, 0, 1)
        expanded_style = style.expand(x.shape[0], x.shape[1], -1)
        x = torch.cat([x, expanded_style], dim=-1)
        x = x.transpose(0, 1).transpose(-1, -2)
        for block in module.lstms:
            if isinstance(block, type(module.lstms[1])) and hasattr(block, "fc"):
                x = block(x.transpose(-1, -2), style).transpose(-1, -2)
                x = torch.cat([x, expanded_style.permute(1, 2, 0)], dim=1)
            else:
                sequence = x.transpose(-1, -2)
                sequence, _ = block(sequence)
                sequence = F.dropout(sequence, p=module.dropout, training=False)
                x = sequence.transpose(-1, -2)
            x = x.masked_fill(masks.unsqueeze(1), 0.0)
        return x.transpose(-1, -2)

    @staticmethod
    def _text_features(module: nn.Module, ids: torch.Tensor) -> torch.Tensor:
        x = module.embedding(ids).transpose(1, 2)
        for block in module.cnn:
            x = block(x)
        x, _ = module.lstm(x.transpose(1, 2))
        return x.transpose(-1, -2)

    def forward(self, ids: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        batch = ids.shape[0]
        lengths = torch.full((batch,), ids.shape[1], dtype=torch.long, device=ids.device)
        attention = torch.ones_like(ids, dtype=torch.long)
        speakers = torch.full((batch,), self.speaker_id, dtype=torch.long, device=ids.device)
        style = self.text.speaker_embedding(speakers)
        encoded = self.text.bert(ids, attention_mask=attention)
        encoded = self.text.bert_encoder(encoded).transpose(-1, -2)
        duration_features = self._duration_features(self.text.predictor.text_encoder, encoded, style)
        duration_hidden, _ = self.text.predictor.lstm(duration_features)
        durations = torch.sigmoid(self.text.predictor.duration_proj(duration_hidden)).sum(-1)
        token_hidden = self._text_features(self.text.text_encoder, ids)
        asr_tokens = self.text.asr_proj(token_hidden.transpose(1, 2)).transpose(1, 2)
        return durations, duration_features, asr_tokens


class TextBridgeGraph(nn.Module):
    """Expand duration alignment, predict prosody, and run the native bridge."""

    def __init__(self, model: nn.Module, speaker_id: int):
        super().__init__()
        self.text = model.text
        self.bridge = model.bridge
        self.speaker_id = speaker_id

    def forward(self, duration_features: torch.Tensor, asr_tokens: torch.Tensor,
                alignment: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        batch = duration_features.shape[0]
        speakers = torch.full((batch,), self.speaker_id, dtype=torch.long, device=duration_features.device)
        style = self.text.speaker_embedding(speakers)
        aligned = duration_features.transpose(-1, -2) @ alignment
        f0, noise = self.text.predictor.F0Ntrain(aligned, style)
        asr = asr_tokens @ alignment
        hidden = self.bridge.forward_hidden(asr, f0, noise, speakers)
        return hidden, f0


class WaveformGraph(nn.Module):
    """Pinned generator forward with its two random arrays supplied explicitly."""

    def __init__(self, generator: nn.Module):
        super().__init__()
        self.generator = generator
        self.stft = ExactTorchSTFT(generator.stft.filter_length, generator.stft.hop_length)

    def harmonic_source(self, f0: torch.Tensor, phase_uniform: torch.Tensor,
                        harmonic_noise: torch.Tensor) -> torch.Tensor:
        """Build the pinned harmonic excitation before its STFT."""
        g = self.generator
        f0_up = g.f0_upsamp(f0[:, None]).transpose(1, 2)
        source = g.m_source
        sinegen = source.l_sin_gen
        harmonic_count = sinegen.harmonic_num + 1
        harmonics = torch.arange(1, harmonic_count + 1, dtype=f0_up.dtype,
                                 device=f0_up.device).reshape(1, 1, harmonic_count)
        rad = (f0_up * harmonics / sinegen.sampling_rate) % 1
        first = rad[:, :1, :] + phase_uniform.unsqueeze(1)
        rad = torch.cat([first, rad[:, 1:, :]], dim=1)
        rad = F.interpolate(rad.transpose(1, 2), scale_factor=1 / sinegen.upsample_scale,
                            mode="linear").transpose(1, 2)
        phase = torch.cumsum(rad, dim=1) * (2.0 * math.pi)
        phase = F.interpolate(phase.transpose(1, 2) * sinegen.upsample_scale,
                              scale_factor=sinegen.upsample_scale, mode="linear").transpose(1, 2)
        sine = torch.sin(phase) * sinegen.sine_amp
        uv = (f0_up > sinegen.voiced_threshold).to(torch.float32)
        noise_amplitude = uv * sinegen.noise_std + (1.0 - uv) * sinegen.sine_amp / 3.0
        sine = sine * uv + noise_amplitude * harmonic_noise
        return source.l_tanh(source.l_linear(sine)).transpose(1, 2).squeeze(1)

    def forward(self, hidden: torch.Tensor, style: torch.Tensor, f0: torch.Tensor,
                phase_uniform: torch.Tensor, harmonic_noise: torch.Tensor) -> torch.Tensor:
        g = self.generator
        harmonic_source = self.harmonic_source(f0, phase_uniform, harmonic_noise)
        magnitude, source_phase = self.stft.transform(harmonic_source)
        source_spec = torch.cat([magnitude, source_phase], dim=1)

        x = hidden
        for i in range(g.num_upsamples):
            x_source = g.noise_convs[i](source_spec)
            x_source = g.noise_res[i](x_source, style)
            x = g.ups[i](F.leaky_relu(x, negative_slope=0.1))
            if i == g.num_upsamples - 1:
                x = g.reflection_pad(x)
            x = x + x_source
            summed = None
            for j in range(g.num_kernels):
                block = g.resblocks[i * g.num_kernels + j]
                value = block(x, style)
                summed = value if summed is None else summed + value
            x = summed / g.num_kernels

        x = F.leaky_relu(x)
        x = g.conv_post(x)
        bins = g.post_n_fft // 2 + 1
        magnitude = torch.exp(x[:, :bins, :])
        output_phase = torch.sin(x[:, bins:, :])
        return self.stft.inverse(magnitude, output_phase).squeeze(1)


class ExportInstanceNorm1d(nn.Module):
    """InstanceNorm1d expressed with reductions for dynamic-channel ONNX export.

    The pinned generator uses input-statistics InstanceNorm1d
    (track_running_stats=False); the checkpoint retains affine parameters only
    for some layers and omits identity affine pairs from the rest. The legacy
    TorchScript ONNX symbolic rejects its dynamic channel dimension even when
    affine tensors bind that dimension. This explicit population-variance form
    preserves both affine and nonaffine inference equations and lets ONNX keep
    channels and frame count dynamic. Complete waveform parity below compares
    it against the untouched upstream native generator.
    """

    def __init__(self, source: nn.InstanceNorm1d):
        super().__init__()
        require(not source.track_running_stats and source.eps == 1e-5,
                "Only pinned input-statistics InstanceNorm is export-qualified")
        require(source.num_features > 0,
                "Pinned InstanceNorm must retain its declared channel count")
        self.eps = float(source.eps)
        self.affine = bool(source.affine)
        self.weight = source.weight if self.affine else None
        self.bias = source.bias if self.affine else None
        if self.affine:
            require(self.weight.dtype == torch.float32 and self.bias.dtype == torch.float32,
                    "Pinned InstanceNorm affine parameters must be FP32")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mean = x.mean(dim=-1, keepdim=True)
        centered = x - mean
        variance = centered.square().mean(dim=-1, keepdim=True)
        normalized = centered * torch.rsqrt(variance + self.eps)
        if self.affine:
            normalized = normalized * self.weight.reshape(1, -1, 1) + self.bias.reshape(1, -1, 1)
        return normalized


def onnx_export_generator(generator: nn.Module) -> nn.Module:
    """Copy the native generator and replace only unsupported norm symbols."""
    exported = copy.deepcopy(generator)
    for parent in exported.modules():
        for name, child in list(parent.named_children()):
            if isinstance(child, nn.InstanceNorm1d):
                setattr(parent, name, ExportInstanceNorm1d(child))
    return exported


class ExactTorchSTFT(nn.Module):
    """ONNX-friendly realization of the pinned torch.stft/torch.istft calls.

    The checkpoint selects TorchSTFT (complex=True), so substituting the
    nearby approximate CustomSTFT would change the model. This module expands
    the same Hann-window DFT/iDFT and PyTorch overlap normalization using
    convolution ops supported by ONNX Runtime Web.
    """

    def __init__(self, n_fft: int, hop_length: int):
        super().__init__()
        require(n_fft % 2 == 0 and 0 < hop_length <= n_fft, "Invalid pinned STFT dimensions")
        window = torch.hann_window(n_fft, periodic=True, dtype=torch.float32)
        bins = n_fft // 2 + 1
        k = torch.arange(bins, dtype=torch.float64).reshape(bins, 1)
        n = torch.arange(n_fft, dtype=torch.float64).reshape(1, n_fft)
        angle = 2.0 * math.pi * k * n / n_fft
        window64 = window.to(torch.float64)
        forward_real = (torch.cos(angle) * window64).to(torch.float32)
        forward_imag = (-torch.sin(angle) * window64).to(torch.float32)
        # For real input, rfft's DC and Nyquist bins have exactly zero
        # imaginary parts. Keep positive zero so torch.angle selects +pi on
        # a negative real value, rather than a signed-zero/roundoff -pi.
        forward_imag[0].zero_()
        forward_imag[-1].zero_()

        scale = torch.full((bins,), 2.0 / n_fft, dtype=torch.float32)
        scale[0] = 1.0 / n_fft
        scale[-1] = 1.0 / n_fft
        inverse_real = (torch.cos(angle) * (window64 * scale.to(torch.float64)[:, None])).to(torch.float32)
        inverse_imag = (torch.sin(angle) * (window64 * scale.to(torch.float64)[:, None])).to(torch.float32)
        inverse_imag[0].zero_()
        inverse_imag[-1].zero_()
        envelope = window.square().reshape(1, 1, n_fft)
        self.n_fft, self.hop_length = n_fft, hop_length
        self.register_buffer("forward_real", forward_real.unsqueeze(1))
        self.register_buffer("forward_imag", forward_imag.unsqueeze(1))
        self.register_buffer("inverse_real", inverse_real.unsqueeze(1))
        self.register_buffer("inverse_imag", inverse_imag.unsqueeze(1))
        self.register_buffer("envelope", envelope)

    @staticmethod
    def _atan2(y: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
        # ONNX has atan but no atan2. Split quadrants while retaining exact
        # signed-axis cases and PyTorch's +pi choice when y=0 and x<0.
        pi = math.pi
        half_pi = math.pi / 2.0
        safe_x = torch.where(x == 0, torch.ones_like(x), x)
        ratio_angle = torch.atan(y / safe_x)
        positive_x = ratio_angle
        negative_x = torch.where(y >= 0, ratio_angle + pi, ratio_angle - pi)
        off_axis = torch.where(x > 0, positive_x, negative_x)
        axis = torch.where(y > 0, torch.full_like(y, half_pi), torch.full_like(y, -half_pi))
        axis = torch.where(y == 0, torch.zeros_like(y), axis)
        result = torch.where(x == 0, axis, off_axis)
        return torch.where((y == 0) & (x < 0), torch.full_like(result, pi), result)

    def transform(self, waveform: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        pad = self.n_fft // 2
        centered = F.pad(waveform.unsqueeze(1), (pad, pad), mode="reflect")
        real = F.conv1d(centered, self.forward_real, stride=self.hop_length)
        imag = F.conv1d(centered, self.forward_imag, stride=self.hop_length)
        imag = torch.cat((torch.zeros_like(imag[:, :1, :]), imag[:, 1:-1, :],
                          torch.zeros_like(imag[:, -1:, :])), dim=1)
        return torch.sqrt(real.square() + imag.square()), self._atan2(imag, real)

    def inverse(self, magnitude: torch.Tensor, phase: torch.Tensor) -> torch.Tensor:
        real = magnitude * torch.cos(phase)
        imag = magnitude * torch.sin(phase)
        numerator = F.conv_transpose1d(real, self.inverse_real, stride=self.hop_length)
        numerator = numerator - F.conv_transpose1d(imag, self.inverse_imag, stride=self.hop_length)
        envelope = F.conv_transpose1d(torch.ones_like(magnitude[:, :1, :]), self.envelope,
                                      stride=self.hop_length)
        pad = self.n_fft // 2
        numerator = numerator[..., pad:-pad]
        envelope = envelope[..., pad:-pad]
        return numerator / envelope


def alignment_from_durations(durations: torch.Tensor) -> tuple[torch.Tensor, int]:
    values = durations.detach().cpu().reshape(-1)
    rounded = torch.round(values).clamp(min=1).to(torch.int64)
    if int(rounded.sum()) < 2:
        rounded[0] += 1
    frames = int(rounded.sum())
    require(2 <= frames <= MAX_FRAMES, "Pinned Mini duration exceeds the native 1200-frame cap")
    token_count = rounded.numel()
    alignment = torch.zeros((1, token_count, frames), dtype=torch.float32)
    offset = 0
    for token, count in enumerate(rounded.tolist()):
        alignment[0, token, offset:offset + count] = 1.0
        offset += count
    require(offset == frames, "Internal duration alignment construction failed")
    return alignment, frames


def collect_assets(source_dir: Path, output_dir: Path) -> dict:
    model_dir = source_dir / Path(LOCK["checkpoint"]["path"]).parent
    code_dir = model_dir / "code"
    sys.path.insert(0, str(code_dir))
    import native_mini_inference

    torch.set_num_threads(1)
    model = native_mini_inference.load_export(model_dir, device="cpu", allow_cuda=False, fast=False)
    require(model.text_kind == "native33", "Pinned Mini checkpoint text architecture is not native33")
    parameter_count = sum(parameter.numel() for parameter in model.parameters())
    require(parameter_count == 34_310_790, "Pinned Mini core parameter count differs")
    require(model.max_frames == MAX_FRAMES, "Pinned Mini frame cap differs")
    require(model.vocab and len(model.vocab) <= 177, "Pinned Mini phoneme vocabulary is invalid")
    project_commit = os.environ.get("INFLECT_MINI_SOURCE_COMMIT")
    if not project_commit:
        project_commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
            capture_output=True, text=True,
        ).stdout.strip()
    require(len(project_commit) == 40 and all(char in "0123456789abcdef" for char in project_commit),
            "The exporter source commit must be a full lowercase Git SHA-1.")

    ids = torch.tensor([model.phoneme_ids("həˈloʊ.")], dtype=torch.long)
    text_graph = TextDurationGraph(model.text, SPEAKER_ID).eval()
    with torch.inference_mode():
        durations, duration_features, asr_tokens = text_graph(ids)
    alignment, frames = alignment_from_durations(durations)
    bridge_graph = TextBridgeGraph(model, SPEAKER_ID).eval()
    with torch.inference_mode():
        hidden, f0 = bridge_graph(duration_features, asr_tokens, alignment)

    generator = model.generator
    # load_export installs CPU-canonical wrappers; the original modules have the
    # same CPU arithmetic and export cleanly without those Python closures.
    generator.m_source.forward = type(generator.m_source).forward.__get__(
        generator.m_source, type(generator.m_source))
    generator.f0_upsamp.forward = type(generator.f0_upsamp).forward.__get__(generator.f0_upsamp, type(generator.f0_upsamp))
    generator.stft.transform = type(generator.stft).transform.__get__(generator.stft, type(generator.stft))
    waveform_graph = WaveformGraph(onnx_export_generator(generator)).eval()

    if output_dir.exists() and any(output_dir.iterdir()):
        raise RuntimeError("Refusing to overwrite a nonempty ONNX output directory")
    output_dir.mkdir(parents=True, exist_ok=True)
    duration_path = output_dir / "text-duration.onnx"
    bridge_path = output_dir / "text-bridge.onnx"
    waveform_path = output_dir / "waveform-generator.onnx"
    style_path = output_dir / "cassidy-style-table.f32"
    vocab_path = output_dir / "phoneme-vocab.json"

    export_graph(
        text_graph,
        (ids,),
        duration_path,
        input_names=["ids"],
        output_names=["durations", "duration_features", "asr_tokens"],
        dynamic_axes={
            "ids": {1: "tokens"},
            "durations": {1: "tokens"},
            "duration_features": {1: "tokens"},
            "asr_tokens": {2: "tokens"},
        },
    )
    export_graph(
        bridge_graph,
        (duration_features, asr_tokens, alignment),
        bridge_path,
        input_names=["duration_features", "asr_tokens", "alignment"],
        output_names=["hidden", "f0"],
        dynamic_axes={
            "duration_features": {1: "tokens"},
            "asr_tokens": {2: "tokens"},
            "alignment": {1: "tokens", 2: "frames"},
            "hidden": {2: "expanded_frames"},
            "f0": {1: "f0_frames"},
        },
    )

    # Random source excitation is an explicit graph input. This keeps the
    # browser run deterministic with its seeded PRNG instead of an unseedable
    # ONNX RandomNormal operator. The exporter parity below supplies Torch's
    # own random arrays and verifies the unchanged official waveform path.
    phase = torch.zeros((1, generator.m_source.l_sin_gen.harmonic_num + 1), dtype=torch.float32)
    harmonic_noise = torch.zeros((1, 600 * frames, phase.shape[1]), dtype=torch.float32)
    with model._affines(VOICE):
        export_graph(
            waveform_graph,
            (hidden, torch.zeros((1, 128), dtype=torch.float32), f0, phase, harmonic_noise),
            waveform_path,
            input_names=["hidden", "style", "f0", "phase_uniform", "harmonic_noise"],
            output_names=["waveform"],
            dynamic_axes={
                "hidden": {2: "expanded_frames"},
                "f0": {1: "f0_frames"},
                "harmonic_noise": {1: "samples"},
                "waveform": {1: "samples"},
            },
        )

    voice_index = SPEAKER_ID
    donor = native_mini_inference.DONORS[voice_index]
    style_rows = model.styles["banks"][donor] + model.styles["offsets"][voice_index][None, :] * model.styles["strengths"][voice_index]
    require(style_rows.shape == (510, 128) and bool(torch.isfinite(style_rows).all()), "Cassidy style table is invalid")
    style_path.write_bytes(style_rows.detach().cpu().numpy().astype("<f4", copy=False).tobytes())
    require(all(isinstance(symbol, str) and len(symbol) == 1 and type(index) is int
                and 0 < index < 178 for symbol, index in model.vocab.items()), "Mini symbol-to-id vocabulary is invalid")
    require(len(set(model.vocab.values())) == len(model.vocab), "Mini phoneme ids are not unique")
    vocab_path.write_text(json.dumps(model.vocab, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

    # Compare each graph stage and a complete seeded utterance against the
    # pinned native Python inference. No output is used as benchmark evidence.
    duration_session = ort.InferenceSession(str(duration_path), providers=["CPUExecutionProvider"])
    bridge_session = ort.InferenceSession(str(bridge_path), providers=["CPUExecutionProvider"])
    waveform_session = ort.InferenceSession(str(waveform_path), providers=["CPUExecutionProvider"])
    ids_np = ids.numpy()
    duration_onnx, features_onnx, asr_onnx = duration_session.run(None, {"ids": ids_np})
    speaker = torch.tensor([SPEAKER_ID], dtype=torch.long)
    lengths = torch.tensor([ids.shape[1]], dtype=torch.long)
    with torch.inference_mode():
        native_durations, _, _, native_asr = model.text(ids, lengths, speaker_ids=speaker)
    require(np.allclose(duration_onnx, native_durations.numpy(), rtol=2e-4, atol=2e-5),
            "ONNX text durations diverge from native Mini")
    require(np.allclose(asr_onnx, native_asr.numpy(), rtol=2e-4, atol=2e-5),
            "ONNX text features diverge from native Mini")

    alignment, frames = alignment_from_durations(torch.from_numpy(duration_onnx))
    hidden_onnx, f0_onnx = bridge_session.run(None, {
        "duration_features": features_onnx,
        "asr_tokens": asr_onnx,
        "alignment": alignment.numpy(),
    })
    with torch.inference_mode():
        predicted = model.text.infer(ids, lengths, speaker_ids=speaker, speed=1.0)
        asr = predicted["asr"]
        native_hidden = model.bridge.forward_hidden(asr, predicted["F0"], predicted["N"], speaker)
    require(np.allclose(f0_onnx, predicted["F0"].numpy(), rtol=4e-4, atol=4e-5),
            "ONNX prosody diverges from native Mini")
    require(np.allclose(hidden_onnx, native_hidden.numpy(), rtol=6e-4, atol=6e-5),
            "ONNX bridge diverges from native Mini")

    style = style_rows[ids.shape[1] - 3][None, :].detach().cpu().numpy().astype(np.float32)
    with torch.random.fork_rng(devices=[]):
        torch.random.default_generator.manual_seed(42)
        phase_torch = torch.rand((1, phase.shape[1]), dtype=torch.float32)
        phase_torch[:, 0] = 0
        noise_torch = torch.randn((1, 600 * frames, phase.shape[1]), dtype=torch.float32)
    f0_up_native = generator.f0_upsamp(predicted["F0"][:, None]).transpose(1, 2)
    with fixed_source_randomness(phase_torch, noise_torch):
        native_harmonic, _, _ = generator.m_source(f0_up_native)
    native_harmonic = native_harmonic.transpose(1, 2).squeeze(1)
    exported_harmonic = waveform_graph.harmonic_source(predicted["F0"], phase_torch, noise_torch)
    harmonic_max_error = float((exported_harmonic - native_harmonic).abs().max())
    harmonic_rms_error = float(torch.sqrt((exported_harmonic - native_harmonic).square().mean()))
    require(harmonic_max_error <= 1e-7 and harmonic_rms_error <= 1e-8,
            "Explicit harmonic source differs from native Mini: max=" + str(harmonic_max_error)
            + " rms=" + str(harmonic_rms_error))
    native_magnitude, native_phase = generator.stft.transform(native_harmonic)
    exported_magnitude, exported_phase = waveform_graph.stft.transform(exported_harmonic)
    stft_magnitude_max_error = float((exported_magnitude - native_magnitude).abs().max())
    stft_magnitude_rms_error = float(torch.sqrt((exported_magnitude - native_magnitude).square().mean()))
    phase_delta = torch.remainder(exported_phase - native_phase + math.pi, 2.0 * math.pi) - math.pi
    phase_mask = native_magnitude > max(1e-7, float(native_magnitude.max()) * 1e-6)
    stft_phase_max_error = float(phase_delta[phase_mask].abs().max())
    stft_phase_rms_error = float(torch.sqrt(phase_delta[phase_mask].square().mean()))
    require(stft_magnitude_max_error <= 2e-5 and stft_magnitude_rms_error <= 3e-6,
            "Explicit STFT magnitude differs from native Mini: max=" + str(stft_magnitude_max_error)
            + " rms=" + str(stft_magnitude_rms_error))
    require(stft_phase_max_error <= 2e-4 and stft_phase_rms_error <= 2e-5,
            "Explicit STFT phase differs from native Mini: max=" + str(stft_phase_max_error)
            + " rms=" + str(stft_phase_rms_error))
    require(bool(torch.count_nonzero(waveform_graph.stft.forward_imag[[0, -1]]) == 0)
            and bool(torch.count_nonzero(waveform_graph.stft.inverse_imag[[0, -1]]) == 0)
            and not bool(torch.signbit(waveform_graph.stft.forward_imag[[0, -1]]).any())
            and not bool(torch.signbit(waveform_graph.stft.inverse_imag[[0, -1]]).any()),
            "Real-input DC/Nyquist imaginary basis must be exact positive zero")
    waveform_onnx = waveform_session.run(None, {
        "hidden": hidden_onnx,
        "style": style,
        "f0": f0_onnx,
        "phase_uniform": phase_torch.numpy(),
        "harmonic_noise": noise_torch.numpy(),
    })[0]
    with fixed_source_randomness(phase_torch, noise_torch):
        native = model.synthesize_ids(model.phoneme_ids("həˈloʊ."), VOICE, seed=42)
    require(waveform_onnx.shape == (1, 600 * frames), "ONNX waveform clock differs")
    require(np.isfinite(waveform_onnx).all() and np.max(np.abs(waveform_onnx)) < 1,
            "ONNX waveform is nonfinite or clipped")
    waveform_max_error = float(np.max(np.abs(waveform_onnx[0] - native["audio"].numpy())))
    waveform_rms_error = float(np.sqrt(np.mean((waveform_onnx[0] - native["audio"].numpy()) ** 2)))
    require(waveform_max_error <= 2e-3 and waveform_rms_error <= 2e-4,
            "ONNX waveform diverges from native Mini: max=" + str(waveform_max_error)
            + " rms=" + str(waveform_rms_error))

    # Exercise genuinely dynamic token and frame axes as well as the export
    # trace shape. A repeated valid vowel sequence is not used as audio evidence.
    dynamic_ids = torch.tensor([model.phoneme_ids("a" * 24)], dtype=torch.long)
    dynamic_outputs = duration_session.run(None, {"ids": dynamic_ids.numpy()})
    dynamic_native = model.text(dynamic_ids, torch.tensor([dynamic_ids.shape[1]], dtype=torch.long),
                                speaker_ids=speaker)
    require(dynamic_outputs[0].shape == (1, dynamic_ids.shape[1])
            and np.allclose(dynamic_outputs[0], dynamic_native[0].numpy(), rtol=2e-4, atol=2e-5),
            "Dynamic ONNX token axis diverges from native Mini")
    dynamic_alignment, dynamic_frames = alignment_from_durations(torch.from_numpy(dynamic_outputs[0]))
    dynamic_hidden, dynamic_f0 = bridge_session.run(None, {
        "duration_features": dynamic_outputs[1],
        "asr_tokens": dynamic_outputs[2],
        "alignment": dynamic_alignment.numpy(),
    })
    with torch.inference_mode():
        dynamic_native_infer = model.text.infer(
            dynamic_ids, torch.tensor([dynamic_ids.shape[1]], dtype=torch.long), speaker_ids=speaker, speed=1.0)
        dynamic_asr = dynamic_native_infer["asr"]
        dynamic_native_hidden = model.bridge.forward_hidden(
            dynamic_asr, dynamic_native_infer["F0"], dynamic_native_infer["N"], speaker)
    require(dynamic_hidden.shape == (1, 512, 2 * dynamic_frames)
            and np.allclose(dynamic_hidden, dynamic_native_hidden.numpy(), rtol=6e-4, atol=6e-5),
            "Dynamic ONNX frame axis diverges from native Mini")
    dynamic_style = style_rows[dynamic_ids.shape[1] - 3][None].detach().cpu().numpy().astype(np.float32)
    require(dynamic_frames != frames, "Dynamic waveform parity must exercise a distinct frame count")
    with torch.random.fork_rng(devices=[]):
        torch.random.default_generator.manual_seed(43)
        dynamic_phase = torch.rand((1, phase.shape[1]), dtype=torch.float32)
        dynamic_phase[:, 0] = 0
        dynamic_noise = torch.randn((1, 600 * dynamic_frames, phase.shape[1]), dtype=torch.float32)
    dynamic_excitation = waveform_session.run(None, {
        "hidden": dynamic_hidden,
        "style": dynamic_style,
        "f0": dynamic_f0,
        "phase_uniform": dynamic_phase.numpy(),
        "harmonic_noise": dynamic_noise.numpy(),
    })[0]
    require(dynamic_excitation.shape == (1, 600 * dynamic_frames)
            and np.isfinite(dynamic_excitation).all(), "Dynamic waveform graph clock is invalid")
    require(np.allclose(dynamic_f0, dynamic_native_infer["F0"].numpy(), rtol=4e-4, atol=4e-5),
            "Dynamic ONNX prosody diverges from native Mini")
    with fixed_source_randomness(dynamic_phase, dynamic_noise):
        dynamic_native = model.synthesize_ids(model.phoneme_ids("a" * 24), VOICE, seed=43)
    dynamic_waveform_max_error = float(np.max(np.abs(
        dynamic_excitation[0] - dynamic_native["audio"].numpy())))
    dynamic_waveform_rms_error = float(np.sqrt(np.mean(
        (dynamic_excitation[0] - dynamic_native["audio"].numpy()) ** 2)))
    require(dynamic_waveform_max_error <= 2e-3 and dynamic_waveform_rms_error <= 2e-4,
            "Dynamic ONNX waveform diverges from native Mini: max="
            + str(dynamic_waveform_max_error) + " rms=" + str(dynamic_waveform_rms_error))

    files = []
    for path in (duration_path, bridge_path, waveform_path, style_path, vocab_path):
        files.append({"path": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)})

    # Preserve the active owner grant and the exact upstream Kokoro/StyleTTS2
    # license texts next to the generated model graphs.
    provenance_files = []
    for relative in LOCK["provenanceFiles"]:
        source_path = source_dir / relative
        target_path = output_dir / "upstream" / relative
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, target_path)
        provenance_files.append({
            "path": "upstream/" + relative,
            "bytes": target_path.stat().st_size,
            "sha256": sha256_file(target_path),
            "sourcePath": relative,
        })

    report = {
        "format": "inflect-mini-v3-browser-onnx-v1",
        "model": LOCK["model"],
        "modelRevision": LOCK["modelRevision"],
        "projectSourceCommit": project_commit,
        "sourceCheckpoint": LOCK["checkpoint"],
        "parameterCount": parameter_count,
        "voice": VOICE,
        "speakerId": SPEAKER_ID,
        "sampleRate": 24000,
        "precision": "FP32 ONNX",
        "textArchitecture": model.text_kind,
        "framesPerTokenClock": 600,
        "maxPhonemes": 510,
        "maxFrames": MAX_FRAMES,
        "seededExcitation": "Explicit uniform/normal graph inputs; browser uses seeded Mulberry32 + Box-Muller, not PyTorch bitwise RNG parity.",
        "normalization": {
            "layer": "InstanceNorm1d",
            "inputShape": "[batch, channels, time]",
            "reductionAxis": -1,
            "variance": "biased population variance: mean((x - mean)^2)",
            "epsilon": 1e-5,
            "dtype": "FP32 input, FP32 reductions and affine parameters",
            "affine": "Use checkpoint-retained gain/bias; omitted identity pairs remain nonaffine",
        },
        "runtime": {"torch": torch.__version__, "onnx": onnx.__version__, "onnxruntime": ort.__version__, "opset": OPSET},
        "provenanceFiles": provenance_files,
        "verification": {
            "reference": "Pinned NativeMini CPU inference at two token/frame lengths with seeded excitation; exporter verification only, not benchmark evidence.",
            "waveformFrames": frames,
            "waveformSamples": 600 * frames,
            "harmonicSourceMaxAbsError": harmonic_max_error,
            "harmonicSourceRmsError": harmonic_rms_error,
            "stftMagnitudeMaxAbsError": stft_magnitude_max_error,
            "stftMagnitudeRmsError": stft_magnitude_rms_error,
            "stftPhaseMaxAbsError": stft_phase_max_error,
            "stftPhaseRmsError": stft_phase_rms_error,
            "waveformMaxAbsError": waveform_max_error,
            "waveformRmsError": waveform_rms_error,
            "dynamicWaveformMaxAbsError": dynamic_waveform_max_error,
            "dynamicWaveformRmsError": dynamic_waveform_rms_error,
            "dynamicTokenIds": int(dynamic_ids.shape[1]),
            "dynamicFrames": int(dynamic_frames),
            "dynamicWaveformSamples": int(dynamic_excitation.shape[1]),
            "clipped": False,
        },
        "files": files,
    }
    (output_dir / "BUILD-MANIFEST.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True))
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=SOURCE)
    parser.add_argument("--download", action="store_true", help="Fetch only the pinned source-file allowlist")
    args = parser.parse_args()
    source_dir = args.source_dir.resolve()
    if args.download or not source_dir.is_dir():
        download_pinned_source(source_dir)
    verify_source(source_dir)
    collect_assets(source_dir, OUTPUT)


if __name__ == "__main__":
    main()
