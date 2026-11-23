# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `16bdd280e2fa8296f6e9ecfcfd062bf0ec66a765` (source fingerprint `2c97d4d29fc7271f35d83680108fab2633850103ed59e876e8ad8865f9f18d83`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ar-article-v1`, 28,275 characters / 129 chunks, SHA-256 `3421fd109af55f52743b89b377a81e55e9ed524bd717f334d81638fc091f94d5`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 28,275-character article (129 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Arabic CATT a000 (FP32) | 87.59 s (87.59–88.67; n=3) | 64.50 s (64.33–64.56; n=3) | 771.90 ms (n=3) | 470.76 ms (n=3) | 1728.47 s / 0.051 | 1728.47 s / 0.037 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Arabic CATT a000 (FP32) | 1241.12 MB (n=1; 1056 samples) | 2099.53 MB (sampled max; n=1; 1056 samples) | 1432.88 MB (n=1; 1026 samples) | 1824.69 MB (sampled max; n=1; 1026 samples) | 114.11 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Arabic CATT a000 (FP32) | [Report](../../results/2026-11-23t07-52-37-888z-tiny-voca-arabic-cpu-warm-60b19222/summary.md) | [Report](../../results/2026-11-23t08-06-09-230z-tiny-voca-arabic-webgpu-warm-4abbd0ea/summary.md) | [Report](../../results/2026-11-23t08-18-16-758z-tiny-voca-arabic-cpu-cached-5205f2aa/summary.md) | [Report](../../results/2026-11-23t08-27-26-546z-tiny-voca-arabic-webgpu-cached-1ffa362a/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-arabic) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
