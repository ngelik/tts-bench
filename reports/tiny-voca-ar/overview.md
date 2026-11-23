# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `cf9b05a408ecce9e0ed7ecc1ea8a8504a545bbc9` (source fingerprint `75a09e80b30fd675fce932499d8a1608a071fab46022974140ea5319cafc92c3`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ar-article-v1`, 28,275 characters / 129 chunks, SHA-256 `3421fd109af55f52743b89b377a81e55e9ed524bd717f334d81638fc091f94d5`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` or `waveformExecutionProviders` identify the selected runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 28,275-character article (129 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Arabic M2 (FP32) | 140.48 s (140.43–140.48; n=3) | 91.11 s (91.07–91.22; n=3) | 1416.84 ms (n=3) | 816.05 ms (n=3) | 2428.61 s / 0.058 | 2428.61 s / 0.038 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Arabic M2 (FP32) | 2034.88 MB (n=1; 280 samples) | 2185.67 MB (sampled max; n=1; 280 samples) | 1802.94 MB (n=1; 182 samples) | 1931.53 MB (sampled max; n=1; 182 samples) | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Arabic M2 (FP32) | [Report](../../results/2026-11-23t06-16-48-416z-tiny-voca-ar-cpu-warm-cde348f7/summary.md) | [Report](../../results/2026-11-23t06-26-27-304z-tiny-voca-ar-webgpu-warm-978a9a1e/summary.md) | [Report](../../results/2026-11-23t06-32-47-973z-tiny-voca-ar-cpu-cached-988588bc/summary.md) | [Report](../../results/2026-11-23t06-35-23-186z-tiny-voca-ar-webgpu-cached-248f99e1/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ar) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
