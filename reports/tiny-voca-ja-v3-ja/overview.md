# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `a96392aac7a5e80686a3b5507e5d4532da5d7bd9` (source fingerprint `ea0a8f00784f7e1d6acfe481016486d688552199462fa5d15964004d9773a4a9`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ja-article-v1`, 8,399 characters / 38 chunks, SHA-256 `288437490ed89136edf80153031e936e6a33aebba80760b2cfb7287fc98504b6`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 8,399-character article (38 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Japanese v3 F2 4.54M FP32 | 76.70 s (76.70–76.80; n=3) | 27.99 s (27.89–28.26; n=3) | 2065.84 ms (n=3) | 653.25 ms (n=3) | 1510.46 s / 0.051 | 1510.46 s / 0.019 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Japanese v3 F2 4.54M FP32 | 2256.86 MB (n=1; 153 samples) | 2391.70 MB (sampled max; n=1; 153 samples) | 2680.03 MB (n=1; 58 samples) | 2836.97 MB (sampled max; n=1; 58 samples) | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Japanese v3 F2 4.54M FP32 | [Report](../../results/2026-11-22t16-16-42-975z-tiny-voca-ja-v3-cpu-warm-c733bdcf/summary.md) | [Report](../../results/2026-11-22t16-22-11-279z-tiny-voca-ja-v3-webgpu-warm-f806d007/summary.md) | [Report](../../results/2026-11-22t16-24-25-697z-tiny-voca-ja-v3-cpu-cached-b421da27/summary.md) | [Report](../../results/2026-11-22t16-26-03-040z-tiny-voca-ja-v3-webgpu-cached-b5525f44/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ja-v3) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
