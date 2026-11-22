# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `e49d51e6aaa9ee77d700285ca17b02003dda5f00` (source fingerprint `692054e5989fd4305f9831494d2a3a9ebc1f0e1de2a211cc7f26b5c7d3e61bed`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `de-at-article-v1`, 23,898 characters / 109 chunks, SHA-256 `13d72aa0ab868b492fd22384a374df6acd05c1648267da92c2db21bdc05c1324`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,898-character article (109 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Austrian German) | 222.99 s (222.86–223.12; n=3) | 156.42 s (156.37–156.79; n=3) | 671.16 ms (n=3) | 490.58 ms (n=3) | 1453.30 s / 0.153 | 1453.14 s / 0.108 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Austrian German) | 1105.30 MB (n=1; 459 samples) | 1245.02 MB (sampled max; n=1; 459 samples) | 1491.75 MB (n=1; 339 samples) | 1835.45 MB (sampled max; n=1; 339 samples) | 38.04 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Apptor Tiny TTS 4.5M (Austrian German) | [Report](../../results/2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536/summary.md) | [Report](../../results/2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22/summary.md) | [Report](../../results/2026-11-22t06-05-39-761z-apptor-tiny-tts-at-cpu-cached-903191c8/summary.md) | [Report](../../results/2026-11-22t06-09-40-697z-apptor-tiny-tts-at-webgpu-cached-d43f6809/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#apptor-tiny-tts-at) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
