# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `007f6ae5d51aa27b8f9323a862bd56eed152a0eb` (source fingerprint `0f79f5922f14a143ac6162a6d3844b93586f89b38f3eac3fc688118de8d4f076`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU apple. Fixture: `uz-article-v1`, 23,088 characters / 105 chunks, SHA-256 `ccf5419bdd654df31cd4df1ff79707cd1e32ffc7fcf26817d8b58d6a204a0254`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,088-character article (105 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Uzbek Navoiy M2 | Not submitted | 20.70 s (20.45–20.76; n=3) | Not submitted | 79.18 ms (n=3) | Not submitted | 1528.64 s / 0.014 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Uzbek Navoiy M2 | Not submitted | Not submitted | 1810.60 MB (n=1; 42 samples) | 1965.79 MB (sampled max; n=1; 42 samples) | 21.36 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Uzbek Navoiy M2 | Not submitted | [Report](../../results/2026-11-24t19-25-00-128z-tiny-voca-uz-navoiy-webgpu-warm-9d35be1e/summary.md) | Not submitted | [Report](../../results/2026-11-24t19-27-57-522z-tiny-voca-uz-navoiy-webgpu-cached-6d4c9180/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-uz-navoiy) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
