# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `8ee165d13083d9f6fa75bcf731421c2fb6dac98f` (source fingerprint `647ebaed985ff230775fd3ef6cbe3b9cec5577c2c898fc8e7fbf87a6ca1e769f`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `te-latn-article-v1`, 24,747 characters / 113 chunks, SHA-256 `bb308136b764b649d53d38948bdb707e39b7e952531a80ed73a8a53c5d336eea`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 24,747-character article (113 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Browser Voice Telugu preview INT8 (Sreekar) | 87.05 s (86.99–87.11; n=3) | Unsupported (not declared in manifest) | 809.18 ms (n=3) | Unsupported (not declared in manifest) | 1426.90 s / 0.061 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Browser Voice Telugu preview INT8 (Sreekar) | 1231.75 MB (n=1; 173 samples) | 1298.51 MB (sampled max; n=1; 173 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.77 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Browser Voice Telugu preview INT8 (Sreekar) | [Report](../../results/2026-11-25t18-02-15-937z-browser-voice-te-preview-int8-cpu-warm-8daf84bd/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-25t18-08-12-521z-browser-voice-te-preview-int8-cpu-cached-91e47a8f/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#browser-voice-te-preview-int8) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
