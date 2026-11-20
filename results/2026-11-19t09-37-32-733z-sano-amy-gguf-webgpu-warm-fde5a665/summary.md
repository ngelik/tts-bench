# 2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-amy-gguf | webgpu | measured | 173.41 s | 173.04–173.79 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-amy-gguf | webgpu | First completed source chunk | 2001.050 | ms | 5 |
| sano-amy-gguf | webgpu | First PCM block | 2001.040 | ms | 5 |
| sano-amy-gguf | webgpu | Generated audio | 1312.830 | s | 5 |
| sano-amy-gguf | webgpu | Generation / audio duration | 0.132 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-amy-gguf | 1 | 1 | 1 (en) | amy (US English; Piper NFD phonemes with interleaved PAD) |

Individual pinned amy-en-1p46m voice converted with Kokopop. One selected voice; 22050 Hz. Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU. CPU is cpu/wasm; GPU is webgpu+wasm with mandatory actual dispatch proof. Kokopop LONG\_FORM normalization and internal chunking are retained. No other voices are bundled. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p46m/manifest.json), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [3](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88).


![Generation chart](chart.svg)

- **sano-amy-gguf / webgpu**: An eligible hardware WebGPU adapter was selected; ggml scheduler telemetry assigned named neural ops and GPUComputePassEncoder recorded dispatches during seeded selected-voice synthesis.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T09-37-32-213Z-ac7fc4ee90ae; cell 1/1; source 01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661; requested n=5; effective n=5; Native Apple M1 Pro 8 CPU cores/16 GiB, preserved headed Chrome 157.0.8103.40; exact public tested source; one excluded full English 20k/93-span warmup plus five scored articles; no RSS/cached measurement. Separate individual converted Kokopop F16,F32 profile, voice amy, 22050 Hz. Speed1/base seed42+canonical span ID; pinned native LONG_FORM normalization/internal segmentation, pauses/crossfade and internal seeds retained. CPU then WebGPU per profile; separate fresh browser profile and shared compute lock per cell. No skipped input symbols across all93 audited spans. Native component substitutions to schwa are preserved: {"duration": [{"sourceId": 144, "symbol": "̩", "codepoints": ["U+0329"], "replacementId": 59, "replacementSymbol": "ə", "count": 5}, {"sourceId": 150, "symbol": "\"", "codepoints": ["U+0022"], "replacementId": 59, "replacementSymbol": "ə", "count": 52}], "acoustic": [{"sourceId": 150, "symbol": "\"", "codepoints": ["U+0022"], "replacementId": 59, "replacementSymbol": "ə", "count": 52}]}. This is frontend behavior, not an intelligibility claim; original output retained for listening. Counts are separate untimed diagnostic evidence, no altered inference runtime.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
