"""Export Atom's pinned FP32 acoustic core, preserving its duration regulator."""
import argparse
import hashlib
import importlib.util
import json
import shutil
import sys
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import onnx
import onnxruntime as ort
import torch

REPOSITORY = "owensong/Inflect-Atom-v3"
REVISION = "6d517b3580e0167556148770760bbbb6a8870b99"
CHECKPOINT_SHA256 = "aad761146483f24f2669223e54bc66db6cfb869da9a4f2fdc969b7e03f9f8e96"


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def download(name, destination):
    url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}"
    data = urlopen(url, timeout=90).read()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return data


class Encoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, ids, speaker):
        # The public browser API accepts one unpadded sequence at a time.
        x = self.model.phoneme(ids) + self.model.speaker_projection(self.model.speaker(speaker))[:, None, :]
        for conv_norm, ffn_norm in zip(self.model.encoder_norms, self.model.encoder_ffn_norms):
            x = x + self.model.encoder_conv(conv_norm(x))
            x = x + self.model.encoder_ffn(ffn_norm(x))
        # A single full-length utterance needs neither sorting nor packed padding.
        x, _ = self.model.encoder_gru(x)
        encoded = self.model.gru_projection(x)
        log_duration = self.model.duration_predictor(encoded).squeeze(-1).clamp(-4.0, 8.0)
        pitch = self.model.pitch_predictor(encoded).squeeze(-1)
        durations = torch.round((torch.exp(log_duration) - 1.0).clamp_min(1.0)).long()
        return encoded, durations, pitch


class Decoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, encoded, durations, pitch, frame_positions):
        # Host-supplied arange avoids freezing a data-dependent frame count.
        ends = durations.cumsum(dim=1)
        centers = ends - 0.5 * durations
        sigma = self.model.regulator_sigma.abs().clamp_min(0.1)
        logits = -0.5 * ((frame_positions[None, :, None] + 0.5 - centers[:, None, :]) / sigma) ** 2
        valid = durations[:, None, :] > 0
        logits = logits.masked_fill(~valid, torch.finfo(torch.float32).min)
        weights = torch.softmax(logits, dim=-1) * valid.float()
        weights = weights / weights.sum(dim=-1, keepdim=True).clamp_min(torch.finfo(torch.float32).eps)
        expanded = torch.bmm(weights, encoded)
        pitch_frames = torch.bmm(weights, pitch.unsqueeze(-1)).squeeze(-1)
        mask = torch.ones_like(frame_positions, dtype=torch.bool)[None, :]
        for index, layer in enumerate(self.model.decoder_layers):
            expanded = layer(expanded, self.model.decoder_ffns[index % 3], mask)
        return (
            self.model.frame_pitch(expanded).squeeze(-1) + pitch_frames,
            self.model.frame_voiced(expanded).squeeze(-1),
            self.model.harmonic_head(expanded),
            self.model.noise_head(expanded),
        )


def main(output):
    torch.set_num_threads(1)
    output.mkdir(parents=True, exist_ok=True)
    upstream = output / "upstream"
    upstream.mkdir(exist_ok=True)
    manifest = json.loads(download("manifest.json", upstream / "manifest.json"))
    names = [
        "export.pt", "vocab.json", "atom_dsp_model_20261024.py",
        "atom_runtime_20261024.py", "atom_text_frontend_20261024.py",
        "LICENSE.md", "LICENSE_SCOPE.json", "LICENSING.md", "THIRD_PARTY_NOTICES.md",
    ]
    for name in names:
        data = download(name, upstream / name)
        expected = manifest["files"][name]
        assert len(data) == expected["size"] and hashlib.sha256(data).hexdigest() == expected["sha256"], name
    assert hashlib.sha256((upstream / "export.pt").read_bytes()).hexdigest() == CHECKPOINT_SHA256
    sys.path.insert(0, str(upstream))
    from atom_runtime_20261024 import AtomRuntime
    from atom_text_frontend_20261024 import make_espeak_light

    frontend = make_espeak_light()
    runtime = AtomRuntime(upstream / "export.pt", upstream / "vocab.json", g2p=frontend)
    model = runtime.model.eval()
    assert model.parameter_count == 157190
    encoder = Encoder(model).eval()
    decoder = Decoder(model).eval()
    fixture_root = Path(__file__).resolve().parents[2] / "fixtures"
    article = (fixture_root / "en-20000.txt").read_text()
    spans = json.loads((fixture_root / "en-20000.chunks.json").read_text())["chunks"]
    frontend_cases = []
    for span in spans:
        text = article[span["start"]:span["end"]]
        normalized = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
        phones, _ = frontend(normalized)
        assert phones and len(phones) <= 510
        frontend_cases.append({"id": len(frontend_cases), "text": text, "frontendText": normalized, "phonemes": phones})
    write_json(output / "frontend-parity.json", frontend_cases)
    unknown = [{**case, "unknown": sorted(set(case["phonemes"]) - set(runtime.vocab))} for case in frontend_cases if set(case["phonemes"]) - set(runtime.vocab)]
    write_json(output / "frontend-unknown.json", unknown)
    assert not unknown, f"Official espeak-light frontend emits unsupported phones: {[(case['id'], case['unknown']) for case in unknown]}"
    ids = torch.tensor([[0, *[runtime.vocab[p] for p in frontend_cases[0]["phonemes"]], 0]], dtype=torch.long)
    speaker = torch.tensor([2], dtype=torch.long)  # Official Cassidy preset.
    with torch.inference_mode():
        encoded, durations, pitch = encoder(ids, speaker)
        frames = int(durations.sum())
        frame_positions = torch.arange(frames, dtype=torch.float32)
        torch.onnx.export(
            encoder, (ids, speaker), output / "encoder.onnx", opset_version=17,
            input_names=["ids", "speaker"], output_names=["encoded", "durations", "pitch"],
            dynamic_axes={"ids": {1: "tokens"}, "encoded": {1: "tokens"}, "durations": {1: "tokens"}, "pitch": {1: "tokens"}},
            dynamo=False,
        )
        torch.onnx.export(
            decoder, (encoded, durations.float(), pitch, frame_positions), output / "decoder.onnx", opset_version=17,
            input_names=["encoded", "durations", "pitch", "frames"],
            output_names=["f0_norm", "voiced_logits", "harmonic_log", "noise_log"],
            dynamic_axes={"encoded": {1: "tokens"}, "durations": {1: "tokens"}, "pitch": {1: "tokens"}, "frames": {0: "frames"}, **{name: {1: "frames"} for name in ["f0_norm", "voiced_logits", "harmonic_log", "noise_log"]}},
            dynamo=False,
        )
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    sessions = {name: ort.InferenceSession(str(output / f"{name}.onnx"), sess_options=options, providers=["CPUExecutionProvider"]) for name in ("encoder", "decoder")}
    for name in sessions:
        onnx.checker.check_model(str(output / f"{name}.onnx"))
    records = []
    with torch.inference_mode():
        for item in frontend_cases:
            ids = torch.tensor([[0, *[runtime.vocab[p] for p in item["phonemes"]], 0]], dtype=torch.long)
            lengths = torch.tensor([ids.shape[1]], dtype=torch.long)
            reference = model.predict(ids, lengths, speaker, max_frames=4096)
            encoded, durations, pitch = sessions["encoder"].run(None, {"ids": ids.numpy(), "speaker": speaker.numpy()})
            frames = int(durations.sum())
            native_frames = int(reference["frame_lengths"][0])
            native_duration = torch.round(torch.expm1(reference["log_duration"]).clamp_min(1.0)).long().numpy()
            differences = [{"token": i, "native": int(a), "onnx": int(b)} for i, (a, b) in enumerate(zip(native_duration[0], durations[0])) if a != b]
            assert max([abs(x["native"] - x["onnx"]) for x in differences] or [0]) <= 1
            assert abs(frames - native_frames) <= 1, (item["id"], frames, native_frames, differences)
            assert frames <= 4096
            # A float32 duration exactly near x.5 can round differently across
            # kernels. Preserve actual export durations; compare the continuous
            # decoder against the original architecture at these same durations.
            reference = model.predict(ids, lengths, speaker, durations=torch.from_numpy(durations), max_frames=4096)
            actual = sessions["decoder"].run(None, {"encoded": encoded, "durations": durations.astype(np.float32), "pitch": pitch, "frames": np.arange(frames, dtype=np.float32)})
            errors = {}
            for name, value in zip(["f0_norm", "voiced_logits", "harmonic_log", "noise_log"], actual):
                expected = reference[name].numpy()
                np.testing.assert_allclose(value, expected, rtol=2e-4, atol=2e-4, err_msg=f"span {item['id']} {name}")
                errors[name] = float(np.max(np.abs(value - expected)))
            records.append({"span": item["id"], "tokens": ids.shape[1], "frames": frames, "nativeFrames": native_frames, "durationRoundingDifferences": differences, "maxAbsoluteError": errors})
            if item["id"] == 0:
                features = {name: torch.from_numpy(value) for name, value in zip(["f0_norm", "voiced_logits", "harmonic_log", "noise_log"], actual)}
                features["speaker_ids"] = speaker
                torch.manual_seed(7717)
                noise = torch.randn(1, frames * 300)
                wave = model.synthesize(features, noise=noise)
                for name, value in {**features, "noise": noise, "wave": wave}.items():
                    value.numpy().astype("<f4").tofile(output / f"parity-{name}.f32")
                write_json(output / "dsp-parity.json", {"frames": frames, "samples": frames * 300, "speaker": 2})
    write_json(output / "dsp.json", {"sampleRate": 24000, "hop": 300, "fftSize": 1024, "harmonics": 80, "harmonicBands": 40, "noiseBands": 24, **{name: getattr(model, name).detach().tolist() for name in ("theta", "fir", "f0_mean", "f0_std")}})
    shutil.copyfile(upstream / "vocab.json", output / "vocab.json")
    write_json(output / "export-evidence.json", {"model": REPOSITORY, "revision": REVISION, "checkpointSha256": CHECKPOINT_SHA256, "parameters": 157190, "torch": torch.__version__, "onnx": onnx.__version__, "onnxruntime": ort.__version__, "frontend": frontend.runtime, "cases": records})
    write_json(output / "checksums.json", {str(p.relative_to(output)): {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(output.rglob("*")) if p.is_file()})
    print(f"Verified {len(records)} canonical acoustic spans")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    main(parser.parse_args().output)
