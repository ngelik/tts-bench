# 2026-11-22t13-36-48-173z-korean-tts-webgpu-warm-f7086089

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| korean-tts | webgpu | measured | 43.92 s | 43.73–44.12 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| korean-tts | webgpu | First completed source chunk | 536.495 | ms | 3 |
| korean-tts | webgpu | First PCM block | 156.055 | ms | 3 |
| korean-tts | webgpu | Generated audio | 1182.208 | s | 3 |
| korean-tts | webgpu | Generation / audio duration | 0.037 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| korean-tts | 3 | 3 | 2 (ko, en) | F2 |

One pinned bilingual FP32 graph. KSS index 0 is evaluated for the Korean ko-loan frontend; Dizione F2 index 1 is evaluated for English own mode. M2 remains an upstream alternate voice.. Only KSS/ko-article-v1 and F2/english-20k-v1 are benchmark profiles. Mixed Korean with embedded English uses the Korean loanword route. The KSS weight terms apply to both voices; noncommercial acceptance is required. Sources: [1](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/FINAL_REPORT_v2.md), [2](https://huggingface.co/datasets/Bingsu/KSS_Dataset), [3](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode), [4](https://huggingface.co/n4ze3m/tiny-voca/tree/a46fbe0c8514cb32f5e80be987e6c96ef0540f8d), [5](https://github.com/ooodev/korean-tts/tree/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/tiny-voca).


![Generation chart](chart.svg)

- **korean-tts / webgpu**: Observed 2520 WebGPU dispatches in the untimed synthesis probe; unsupported operators may fall back to single-thread WASM.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T13-32-43-053Z-9d9471ea8346; cell 2/4; source fff67d3bc4d836adcb1e87671d8a91c18c7f886c; fixture english-20k-v1 (en, 20000 JavaScript characters, 93 spans); requested n=3; effective n=3; Headed Google Chrome in sequential disposable profiles. The released korean-tts v2 step-160000 FP32 browser graph, F2, voice index 1, own mode. The official Pyodide 0.26.4 frontend and ORT Web 1.20.1, retaining upstream stochastic inference. Dedicated cached resource samples are independent of warm timing.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
