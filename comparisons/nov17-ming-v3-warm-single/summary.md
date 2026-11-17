# native-benchmark-comparison

MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Comparison of separate native harness runs.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| ming-3.0-tts-0.5b-gguf | cpu | measured | 7539.10 s | 7539.10–7539.10 s | 1 |
| ming-3.0-tts-0.5b-gguf | webgpu | measured | 5233.21 s | 5233.21–5233.21 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| ming-3.0-tts-0.5b-gguf | cpu | First completed source chunk | 91544.620 | ms | 1 |
| ming-3.0-tts-0.5b-gguf | cpu | First PCM block | 91539.090 | ms | 1 |
| ming-3.0-tts-0.5b-gguf | cpu | Generated audio | 1058.700 | s | 1 |
| ming-3.0-tts-0.5b-gguf | cpu | Generation / audio duration | 7.121 | ratio | 1 |
| ming-3.0-tts-0.5b-gguf | webgpu | First completed source chunk | 64551.400 | ms | 1 |
| ming-3.0-tts-0.5b-gguf | webgpu | First PCM block | 64546.030 | ms | 1 |
| ming-3.0-tts-0.5b-gguf | webgpu | Generated audio | 1054.800 | s | 1 |
| ming-3.0-tts-0.5b-gguf | webgpu | Generation / audio duration | 4.961 | ratio | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| ming-3.0-tts-0.5b-gguf | 117 | 1 | 7 | US_James built-in voice (English) |
| ming-3.0-tts-0.5b-gguf | 117 | 1 | 7 | US_James built-in voice (English) |

Named base speakers in the upstream checkpoint catalog. The benchmark adapter exposes one fixed English voice.. US\_James is the sole benchmarked voice. The count deduplicates named base voices and excludes emotion variants, voice cloning and voice design. Sources: [1](https://github.com/inclusionAI/Ming-3.0-tts/blob/e999c39fa676722aaa9ea29b5aa19a90525b271f/cookbooks/instruction_en.md#built-in-premium-voices), [2](https://huggingface.co/audio-cpp/Ming-3.0-TTS-0.5B-GGUF/blob/2eb8d37c7f10672e69c8aa33091baa04c461b66c/README.md), [3](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/docs/models/ming3_tts.md).


Named base speakers in the upstream checkpoint catalog. The benchmark adapter exposes one fixed English voice.. US\_James is the sole benchmarked voice. The count deduplicates named base voices and excludes emotion variants, voice cloning and voice design. Sources: [1](https://github.com/inclusionAI/Ming-3.0-tts/blob/e999c39fa676722aaa9ea29b5aa19a90525b271f/cookbooks/instruction_en.md#built-in-premium-voices), [2](https://huggingface.co/audio-cpp/Ming-3.0-TTS-0.5B-GGUF/blob/2eb8d37c7f10672e69c8aa33091baa04c461b66c/README.md), [3](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/docs/models/ming3_tts.md).


![Generation chart](chart.svg)

- **ming-3.0-tts-0.5b-gguf / cpu**: Explicit CPU audio.cpp backend; separate untimed synthesis probe returned finite PCM.
- **ming-3.0-tts-0.5b-gguf / webgpu**: Observed 1540847 WebGPU dispatches during untimed synthesis with finite CPU-readable PCM. Hooks were installed before runtime init and the probe is outside generation timing.

Comparison of separate native run receipts; no repetitions were pooled.

Input: 2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112

Input: 2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29

Read each source result for power, thermal, execution-order and other run-specific notes.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
