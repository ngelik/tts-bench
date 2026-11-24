# 2026-11-24t23-17-36-306z-tiny-voca-zh-blue-buff-webgpu-warm-a816facc

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-zh-blue-buff | webgpu | measured | 13.07 s | 12.92–13.11 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-zh-blue-buff | webgpu | First completed source chunk | 451.545 | ms | 3 |
| tiny-voca-zh-blue-buff | webgpu | First PCM block | 128.545 | ms | 3 |
| tiny-voca-zh-blue-buff | webgpu | Generated audio | 1250.283 | s | 3 |
| tiny-voca-zh-blue-buff | webgpu | Generation / audio duration | 0.010 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-zh-blue-buff | 2 | 2 | 1 (zh-Hans) | F |

Pinned Blue-Buff tiny-voca-zh FP32 checkpoint bundles voices F and M; this qualified browser profile selects F at graph index 0 for Simplified Chinese, 24 kHz mono.. The browser frontend uses the pinned per-span Pyodide phonemizer and checked dictionary/dependency notices. Native and browser plans must match the independent frontend receipts. The direct acoustic control qualifies only three spans and does not establish a benchmark result or listening quality. Sources: [1](https://huggingface.co/songLucasXXX/tiny-voca-zh/tree/9d6b4631bd59b1fa69b398913b852d03f22071d2), [2](https://github.com/blue-buff/tiny-voca-zh/tree/8b3fb5b460e828a90913edc28f3f1ddc51a66127).


![Generation chart](chart.svg)

- **tiny-voca-zh-blue-buff / webgpu**: Observed 2280 dispatch(es) in a separate WebGPU capability synthesis; WASM remains an explicit fallback for unsupported operators.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-24T23-11-44-741Z-251e85f51339; cell 2/4; source 939917ac5bc6b4e310a5ad6a49b485120d929a5a; fixture zh-hans-article-v1 (zh-Hans, 6570 JavaScript characters, 30 spans); requested n=3; effective n=3; Headed Google Chrome, Apple M1 Pro, AC power. Published tiny-voca-zh-blue-buff, F, FP32 ONNX checkpoint. Qualified backends: cpu, webgpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
