# 2026-11-23t13-32-59-104z-tiny-swara-webgpu-warm-1ae9d42b

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-swara | webgpu | measured | 74.10 s | 73.86–74.28 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-swara | webgpu | First completed source chunk | 834.735 | ms | 3 |
| tiny-swara | webgpu | First PCM block | 260.700 | ms | 3 |
| tiny-swara | webgpu | Generated audio | 1576.437 | s | 3 |
| tiny-swara | webgpu | Generation / audio duration | 0.047 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-swara | 2 | 2 | 1 (bn) | BF |

Pinned Bengali checkpoint only. BF/index 0 is the benchmark default; BM/index 1 is the alternate bundled voice. Latin code-mix routes are frontend behavior, not additional supported model languages.. The pinned Bengali fixture frontend oracle covers 89 spans and 305 sentence plans, maximum 220 tokens, 2,908 primary-stress marks and zero unknown phones. This is a text frontend audit, not a pronunciation review. Config frontend fingerprint 54cece4f… differs from the complete release inventory fingerprint 9b2e2c14… because the latter adds code-mix fallback entries; native fixture token/stress outputs match. The graph includes RandomNormalLike, so repeated PCM is stochastic. Model card requests Rasa attribution/terms for redistributed derived audio. Sources: [1](https://huggingface.co/Xeven7/tiny-swara/tree/9432a340c46249c8acae4ff4b062d46b9cbd1991), [2](https://github.com/espeak-ng/espeak-ng/tree/4870adfa25b1a32b4361592f1be8a40337c58d6c), [3](https://github.com/microsoft/onnxruntime/tree/v1.31.1), [4](https://huggingface.co/datasets/ai4bharat/Rasa).


![Generation chart](chart.svg)

- **tiny-swara / webgpu**: Observed 2670 WebGPU compute dispatches from ONNX Runtime Web 1.31.1; WASM fallback remains available.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T13-27-15-873Z-f18c2c264537; cell 2/4; source 680bbce8b9fe50c383ba4c86ea2997c9b749d77c; fixture bn-article-v1 (bn, 19455 JavaScript characters, 89 spans); requested n=3; effective n=3; Headed Google Chrome on Apple M1 Pro under AC power; sequential disposable profiles. Xeven7 Tiny Swara release default INT8 graph, BF/index zero, 24 kHz, speed 1, pitch shift 0, pitch range 1. Exact released Bengali frontend and pinned eSpeak NG 1.52.0 WASM executing live within each article, with original sentence splitting, 0.9 per-sentence peak normalization, and no inserted gap. Same ONNX Runtime Web 1.31.1 version on both routes: one CPU/WASM thread or hardware Apple WebGPU+WASM with explicit synchronized readback.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
