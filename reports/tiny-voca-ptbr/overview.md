# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `a1f52276803d69fde8e4d77456066d2ebd04da07` (source fingerprint `7b3b80f27947849134a6fc2a5eec7976c4b3453c74b47dcacde14c56252b6902`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `pt-br-article-v1`, 22,164 characters / 101 chunks, SHA-256 `718c92e50ffeb66db7fa088018ff7860c3824348a6db5917be40d6d2cd6eb686`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,164-character article (101 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Brazilian Portuguese F_s4 (FP32) | 93.30 s (93.20–93.64; n=3) | 31.90 s (31.87–32.11; n=3) | 209.98 ms (n=3) | 93.48 ms (n=3) | 1768.55 s / 0.053 | 1768.57 s / 0.018 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Brazilian Portuguese F_s4 (FP32) | 1399.84 MB (n=1; 187 samples) | 1700.30 MB (sampled max; n=1; 187 samples) | 1541.30 MB (n=1; 64 samples) | 1665.97 MB (sampled max; n=1; 64 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Brazilian Portuguese F_s4 (FP32) | [Report](../../results/2026-11-23t02-09-13-281z-tiny-voca-ptbr-cpu-warm-9ed2786e/summary.md) | [Report](../../results/2026-11-23t02-15-37-064z-tiny-voca-ptbr-webgpu-warm-31911807/summary.md) | [Report](../../results/2026-11-23t02-17-55-289z-tiny-voca-ptbr-cpu-cached-0493d237/summary.md) | [Report](../../results/2026-11-23t02-19-38-670z-tiny-voca-ptbr-webgpu-cached-198bbe62/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ptbr) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
