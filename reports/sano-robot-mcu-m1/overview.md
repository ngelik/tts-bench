# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `7f9b7982e5336be8642f91404584114371582fcd` (source fingerprint `662279cddb19fe0853408d2ed7d38659012c1096ab83ad54dc3907a1a69ce53a`), on Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU not reported. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| SanoTTS Robot MCU INT8 (English, US) | 28.06 s (28.04–28.13; n=5) | Unsupported | 94.58 ms (n=5) | Unsupported | 1131.68 s / 0.025 | Unsupported |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| SanoTTS Robot MCU INT8 (English, US) | 835.66 MB (n=1; 56 samples) | 887.72 MB (sampled max; n=1; 56 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 0.68 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| SanoTTS Robot MCU INT8 (English, US) | [Report](../../results/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8/summary.md) | [Report](../../results/2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf/summary.md) | [Report](../../results/2026-11-19t09-36-45-778z-sano-robot-mcu-cpu-cached-0c917edc/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-robot-mcu) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

Reasons are listed once per model, backend, status and reason; the receipt table above retains links for every submitted cell.

| Model | Backend | Status | Reason | Source receipt |
|---|---|---|---|---|
| sano-robot-mcu | webgpu | Unsupported | The pinned official SanoTTS Robot/Trellis browser path is CPU WebAssembly; it does not implement WebGPU dispatch. | [Report](../../results/2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf/summary.md) |


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
