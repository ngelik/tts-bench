# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `0c5a1a00e43aaa0976a98425a3f82f5fe0a4c4ce` (source fingerprint `25329cb4bdd131e4b353389379960c83b96adc2d2ea41243f0677120aed631b4`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `ml-article-v1`, 23,011 characters / 105 chunks, SHA-256 `ef98dc2e0c65d273b4b0514501c0b8e45022ad0e5d766beedfd60b03fa5c46fd`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 23,011-character article (105 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tui Voice Mini Malayalam F2 (FP32) | 89.10 s (89.07–89.12; n=3) | 22.34 s (22.21–22.37; n=3) | 928.84 ms (n=3) | 225.65 ms (n=3) | 1373.18 s / 0.065 | 1373.18 s / 0.016 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tui Voice Mini Malayalam F2 (FP32) | 1256.27 MB (n=1; 177 samples) | 1345.22 MB (sampled max; n=1; 177 samples) | 2068.65 MB (n=1; 45 samples) | 2267.38 MB (sampled max; n=1; 45 samples) | 21.39 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tui Voice Mini Malayalam F2 (FP32) | [Report](../../results/2026-11-23t15-38-32-106z-tui-voice-mini-ml-cpu-warm-02e159f8/summary.md) | [Report](../../results/2026-11-23t15-44-39-263z-tui-voice-mini-ml-webgpu-warm-28be0755/summary.md) | [Report](../../results/2026-11-23t15-46-19-544z-tui-voice-mini-ml-cpu-cached-457bf385/summary.md) | [Report](../../results/2026-11-23t15-47-58-087z-tui-voice-mini-ml-webgpu-cached-1aa0b577/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tui-voice-mini-ml) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
