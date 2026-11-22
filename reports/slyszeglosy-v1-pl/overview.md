# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `5e0212f8277c154901925f9d13d5306ecc976039` (source fingerprint `64825ceec4d7cd769794dc1f16d9630d0c4c3fb86604cf4b87d71e6c0dd46cb1`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple / metal-3. Fixture: `pl-article-v1`, 21,375 characters / 98 chunks, SHA-256 `09e2f4876dca3feaf6c40ff9631dcdad383bf359d8d1a004c28510003668631d`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 21,375-character article (98 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Słyszę Głosy V1 (Polish F) | 62.92 s (62.88–62.95; n=3) | 46.05 s (45.94–46.09; n=3) | 202.71 ms (n=3) | 166.45 ms (n=3) | 1340.17 s / 0.047 | 1340.17 s / 0.034 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Słyszę Głosy V1 (Polish F) | 1775.70 MB (n=1; 125 samples) | 1862.37 MB (sampled max; n=1; 125 samples) | 1637.74 MB (n=1; 92 samples) | 1675.54 MB (sampled max; n=1; 92 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Słyszę Głosy V1 (Polish F) | [Report](../../results/2026-11-22t17-31-57-568z-slyszeglosy-v1-cpu-warm-06032682/summary.md) | [Report](../../results/2026-11-22t17-36-20-153z-slyszeglosy-v1-webgpu-warm-3baa8b76/summary.md) | [Report](../../results/2026-11-22t17-39-35-755z-slyszeglosy-v1-cpu-cached-b5986119/summary.md) | [Report](../../results/2026-11-22t17-40-49-290z-slyszeglosy-v1-webgpu-cached-4bba2e66/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#slyszeglosy-v1) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
