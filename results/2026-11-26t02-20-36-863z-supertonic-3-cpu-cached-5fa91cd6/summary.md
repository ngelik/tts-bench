# 2026-11-26t02-20-36-863z-supertonic-3-cpu-cached-5fa91cd6

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| supertonic-3 | cpu | measured | 2213.89 s | 2213.89–2213.89 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| supertonic-3 | cpu | First completed source chunk | 16487.165 | ms | 1 |
| supertonic-3 | cpu | First PCM block | 16487.155 | ms | 1 |
| supertonic-3 | cpu | Generated audio | 1881.590 | s | 1 |
| supertonic-3 | cpu | Generation / audio duration | 1.177 | ratio | 1 |
| supertonic-3 | cpu | Model initialization | 1183.448 | ms | 1 |
| supertonic-3 | cpu | Complete controller trial including setup/export | 2225117.462 | ms | 1 |
| supertonic-3 | cpu | Transferred HTTP body data | 256667253 | bytes | 1 |
| supertonic-3 | cpu | Ideal body transfer at 1 Mbps | 2053.338 | s | 1 |
| supertonic-3 | cpu | Whole-call Chrome process-tree peak RSS | 2478718976 | bytes | 1 |
| supertonic-3 | cpu | Per-trial mean generation Chrome process-tree RSS | 1297238918 | bytes | 1 |
| supertonic-3 | cpu | In-window Chrome RSS observations | 4410.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| supertonic-3 | 10 | 1 | 31 | M3 (Robert) |

Pinned Supertonic 3 checkpoint and ten supplied preset voice styles. Ten supplied presets F1–F5 and M1–M5; M3 \(Robert\) is staged for this profile. The Spain Spanish and Brazilian Portuguese article editions use the native es and pt tags. Language-agnostic mode na is excluded from the language count. Eight denoising steps and effective speed 1.05 match the linked demo defaults \(UI speed 1.0\). Sources: [1](https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/README.md), [2](https://huggingface.co/Supertone/supertonic-3/tree/3cadd1ee6394adea1bd021217a0e650ede09a323/voice_styles), [3](https://huggingface.co/spaces/Supertone/supertonic-3/blob/4402acca094e2ff2b3dff446e0bf915f3fccc462/script.js).


![Generation chart](chart.svg)

- **supertonic-3 / cpu**: Explicit one-thread ONNX Runtime Web WASM provider; model text processing runs in the Chrome worker.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-25T23-50-30-468Z-da881e6514cf; cell 2/2; source 42f5d466737d91eb9a524ab1b01171e761740b2f; fixture ar-article-v1 (ar, 28275 JavaScript characters, 129 spans); requested n=1; effective n=1; Supertonic 3 FP32 M3, Apple M1 Pro, AC power, headed Chrome, disposable profiles, sequential inference. Eight denoising steps and speed 1.05. Verified Apple WebGPU dispatch with some WASM operators, or explicit one-thread CPU/WASM.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
