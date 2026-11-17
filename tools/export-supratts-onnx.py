#!/usr/bin/env python3
"""Convert the pinned SupraTTS checkpoint into dynamic FP32 browser ONNX graphs.

This is an export step only. The generated ONNX models are executed and scored
inside headed Google Chrome by ONNX Runtime Web; this script does not synthesize
speech or create benchmark results.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import urllib.request

import onnx
import torch
import torch.nn as nn
import torch.nn.functional as F


ROOT = Path(__file__).resolve().parents[1]
CONVERSION_LOCK = json.loads((ROOT / "tools" / "supratts-conversion.lock.json").read_text(encoding="utf-8"))
MODEL_ID = CONVERSION_LOCK["model"]
REVISION = CONVERSION_LOCK["modelRevision"]
CACHE = ROOT / ".cache" / "supratts-conversion-sources"
OUTPUT = ROOT / ".cache" / "supratts-onnx"
OPSET = CONVERSION_LOCK["opset"]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verified_source(asset: dict) -> Path:
    path = CACHE / asset["path"]
    if not path.is_file():
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(asset["url"], headers={"User-Agent": "tts-bench-supratts-export/1"})
        with urllib.request.urlopen(request, timeout=180) as response:
            data = response.read()
        if len(data) != asset["bytes"] or sha256(data) != asset["sha256"]:
            raise RuntimeError("Pinned conversion source failed size/hash validation: " + asset["id"])
        path.write_bytes(data)
    data = path.read_bytes()
    if len(data) != asset["bytes"] or sha256(data) != asset["sha256"]:
        raise RuntimeError("Cached conversion source failed size/hash validation: " + asset["id"])
    return path


class DurationGraph(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, ids, features):
        model = self.model
        x = model.embed(ids).transpose(0, 1).unsqueeze(0)
        x = model.proj(torch.cat((x, features.unsqueeze(0)), dim=1))
        for (c0, c1), scale in zip(model.blocks, model.scales):
            h = F.silu(c0(x))
            h = c1(h)
            x = x + scale * h
        return model.out(x).squeeze(0).squeeze(0)


class AcousticTokenGraph(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, ids, features):
        model = self.model
        x = model.embed(ids).transpose(0, 1).unsqueeze(0)
        x = model.tproj(torch.cat((x, features.unsqueeze(0)), dim=1))
        for (c0, c1), scale in zip(model.token_blocks, model.token_scales):
            h = F.silu(c0(x))
            h = c1(h)
            x = x + scale * h
        return x.squeeze(0)


class AcousticFrameGraph(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, hidden, features):
        model = self.model
        x = model.fproj(torch.cat((hidden, features), dim=0).unsqueeze(0))
        for (c0, c1), scale in zip(model.frame_blocks, model.frame_scales):
            h = F.silu(c0(x))
            h = c1(h)
            x = x + scale * h
        return model.out(x).squeeze(0)


class DecoderGraph(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, mel, noise):
        model = self.model
        x = model.embed(mel.unsqueeze(0)) + model.noise_adapter(noise.unsqueeze(0))
        x = model.norm(x.transpose(1, 2)).transpose(1, 2)
        for block in model.blocks:
            h = block.dw(x).transpose(1, 2)
            h = block.norm(h)
            h = F.gelu(block.pw0(h))
            h = block.pw1(h)
            h = h.transpose(1, 2) * block.gamma.reshape(1, -1, 1)
            x = x + h
        x = model.fnorm(x.transpose(1, 2))
        out = model.head(x).transpose(1, 2).squeeze(0)
        mag = torch.exp(out[:model.bins])
        # Match the upstream decoder's zero DC and Nyquist magnitudes.
        mask = torch.ones_like(mag)
        mask[0] = 0.0
        mask[-1] = 0.0
        mag = torch.clamp(mag * mask, max=1e2)
        phase = out[model.bins:]
        return mag.unsqueeze(-1) * torch.stack((torch.cos(phase), torch.sin(phase)), dim=-1)


def export(model, args, path, *, input_names, output_names, dynamic_axes):
    torch.onnx.export(
        model,
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    source_assets = {asset["id"]: asset for asset in CONVERSION_LOCK["sources"]}
    required = ["duration", "acoustic", "decoder", "config", "models-source"]
    missing = [asset_id for asset_id in required if asset_id not in source_assets]
    if missing:
        raise RuntimeError("Missing pinned conversion sources: " + ", ".join(missing))
    staged = {asset_id: verified_source(source_assets[asset_id]) for asset_id in required}
    module_path = staged["models-source"]
    spec = importlib.util.spec_from_file_location("supratts_official_models", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load pinned upstream microtts/models.py.")
    upstream = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = upstream
    spec.loader.exec_module(upstream)

    cfg = json.loads(staged["config"].read_text(encoding="utf-8"))
    dims = cfg["architecture_dims"]
    duration = upstream.DurationStudent(
        hidden=dims["duration_hidden"], depth=dims["duration_depth"]
    ).eval()
    acoustic = upstream.AcousticStudent(
        hidden=dims["acoustic_hidden"],
        depth=dims["acoustic_depth"],
        token_depth=dims["acoustic_token_depth"],
    ).eval()
    decoder = upstream.DecoderStudent(
        dim=dims["decoder_dim"],
        pw_hidden=dims["decoder_pw"],
        blocks=dims["decoder_blocks"],
    ).eval()
    for module, asset_id in [
        (duration, "duration"),
        (acoustic, "acoustic"),
        (decoder, "decoder"),
    ]:
        state = torch.load(staged[asset_id], map_location="cpu", weights_only=True)
        module.load_state_dict(state, strict=True)

    args.output.mkdir(parents=True, exist_ok=True)
    duration_path = args.output / "duration.onnx"
    token_path = args.output / "acoustic-token.onnx"
    frame_path = args.output / "acoustic-frame.onnx"
    decoder_path = args.output / "decoder.onnx"

    token_count = 9
    frame_count = 24
    duration_graph = DurationGraph(duration)
    acoustic_token_graph = AcousticTokenGraph(acoustic)
    acoustic_frame_graph = AcousticFrameGraph(acoustic)
    decoder_graph = DecoderGraph(decoder)
    with torch.inference_mode():
        export(
            duration_graph,
            (torch.tensor([1, 13, 14, 2, 3, 15, 16, 17, 2], dtype=torch.long), torch.zeros(3, token_count)),
            duration_path,
            input_names=["ids", "features"],
            output_names=["log_duration"],
            dynamic_axes={"ids": {0: "tokens"}, "features": {1: "tokens"}, "log_duration": {0: "tokens"}},
        )
        export(
            acoustic_token_graph,
            (torch.tensor([1, 13, 14, 2, 3, 15, 16, 17, 2], dtype=torch.long), torch.zeros(2, token_count)),
            token_path,
            input_names=["ids", "features"],
            output_names=["hidden"],
            dynamic_axes={"ids": {0: "tokens"}, "features": {1: "tokens"}, "hidden": {1: "tokens"}},
        )
        export(
            acoustic_frame_graph,
            (torch.zeros(dims["acoustic_hidden"], frame_count), torch.zeros(3, frame_count)),
            frame_path,
            input_names=["hidden", "features"],
            output_names=["mel"],
            dynamic_axes={"hidden": {1: "frames"}, "features": {1: "frames"}, "mel": {1: "frames"}},
        )
        export(
            decoder_graph,
            (torch.zeros(dims["n_mels"], frame_count), torch.zeros(dims["noise_channels"], frame_count)),
            decoder_path,
            input_names=["mel", "noise"],
            output_names=["spectrum"],
            dynamic_axes={"mel": {1: "frames"}, "noise": {1: "frames"}, "spectrum": {1: "frames"}},
        )

    outputs = []
    for path in [duration_path, token_path, frame_path, decoder_path]:
        data = path.read_bytes()
        outputs.append({"file": path.name, "bytes": len(data), "sha256": sha256(data)})
    manifest = {
        "model": MODEL_ID,
        "modelRevision": REVISION,
        "opset": OPSET,
        "torch": torch.__version__,
        "onnx": onnx.__version__,
        "sourceFiles": {
            asset_id: {"path": source_assets[asset_id]["path"], "bytes": source_assets[asset_id]["bytes"], "sha256": source_assets[asset_id]["sha256"]}
            for asset_id in source_assets
        },
        "graphs": outputs,
    }
    (args.output / "conversion.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
