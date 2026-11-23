# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `7f6c1496053453747bbb47b4f6af6ac041ecc6eb` (source fingerprint `f6ca971c148dd5510413309f7ed38b7c6af00ee56fa4770b8078fb485711d16a`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU not reported. Fixture: `sa-article-v1`, 19,801 characters / 90 chunks, SHA-256 `7f1e80ac2b25b36b36fd8af34a863f182cba6572739b00d4f5094cd381ca014c`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,801-character article (90 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Alpa (Sanskrit) | 148.56 s (148.46–149.18; n=3) | Not submitted | 1819.71 ms (n=3) | Not submitted | 1801.24 s / 0.082 | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Alpa (Sanskrit) | 1151.19 MB (n=1; 297 samples) | 1365.38 MB (sampled max; n=1; 297 samples) | Not submitted | Not submitted | 22.55 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Alpa (Sanskrit) | [Report](../../results/2026-11-23t18-19-03-145z-alpa-sanskrit-cpu-warm-3efb94fb/summary.md) | Not submitted | [Report](../../results/2026-11-23t18-31-41-474z-alpa-sanskrit-cpu-cached-9318014f/summary.md) | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#alpa-sanskrit) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
