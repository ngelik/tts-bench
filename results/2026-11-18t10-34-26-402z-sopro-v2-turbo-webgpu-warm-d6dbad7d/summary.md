# 2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d

MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sopro-v2-turbo | webgpu | measured | 507.48 s | 500.10–507.60 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sopro-v2-turbo | webgpu | First completed source chunk | 6085.995 | ms | 5 |
| sopro-v2-turbo | webgpu | First PCM block | 629.560 | ms | 5 |
| sopro-v2-turbo | webgpu | Generated audio | 1223.587 | s | 5 |
| sopro-v2-turbo | webgpu | Generation / audio duration | 0.415 | ratio | 5 |

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

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
