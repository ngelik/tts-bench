# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `e8b4600bfb29c562fbab4d4fb9f3c4dc9bb994d4` (source fingerprint `1b185f9e1ddd6fa17c96951f353df6090fe0e07caae937fd99945aa4d2793f61`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ar-article-v1`, 28,275 characters / 129 chunks, SHA-256 `3421fd109af55f52743b89b377a81e55e9ed524bd717f334d81638fc091f94d5`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 28,275-character article (129 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Arabic Halabi F2 (FP32) | 94.98 s (94.91–95.00; n=3) | 79.59 s (79.53–80.29; n=3) | 289.35 ms (n=3) | 228.39 ms (n=3) | 2034.34 s / 0.047 | 2034.34 s / 0.039 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Arabic Halabi F2 (FP32) | 1271.61 MB (n=1; 190 samples) | 1744.99 MB (sampled max; n=1; 190 samples) | 1328.26 MB (n=1; 159 samples) | 1596.98 MB (sampled max; n=1; 159 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Arabic Halabi F2 (FP32) | [Report](../../results/2026-11-23t05-22-26-884z-tiny-voca-ar-halabi-cpu-warm-f9178859/summary.md) | [Report](../../results/2026-11-23t05-29-00-720z-tiny-voca-ar-halabi-webgpu-warm-82fdd147/summary.md) | [Report](../../results/2026-11-23t05-34-32-960z-tiny-voca-ar-halabi-cpu-cached-823d438d/summary.md) | [Report](../../results/2026-11-23t05-36-20-697z-tiny-voca-ar-halabi-webgpu-cached-4ad40656/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ar-halabi) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
