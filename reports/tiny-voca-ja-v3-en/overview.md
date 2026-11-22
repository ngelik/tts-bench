# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `9bda87dfd44d718d753075bcf7ba223915936b5c` (source fingerprint `b51d162146253c6f709e90ff625cf2e74180bb45eebd482d16c03c2f69bcea17`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Japanese v3 F2 4.54M FP32 | 73.10 s (73.10–73.13; n=3) | 27.16 s (26.93–27.25; n=3) | 841.01 ms (n=3) | 300.31 ms (n=3) | 1445.86 s / 0.051 | 1445.86 s / 0.019 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Japanese v3 F2 4.54M FP32 | 1383.26 MB (n=1; 145 samples) | 1472.38 MB (sampled max; n=1; 145 samples) | 2089.18 MB (n=1; 56 samples) | 2230.78 MB (sampled max; n=1; 56 samples) | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Japanese v3 F2 4.54M FP32 | [Report](../../results/2026-11-22t16-35-31-457z-tiny-voca-ja-v3-cpu-warm-b71fc77a/summary.md) | [Report](../../results/2026-11-22t16-40-36-069z-tiny-voca-ja-v3-webgpu-warm-cd78835b/summary.md) | [Report](../../results/2026-11-22t16-42-38-097z-tiny-voca-ja-v3-cpu-cached-6df6b372/summary.md) | [Report](../../results/2026-11-22t16-44-02-855z-tiny-voca-ja-v3-webgpu-cached-8a2c7435/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ja-v3) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
