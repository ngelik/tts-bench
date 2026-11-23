# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `0919d332331f48b438dbb2c03bb46a7dbd0aaa27` (source fingerprint `9c04d0a6c61327cdc7d0bb231630c00f227533066b2e1fd3a26dd2439f05b252`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU not reported. Fixture: `bn-article-v1`, 19,455 characters / 89 chunks, SHA-256 `6047a502a329ec3d83ece032feefbff353185b88c5a55f4ccfe838c677b64fe8`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 19,455-character article (89 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Hansda Bengali Voice Compact INT8 (Jahnavi) | 85.23 s (85.20–85.33; n=3) | Unsupported (not declared in manifest) | 998.45 ms (n=3) | Unsupported (not declared in manifest) | 1381.24 s / 0.062 | Unsupported (not declared in manifest) |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Hansda Bengali Voice Compact INT8 (Jahnavi) | 1323.76 MB (n=1; 170 samples) | 1427.62 MB (sampled max; n=1; 170 samples) | Unsupported (not declared in manifest) | Unsupported (not declared in manifest) | 2.76 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Hansda Bengali Voice Compact INT8 (Jahnavi) | [Report](../../results/2026-11-23t12-22-44-499z-bengali-voice-cpu-warm-96cad45e/summary.md) | Unsupported (manifest) | [Report](../../results/2026-11-23t12-28-36-269z-bengali-voice-cpu-cached-bfe96b97/summary.md) | Unsupported (manifest) | [Support details](../../docs/MODEL_SUPPORT.md#bengali-voice) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
