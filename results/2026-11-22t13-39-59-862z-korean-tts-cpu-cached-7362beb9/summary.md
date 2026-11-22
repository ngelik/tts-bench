# 2026-11-22t13-39-59-862z-korean-tts-cpu-cached-7362beb9

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| korean-tts | cpu | measured | 57.62 s | 57.62–57.62 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| korean-tts | cpu | First completed source chunk | 832.230 | ms | 1 |
| korean-tts | cpu | First PCM block | 312.835 | ms | 1 |
| korean-tts | cpu | Generated audio | 1182.208 | s | 1 |
| korean-tts | cpu | Generation / audio duration | 0.049 | ratio | 1 |
| korean-tts | cpu | Model initialization | 3675.817 | ms | 1 |
| korean-tts | cpu | Complete controller trial including setup/export | 64966.718 | ms | 1 |
| korean-tts | cpu | Transferred HTTP body data | 45847 | bytes | 1 |
| korean-tts | cpu | Ideal body transfer at 1 Mbps | 0.367 | s | 1 |
| korean-tts | cpu | Whole-call Chrome process-tree peak RSS | 1894400000 | bytes | 1 |
| korean-tts | cpu | Per-trial mean generation Chrome process-tree RSS | 1400526309 | bytes | 1 |
| korean-tts | cpu | In-window Chrome RSS observations | 114.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| korean-tts | 3 | 3 | 2 (ko, en) | F2 |

One pinned bilingual FP32 graph. KSS index 0 is evaluated for the Korean ko-loan frontend; Dizione F2 index 1 is evaluated for English own mode. M2 remains an upstream alternate voice.. Only KSS/ko-article-v1 and F2/english-20k-v1 are benchmark profiles. Mixed Korean with embedded English uses the Korean loanword route. The KSS weight terms apply to both voices; noncommercial acceptance is required. Sources: [1](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/FINAL_REPORT_v2.md), [2](https://huggingface.co/datasets/Bingsu/KSS_Dataset), [3](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode), [4](https://huggingface.co/n4ze3m/tiny-voca/tree/a46fbe0c8514cb32f5e80be987e6c96ef0540f8d), [5](https://github.com/ooodev/korean-tts/tree/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/tiny-voca).


![Generation chart](chart.svg)

- **korean-tts / cpu**: Pinned ONNX Runtime Web 1.20.1 model inference on explicit single-thread WASM; Pyodide frontend runs locally on CPU.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T13-32-43-053Z-9d9471ea8346; cell 3/4; source fff67d3bc4d836adcb1e87671d8a91c18c7f886c; fixture english-20k-v1 (en, 20000 JavaScript characters, 93 spans); requested n=1; effective n=1; Headed Google Chrome in sequential disposable profiles. The released korean-tts v2 step-160000 FP32 browser graph, F2, voice index 1, own mode. The official Pyodide 0.26.4 frontend and ORT Web 1.20.1, retaining upstream stochastic inference. Dedicated cached resource samples are independent of warm timing.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
