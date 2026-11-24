# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `2581937c17b500bda80cb158cd86a0c804149026` (source fingerprint `f8076a363297b8531c641efc210304a52c37c61875d9e5d7356dbd1d8e08cd5e`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `pt-pt-article-v1`, 23,265 characters / 106 chunks, SHA-256 `08e524e4a56f05d9a8b6f043bc91accfd6dfc94156601213f4c9ae53585573c7`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,265-character article (106 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca European Portuguese F3 (FP32) | 66.15 s (66.06–66.23; n=3) | Not submitted | 167.03 ms (n=3) | Not submitted | 1344.83 s / 0.049 | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca European Portuguese F3 (FP32) | 1086.49 MB (n=1; 134 samples) | 1458.83 MB (sampled max; n=1; 134 samples) | Not submitted | Not submitted | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca European Portuguese F3 (FP32) | [Report](../../results/2026-11-24t11-58-36-394z-tiny-voca-ptpt-cpu-warm-a650579f/summary.md) | Not submitted | [Report](../../results/2026-11-24t12-05-03-409z-tiny-voca-ptpt-cpu-cached-fab0d37b/summary.md) | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ptpt) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
