# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `4166ea62b50b3f7a0e4234ecb2a667f6b3a78edd` (source fingerprint `e28d2c091a63ccaa87b3eb2898d24a8c6f01a9965ffe59e0b2bfb37cc437dfb1`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `te-article-v1`, 20,486 characters / 93 chunks, SHA-256 `3dbf5136b343b34f1548c4acb06e209ecdfc755237912932a58d331c5dcc0fdc`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,486-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Telugu preview INT8 (Sreekar) | 88.37 s (88.28–88.37; n=3) | Unsupported (not declared in manifest) | 941.06 ms (n=3) | Unsupported (not declared in manifest) | 1429.96 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Telugu preview INT8 (Sreekar) | 1141.23 MB (n=1; 176 samples) | 1195.70 MB (sampled max; n=1; 176 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.77 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Telugu preview INT8 (Sreekar) | [Report](../../results/2026-11-24t19-38-00-411z-browser-voice-te-preview-int8-cpu-warm-f5174d41/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-24t19-44-02-537z-browser-voice-te-preview-int8-cpu-cached-07d62f5a/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-te-preview-int8) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
