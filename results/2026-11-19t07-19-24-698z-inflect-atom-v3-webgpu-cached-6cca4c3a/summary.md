# 2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a

MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| inflect-atom-v3 | webgpu | measured | 89.44 s | 89.44–89.44 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| inflect-atom-v3 | webgpu | First completed source chunk | 1435.495 | ms | 1 |
| inflect-atom-v3 | webgpu | First PCM block | 1435.485 | ms | 1 |
| inflect-atom-v3 | webgpu | Generated audio | 1256.638 | s | 1 |
| inflect-atom-v3 | webgpu | Generation / audio duration | 0.071 | ratio | 1 |
| inflect-atom-v3 | webgpu | Model initialization | 336.539 | ms | 1 |
| inflect-atom-v3 | webgpu | Complete controller trial including setup/export | 94335.650 | ms | 1 |
| inflect-atom-v3 | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| inflect-atom-v3 | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| inflect-atom-v3 | webgpu | Whole-call Chrome process-tree peak RSS | 2482847744 | bytes | 1 |
| inflect-atom-v3 | webgpu | Per-trial mean generation Chrome process-tree RSS | 1788983871 | bytes | 1 |
| inflect-atom-v3 | webgpu | In-window Chrome RSS observations | 178.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| inflect-atom-v3 | 6 | 6 | 1 (en) | Cassidy (official fixed voice, index 2) |

Exact 157,190-parameter Atom v3 core and six fixed voice embeddings; rule-based English frontend with no neural POS model. Hope, Sophia, Cassidy, James, Jasper and Mark; benchmark selects Cassidy. Local FP32 ONNX + WASM DSP browser port, with explicitly normalized line whitespace and a specified seeded noise stream. WebGPU accelerates the convolutional decoder; GRU encoder/frontend/DSP remain WASM. Sources: [1](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/README.md), [2](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/atom_runtime_20261024.py), [3](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/LICENSE.md).


![Generation chart](chart.svg)

- **inflect-atom-v3 / webgpu**: Convolution decoder uses WebGPU with WASM fallback; GRU encoder and DSP remain WASM. Untimed dispatches: 218.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Atom v3 English Cassidy, FP32 acoustic encoder/decoder, one WASM thread, exact local espeak-light frontend, seeded MT19937/polar noise7717. WebGPU decoder with WASM encoder/DSP; same settings on CPU. Exclusive M1 benchmark lock; Now drawing from 'AC Power'. Run order: CPU and WebGPU smoke, CPU and WebGPU cached, CPU and WebGPU warm.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
