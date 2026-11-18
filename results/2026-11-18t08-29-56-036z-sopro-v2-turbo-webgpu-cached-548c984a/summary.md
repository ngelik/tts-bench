# 2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a

MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sopro-v2-turbo | webgpu | measured | 511.67 s | 511.67–511.67 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sopro-v2-turbo | webgpu | First completed source chunk | 6504.400 | ms | 1 |
| sopro-v2-turbo | webgpu | First PCM block | 707.470 | ms | 1 |
| sopro-v2-turbo | webgpu | Generated audio | 1223.587 | s | 1 |
| sopro-v2-turbo | webgpu | Generation / audio duration | 0.418 | ratio | 1 |
| sopro-v2-turbo | webgpu | Model initialization | 5001.933 | ms | 1 |
| sopro-v2-turbo | webgpu | Complete controller trial including setup/export | 521070.319 | ms | 1 |
| sopro-v2-turbo | webgpu | Transferred HTTP body data | 191331908 | bytes | 1 |
| sopro-v2-turbo | webgpu | Ideal body transfer at 1 Mbps | 1530.655 | s | 1 |
| sopro-v2-turbo | webgpu | Whole-call Chrome process-tree peak RSS | 2266120192 | bytes | 1 |
| sopro-v2-turbo | webgpu | Per-trial mean generation Chrome process-tree RSS | 1792633686 | bytes | 1 |
| sopro-v2-turbo | webgpu | In-window Chrome RSS observations | 1019.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sopro-v2-turbo | Unknown | 0 | 4 (en, pt, fr, de) | Tiny Voca F2 synthetic English reference |

Open-ended voice conditioning from reference audio. No bundled speakers.. English, synthetic F2 reference from the benchmark’s Tiny Voca CPU warm recording. Sources: [1](https://huggingface.co/samuel-vitorino/sopro-v2-turbo/blob/c12d0dc7c4a33b3cb6ea3d11ceb70bc60c7c6312/README.md), [2](https://huggingface.co/samuel-vitorino/sopro-v2-turbo-onnx/blob/9fe97bddf52ed785af3634db86a032bb7e07bf18/manifest.json), [3](https://github.com/ngelik/tts-bench/blob/f456cce4422663e3217a885a4c52e8ef4735dd6d/audio/samples/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20--tiny-voca--cpu.wav).


![Generation chart](chart.svg)

- **sopro-v2-turbo / webgpu**: 27430 probe compute dispatches. Reference and semantic stages use WASM; acoustic and vocoder graphs request WebGPU.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Sopro English, four WASM threads, fixed synthetic F2 prompt and seed 1. Exclusive M1 benchmark lock; Now drawing from 'AC Power'. Run order: CPU and WebGPU smoke, CPU and WebGPU cached, CPU and WebGPU warm.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
