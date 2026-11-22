# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `979a76f1d0346fe72a04389a0a70fc64be992963` (source fingerprint `f63c4c40b8aa52e16ccf553f5c402b7c9c4377444609f056b2c1f8831af7c0a9`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `el-article-v1`, 23,928 characters / 109 chunks, SHA-256 `dbc35fd140cebb09299d642b3afef95ae78b610f28806fb3b92b5079e74c93e9`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,928-character article (109 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Greek M (FP32) | 90.32 s (90.30–90.50; n=3) | 23.56 s (23.56–23.58; n=3) | 233.64 ms (n=3) | 73.65 ms (n=3) | 1790.21 s / 0.050 | 1790.21 s / 0.013 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Greek M (FP32) | 1262.24 MB (n=1; 180 samples) | 1371.98 MB (sampled max; n=1; 180 samples) | 2172.01 MB (n=1; 47 samples) | 2276.29 MB (sampled max; n=1; 47 samples) | 21.36 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Greek M (FP32) | [Report](../../results/2026-11-22t19-55-14-092z-tiny-voca-gr-cpu-warm-ed6d78b7/summary.md) | [Report](../../results/2026-11-22t20-01-26-246z-tiny-voca-gr-webgpu-warm-00f2f8e6/summary.md) | [Report](../../results/2026-11-22t20-03-12-417z-tiny-voca-gr-cpu-cached-70ec2885/summary.md) | [Report](../../results/2026-11-22t20-04-52-385z-tiny-voca-gr-webgpu-cached-5124dd63/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-gr) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
