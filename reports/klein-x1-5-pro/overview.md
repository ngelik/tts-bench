# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `1bf5187012bad86ab324679b05dfc0a712896f80` (source fingerprint `ed3a99a86bfc6c8473d0205e9abf551b22138a81a245bf7a41c47f81fe444b95`), on MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Klein-TTS X1.5 Pro FP32 | 251.73 s (251.70–251.81; n=5) | 22.00 s (21.99–22.11; n=5) | 2875.79 ms (n=5) | 271.19 ms (n=5) | 1258.60 s / 0.200 | 1258.60 s / 0.017 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Klein-TTS X1.5 Pro FP32 | 1331.76 MB (n=1; 502 samples) | 1465.79 MB (sampled max; n=1; 502 samples) | 1903.43 MB (n=1; 44 samples) | 2081.85 MB (sampled max; n=1; 44 samples) | 52.88 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Klein-TTS X1.5 Pro FP32 | [Report](../../results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [Report](../../results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | [Report](../../results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/summary.md) | [Report](../../results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#klein-tts-x1.5-pro) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
