# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `448eba5382c28247e98d389e151a1983a109d8ce` (source fingerprint `0a4183837856b225855cb4119e26ad4c7729e4bd122af828e5aa3bcc7c6bab75`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU not reported. Fixture: `uk-article-v1`, 19,980 characters / 92 chunks, SHA-256 `542130c28a312d8e29d4ab7615280bcb661d8c1d8f74e8f2d9c298e4eaceff40`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,980-character article (92 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Supertonic 3 FP32 (M3) | 1515.35 s (1515.18–1516.60; n=3) | Not submitted | 13780.29 ms (n=3) | Not submitted | 1298.80 s / 1.167 | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Supertonic 3 FP32 (M3) | Not submitted | Not submitted | Not submitted | Not submitted | 398.08 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Supertonic 3 FP32 (M3) | [Report](../../results/2026-11-24t09-41-28-236z-supertonic-3-cpu-warm-6baf9686/summary.md) | Not submitted | Not submitted | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#supertonic-3) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
