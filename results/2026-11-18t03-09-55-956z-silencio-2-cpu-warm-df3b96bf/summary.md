# 2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| silencio-2 | cpu | measured | 607.96 s | 606.52–609.88 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| silencio-2 | cpu | First completed source chunk | 5947.440 | ms | 5 |
| silencio-2 | cpu | First PCM block | 78.435 | ms | 5 |
| silencio-2 | cpu | Generated audio | 1204.960 | s | 5 |
| silencio-2 | cpu | Generation / audio duration | 0.505 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| silencio-2 | 8 | 1 | 1 (en) | 260 |

Pinned BlueRoseLabs/Silencio-2 checkpoint and its eight bundled voice catalog entries; this benchmark exposes only synthetic voice 260.. English only. The browser configuration uses voice 260, carries its model-bound state, and does not expose custom voice cloning or the other seven catalog entries. CPU/WASM and WebGPU run FP32 ONNX graphs with one WASM thread; WebGPU allows WASM operator fallback and must prove actual GPU dispatch. Seeded browser noise is disclosed and is not bitwise PyTorch RNG parity. Sources: [1](https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/README.md), [2](https://huggingface.co/BlueRoseLabs/Silencio-2/tree/20930f5f6a6bb564f2a8207152fd5c5d8eecff03), [3](https://erogol.com/small_tts_bench/).


![Generation chart](chart.svg)

- **silencio-2 / cpu**: Explicit single-thread ONNX Runtime Web WASM provider; text preprocessing runs in the worker.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-18T03-09-54-940Z-24399c495e1e; cell 1/4; source 0d5dd8e407191485dcb34565e7f42baa961f5f3f; requested n=5; effective n=5; MacBook Pro (MacBookPro18,3, Apple M1 Pro, 8 CPU cores: 6 performance and 2 efficiency, 16 GB RAM), macOS 26.6.2 arm64, headed Google Chrome 157.0.8103.40, AC attached. One excluded full-article warm-up per warm backend; sequential CPU warm, WebGPU warm, then CPU and WebGPU cached full-article RSS diagnostics. Canonical english-20k-v1 fixture; each cell runs alone through the shared M1 publication slot. Background load and thermal/power state are recorded with the native receipts.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
