# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `5bbac603e361df0789e4a1a72f30d5fc9f1c7143` (source fingerprint `d4962cd62f6f5f4db736c6422b0211ffaea83a10064f1d497d9b9f7e75ce5cc5`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `pt-br-article-v1`, 22,164 characters / 101 chunks, SHA-256 `718c92e50ffeb66db7fa088018ff7860c3824348a6db5917be40d6d2cd6eb686`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,164-character article (101 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Broca Brazilian Portuguese F1 (FP32) | 79.37 s (79.35–79.38; n=3) | 57.11 s (57.10–57.23; n=3) | 175.99 ms (n=3) | 160.34 ms (n=3) | 1529.74 s / 0.052 | 1529.74 s / 0.037 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Broca Brazilian Portuguese F1 (FP32) | 1784.97 MB (n=1; 158 samples) | 1921.74 MB (sampled max; n=1; 158 samples) | 1661.23 MB (n=1; 114 samples) | 2003.35 MB (sampled max; n=1; 114 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Broca Brazilian Portuguese F1 (FP32) | [Report](../../results/2026-11-23t04-09-39-454z-tiny-broca-cpu-warm-738f8a1a/summary.md) | [Report](../../results/2026-11-23t04-15-08-824z-tiny-broca-webgpu-warm-7c717bac/summary.md) | [Report](../../results/2026-11-23t04-19-09-670z-tiny-broca-cpu-cached-f872e621/summary.md) | [Report](../../results/2026-11-23t04-20-40-410z-tiny-broca-webgpu-cached-44cca439/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-broca) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
