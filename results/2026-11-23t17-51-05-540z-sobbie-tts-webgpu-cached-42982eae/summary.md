# 2026-11-23t17-51-05-540z-sobbie-tts-webgpu-cached-42982eae

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sobbie-tts | webgpu | measured | 25.32 s | 25.32–25.32 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sobbie-tts | webgpu | First completed source chunk | 398.920 | ms | 1 |
| sobbie-tts | webgpu | First PCM block | 163.280 | ms | 1 |
| sobbie-tts | webgpu | Generated audio | 1225.717 | s | 1 |
| sobbie-tts | webgpu | Generation / audio duration | 0.021 | ratio | 1 |
| sobbie-tts | webgpu | Model initialization | 3012.570 | ms | 1 |
| sobbie-tts | webgpu | Complete controller trial including setup/export | 32179.120 | ms | 1 |
| sobbie-tts | webgpu | Transferred HTTP body data | 64636 | bytes | 1 |
| sobbie-tts | webgpu | Ideal body transfer at 1 Mbps | 0.517 | s | 1 |
| sobbie-tts | webgpu | Whole-call Chrome process-tree peak RSS | 2266300416 | bytes | 1 |
| sobbie-tts | webgpu | Per-trial mean generation Chrome process-tree RSS | 2033234084 | bytes | 1 |
| sobbie-tts | webgpu | In-window Chrome RSS observations | 50.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sobbie-tts | 2 | 2 | 1 (en) | F |

Pinned SobbieTTS FP32 checkpoint; English canonical fixture, publisher F/index 0, 24 kHz mono. Dizione at pinned source/data; speed 1, pitch shift 0, pitch range 1.15.. The browser route follows the staged publisher worker for finished\(\), abbreviations/sentence boundaries, max\_tokens minus 12 recursive token fitting, default F voice, direct PCM concatenation and one 0.99 final source-span peak cap. The Dizione config frontend fingerprint is retained as a distinct release identifier; the source/data digest is recorded separately. Sources: [1](https://huggingface.co/PatnaikAshish/SobbieTTS/tree/6b6132c6d34b5fc163d8f5553580678a60532ac3), [2](https://huggingface.co/PatnaikAshish/SobbieTTS/blob/6b6132c6d34b5fc163d8f5553580678a60532ac3/README.md), [3](https://github.com/n4ze3m/dizione/tree/8cd889e4de7be6bd1dd2e6891344a0729fa14dd4).


![Generation chart](chart.svg)

- **sobbie-tts / webgpu**: Observed 2310 hardware WebGPU compute dispatches in an untimed probe; WASM remains the declared fallback for unsupported graph operators.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T17-43-43-862Z-b6127a3103f3; cell 4/4; source 541739673980e4a5789a06360e9bbb3a211ac22f; fixture english-20k-v1 (en, 20000 JavaScript characters, 93 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro under AC power, sequential disposable profiles. Exact SobbieTTS FP32 English graph, revision 6b6132c6d34b5fc163d8f5553580678a60532ac3, F/index zero, speed 1, pitch shift zero, pitch range 1.15, 24 kHz. Stock Dizione assets, publisher frontend format and token budgeting with Pyodide 0.26.4. ONNX Runtime Web 1.31.1 on both routes, one WASM thread and verified Apple hardware WebGPU plus WASM asyncify. PCM is joined and capped at the publisher peak for each source span.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
