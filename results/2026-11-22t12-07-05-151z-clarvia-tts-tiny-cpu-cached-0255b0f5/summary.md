# 2026-11-22t12-07-05-151z-clarvia-tts-tiny-cpu-cached-0255b0f5

Apple M1 Pro / 16 GiB · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| clarvia-tts-tiny | cpu | measured | 62.16 s | 62.16–62.16 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| clarvia-tts-tiny | cpu | First completed source chunk | 715.875 | ms | 1 |
| clarvia-tts-tiny | cpu | First PCM block | 199.225 | ms | 1 |
| clarvia-tts-tiny | cpu | Generated audio | 1301.536 | s | 1 |
| clarvia-tts-tiny | cpu | Generation / audio duration | 0.048 | ratio | 1 |
| clarvia-tts-tiny | cpu | Model initialization | 1729.402 | ms | 1 |
| clarvia-tts-tiny | cpu | Complete controller trial including setup/export | 67918.077 | ms | 1 |
| clarvia-tts-tiny | cpu | Transferred HTTP body data | 48249 | bytes | 1 |
| clarvia-tts-tiny | cpu | Ideal body transfer at 1 Mbps | 0.386 | s | 1 |
| clarvia-tts-tiny | cpu | Whole-call Chrome process-tree peak RSS | 1644576768 | bytes | 1 |
| clarvia-tts-tiny | cpu | Per-trial mean generation Chrome process-tree RSS | 1096656247 | bytes | 1 |
| clarvia-tts-tiny | cpu | In-window Chrome RSS observations | 123.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| clarvia-tts-tiny | 10 | 10 | 1 (tr) | female_1 (synthetic) |

Pinned Turkish FP32 checkpoint with ten bundled synthetic voices; the browser profile fixes female\_1.. Only female\_1 is benchmarked. The model card describes a synthetic training set; dataset summaries are publisher claims and have not been independently audited. The publisher requests AI-audio disclosure and prohibits impersonation. Model/code licensing is not a separate blanket grant to redistribute generated recordings. Sources: [1](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/README.md), [2](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/config.json), [3](https://huggingface.co/wite-tech/clarvia-phonemizer/tree/bf1b1aab40e24ca3f6700980427c386f4f171f6f), [4](https://www.npmjs.com/package/pyodide/v/314.0.8), [5](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt).


![Generation chart](chart.svg)

- **clarvia-tts-tiny / cpu**: ONNX Runtime Web 1.20.1 uses the explicit single-thread SIMD WASM route; Turkish phonemization runs locally in Pyodide.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T11-59-32-168Z-5e0a0a65feae; cell 3/4; source 2c2716b5482c5bcbe094fa7a11a0c30ce0fca318; fixture tr-article-v1 (tr, 20679 JavaScript characters, 94 spans); requested n=1; effective n=1; Headed Google Chrome in disposable profiles, sequential. Clarvia TTS Tiny FP32, default female_1 (index 2) at neutral settings, official Clarvia phonemizer and upstream sentence planner in Pyodide 314.0.8 with CPython 3.14.2, and ORT Web 1.20.1. Dedicated cached resource cells do not contribute to the warm time score. Native stochastic inference preserved. Record AC, Chrome version, host load and thermal observations.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
