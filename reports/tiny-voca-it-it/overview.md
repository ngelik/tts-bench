# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `2f1f236b34a3baf9c5a442e87468809a38b335d0` (source fingerprint `a863b9d34877285e9507d35959a2b8f30c7b38bdd502b9269ed181ab02531e80`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `it-article-v1`, 23,584 characters / 107 chunks, SHA-256 `9deb44d6edb942644c0e018446040f24984e2c2a032a9665b3bb4d4bff17023a`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,584-character article (107 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Italian 6.77M (Lorenzo) | 160.32 s (160.30–160.65; n=3) | 135.55 s (135.21–135.65; n=3) | 363.26 ms (n=3) | 329.06 ms (n=3) | 1622.06 s / 0.099 | 1622.06 s / 0.084 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Italian 6.77M (Lorenzo) | 1386.86 MB (n=1; 320 samples) | 1880.46 MB (sampled max; n=1; 320 samples) | 1315.70 MB (n=1; 272 samples) | 1651.61 MB (sampled max; n=1; 272 samples) | 27.98 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Italian 6.77M (Lorenzo) | [Report](../../results/2026-11-22t08-31-21-521z-tiny-voca-it-cpu-warm-8ba15836/summary.md) | [Report](../../results/2026-11-22t08-42-15-104z-tiny-voca-it-webgpu-warm-344ea226/summary.md) | [Report](../../results/2026-11-22t08-51-36-536z-tiny-voca-it-cpu-cached-a3d6a522/summary.md) | [Report](../../results/2026-11-22t08-54-27-327z-tiny-voca-it-webgpu-cached-bbcd5e49/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-it) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
