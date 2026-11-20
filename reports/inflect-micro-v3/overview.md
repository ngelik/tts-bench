# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `796a12747ad7c7ed79b3592dfa88c875629c0084` (source fingerprint `49ba933ebd70bfe7f17dcc5d67d57b486bd2025b0d50931c26d0d45864d118ab`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Inflect Micro v3 FP32 | 259.52 s (259.41–259.69; n=5) | 218.89 s (218.09–219.74; n=5) | 2702.74 ms (n=5) | 2263.44 ms (n=5) | 1289.03 s / 0.201 | 1289.03 s / 0.170 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Inflect Micro v3 FP32 | 939.74 MB (n=1; 525 samples) | 1230.65 MB (sampled max; n=1; 525 samples) | 1108.40 MB (n=1; 451 samples) | 1809.87 MB (sampled max; n=1; 451 samples) | 47.57 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Inflect Micro v3 FP32 | [Report](../../results/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326/summary.md) | [Report](../../results/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1/summary.md) | [Report](../../results/2026-11-19t11-14-33-448z-inflect-micro-v3-cpu-cached-2c490708/summary.md) | [Report](../../results/2026-11-19t13-58-17-329z-inflect-micro-v3-webgpu-cached-90200a0e/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#inflect-micro-v3) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
