# 2026-11-23t10-51-27-655z-tiny-voca-he-cpu-cached-8423b493

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-he | cpu | measured | 442.26 s | 442.26–442.26 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-he | cpu | First completed source chunk | 5391.870 | ms | 1 |
| tiny-voca-he | cpu | First PCM block | 1269.520 | ms | 1 |
| tiny-voca-he | cpu | Generated audio | 1120.715 | s | 1 |
| tiny-voca-he | cpu | Generation / audio duration | 0.395 | ratio | 1 |
| tiny-voca-he | cpu | Model initialization | 3043.594 | ms | 1 |
| tiny-voca-he | cpu | Complete controller trial including setup/export | 448797.651 | ms | 1 |
| tiny-voca-he | cpu | Transferred HTTP body data | 62468 | bytes | 1 |
| tiny-voca-he | cpu | Ideal body transfer at 1 Mbps | 0.500 | s | 1 |
| tiny-voca-he | cpu | Whole-call Chrome process-tree peak RSS | 2269036544 | bytes | 1 |
| tiny-voca-he | cpu | Per-trial mean generation Chrome process-tree RSS | 1787415310 | bytes | 1 |
| tiny-voca-he | cpu | In-window Chrome RSS observations | 880.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-he | 1 | 1 | 1 (he) | AH |

The Modern Hebrew profile uses he-article-v1 and the released AH voice at 24 kHz mono. RenikudPlus runs on CPU/WASM in both configurations. WebGPU applies to acoustic inference.. FP32 acoustic graph: 21,361,734 bytes. INT8 RenikudPlus G2P graph: 311,605,741 bytes. Combined model weights: 332,967,475 bytes. Independent browser frontend audit: 71 spans, 320 utterances, max 140, zero unknowns; full token/stress SHA-256 4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7. Sources: [1](https://github.com/buzagloidan/tiny-voca-he/tree/fdc9b3080984c94768239989391fbaddcf9b5519), [2](https://raw.githubusercontent.com/buzagloidan/tiny-voca-he/fdc9b3080984c94768239989391fbaddcf9b5519/models/he-v3/LICENSE), [3](https://huggingface.co/notmax123/RenikudPlus/tree/679c56ca449d41873fb8ff7711ddf7563d28198f), [4](https://pypi.org/project/renikud-plus/0.6.0/), [5](https://pypi.org/project/hebrew-num2words/0.1.0/), [6](https://github.com/maxmelichov/RenikudPlus/blob/93a82fad122207f9dc38105ceb5068e98d00f092/pyproject.toml).


![Generation chart](chart.svg)

- **tiny-voca-he / cpu**: Acoustic and G2P inference use CPU/WASM.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T09-51-56-767Z-ea71b6c236bd; cell 3/4; source a1aee0484c7096728d9512c1203a9d26123f7247; fixture he-article-v1 (he, 15513 JavaScript characters, 71 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro with AC power and disposable sequential profiles. Released tiny-voca-he he-v3 FP32 acoustic graph at step 104000 with AH/index zero, speed 1, neutral pitch, original sentence/140-token fit, and a completed-span peak cap. RenikudPlus INT8 ONNX G2P uses CPU/WASM on both paths with the stock 0.6.0 exact MAP decoder, niqqud strip, speaker and target zero and HebrewNum2Words 0.1.0 in Pyodide. Every source span includes live phonemization. The acoustic graph uses ONNX Runtime Web 1.20.1 CPU/WASM or hardware Apple WebGPU+WASM.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
