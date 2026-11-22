# 2026-11-22t10-05-53-145z-vocina-it-webgpu-cached-e0289f54

Apple M1 Pro / 16 GiB · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| vocina-it | webgpu | measured | 63.57 s | 63.57–63.57 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| vocina-it | webgpu | First completed source chunk | 789.670 | ms | 1 |
| vocina-it | webgpu | First PCM block | 324.575 | ms | 1 |
| vocina-it | webgpu | Generated audio | 1452.527 | s | 1 |
| vocina-it | webgpu | Generation / audio duration | 0.044 | ratio | 1 |
| vocina-it | webgpu | Model initialization | 1069.999 | ms | 1 |
| vocina-it | webgpu | Complete controller trial including setup/export | 68957.926 | ms | 1 |
| vocina-it | webgpu | Transferred HTTP body data | 50510 | bytes | 1 |
| vocina-it | webgpu | Ideal body transfer at 1 Mbps | 0.404 | s | 1 |
| vocina-it | webgpu | Whole-call Chrome process-tree peak RSS | 1852669952 | bytes | 1 |
| vocina-it | webgpu | Per-trial mean generation Chrome process-tree RSS | 1109846699 | bytes | 1 |
| vocina-it | webgpu | In-window Chrome RSS observations | 126.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| vocina-it | 2 | 2 | 1 (it) | I1 (Femminile) |

Pinned Vocina v1.0 INT8 checkpoint and its two released Italian preset voices. Benchmarks I1 \(Femminile, index 0\) only. I2 \(Maschile, index 1\) is also released. The publisher estimates approximately 4.5M parameters; the local graph scan reports a 180,555 explicitly named FP32 weight/bias initializer lower bound and 4,533,743 stored initializer values, not an exact trainable count. Voice/output redistribution terms were not separately stated. Sources: [1](https://github.com/OfficinePixel/vocina/tree/8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34), [2](https://github.com/OfficinePixel/vocina/releases/tag/v1.0), [3](https://www.officinepixel.com/vocina/).


![Generation chart](chart.svg)

- **vocina-it / webgpu**: Observed 2796 WebGPU compute dispatches during the untimed probe; unsupported operators may run on explicit WASM fallback.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T09-55-33-549Z-28db6049187f; cell 4/4; source adeea4ac056330319f95e078066ba06501f0c7db; fixture it-article-v1 (it, 23584 JavaScript characters, 107 spans); requested n=1; effective n=1; Headed Google Chrome in disposable profiles, sequential. Vocina v1.0 dynamic-MatMul INT8, default I1 (Femminile) at neutral settings, official G2P with empty variants, and ORT Web 1.27.0. Dedicated cached resource cells do not contribute to the warm time score. Native stochastic inference preserved. Record AC, Chrome version, host load and thermal observations.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
