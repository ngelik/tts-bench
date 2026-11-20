# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `8b929d8e68834b101dd1992981e9b04640222748` (source fingerprint `df550f024216e8c8e206a9d8e72702dc4afdf845e05f907df855b4d12ceddd4a`), on Apple M1 Pro 8-core / 16 GiB baseline · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU not reported. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| SanoTTS Amy 1.83M (English) | 760.40 s (759.50–765.69; n=5) | Unsupported (not declared in manifest) | 8700.54 ms (n=5) | Unsupported (not declared in manifest) | 1203.17 s / 0.632 | Unsupported (not declared in manifest) |
| SanoTTS Amy-small 1.08M (English) | 529.24 s (528.95–529.42; n=5) | Unsupported (not declared in manifest) | 6123.21 ms (n=5) | Unsupported (not declared in manifest) | 1214.10 s / 0.436 | Unsupported (not declared in manifest) |
| SanoTTS Heart 2.27M (English, US) | 242.94 s (242.60–243.05; n=5) | Unsupported (not declared in manifest) | 720.05 ms (n=5) | Unsupported (not declared in manifest) | 1340.62 s / 0.181 | Unsupported (not declared in manifest) |
| SanoTTS HFC 1.83M (English) | 612.95 s (612.48–613.70; n=5) | Unsupported (not declared in manifest) | 7050.90 ms (n=5) | Unsupported (not declared in manifest) | 968.07 s / 0.633 | Unsupported (not declared in manifest) |
| SanoTTS Kristin 1.40M (English) | 674.37 s (673.21–674.57; n=5) | Unsupported (not declared in manifest) | 7922.88 ms (n=5) | Unsupported (not declared in manifest) | 1076.42 s / 0.626 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| SanoTTS Amy 1.83M (English) | Not submitted | Not submitted | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 7.34 MB |
| SanoTTS Amy-small 1.08M (English) | Not submitted | Not submitted | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 4.34 MB |
| SanoTTS Heart 2.27M (English, US) | 735.77 MB (n=1; 478 samples) | 829.16 MB (sampled max; n=1; 478 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 9.14 MB |
| SanoTTS HFC 1.83M (English) | 922.89 MB (n=1; 1222 samples) | 1045.07 MB (sampled max; n=1; 1222 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 7.34 MB |
| SanoTTS Kristin 1.40M (English) | 850.11 MB (n=1; 1342 samples) | 924.71 MB (sampled max; n=1; 1342 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 5.59 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| SanoTTS Amy 1.83M (English) | [Report](../../results/2026-11-19t12-33-24-733z-sano-amy-1p8m-cpu-warm-f43efd39/summary.md) | Unsupported (manifest) | Not submitted | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-amy-1p8m) | [Terms](../../docs/LICENSING.md) |
| SanoTTS Amy-small 1.08M (English) | [Report](../../results/2026-11-19t11-40-02-061z-sano-amy-small-cpu-warm-e81738fa/summary.md) | Unsupported (manifest) | Not submitted | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-amy-small) | [Terms](../../docs/LICENSING.md) |
| SanoTTS Heart 2.27M (English, US) | [Report](../../results/2026-11-19t05-34-55-044z-sano-heart-cpu-warm-eff21fdc/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-19t16-19-15-814z-sano-heart-cpu-cached-865b4f98/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-heart) | [Terms](../../docs/LICENSING.md) |
| SanoTTS HFC 1.83M (English) | [Report](../../results/2026-11-19t06-08-51-824z-sano-hfc-cpu-warm-eefb925d/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-19t23-09-09-954z-sano-hfc-cpu-cached-574942d8/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-hfc) | [Terms](../../docs/LICENSING.md) |
| SanoTTS Kristin 1.40M (English) | [Report](../../results/2026-11-19t10-04-14-383z-sano-kristin-cpu-warm-bd5428e0/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-20t06-41-40-071z-sano-kristin-cpu-cached-7cfb4ab7/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#sano-kristin) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
