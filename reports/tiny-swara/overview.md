# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `680bbce8b9fe50c383ba4c86ea2997c9b749d77c` (source fingerprint `7419991790efbd4c537704b7adb06e1b33f629c513f8e2ab0b54b1429af555ed`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `bn-article-v1`, 19,455 characters / 89 chunks, SHA-256 `6047a502a329ec3d83ece032feefbff353185b88c5a55f4ccfe838c677b64fe8`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` or `waveformExecutionProviders` identify the selected runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,455-character article (89 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Swara Bengali BF (INT8) | 82.80 s (82.74–82.91; n=3) | 74.10 s (73.86–74.28; n=3) | 258.88 ms (n=3) | 260.70 ms (n=3) | 1575.85 s / 0.053 | 1576.44 s / 0.047 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Swara Bengali BF (INT8) | 1313.78 MB (n=1; 165 samples) | 1429.23 MB (sampled max; n=1; 165 samples) | 1249.60 MB (n=1; 149 samples) | 1574.03 MB (sampled max; n=1; 149 samples) | 8.64 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Swara Bengali BF (INT8) | [Report](../../results/2026-11-23t13-27-16-548z-tiny-swara-cpu-warm-2c97e097/summary.md) | [Report](../../results/2026-11-23t13-32-59-104z-tiny-swara-webgpu-warm-1ae9d42b/summary.md) | [Report](../../results/2026-11-23t13-38-07-074z-tiny-swara-cpu-cached-ba279a6a/summary.md) | [Report](../../results/2026-11-23t13-39-39-667z-tiny-swara-webgpu-cached-ddc04ead/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-swara) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
