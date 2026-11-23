# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `54408783d9ba80b002a90ebb8106bb03ba43176f` (source fingerprint `4ba74115fa7be74cc7b382b6742998853664485c4cad2904107f0e167e121f7f`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ur-latn-article-v1`, 22,486 characters / 103 chunks, SHA-256 `1efd405d195af01f6f72acbafb54cfdf25495382f5cc4fece31352d2fffd4c0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,486-character article (103 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Urdu M2 (FP32) | Not submitted | 31.21 s (31.15–31.30; n=3) | Not submitted | 95.72 ms (n=3) | Not submitted | 1511.14 s / 0.021 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Urdu M2 (FP32) | Not submitted | Not submitted | 2062.64 MB (n=1; 62 samples) | 2169.39 MB (sampled max; n=1; 62 samples) | 21.42 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Urdu M2 (FP32) | Not submitted | [Report](../../results/2026-11-23t16-30-36-555z-tiny-urdu-webgpu-warm-eab2a71b/summary.md) | Not submitted | [Report](../../results/2026-11-23t16-34-15-251z-tiny-urdu-webgpu-cached-faf31c2f/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-urdu) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
