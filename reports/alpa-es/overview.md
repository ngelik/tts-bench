# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `bef91023f0a625c03eecc7d0dcf1391f012d535a` (source fingerprint `18b2f17278739bde9b750ad1d7bfbe033ac5f27b6df3cdb53180c1789945541a`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `es-ar-article-v1`, 22,749 characters / 104 chunks, SHA-256 `cfcf5a8095bab6894cc93faad6d3a01f2bfbf731144f54a66b61309fb507bcb4`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,749-character article (104 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Alpa Spanish female (FP32) | 95.67 s (95.62–95.72; n=3) | 15.25 s (15.22–15.30; n=3) | 960.19 ms (n=3) | 147.15 ms (n=3) | 1416.68 s / 0.068 | 1416.68 s / 0.011 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Alpa Spanish female (FP32) | 1252.10 MB (n=1; 190 samples) | 1327.71 MB (sampled max; n=1; 190 samples) | 1902.70 MB (n=1; 30 samples) | 1983.20 MB (sampled max; n=1; 30 samples) | 22.53 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Alpa Spanish female (FP32) | [Report](../../results/2026-11-22t23-02-41-155z-alpa-es-cpu-warm-574587f7/summary.md) | [Report](../../results/2026-11-22t23-09-13-541z-alpa-es-webgpu-warm-8e4418d0/summary.md) | [Report](../../results/2026-11-22t23-10-24-697z-alpa-es-cpu-cached-152cb2be/summary.md) | [Report](../../results/2026-11-22t23-12-09-189z-alpa-es-webgpu-cached-dee19f60/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#alpa-es) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
