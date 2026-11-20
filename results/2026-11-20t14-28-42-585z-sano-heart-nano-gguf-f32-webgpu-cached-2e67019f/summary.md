# 2026-11-20t14-28-42-585z-sano-heart-nano-gguf-f32-webgpu-cached-2e67019f

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-heart-nano-gguf-f32 | webgpu | measured | 4.01 s | 4.01–4.01 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-heart-nano-gguf-f32 | webgpu | First completed source chunk | 148.675 | ms | 1 |
| sano-heart-nano-gguf-f32 | webgpu | First PCM block | 148.660 | ms | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Generated audio | 1303.496 | s | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Generation / audio duration | 0.003 | ratio | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Model initialization | 74.167 | ms | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Complete controller trial including setup/export | 7966.742 | ms | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Whole-call Chrome process-tree peak RSS | 1453883392 | bytes | 1 |
| sano-heart-nano-gguf-f32 | webgpu | Per-trial mean generation Chrome process-tree RSS | 1068817262 | bytes | 1 |
| sano-heart-nano-gguf-f32 | webgpu | In-window Chrome RSS observations | 7.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-heart-nano-gguf-f32 | 1 | 1 | 1 (en) | heartnano (US English; upstream Misaki-normalized eSpeak IPA frontend) |

Pinned Ampixa heartnano package converted to the separately named Kokopop F32 GGUF profile. One fixed heartnano US English voice is benchmarked at 24 kHz. The GGUF is F32 expanded from the exact pinned Q8 front/decoder blobs; this is distinct from the official Q8 browser configuration. Generation uses speed 1 and seed 42 + canonical chunk id. Kokopop applies the pinned Misaki-normalized eSpeak IPA frontend. The CPU profile is cpu/wasm; WebGPU is webgpu+wasm and requires actual hardware dispatch. Only English \(US\) eSpeak data is bundled. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/heartnano/meta.json), [3](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88), [4](https://github.com/Ampixa/sanoTTS/tree/939d982b9faa54cbcf5d24cc878f5cd514b2646e).


![Generation chart](chart.svg)

- **sano-heart-nano-gguf-f32 / webgpu**: An eligible hardware WebGPU adapter was selected; ggml scheduler telemetry assigned named neural ops and GPUComputePassEncoder recorded dispatches during seeded selected-voice synthesis.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T14-28-42-123Z-71630afa44be; cell 1/1; source 01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661; requested n=1; effective n=1; Separate native cached-resource diagnostic after the primary12 converted warm cells. One full English20k/93-span article, n=1 with --resources. Chrome RSS sampling belongs only to this cached run and does not alter previous warm timings. Same clean source, pinned weights/runtime/voice and actual baseline Apple M1 Pro/8cores/16GiB/headed Chrome157.0.8103.40. No cold measurement or warmup; preserve full native receipt, in-window Chrome process-tree RSS observations, effective backend and actual waveform. Require working backend and absence of any existing qualified cached measurement before admission. Native Kokopop frontend substitutions remain unchanged; see source-bound frontend-admission.json.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
