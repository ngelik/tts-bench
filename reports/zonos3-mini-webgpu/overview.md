# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `de9dded4722f160d185b4dcbbb720edec8ee595f` (source fingerprint `a6f8170eed3e37f5be536c5b27cbf4d239c05f30c4b206c39b6f187b076fa1fe`), on Apple MacBook Pro M1 Pro / 16 GB · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple / metal-3. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| ZONOS3-Mini (Imogen) | Not submitted | 153.41 s (153.41–153.41; n=1) | Not submitted | 112.69 ms (n=1) | Not submitted | 1284.33 s / 0.119 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| ZONOS3-Mini (Imogen) | Not submitted | Not submitted | 1126.22 MB (n=1; 306 samples) | 1212.48 MB (sampled max; n=1; 306 samples) | 2081.59 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| ZONOS3-Mini (Imogen) | Not submitted | [Report](../../results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/summary.md) | Not submitted | [Report](../../results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#zonos3-mini) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
