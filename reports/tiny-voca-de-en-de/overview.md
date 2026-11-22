# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `fc90112669fe6fff8663a853d17d06cfaf4d6ce7` (source fingerprint `72ba6c81d61d79ed3fa49c677409152c8f36ae0dc95822979b10aa738a6b7ed7`), on MacBook Pro 18,3 / Apple M1 Pro 8-core / 16 GB / arm64 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `de-article-v1`, 23,885 characters / 109 chunks, SHA-256 `f171154d19dc0598f221e45f15365be632ed8d275eb07822c2134971190d0931`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,885-character article (109 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca DE/EN 4.6M (Voca64) | 72.53 s (72.53–72.60; n=3) | 22.88 s (22.84–22.88; n=3) | 228.82 ms (n=3) | 80.44 ms (n=3) | 1553.64 s / 0.047 | 1553.64 s / 0.015 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca DE/EN 4.6M (Voca64) | 1094.16 MB (n=1; 147 samples) | 1223.54 MB (sampled max; n=1; 147 samples) | 1437.48 MB (n=1; 49 samples) | 1590.03 MB (sampled max; n=1; 49 samples) | 21.49 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca DE/EN 4.6M (Voca64) | [Report](../../results/2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be/summary.md) | [Report](../../results/2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567/summary.md) | [Report](../../results/2026-11-22t07-06-16-939z-tiny-voca-de-en-cpu-cached-6982d19e/summary.md) | [Report](../../results/2026-11-22t07-07-40-234z-tiny-voca-de-en-webgpu-cached-78525d07/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-de-en) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
