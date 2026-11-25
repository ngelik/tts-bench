# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `02e06ca8b35a8e0bc3833822350935acec166c75` (source fingerprint `49fcc7b24edaa696ddf5956d88a6e08f50e946f6ee2e97bf712d489b606bb51e`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU apple. Fixture: `fa-article-v1`, 18,805 characters / 86 chunks, SHA-256 `17d9ce8d7038eb0be3f6b772e8dd47c0acc68bcad6bf64616b9c84bafa2c204a`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 18,805-character article (86 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Ava Persian Parisa (FP32) | Not submitted | 406.85 s (406.72–407.07; n=3) | Not submitted | 916.74 ms (n=3) | Not submitted | 1560.83 s / 0.261 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Ava Persian Parisa (FP32) | Not submitted | Not submitted | 1074.31 MB (n=1; 815 samples) | 1316.77 MB (sampled max; n=1; 815 samples) | 30.13 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Ava Persian Parisa (FP32) | Not submitted | [Report](../../results/2026-11-25t02-09-37-256z-tiny-voca-fa-webgpu-warm-494d790f/summary.md) | Not submitted | [Report](../../results/2026-11-25t02-44-04-633z-tiny-voca-fa-webgpu-cached-3318b625/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-fa) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
