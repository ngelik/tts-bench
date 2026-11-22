# 2026-11-22t17-40-49-290z-slyszeglosy-v1-webgpu-cached-4bba2e66

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| slyszeglosy-v1 | webgpu | measured | 46.42 s | 46.42–46.42 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| slyszeglosy-v1 | webgpu | First completed source chunk | 581.450 | ms | 1 |
| slyszeglosy-v1 | webgpu | First PCM block | 253.245 | ms | 1 |
| slyszeglosy-v1 | webgpu | Generated audio | 1340.171 | s | 1 |
| slyszeglosy-v1 | webgpu | Generation / audio duration | 0.035 | ratio | 1 |
| slyszeglosy-v1 | webgpu | Model initialization | 1732.626 | ms | 1 |
| slyszeglosy-v1 | webgpu | Complete controller trial including setup/export | 52355.146 | ms | 1 |
| slyszeglosy-v1 | webgpu | Transferred HTTP body data | 52237 | bytes | 1 |
| slyszeglosy-v1 | webgpu | Ideal body transfer at 1 Mbps | 0.418 | s | 1 |
| slyszeglosy-v1 | webgpu | Whole-call Chrome process-tree peak RSS | 1735327744 | bytes | 1 |
| slyszeglosy-v1 | webgpu | Per-trial mean generation Chrome process-tree RSS | 1637739297 | bytes | 1 |
| slyszeglosy-v1 | webgpu | In-window Chrome RSS observations | 92.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| slyszeglosy-v1 | 2 | 2 | 1 (pl) | F |

One pinned V1 graph bundles synthetic F and M Polish voices. The adapter evaluates F index 0 only; the separate V2 model is outside this profile.. Only F index 0, Polish, pl-article-v1 is registered. M remains bundled but unevaluated. V2 is explicitly outside this V1 entry. Model and synthetic voice data require noncommercial license acknowledgment. Sources: [1](https://huggingface.co/Damaon/slyszeglosy/tree/23b63ff12db5f19260985031e64c2f45b89cc609), [2](https://github.com/Damaon/slyszeglosy/tree/605a13f5d9994ad8c897dff3463ce1f339acfb5f), [3](https://creativecommons.org/licenses/by-nc/4.0/legalcode).


![Generation chart](chart.svg)

- **slyszeglosy-v1 / webgpu**: Observed 2487 WebGPU compute dispatches on the synthesis probe; provider order is webgpu then wasm.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T17-31-56-972Z-3592c6dbba16; cell 4/4; source 5e0212f8277c154901925f9d13d5306ecc976039; fixture pl-article-v1 (pl, 21375 JavaScript characters, 98 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro, disposable sequential profiles. Słyszegłosy V1 stock FP32 ONNX, original synthetic F voice at index zero, neutral speed and pitch. Pinned wymowa Polish frontend in same-origin Pyodide 0.26.4. ORT Web 1.20.1 single-thread CPU/WASM or Apple hardware WebGPU+WASM. Separate cached process-tree RSS measurements.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
