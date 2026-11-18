# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `ef1163d7a243fe0d82b4c0ecccb5de113d58a9a1` (source fingerprint `aa6b49118546eed8c96a5c6ba4d7a9a2d4efad21e174e0189eed6bdecfc4736a`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 21.88 s (21.81–21.92; n=5) | 16.47 s (16.35–16.52; n=5) | 121.51 ms (n=5) | 114.47 ms (n=5) | 1284.15 s / 0.017 | 1284.15 s / 0.013 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 1212.81 MB (n=1; 44 samples) | 1292.81 MB (sampled max; n=1; 44 samples) | 2024.57 MB (n=1; 34 samples) | 2136.64 MB (sampled max; n=1; 34 samples) | 6.96 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| SupraTTS 1.0 Preview FP32 | [Report](../../results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [Report](../../results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | [Report](../../results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/summary.md) | [Report](../../results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#supratts-1.0-preview) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
