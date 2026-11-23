# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `ac0cebd561863f8bb27411b6d01453fe99c842a1` (source fingerprint `7e56d28b151732da38438c70b45540ae7882336e8866f68f4c0c4b480b613e56`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU not reported. Fixture: `sw-article-v1`, 23,917 characters / 109 chunks, SHA-256 `7ad4f4839ffb808429c538e40b08e0e6c87655a150a1ceb0d52106cce9ecd4b1`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,917-character article (109 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Kiswahili | 123.29 s (123.17–123.49; n=3) | Not submitted | 409.75 ms (n=3) | Not submitted | 2321.16 s / 0.053 | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Kiswahili | 1273.60 MB (n=1; 246 samples) | 1428.01 MB (sampled max; n=1; 246 samples) | Not submitted | Not submitted | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Kiswahili | [Report](../../results/2026-11-23t17-14-17-810z-tiny-voca-swahili-cpu-warm-5f0f319c/summary.md) | Not submitted | [Report](../../results/2026-11-23t17-25-31-201z-tiny-voca-swahili-cpu-cached-3675422b/summary.md) | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-swahili) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
