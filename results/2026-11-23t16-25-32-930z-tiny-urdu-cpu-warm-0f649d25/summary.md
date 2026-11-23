# 2026-11-23t16-25-32-930z-tiny-urdu-cpu-warm-0f649d25

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-urdu | cpu | measured | 73.24 s | 73.23–73.31 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-urdu | cpu | First completed source chunk | 716.265 | ms | 3 |
| tiny-urdu | cpu | First PCM block | 231.765 | ms | 3 |
| tiny-urdu | cpu | Generated audio | 1511.141 | s | 3 |
| tiny-urdu | cpu | Generation / audio duration | 0.048 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-urdu | 1 | 1 | 1 (ur) | M2 |

Pinned zafar205/tiny-urdu-tts-4.5-million-parameters checkpoint, Roman Urdu input \(ur-Latn\), Urdu speech, M2/index 1, 24 kHz mono FP32.. The model card reports 4.5 million parameters; the registered exact count is the 4,545,739 logical scalar values across pinned ONNX initializer tensor shapes, including any graph constants, and is not asserted as a trainable-only count. The stock frontend audit covers ur-latn-article-v1: 103 ordered spans, 319 utterances, maximum 177 tokens, zero unknown token IDs, zero nonzero stress values, digest ef4562f72d6725d8f5a9b2a50644e914bcdd1b768b2baaffb38e64e57e5f9161. Roman Urdu uses Urdu phonemizer rules; common English loanwords are read with those Urdu rules, not as an English route. Urdu-script input is unsupported. Independent headed Chrome qualification tested stock 1.17.3 CPU and matched 1.31.1 CPU/WebGPU settings; the registered adapter uses 1.31.1 on both backends. Sources: [1](https://huggingface.co/zafar205/tiny-urdu-tts-4.5-million-parameters/tree/4fe6566118972ea0d44b517f413191e0e30f5880), [2](https://huggingface.co/zafar205/tiny-urdu-tts-4.5-million-parameters/blob/4fe6566118972ea0d44b517f413191e0e30f5880/README.md), [3](https://github.com/Zafar205/tiny-urdu/tree/5770756e05f33591eab29498a47f6644664beae7), [4](https://github.com/Zafar205/tiny-urdu/blob/5770756e05f33591eab29498a47f6644664beae7/web/lib/urdu.ts), [5](https://huggingface.co/datasets/kaab4321/UrduTTS/tree/f5c50b7aaabd4325bfe33617232203ad02e30f97), [6](https://github.com/microsoft/onnxruntime/tree/v1.31.1).


![Generation chart](chart.svg)

- **tiny-urdu / cpu**: Explicit ONNX Runtime Web 1.31.1 single-thread WASM provider with CPU memory arena and memory pattern disabled.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T16-25-32-219Z-98f5a9c7732d; cell 1/4; source 54408783d9ba80b002a90ebb8106bb03ba43176f; fixture ur-latn-article-v1 (ur-Latn, 22486 JavaScript characters, 103 spans); requested n=3; effective n=3; Headed Google Chrome on Apple M1 Pro under AC power and sequential disposable profiles. Exact original Tiny Urdu FP32 browser graph, M2/index one, speed 1, pitch shift zero, range one, 24 kHz. Original pinned Roman Urdu TypeScript port compiled by erasing types, stock punctuation sentence splitting and recursive 500-token fit, a 150 ms inter-utterance gap within each source span, stock 0.99 span peak cap. ONNX Runtime Web 1.31.1 on both routes, one WASM thread or Apple hardware WebGPU plus WASM asyncify with synchronized CPU PCM readback, stock basic graph optimization with CPU arena and memory pattern disabled.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
