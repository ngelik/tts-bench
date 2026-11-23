# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `a1aee0484c7096728d9512c1203a9d26123f7247` (source fingerprint `b85768188afba1df91b0f91acc8456b5324793e97aff0f4e1e821fc6f7ac2e4a`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `he-article-v1`, 15,513 characters / 71 chunks, SHA-256 `1f2ac7f4c6f81f21cea8262a64f6893440d49f8b97824c77a59dc8a831b8d3d7`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 15,513-character article (71 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Hebrew AH (FP32) | 443.69 s (442.04–443.71; n=3) | 440.14 s (440.06–440.24; n=3) | 1201.54 ms (n=3) | 1204.13 ms (n=3) | 1120.71 s / 0.396 | 1120.71 s / 0.393 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Hebrew AH (FP32) | 1787.42 MB (n=1; 880 samples) | 2269.04 MB (sampled max; n=1; 880 samples) | 1639.21 MB (n=1; 878 samples) | 1844.69 MB (sampled max; n=1; 878 samples) | 332.97 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Hebrew AH (FP32) | [Report](../../results/2026-11-23t09-51-57-690z-tiny-voca-he-cpu-warm-0889617d/summary.md) | [Report](../../results/2026-11-23t10-21-45-420z-tiny-voca-he-webgpu-warm-a6ab48f0/summary.md) | [Report](../../results/2026-11-23t10-51-27-655z-tiny-voca-he-cpu-cached-8423b493/summary.md) | [Report](../../results/2026-11-23t10-59-03-499z-tiny-voca-he-webgpu-cached-0c79c107/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-he) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
