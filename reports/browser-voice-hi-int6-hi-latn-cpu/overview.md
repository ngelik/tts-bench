# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `f10e2b58e6564c90d59631b375e8bcea0751d398` (source fingerprint `3010583c0a5e081a72563e786fafd9b21d0d2e2c024fb72dbac1d6edbcedefa7`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `hi-latn-article-v1`, 23,420 characters / 107 chunks, SHA-256 `acce9de48b72daf86d6fc4126497f55977c64dafa3e7a3d84809051df1298d9e`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,420-character article (107 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Hindi INT6 (Ishwari) | 88.66 s (88.64–88.96; n=3) | Unsupported (not declared in manifest) | 969.84 ms (n=3) | Unsupported (not declared in manifest) | 1433.10 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Hindi INT6 (Ishwari) | 1139.48 MB (n=1; 177 samples) | 1231.75 MB (sampled max; n=1; 177 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.63 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Hindi INT6 (Ishwari) | [Report](../../results/2026-11-25t09-13-42-269z-browser-voice-hi-int6-cpu-warm-61c98a93/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t09-19-45-650z-browser-voice-hi-int6-cpu-cached-ac2a98a5/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-hi-int6) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
