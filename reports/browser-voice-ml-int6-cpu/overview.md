# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `b5f7429ea828f0be1a16b194edbbddbffb9f77ab` (source fingerprint `73c691bdde841747df499345e7a2c1384e73bd03648cc7843fbd595b7b26c592`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `ml-article-v1`, 23,011 characters / 105 chunks, SHA-256 `ef98dc2e0c65d273b4b0514501c0b8e45022ad0e5d766beedfd60b03fa5c46fd`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,011-character article (105 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Malayalam INT6 (Jahnavi) | 90.82 s (90.76–90.85; n=3) | Unsupported (not declared in manifest) | 868.38 ms (n=3) | Unsupported (not declared in manifest) | 1452.41 s / 0.063 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Malayalam INT6 (Jahnavi) | 1055.20 MB (n=1; 181 samples) | 1157.71 MB (sampled max; n=1; 181 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.62 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Malayalam INT6 (Jahnavi) | [Report](../../results/2026-11-25t05-59-02-774z-browser-voice-ml-int6-cpu-warm-8cb3ef76/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t06-05-14-820z-browser-voice-ml-int6-cpu-cached-5ff5cd42/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-ml-int6) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
