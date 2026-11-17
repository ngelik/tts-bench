# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `6ad6b9f4f062c77514e1fc8da4254327b2cf2e59` (source fingerprint `5091889c8a93f2c87d20ad2a098849fe9723875b63a1d3bec1568d318f14aeaf`), on MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca 4.5M | 54.86 s (54.80–54.88; n=5) | 21.47 s (21.45–21.49; n=5) | 159.07 ms (n=5) | 86.07 ms (n=5) | 1152.39 s / 0.048 | 1152.39 s / 0.019 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca 4.5M | 1294.69 MB (n=1; 109 samples) | 1344.55 MB (sampled max; n=1; 109 samples) | 2349.25 MB (n=1; 43 samples) | 2451.32 MB (sampled max; n=1; 43 samples) | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca 4.5M | [Report](../../results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [Report](../../results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | [Report](../../results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [Report](../../results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
