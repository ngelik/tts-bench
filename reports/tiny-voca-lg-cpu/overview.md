# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `abf55cecbaff617762d6bfdd4a3b47ad231fc414` (source fingerprint `c63f0bf90d953466244154fb0b9e6ae2f42cf224326c9664168ab9d9ef94757d`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `lg-article-v1`, 25,641 characters / 117 chunks, SHA-256 `484bdc44ec7a0bfabf0198a081897f993f690e8ff36d6667029e8f982e50bd9e`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 25,641-character article (117 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Luganda F2 | 102.81 s (102.80–102.84; n=3) | Not submitted | 284.67 ms (n=3) | Not submitted | 1907.42 s / 0.054 | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Luganda F2 | 1331.39 MB (n=1; 204 samples) | 1457.55 MB (sampled max; n=1; 204 samples) | Not submitted | Not submitted | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Luganda F2 | [Report](../../results/2026-11-24t12-22-06-303z-tiny-voca-lg-cpu-warm-a29a6b42/summary.md) | Not submitted | [Report](../../results/2026-11-24t12-31-43-246z-tiny-voca-lg-cpu-cached-16b52b0e/summary.md) | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-lg) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
