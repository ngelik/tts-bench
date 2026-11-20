# 2026-11-20t14-25-16-804z-sano-kristin-gguf-webgpu-cached-9bc5cbe1

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-kristin-gguf | webgpu | measured | 155.72 s | 155.72–155.72 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-kristin-gguf | webgpu | First completed source chunk | 1981.825 | ms | 1 |
| sano-kristin-gguf | webgpu | First PCM block | 1981.810 | ms | 1 |
| sano-kristin-gguf | webgpu | Generated audio | 1175.157 | s | 1 |
| sano-kristin-gguf | webgpu | Generation / audio duration | 0.133 | ratio | 1 |
| sano-kristin-gguf | webgpu | Model initialization | 70.404 | ms | 1 |
| sano-kristin-gguf | webgpu | Complete controller trial including setup/export | 159262.631 | ms | 1 |
| sano-kristin-gguf | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| sano-kristin-gguf | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| sano-kristin-gguf | webgpu | Whole-call Chrome process-tree peak RSS | 2388197376 | bytes | 1 |
| sano-kristin-gguf | webgpu | Per-trial mean generation Chrome process-tree RSS | 1878487066 | bytes | 1 |
| sano-kristin-gguf | webgpu | In-window Chrome RSS observations | 310.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-kristin-gguf | 1 | 1 | 1 (en) | kristin (US English; Piper NFD phonemes with interleaved PAD) |

Individual pinned kristin-en-1p4m voice converted with Kokopop. One selected voice; 22050 Hz. Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU. CPU is cpu/wasm; GPU is webgpu+wasm with mandatory actual dispatch proof. Kokopop LONG\_FORM normalization and internal chunking are retained. No other voices are bundled. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/kristin-en-1p4m/manifest.json), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [3](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88).


![Generation chart](chart.svg)

- **sano-kristin-gguf / webgpu**: An eligible hardware WebGPU adapter was selected; ggml scheduler telemetry assigned named neural ops and GPUComputePassEncoder recorded dispatches during seeded selected-voice synthesis.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T14-25-16-307Z-7866ffaba698; cell 1/1; source 01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661; requested n=1; effective n=1; Separate native cached-resource diagnostic after the primary12 converted warm cells. One full English20k/93-span article, n=1 with --resources. Chrome RSS sampling belongs only to this cached run and does not alter previous warm timings. Same clean source, pinned weights/runtime/voice and actual baseline Apple M1 Pro/8cores/16GiB/headed Chrome157.0.8103.40. No cold measurement or warmup; preserve full native receipt, in-window Chrome process-tree RSS observations, effective backend and actual waveform. Require working backend and absence of any existing qualified cached measurement before admission. Native Kokopop frontend substitutions remain unchanged; see source-bound frontend-admission.json.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
