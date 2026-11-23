# 2026-11-23t02-17-55-289z-tiny-voca-ptbr-cpu-cached-0493d237

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-ptbr | cpu | measured | 94.35 s | 94.35–94.35 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-ptbr | cpu | First completed source chunk | 940.735 | ms | 1 |
| tiny-voca-ptbr | cpu | First PCM block | 272.230 | ms | 1 |
| tiny-voca-ptbr | cpu | Generated audio | 1768.555 | s | 1 |
| tiny-voca-ptbr | cpu | Generation / audio duration | 0.053 | ratio | 1 |
| tiny-voca-ptbr | cpu | Model initialization | 650.479 | ms | 1 |
| tiny-voca-ptbr | cpu | Complete controller trial including setup/export | 100317.764 | ms | 1 |
| tiny-voca-ptbr | cpu | Transferred HTTP body data | 59824 | bytes | 1 |
| tiny-voca-ptbr | cpu | Ideal body transfer at 1 Mbps | 0.479 | s | 1 |
| tiny-voca-ptbr | cpu | Whole-call Chrome process-tree peak RSS | 2010120192 | bytes | 1 |
| tiny-voca-ptbr | cpu | Per-trial mean generation Chrome process-tree RSS | 1399835730 | bytes | 1 |
| tiny-voca-ptbr | cpu | In-window Chrome RSS observations | 187.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-ptbr | 2 | 2 | 1 (pt-BR) | F_s4 |

Pinned semfence/tiny-voca-ptbr checkpoint only. Two fixed synthetic voices, F\_s4 and M\_sm4, at 24 kHz mono; benchmark default is F\_s4/index 0. This browser profile exposes Brazilian Portuguese \(pt-BR\) only.. The pinned checkpoint card reports 4,533,259 parameters including the waveform generator. Exact pt-br-article-v1 frontend audit: 101 spans, 310 utterances, maximum 225 tokens, zero &lt;unk&gt; phones; this is a diagnostic, not a score. Both original synthetic voices are included. The graph has no seed input and generates waveform noise internally. Generated recordings have no blanket redistribution grant from the code license. Sources: [1](https://huggingface.co/semfence/tiny-voca-ptbr/tree/f231cbe318c9f972e27fd8dad5d8ebcfb40a672f), [2](https://huggingface.co/spaces/semfence/tiny-voca-ptbr-demo/tree/a456470df5589478e3fb3f1973457771f4c056bd), [3](https://github.com/n4ze3m/tiny-voca), [4](https://github.com/SemFence/dizione-ptbr/tree/8fbb77e579fe684f3afd9cb2a801d0adce8c89cf), [5](https://github.com/MontrealCorpusTools/mfa-models/tree/dictionary-portuguese_brazil_mfa-v2.0.0a), [6](https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.22.0.tgz).


![Generation chart](chart.svg)

- **tiny-voca-ptbr / cpu**: Explicit ONNX Runtime Web 1.22.0 single-thread WASM provider; this is the CPU backend.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T02-09-12-660Z-a9aceb978466; cell 3/4; source a1f52276803d69fde8e4d77456066d2ebd04da07; fixture pt-br-article-v1 (pt-BR, 22164 JavaScript characters, 101 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro, disposable sequential profiles. tiny-voca-ptbr released FP32 graph, default Brazilian Portuguese F_s4 voice index zero, neutral speed and pitch and completed-span peak cap 0.99. Exact released Brazilian Portuguese Dizione JS normalization, tokenization, and sentence segmentation. ORT Web 1.22.0 single-thread CPU/WASM or Apple hardware WebGPU+WASM. Separate cached process-tree RSS observations.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
