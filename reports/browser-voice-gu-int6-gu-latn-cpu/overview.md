# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `16f21ef76aab881b34900cd9ed1044dfc00e25bf` (source fingerprint `5ccb6db9a3bc02519c32f8cc19a526090560947e2d726e60610e757cfb61e32a`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `gu-latn-article-v1`, 24,553 characters / 112 chunks, SHA-256 `a44c7559473406b9060235133b2886b07ef7b2a4b09612d11f4087ad3d340e27`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 24,553-character article (112 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Gujarati INT6 (Jahnavi) | 90.34 s (90.18–90.39; n=3) | Unsupported (not declared in manifest) | 881.94 ms (n=3) | Unsupported (not declared in manifest) | 1453.50 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Gujarati INT6 (Jahnavi) | 1263.26 MB (n=1; 180 samples) | 1351.86 MB (sampled max; n=1; 180 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.64 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Gujarati INT6 (Jahnavi) | [Report](../../results/2026-11-25t08-56-40-353z-browser-voice-gu-int6-cpu-warm-256432af/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t09-02-50-546z-browser-voice-gu-int6-cpu-cached-c4b20952/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-gu-int6) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
