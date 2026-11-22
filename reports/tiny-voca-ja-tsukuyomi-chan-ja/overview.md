# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `a4f4eb675cb3e1b64983438e80e3f565b1c7e3e1` (source fingerprint `5c22983671dd91709f96d36580b2dfc693c45fd359e66cd7cbe234b4596d2497`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU not reported. Fixture: `ja-article-v1`, 8,399 characters / 38 chunks, SHA-256 `288437490ed89136edf80153031e936e6a33aebba80760b2cfb7287fc98504b6`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 8,399-character article (38 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Japanese Tsukuyomi-chan P1 4.59M FP32 | 69.88 s (69.84–69.90; n=3) | Unsupported (not declared in manifest) | 1952.35 ms (n=3) | Unsupported (not declared in manifest) | 1323.48 s / 0.053 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Japanese Tsukuyomi-chan P1 4.59M FP32 | 2213.53 MB (n=1; 139 samples) | 2352.12 MB (sampled max; n=1; 139 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 21.88 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Japanese Tsukuyomi-chan P1 4.59M FP32 | [Report](../../results/2026-11-22t15-03-37-242z-tiny-voca-ja-tsukuyomi-chan-cpu-warm-054d2623/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-22t15-08-37-325z-tiny-voca-ja-tsukuyomi-chan-cpu-cached-06b65a15/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ja-tsukuyomi-chan) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
