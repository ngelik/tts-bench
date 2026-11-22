# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `b61a139d470464f8bbbd0e9088242122f0a21d80` (source fingerprint `dc2672e02441aae8ccaa43eb98b95c06ccb729492267c314a05197193c6c1b81`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple / metal-3. Fixture: `ru-article-v1`, 20,732 characters / 95 chunks, SHA-256 `14bd6d91b7738d8f3e275885d235540a362f5bf956294e3dfb779e0f3e5abf2f`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` or `waveformExecutionProviders` identify the selected runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,732-character article (95 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Russian M | 68.00 s (67.92–68.01; n=3) | 53.87 s (53.86–53.88; n=3) | 181.36 ms (n=3) | 166.12 ms (n=3) | 1355.18 s / 0.050 | 1355.18 s / 0.040 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Russian M | 1892.80 MB (n=1; 136 samples) | 1986.99 MB (sampled max; n=1; 136 samples) | 1696.58 MB (n=1; 109 samples) | 1803.63 MB (sampled max; n=1; 109 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Russian M | [Report](../../results/2026-11-22t18-32-32-311z-tiny-voca-ru-cpu-warm-ec443147/summary.md) | [Report](../../results/2026-11-22t18-37-17-189z-tiny-voca-ru-webgpu-warm-bc7a5c22/summary.md) | [Report](../../results/2026-11-22t18-41-07-258z-tiny-voca-ru-cpu-cached-fa5685ae/summary.md) | [Report](../../results/2026-11-22t18-42-27-395z-tiny-voca-ru-webgpu-cached-58ba502e/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ru) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
