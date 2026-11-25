# 2026-11-25t18-20-16-118z-tiny-voca-french-cpu-warm-9d7f6396

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-french | cpu | measured | 58.21 s | 58.18–58.22 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-french | cpu | First completed source chunk | 559.530 | ms | 3 |
| tiny-voca-french | cpu | First PCM block | 189.950 | ms | 3 |
| tiny-voca-french | cpu | Generated audio | 1230.699 | s | 3 |
| tiny-voca-french | cpu | Generation / audio duration | 0.047 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-french | 5 | 5 | 1 (fr) | F1 |

French, five bundled voices. The benchmark uses F1 at index 0 with one WebAssembly thread.. F1 is a synthetic voice. The browser adapter matched the publisher’s pronunciation inputs across the full French article and sample counts on its opening three segments. The qualification record contains waveform comparisons. The SIWIS-derived SW voice is outside this benchmark. Sources: [1](https://huggingface.co/ymelka/tiny-voca-french/tree/502ebbc0b9d442d056da1ef60926646394a2dbc8), [2](https://github.com/yoch/tiny-voca/tree/9662a249d8ced6957d9f85665468f93df84fbea8), [3](https://huggingface.co/spaces/ymelka/tiny-voca-french/tree/8ddb95dc20e47864cc9c5c3754aac331f2db1d6b), [4](https://www.npmjs.com/package/onnxruntime-web/v/1.20.1).


![Generation chart](chart.svg)

- **tiny-voca-french / cpu**: Official Space uses ONNX Runtime Web 1.20.1 with explicit single-thread WASM.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-25T18-20-15-452Z-280ac166d14b; cell 1/2; source e3f1670996ee35c33c1bab0e120fdac68e7d98ac; fixture fr-article-v1 (fr, 23757 JavaScript characters, 108 spans); requested n=3; effective n=3; Headed Google Chrome, Apple M1 Pro, AC power. Published tiny-voca-french, F1, FP32 ONNX. Qualified backends: cpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
