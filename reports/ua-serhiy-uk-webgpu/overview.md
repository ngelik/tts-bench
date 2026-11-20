# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `9870c198651481dfed69ece7dc7bb88d870edabd` (source fingerprint `c02c5861f72e45f36e024ea08887c0ada604abd53da938583d702124cfbdd163`), on MacBook Pro (Apple M1 Pro, 16 GB, native arm64; macOS 26.6.2) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `uk-article-v1`, 19,980 characters / 92 chunks, SHA-256 `542130c28a312d8e29d4ab7615280bcb661d8c1d8f74e8f2d9c298e4eaceff40`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,980-character article (92 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Serhiy 0.58M (Ukrainian) | Not submitted | 9.36 s (9.26–9.45; n=5) | Not submitted | 27.71 ms (n=5) | Not submitted | 1185.58 s / 0.008 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Serhiy 0.58M (Ukrainian) | Not submitted | Not submitted | 1964.76 MB (n=1; 20 samples) | 2047.36 MB (sampled max; n=1; 20 samples) | 2.34 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Serhiy 0.58M (Ukrainian) | Not submitted | [Report](../../results/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093/summary.md) | Not submitted | [Report](../../results/2026-11-20t23-22-14-572z-ua-serhiy-0p58m-webgpu-cached-ac55e923/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#ua-serhiy-0p58m) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
