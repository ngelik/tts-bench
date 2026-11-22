# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `4786ead9110d21ee878e1fc4bee70d594cfe4a4d` (source fingerprint `9f85dbf04d2a660de81e6ffbe5aefcad4370cdec89fb6fee78e4f9bc4a11c5eb`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `de-article-v1`, 23,885 characters / 109 chunks, SHA-256 `f171154d19dc0598f221e45f15365be632ed8d275eb07822c2134971190d0931`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,885-character article (109 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Standard German) | 189.32 s (189.22–190.12; n=3) | 136.04 s (135.77–136.05; n=3) | 569.17 ms (n=3) | 439.44 ms (n=3) | 1295.30 s / 0.146 | 1295.33 s / 0.105 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Standard German) | 1192.76 MB (n=1; 392 samples) | 1328.74 MB (sampled max; n=1; 392 samples) | 1760.56 MB (n=1; 296 samples) | 1857.86 MB (sampled max; n=1; 296 samples) | 38.03 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Apptor Tiny TTS 4.5M (Standard German) | [Report](../../results/2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d/summary.md) | [Report](../../results/2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c/summary.md) | [Report](../../results/2026-11-22t01-40-25-874z-apptor-tiny-tts-cpu-cached-f7c1946a/summary.md) | [Report](../../results/2026-11-22t01-43-52-365z-apptor-tiny-tts-webgpu-cached-04dcbe0e/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#apptor-tiny-tts) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
