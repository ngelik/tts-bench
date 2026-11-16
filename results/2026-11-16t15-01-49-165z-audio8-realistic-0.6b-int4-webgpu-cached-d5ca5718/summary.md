# 2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718

MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| audio8-realistic-0.6b-int4 | webgpu | measured | 9732.59 s | 9732.59–9732.59 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| audio8-realistic-0.6b-int4 | webgpu | First completed source chunk | 112316.250 | ms | 1 |
| audio8-realistic-0.6b-int4 | webgpu | First PCM block | 112316.155 | ms | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Generated audio | 1427.749 | s | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Generation / audio duration | 6.817 | ratio | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Model initialization | 5838.896 | ms | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Complete controller trial including setup/export | 9747580.029 | ms | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Whole-call Chrome process-tree peak RSS | 4169924608 | bytes | 1 |
| audio8-realistic-0.6b-int4 | webgpu | Per-trial mean generation Chrome process-tree RSS | 2912532016 | bytes | 1 |
| audio8-realistic-0.6b-int4 | webgpu | In-window Chrome RSS observations | 19401.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| audio8-realistic-0.6b-int4 | Unknown | 0 | 23 | Reference-free English synthesis |

Realistic 0.6B checkpoint; reference-free synthesis or open-ended zero-shot voices.. No preset voices ship in this configuration. Reference-free English mode is tested. Sources: [1](https://huggingface.co/Edge0/Audio8-TTS-Realistic-Air/blob/1e857568bfd4f02931aca3988ee773a44d2d26d3/README.md), [2](https://huggingface.co/stephvax/audio8-tts-realistic-0.6b-onnx-int4/blob/04313606782af6b9a1aa93724555bc7b64ba9197/provenance.json).


![Generation chart](chart.svg)

- **audio8-realistic-0.6b-int4 / webgpu**: 1624576 autoregressive dispatches in separate capability probe; WASM-only codec (0 dispatches).

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-16T15-01-48-221Z-da7c69ce08bb; cell 1/1; source 9c7d880199e87a15a3959ae94b632f9d9cdd40da; Mains power attached; pre-run load averages 16.99, 19.85, 21.28; serial M1 order; normal user background apps remain; thermal state not instrumented; Audio8 webgpu cached full article; serial campaign cell; headed pinned Chrome 157.0.8103.40.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
