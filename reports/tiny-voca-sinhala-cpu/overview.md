# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `65036acbd399d20db9dbea6c4ce74254f5a26d54` (source fingerprint `f00fea29efec7b25e96b3067808e3acb33646b2a1845403c795cb41afd021738`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 158.0.8127.37 · GPU not reported. Fixture: `si-article-v1`, 19,752 characters / 90 chunks, SHA-256 `6bf7b054ee96b965287c7b4473f7e66cac06436fac16a0ad9aaea6d31ef00f15`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,752-character article (90 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Sinhala M1 / F1 | 98.30 s (98.08–98.30; n=3) | Unsupported (not declared in manifest) | 253.38 ms (n=3) | Unsupported (not declared in manifest) | 2008.00 s / 0.049 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Sinhala M1 / F1 | 1106.62 MB (n=1; 195 samples) | 1603.98 MB (sampled max; n=1; 195 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 21.38 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Sinhala M1 / F1 | [Report](../../results/2026-11-24t16-27-10-198z-tiny-voca-sinhala-cpu-warm-5c7f1fe0/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-24t16-33-56-405z-tiny-voca-sinhala-cpu-cached-8c41cc9f/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-sinhala) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
