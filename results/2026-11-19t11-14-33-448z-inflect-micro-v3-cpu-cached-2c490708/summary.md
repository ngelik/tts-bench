# 2026-11-19t11-14-33-448z-inflect-micro-v3-cpu-cached-2c490708

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| inflect-micro-v3 | cpu | measured | 263.84 s | 263.84–263.84 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| inflect-micro-v3 | cpu | First completed source chunk | 3185.675 | ms | 1 |
| inflect-micro-v3 | cpu | First PCM block | 2878.750 | ms | 1 |
| inflect-micro-v3 | cpu | Generated audio | 1289.030 | s | 1 |
| inflect-micro-v3 | cpu | Generation / audio duration | 0.205 | ratio | 1 |
| inflect-micro-v3 | cpu | Model initialization | 432.530 | ms | 1 |
| inflect-micro-v3 | cpu | Complete controller trial including setup/export | 268425.690 | ms | 1 |
| inflect-micro-v3 | cpu | Transferred HTTP body data | 38404 | bytes | 1 |
| inflect-micro-v3 | cpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| inflect-micro-v3 | cpu | Whole-call Chrome process-tree peak RSS | 1282113536 | bytes | 1 |
| inflect-micro-v3 | cpu | Per-trial mean generation Chrome process-tree RSS | 939739678 | bytes | 1 |
| inflect-micro-v3 | cpu | In-window Chrome RSS observations | 525.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| inflect-micro-v3 | 6 | 1 | 1 (en) | Cassidy (fixed voice 2) |

Pinned Inflect Micro v3 English checkpoint c1a7db6ef44c931623fc2028cb0409659b83156c. Upstream checkpoint lists six English voices; only Cassidy \(voice 2\) is exported and benchmarked. 11,787,634-parameter core; browser export uses three FP32 ONNX graphs and a fixed Cassidy style bank. English G2P uses the separately pinned Klein 0.2.0 browser adaptation and does not claim native Misaki parity. Seeded JavaScript Gaussian noise differs from PyTorch RNG sequence. Sources: [1](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/README.md), [2](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/LICENSE_SCOPE.json), [3](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/THIRD_PARTY_NOTICES.md).


![Generation chart](chart.svg)

- **inflect-micro-v3 / cpu**: Explicit one-thread ONNX Runtime WASM; untimed PCM inference passed.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T11-14-32-734Z-ef3105374028; cell 1/1; source 796a12747ad7c7ed79b3592dfa88c875629c0084; requested n=1; effective n=1; Sequential full-article Micro v3; Google Chrome 157.0.8103.40, Apple M1 Pro on AC power. Normal user background applications remain; thermal state is uninstrumented. Cassidy voice ID 2, speed 1, one-thread WASM provider; WebGPU is not used in this cell. One cached full article with generation-window RSS sampling.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
