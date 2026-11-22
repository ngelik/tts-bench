# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `fafe7d9cbe032012ed7702f683d721a6c6b7c46c` (source fingerprint `22a759d79dc95bc9932abb540f46a370f171904c88049db6142b34547d847498`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `es-es-article-v1`, 22,965 characters / 105 chunks, SHA-256 `8acee2d2fe70fb184d7a3f30e000d4a7cf5a9e09fc7523f32e958e7b1451653e`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,965-character article (105 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Spanish F2 (FP32) | 88.36 s (88.30–88.40; n=3) | 32.99 s (32.99–33.04; n=3) | 204.87 ms (n=3) | 92.62 ms (n=3) | 1630.22 s / 0.054 | 1630.22 s / 0.020 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Spanish F2 (FP32) | 1194.73 MB (n=1; 176 samples) | 1293.86 MB (sampled max; n=1; 176 samples) | 1682.82 MB (n=1; 66 samples) | 1816.77 MB (sampled max; n=1; 66 samples) | 21.38 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Spanish F2 (FP32) | [Report](../../results/2026-11-22t21-54-12-758z-tiny-voca-es-cpu-warm-b0e974be/summary.md) | [Report](../../results/2026-11-22t22-00-15-331z-tiny-voca-es-webgpu-warm-4e0436e6/summary.md) | [Report](../../results/2026-11-22t22-02-37-182z-tiny-voca-es-cpu-cached-000a0b96/summary.md) | [Report](../../results/2026-11-22t22-04-14-320z-tiny-voca-es-webgpu-cached-e25ba3ea/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-es) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
