# 2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-hfc-gguf | cpu | measured | 901.17 s | 901.11–901.32 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-hfc-gguf | cpu | First completed source chunk | 10173.835 | ms | 5 |
| sano-hfc-gguf | cpu | First PCM block | 10173.815 | ms | 5 |
| sano-hfc-gguf | cpu | Generated audio | 1052.399 | s | 5 |
| sano-hfc-gguf | cpu | Generation / audio duration | 0.856 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-hfc-gguf | 1 | 1 | 1 (en) | hfc (US English; Piper NFD phonemes with interleaved PAD) |

Individual pinned hfc-en-1p8m voice converted with Kokopop. One selected voice; 22050 Hz. Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU. CPU is cpu/wasm; GPU is webgpu+wasm with mandatory actual dispatch proof. Kokopop LONG\_FORM normalization and internal chunking are retained. No other voices are bundled. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/hfc-en-1p8m/manifest.json), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [3](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88).


![Generation chart](chart.svg)

- **sano-hfc-gguf / cpu**: Explicit CPU/WASM mode of the same Kokopop runtime and selected locked Sano GGUF.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T05-11-11-752Z-9ac222ebe0f9; cell 1/1; source 01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661; requested n=5; effective n=5; Native Apple M1 Pro 8 CPU cores/16 GiB, preserved headed Chrome 157.0.8103.40; exact public tested source; one excluded full English 20k/93-span warmup plus five scored articles; no RSS/cached measurement. Separate individual converted Kokopop F16,F32 profile, voice hfc, 22050 Hz. Speed1/base seed42+canonical span ID; pinned native LONG_FORM normalization/internal segmentation, pauses/crossfade and internal seeds retained. CPU then WebGPU per profile; separate fresh browser profile and shared compute lock per cell. No skipped input symbols across all93 audited spans. Native component substitutions to schwa are preserved: {"duration": [{"sourceId": 144, "symbol": "̩", "codepoints": ["U+0329"], "replacementId": 59, "replacementSymbol": "ə", "count": 5}, {"sourceId": 150, "symbol": "\"", "codepoints": ["U+0022"], "replacementId": 59, "replacementSymbol": "ə", "count": 52}], "acoustic": [{"sourceId": 150, "symbol": "\"", "codepoints": ["U+0022"], "replacementId": 59, "replacementSymbol": "ə", "count": 52}]}. This is frontend behavior, not an intelligibility claim; original output retained for listening. Counts are separate untimed diagnostic evidence, no altered inference runtime.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
