# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `8122617761575975dca03057140e7c33481d5b98` (source fingerprint `c90295fdc5ed394ad1409ba488b2d3b0ca518535632ce95e5d7ad0cf9ff99fa4`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `ml-latn-article-v1`, 25,594 characters / 116 chunks, SHA-256 `16638b2f59789d7ce6b4cc0fe7692a6d56d413170eb8272d7002f58281366764`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 25,594-character article (116 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Malayalam INT6 (Jahnavi) | 90.87 s (90.86–90.90; n=3) | Unsupported (not declared in manifest) | 811.64 ms (n=3) | Unsupported (not declared in manifest) | 1454.39 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Malayalam INT6 (Jahnavi) | 1256.22 MB (n=1; 181 samples) | 1336.59 MB (sampled max; n=1; 181 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.62 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Malayalam INT6 (Jahnavi) | [Report](../../results/2026-11-25t17-44-39-430z-browser-voice-ml-int6-cpu-warm-2dbfba92/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t17-50-52-466z-browser-voice-ml-int6-cpu-cached-b903df88/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-ml-int6) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
