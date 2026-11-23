# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `8c5c2147261d43b373c711334409f62857065e4d` (source fingerprint `20508c0ecd609f68ae8757d46c5615a1b32fc0f47caf35ad7de3173236d8f11d`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `fr-article-v1`, 23,757 characters / 108 chunks, SHA-256 `4383169bb50c860cac854434fde77b93b72bba73443a445d32764cc16688b196`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` or `waveformExecutionProviders` identify the selected runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,757-character article (108 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca French FR_F1 (FP32) | Not submitted | 32.54 s (32.45–32.60; n=3) | Not submitted | 88.83 ms (n=3) | Not submitted | 1411.15 s / 0.023 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca French FR_F1 (FP32) | Not submitted | Not submitted | 1992.41 MB (n=1; 65 samples) | 2129.12 MB (sampled max; n=1; 65 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca French FR_F1 (FP32) | Not submitted | [Report](../../results/2026-11-23t00-14-27-187z-tiny-voca-fr-webgpu-warm-19a53912/summary.md) | Not submitted | [Report](../../results/2026-11-23t00-18-24-402z-tiny-voca-fr-webgpu-cached-2d12d0c6/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-fr) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
