# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `fff67d3bc4d836adcb1e87671d8a91c18c7f886c` (source fingerprint `5280ea70688662b25320d0350fc28d1bfc262e08d7d818fd52c9e16805765c46`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple / metal-3. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Korean TTS (KSS / Dizione F2) | 57.26 s (57.25–57.29; n=3) | 43.92 s (43.73–44.12; n=3) | 164.20 ms (n=3) | 156.06 ms (n=3) | 1182.21 s / 0.048 | 1182.21 s / 0.037 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Korean TTS (KSS / Dizione F2) | 1400.53 MB (n=1; 114 samples) | 1894.40 MB (sampled max; n=1; 114 samples) | 1420.65 MB (n=1; 88 samples) | 1555.51 MB (sampled max; n=1; 88 samples) | 21.44 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Korean TTS (KSS / Dizione F2) | [Report](../../results/2026-11-22t13-32-43-659z-korean-tts-cpu-warm-a7ba0fa1/summary.md) | [Report](../../results/2026-11-22t13-36-48-173z-korean-tts-webgpu-warm-f7086089/summary.md) | [Report](../../results/2026-11-22t13-39-59-862z-korean-tts-cpu-cached-7362beb9/summary.md) | [Report](../../results/2026-11-22t13-41-12-063z-korean-tts-webgpu-cached-babc6122/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#korean-tts) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
