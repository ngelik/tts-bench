# 2026-11-24t01-03-21-130z-supertonic-3-webgpu-cached-4033fb6e

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| supertonic-3 | webgpu | measured | 72.59 s | 72.59–72.59 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| supertonic-3 | webgpu | First completed source chunk | 847.650 | ms | 1 |
| supertonic-3 | webgpu | First PCM block | 847.635 | ms | 1 |
| supertonic-3 | webgpu | Generated audio | 1237.920 | s | 1 |
| supertonic-3 | webgpu | Generation / audio duration | 0.059 | ratio | 1 |
| supertonic-3 | webgpu | Model initialization | 2096.827 | ms | 1 |
| supertonic-3 | webgpu | Complete controller trial including setup/export | 81794.734 | ms | 1 |
| supertonic-3 | webgpu | Transferred HTTP body data | 358040513 | bytes | 1 |
| supertonic-3 | webgpu | Ideal body transfer at 1 Mbps | 2864.324 | s | 1 |
| supertonic-3 | webgpu | Whole-call Chrome process-tree peak RSS | 2567782400 | bytes | 1 |
| supertonic-3 | webgpu | Per-trial mean generation Chrome process-tree RSS | 2432298780 | bytes | 1 |
| supertonic-3 | webgpu | In-window Chrome RSS observations | 144.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| supertonic-3 | 10 | 1 | 31 | M3 (Robert) |

Pinned Supertonic 3 checkpoint and ten supplied preset voice styles. Ten supplied presets F1–F5 and M1–M5; M3 \(Robert\) is staged for this profile. The Spain Spanish and Brazilian Portuguese article editions use the native es and pt tags. Language-agnostic mode na is excluded from the language count. Eight denoising steps and effective speed 1.05 match the linked demo defaults \(UI speed 1.0\). Sources: [1](https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/README.md), [2](https://huggingface.co/Supertone/supertonic-3/tree/3cadd1ee6394adea1bd021217a0e650ede09a323/voice_styles), [3](https://huggingface.co/spaces/Supertone/supertonic-3/blob/4402acca094e2ff2b3dff446e0bf915f3fccc462/script.js).


![Generation chart](chart.svg)

- **supertonic-3 / webgpu**: Observed 8014 WebGPU compute dispatches in a separate untimed synthesis. WebGPU + WASM operator fallback; CPU text processing. Hooks were removed before timed generation.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-24T00-58-15-116Z-e8f7ac575dc8; cell 2/2; source 448eba5382c28247e98d389e151a1983a109d8ce; fixture da-article-v1 (da, 20226 JavaScript characters, 92 spans); requested n=1; effective n=1; Supertonic 3 FP32 M3, Apple M1 Pro, AC power, headed Chrome, disposable profiles, sequential inference. Eight denoising steps and speed 1.05. Verified Apple WebGPU dispatch with some WASM operators, or explicit one-thread CPU/WASM.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
