# 2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-heart-gguf | cpu | measured | 39.17 s | 39.08–39.36 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-heart-gguf | cpu | First completed source chunk | 439.815 | ms | 5 |
| sano-heart-gguf | cpu | First PCM block | 439.800 | ms | 5 |
| sano-heart-gguf | cpu | Generated audio | 1330.012 | s | 5 |
| sano-heart-gguf | cpu | Generation / audio duration | 0.029 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-heart-gguf | 1 | 1 | 1 (en) | heart (US English; Misaki-normalized eSpeak IPA) |

Individual pinned heart voice converted with Kokopop. One selected voice; 24000 Hz. F32 GGUF from pinned Heart F32 source; Kokopop Vocos. CPU is cpu/wasm; GPU is webgpu+wasm with mandatory actual dispatch proof. Kokopop LONG\_FORM normalization and internal chunking are retained. No other voices are bundled. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/heart/meta.json), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [3](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88).


![Generation chart](chart.svg)

- **sano-heart-gguf / cpu**: Explicit CPU/WASM mode of the same Kokopop runtime and selected locked Sano GGUF.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T07-11-20-197Z-2ca177d0ca5b; cell 1/1; source 01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661; requested n=5; effective n=5; Native Apple M1 Pro 8 CPU cores/16 GiB, preserved headed Chrome 157.0.8103.40; exact public tested source; one excluded full English 20k/93-span warmup plus five scored articles; no RSS/cached measurement. Separate individual converted Kokopop F32 profile, voice heart, 24000 Hz. Speed1/base seed42+canonical span ID; pinned native LONG_FORM normalization/internal segmentation, pauses/crossfade and internal seeds retained. CPU then WebGPU per profile; separate fresh browser profile and shared compute lock per cell. No skipped input symbols across all93 audited spans. Native component substitutions to schwa are preserved: {}. This is frontend behavior, not an intelligibility claim; original output retained for listening. Counts are separate untimed diagnostic evidence, no altered inference runtime.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
