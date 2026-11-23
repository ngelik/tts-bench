# 2026-11-23t18-50-18-324z-fiato-webgpu-warm-6841c1a0

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| fiato | webgpu | measured | 25.11 s | 25.11–25.46 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| fiato | webgpu | First completed source chunk | 262.200 | ms | 3 |
| fiato | webgpu | First PCM block | 82.470 | ms | 3 |
| fiato | webgpu | Generated audio | 1240.843 | s | 3 |
| fiato | webgpu | Generation / audio duration | 0.020 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| fiato | 2 | 2 | 1 (en) | F1 |

Pinned Fiato FP32 ONNX checkpoint; English canonical english-20k-v1 fixture; benchmark voice F1/index 0; 24 kHz mono; speed 1, pitch shift 0, pitch range 1; publisher sentence finishing, expression tokens and post-span 0.99 peak ceiling.. The upstream bundle contains F1 and M1. The benchmark uses F1 at index 0. Dizione runs through Pyodide 0.26.4 and NumPy 1.26.4. Separate untimed controls cover sigh, exhale and gasp. The fixed English article is used unchanged. Sources: [1](https://huggingface.co/cfahlgren1/fiato/tree/967de50b6a9ab673ef7de9f8f276fa93a8c0db81), [2](https://huggingface.co/cfahlgren1/fiato/blob/967de50b6a9ab673ef7de9f8f276fa93a8c0db81/README.md), [3](https://huggingface.co/datasets/cfahlgren1/fiato/tree/df0dcab5b7df8c130b5f4d8867caab25c602707f), [4](https://huggingface.co/spaces/cfahlgren1/fiato).


![Generation chart](chart.svg)

- **fiato / webgpu**: WebGPU with WASM operator fallback; Dizione, Python/NumPy setup and PCM readback are CPU work. Actual dispatch is checked in a separate untimed synthesis.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T18-45-59-688Z-7348f0ef444f; cell 2/4; source d24857e8727041e252b4a453a0cdac158d541081; fixture english-20k-v1 (en, 20000 JavaScript characters, 93 spans); requested n=3; effective n=3; Headed Google Chrome on Apple M1 Pro under AC power, sequential disposable profiles. Exact Fiato FP32 English graph, revision 967de50b6a9ab673ef7de9f8f276fa93a8c0db81, F1/index zero, speed 1, pitch shift zero, pitch range 1, 24 kHz. Stock Dizione assets, publisher frontend format and token budgeting with Pyodide 0.26.4. ONNX Runtime Web 1.31.1 on both routes, one WASM thread and verified Apple hardware WebGPU plus WASM asyncify. PCM is joined and capped at the publisher peak for each source span.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
