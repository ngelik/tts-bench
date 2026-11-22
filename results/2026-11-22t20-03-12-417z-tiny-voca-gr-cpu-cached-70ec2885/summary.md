# 2026-11-22t20-03-12-417z-tiny-voca-gr-cpu-cached-70ec2885

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-gr | cpu | measured | 90.50 s | 90.50–90.50 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-gr | cpu | First completed source chunk | 870.875 | ms | 1 |
| tiny-voca-gr | cpu | First PCM block | 254.940 | ms | 1 |
| tiny-voca-gr | cpu | Generated audio | 1790.208 | s | 1 |
| tiny-voca-gr | cpu | Generation / audio duration | 0.051 | ratio | 1 |
| tiny-voca-gr | cpu | Model initialization | 764.929 | ms | 1 |
| tiny-voca-gr | cpu | Complete controller trial including setup/export | 96204.754 | ms | 1 |
| tiny-voca-gr | cpu | Transferred HTTP body data | 76982 | bytes | 1 |
| tiny-voca-gr | cpu | Ideal body transfer at 1 Mbps | 0.616 | s | 1 |
| tiny-voca-gr | cpu | Whole-call Chrome process-tree peak RSS | 2209415168 | bytes | 1 |
| tiny-voca-gr | cpu | Per-trial mean generation Chrome process-tree RSS | 1262241564 | bytes | 1 |
| tiny-voca-gr | cpu | In-window Chrome RSS observations | 180.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-gr | 2 | 2 | 1 (el) | M |

Pinned tiny-voca-gr release only. Two fixed synthesis profiles \(M and F\) at 24 kHz; M index 0 is the benchmark default. The FP32 ONNX graph is a local export of the released PyTorch checkpoint.. Modern Greek only. Native frontend verification covers 109 spans and 335 utterances, with a maximum of 179 tokens and 28 &lt;unk&gt; instances. The Greek inventory can lose sounds from mixed-script names and initials. M is the benchmark voice and F is available for smoke diagnostics. Sources: [1](https://huggingface.co/ComputationalLinguisticsPlatform/tiny-voca-gr/tree/927ea15cf4edcb8695b75328c9c90c5c53928554), [2](https://github.com/n4ze3m/tiny-voca/tree/62e2adef158bc997042cc6234f541f1e0e4cd55d), [3](https://github.com/espeak-ng/espeak-ng/tree/2e9a5fccbb0095e87b2769e9249ea1f821918ecd), [4](https://huggingface.co/datasets/aangelakis/STOMA/tree/fcb947d49abd2736701d8ce3786136812bac85fa).


![Generation chart](chart.svg)

- **tiny-voca-gr / cpu**: The pinned FP32 graph uses explicit single-thread WASM. Greek normalization and eSpeak G2P run locally in the worker.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T19-55-13-455Z-b55f7a1b46ba; cell 3/4; source 979a76f1d0346fe72a04389a0a70fc64be992963; fixture el-article-v1 (el, 23928 JavaScript characters, 109 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro, disposable sequential profiles. Modern Greek Tiny Voca official FP32 ONNX export from the exact release checkpoint, M voice index zero, neutral speed and pitch. Pinned Greek eSpeak NG 1.51 and released Greek phones/stress inventory. ORT Web 1.31.1 single-thread CPU/WASM or Apple hardware WebGPU+WASM. Separate cached process-tree RSS observations.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
