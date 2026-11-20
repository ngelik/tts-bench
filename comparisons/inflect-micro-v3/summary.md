# native-benchmark-comparison

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Comparison of separate native harness runs.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| inflect-micro-v3 | cpu | measured | 259.52 s | 259.41–259.69 s | 5 |
| inflect-micro-v3 | webgpu | measured | 218.89 s | 218.09–219.74 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| inflect-micro-v3 | cpu | First completed source chunk | 3000.675 | ms | 5 |
| inflect-micro-v3 | cpu | First PCM block | 2702.740 | ms | 5 |
| inflect-micro-v3 | cpu | Generated audio | 1289.030 | s | 5 |
| inflect-micro-v3 | cpu | Generation / audio duration | 0.201 | ratio | 5 |
| inflect-micro-v3 | webgpu | First completed source chunk | 2562.385 | ms | 5 |
| inflect-micro-v3 | webgpu | First PCM block | 2263.445 | ms | 5 |
| inflect-micro-v3 | webgpu | Generated audio | 1289.030 | s | 5 |
| inflect-micro-v3 | webgpu | Generation / audio duration | 0.170 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| inflect-micro-v3 | 6 | 1 | 1 (en) | Cassidy (fixed voice 2) |
| inflect-micro-v3 | 6 | 1 | 1 (en) | Cassidy (fixed voice 2) |

Pinned Inflect Micro v3 English checkpoint c1a7db6ef44c931623fc2028cb0409659b83156c. Upstream checkpoint lists six English voices; only Cassidy \(voice 2\) is exported and benchmarked. 11,787,634-parameter core; browser export uses three FP32 ONNX graphs and a fixed Cassidy style bank. English G2P uses the separately pinned Klein 0.2.0 browser adaptation and does not claim native Misaki parity. Seeded JavaScript Gaussian noise differs from PyTorch RNG sequence. Sources: [1](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/README.md), [2](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/LICENSE_SCOPE.json), [3](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/THIRD_PARTY_NOTICES.md).


Pinned Inflect Micro v3 English checkpoint c1a7db6ef44c931623fc2028cb0409659b83156c. Upstream checkpoint lists six English voices; only Cassidy \(voice 2\) is exported and benchmarked. 11,787,634-parameter core; browser export uses three FP32 ONNX graphs and a fixed Cassidy style bank. English G2P uses the separately pinned Klein 0.2.0 browser adaptation and does not claim native Misaki parity. Seeded JavaScript Gaussian noise differs from PyTorch RNG sequence. Sources: [1](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/README.md), [2](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/LICENSE_SCOPE.json), [3](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/THIRD_PARTY_NOTICES.md).


![Generation chart](chart.svg)

- **inflect-micro-v3 / cpu**: Explicit one-thread ONNX Runtime WASM; untimed PCM inference passed.
- **inflect-micro-v3 / webgpu**: Observed 1676 ONNX WebGPU dispatches during untimed model inference; source-filter DSP and final PCM assembly ran in JavaScript on CPU. Output tensors were read back to CPU; probe hooks were removed before timed work.

Comparison of separate native run receipts; no repetitions were pooled.

Input: 2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326

Input: 2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1

Read each source result for power, thermal, execution-order and other run-specific notes.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
