# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `34c829ee99d1ddd7ec45a1f4ea1793c610c6a36a` (source fingerprint `0b70e54f398bf4174fa42837cdc042eda31f3eca3f723cbd410b7b7f72c4c7d1`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `es-es-article-v1`, 22,965 characters / 105 chunks, SHA-256 `8acee2d2fe70fb184d7a3f30e000d4a7cf5a9e09fc7523f32e958e7b1451653e`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,965-character article (105 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Mini Voz 4.5M FP32 (F1) | 71.70 s (71.68–71.72; n=3) | 52.33 s (52.33–52.44; n=3) | 187.06 ms (n=3) | 160.35 ms (n=3) | 1466.71 s / 0.049 | 1466.71 s / 0.036 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Mini Voz 4.5M FP32 (F1) | 1667.10 MB (n=1; 143 samples) | 1743.24 MB (sampled max; n=1; 143 samples) | 1380.98 MB (n=1; 105 samples) | 1488.11 MB (sampled max; n=1; 105 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Mini Voz 4.5M FP32 (F1) | [Report](../../results/2026-11-22t20-59-44-485z-mini-voz-cpu-warm-fdccf2be/summary.md) | [Report](../../results/2026-11-22t21-04-39-744z-mini-voz-webgpu-warm-6b3c9f74/summary.md) | [Report](../../results/2026-11-22t21-08-19-258z-mini-voz-cpu-cached-df708414/summary.md) | [Report](../../results/2026-11-22t21-09-39-011z-mini-voz-webgpu-cached-f4cdb2a2/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#mini-voz) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
