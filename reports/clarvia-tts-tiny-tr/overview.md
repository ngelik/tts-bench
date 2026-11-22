# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `2c2716b5482c5bcbe094fa7a11a0c30ce0fca318` (source fingerprint `fa827a4ce44b1ca7d97842298d5c5346999a5634ed6a46804830e947cb79f1fb`), on Apple M1 Pro / 16 GiB · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `tr-article-v1`, 20,679 characters / 94 chunks, SHA-256 `95e1958fe7385da7aa79d54c30230518e8be360848f2c824ce7639414ce8f3d3`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,679-character article (94 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Clarvia TTS Tiny 4.54M FP32 (Turkish, female_1) | 61.77 s (61.75–61.86; n=3) | 45.25 s (45.25–45.36; n=3) | 148.76 ms (n=3) | 147.46 ms (n=3) | 1301.54 s / 0.047 | 1301.54 s / 0.035 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Clarvia TTS Tiny 4.54M FP32 (Turkish, female_1) | 1096.66 MB (n=1; 123 samples) | 1644.58 MB (sampled max; n=1; 123 samples) | 1067.00 MB (n=1; 91 samples) | 1345.67 MB (sampled max; n=1; 91 samples) | 21.38 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Clarvia TTS Tiny 4.54M FP32 (Turkish, female_1) | [Report](../../results/2026-11-22t11-59-32-801z-clarvia-tts-tiny-cpu-warm-9d9cd530/summary.md) | [Report](../../results/2026-11-22t12-03-52-132z-clarvia-tts-tiny-webgpu-warm-cf22e07f/summary.md) | [Report](../../results/2026-11-22t12-07-05-151z-clarvia-tts-tiny-cpu-cached-0255b0f5/summary.md) | [Report](../../results/2026-11-22t12-08-18-105z-clarvia-tts-tiny-webgpu-cached-d6879c29/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#clarvia-tts-tiny) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
