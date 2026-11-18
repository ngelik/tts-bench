# 2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| silencio-2 | webgpu | measured | 1971.18 s | 1971.18–1971.18 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| silencio-2 | webgpu | First completed source chunk | 21031.965 | ms | 1 |
| silencio-2 | webgpu | First PCM block | 251.925 | ms | 1 |
| silencio-2 | webgpu | Generated audio | 1207.680 | s | 1 |
| silencio-2 | webgpu | Generation / audio duration | 1.632 | ratio | 1 |
| silencio-2 | webgpu | Model initialization | 2760.206 | ms | 1 |
| silencio-2 | webgpu | Complete controller trial including setup/export | 1977722.437 | ms | 1 |
| silencio-2 | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| silencio-2 | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| silencio-2 | webgpu | Whole-call Chrome process-tree peak RSS | 2629238784 | bytes | 1 |
| silencio-2 | webgpu | Per-trial mean generation Chrome process-tree RSS | 1664921917 | bytes | 1 |
| silencio-2 | webgpu | In-window Chrome RSS observations | 3928.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| silencio-2 | 8 | 1 | 1 (en) | 260 |

Pinned BlueRoseLabs/Silencio-2 checkpoint and its eight bundled voice catalog entries; this benchmark exposes only synthetic voice 260.. English only. The browser configuration uses voice 260, carries its model-bound state, and does not expose custom voice cloning or the other seven catalog entries. CPU/WASM and WebGPU run FP32 ONNX graphs with one WASM thread; WebGPU allows WASM operator fallback and must prove actual GPU dispatch. Seeded browser noise is disclosed and is not bitwise PyTorch RNG parity. Sources: [1](https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/README.md), [2](https://huggingface.co/BlueRoseLabs/Silencio-2/tree/20930f5f6a6bb564f2a8207152fd5c5d8eecff03), [3](https://erogol.com/small_tts_bench/).


![Generation chart](chart.svg)

- **silencio-2 / webgpu**: Observed 306177 actual WebGPU compute dispatches during separate untimed synthesis. WebGPU with WASM operator fallback; CPU-readable PCM. Hooks removed before scored generation.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-18T08-49-52-279Z-551814e2ea2e; cell 1/1; source 0d5dd8e407191485dcb34565e7f42baa961f5f3f; requested n=1; effective n=1; MacBook Pro (MacBookPro18,3, Apple M1 Pro, 8 CPU cores: 6 performance and 2 efficiency, 16 GB RAM), macOS 26.6.2 arm64, headed Google Chrome 157.0.8103.40, AC attached. One full-article cached WebGPU resource/RSS cell, run separately through the shared M1 publication slot after the CPU cached cell recorded in runs/campaign-2026-11-18T08-02-53-405Z-20bba4b8bbdd. Canonical english-20k-v1 fixture. Background load and thermal/power state are recorded with native receipts.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
