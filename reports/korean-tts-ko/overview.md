# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `fff67d3bc4d836adcb1e87671d8a91c18c7f886c` (source fingerprint `5280ea70688662b25320d0350fc28d1bfc262e08d7d818fd52c9e16805765c46`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple / metal-3. Fixture: `ko-article-v1`, 10,196 characters / 47 chunks, SHA-256 `05840f7eaccf97ddf51d594872319bfa5319b38b4b5bf150439a4ad6b8192528`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 10,196-character article (47 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Korean TTS (KSS / Dizione F2) | 86.00 s (85.92–86.00; n=3) | 66.06 s (65.91–66.15; n=3) | 249.78 ms (n=3) | 212.16 ms (n=3) | 1599.22 s / 0.054 | 1599.22 s / 0.041 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Korean TTS (KSS / Dizione F2) | 1404.27 MB (n=1; 172 samples) | 1926.20 MB (sampled max; n=1; 172 samples) | 1560.08 MB (n=1; 132 samples) | 1647.36 MB (sampled max; n=1; 132 samples) | 21.44 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Korean TTS (KSS / Dizione F2) | [Report](../../results/2026-11-22t13-18-40-602z-korean-tts-cpu-warm-bd3a1d82/summary.md) | [Report](../../results/2026-11-22t13-24-42-985z-korean-tts-webgpu-warm-7ceb0e99/summary.md) | [Report](../../results/2026-11-22t13-29-25-009z-korean-tts-cpu-cached-220ed6ed/summary.md) | [Report](../../results/2026-11-22t13-31-07-961z-korean-tts-webgpu-cached-664fbb39/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#korean-tts) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
