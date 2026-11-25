# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `e3ad67be16d0c62700c2b1fe38c70b3443492335` (source fingerprint `f2275a8b7a4bd4c016e61f7b07b94dd10e1cb6c600351ef51fc6ddfd70a19775`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `hi-latn-article-v1`, 23,420 characters / 107 chunks, SHA-256 `acce9de48b72daf86d6fc4126497f55977c64dafa3e7a3d84809051df1298d9e`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,420-character article (107 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Hindi INT7 (Ishwari) | 88.65 s (88.58–88.81; n=3) | Unsupported (not declared in manifest) | 969.83 ms (n=3) | Unsupported (not declared in manifest) | 1432.32 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Hindi INT7 (Ishwari) | 1045.89 MB (n=1; 177 samples) | 1205.83 MB (sampled max; n=1; 177 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.72 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Hindi INT7 (Ishwari) | [Report](../../results/2026-11-25t13-16-47-193z-browser-voice-hi-int7-cpu-warm-2d2ffbe1/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t13-22-50-814z-browser-voice-hi-int7-cpu-cached-5fa986d9/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-hi-int7) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
