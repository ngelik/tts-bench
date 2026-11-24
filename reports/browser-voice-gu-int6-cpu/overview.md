# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `e8c324546f1ca848ccf39067d239a37717117df3` (source fingerprint `df5a76a5dfe270f8cc55866063caa26e3e2e69c643ce6530a50383681b120cb6`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `gu-article-v1`, 19,600 characters / 89 chunks, SHA-256 `9c211be0c5462306eac6e9434fbbd2370a00ec671875f0be20693275aa03c73b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,600-character article (89 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Gujarati INT6 (Jahnavi) | 89.51 s (89.45–89.87; n=3) | Unsupported (not declared in manifest) | 1041.05 ms (n=3) | Unsupported (not declared in manifest) | 1428.02 s / 0.063 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Gujarati INT6 (Jahnavi) | 1216.90 MB (n=1; 178 samples) | 1278.71 MB (sampled max; n=1; 178 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.64 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Gujarati INT6 (Jahnavi) | [Report](../../results/2026-11-24t15-39-38-328z-browser-voice-gu-int6-cpu-warm-740d1bed/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-24t15-45-45-316z-browser-voice-gu-int6-cpu-cached-a8c23118/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-gu-int6) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
