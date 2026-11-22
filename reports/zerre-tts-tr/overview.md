# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `fe8f66909ca808473dac4ceb56dc36e23ec44943` (source fingerprint `cc1ae31090eb3f186129cddf7c79852ec9d6e5f668eee5e02423173f3495a09c`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `tr-article-v1`, 20,679 characters / 94 chunks, SHA-256 `95e1958fe7385da7aa79d54c30230518e8be360848f2c824ce7639414ce8f3d3`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,679-character article (94 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Zerre TTS ~4.5M INT8 (Turkish, SES-A) | 75.49 s (75.40–75.52; n=3) | 100.60 s (99.43–100.71; n=3) | 195.30 ms (n=3) | 307.38 ms (n=3) | 1493.24 s / 0.051 | 1493.74 s / 0.067 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Zerre TTS ~4.5M INT8 (Turkish, SES-A) | 1322.87 MB (n=1; 150 samples) | 1586.50 MB (sampled max; n=1; 150 samples) | 1221.60 MB (n=1; 199 samples) | 1483.06 MB (sampled max; n=1; 199 samples) | 8.55 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Zerre TTS ~4.5M INT8 (Turkish, SES-A) | [Report](../../results/2026-11-22t11-01-58-328z-zerre-tts-cpu-warm-215ee888/summary.md) | [Report](../../results/2026-11-22t11-07-11-650z-zerre-tts-webgpu-warm-a2baf431/summary.md) | [Report](../../results/2026-11-22t11-14-02-780z-zerre-tts-cpu-cached-4c204eed/summary.md) | [Report](../../results/2026-11-22t11-15-27-394z-zerre-tts-webgpu-cached-2baa29d6/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#zerre-tts) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
