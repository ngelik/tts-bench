# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `adeea4ac056330319f95e078066ba06501f0c7db` (source fingerprint `81fe21e6f9f745e57565fd97b812ed3a652868f27bf75643d153beabd534c602`), on Apple M1 Pro / 16 GiB · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `it-article-v1`, 23,584 characters / 107 chunks, SHA-256 `9deb44d6edb942644c0e018446040f24984e2c2a032a9665b3bb4d4bff17023a`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,584-character article (107 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Vocina Italian v1.0 INT8 | 68.10 s (68.06–68.12; n=3) | 62.18 s (61.94–62.34; n=3) | 153.01 ms (n=3) | 170.06 ms (n=3) | 1452.56 s / 0.047 | 1452.53 s / 0.043 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Vocina Italian v1.0 INT8 | 1157.49 MB (n=1; 136 samples) | 1247.92 MB (sampled max; n=1; 136 samples) | 1109.85 MB (n=1; 126 samples) | 1430.67 MB (sampled max; n=1; 126 samples) | 8.54 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Vocina Italian v1.0 INT8 | [Report](../../results/2026-11-22t09-55-34-149z-vocina-it-cpu-warm-f8480ae7/summary.md) | [Report](../../results/2026-11-22t10-00-16-545z-vocina-it-webgpu-warm-360c5624/summary.md) | [Report](../../results/2026-11-22t10-04-36-379z-vocina-it-cpu-cached-9dff0e67/summary.md) | [Report](../../results/2026-11-22t10-05-53-145z-vocina-it-webgpu-cached-e0289f54/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#vocina-it) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
