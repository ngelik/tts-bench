# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661` (source fingerprint `659bb701ec977ff2b4a083a9b0eeff601fe72cfafcf539084168b68b75c0a5ab`), on Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU not reported. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 20,000-character article (93 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| sanoTTS Amy 1.45M (Kokopop F16/F32) | 1118.90 s (1117.89–1119.51; n=5) | 173.41 s (173.04–173.79; n=5) | 12720.84 ms (n=5) | 2001.04 ms (n=5) | 1312.84 s / 0.852 | 1312.83 s / 0.132 |
| sanoTTS Heart (Kokopop F32) | 39.17 s (39.08–39.36; n=5) | 6.06 s (6.03–6.13; n=5) | 439.80 ms (n=5) | 81.58 ms (n=5) | 1330.01 s / 0.029 | 1330.00 s / 0.005 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| sanoTTS Amy 1.45M (Kokopop F16/F32) | Not submitted | Not submitted | Not submitted | Not submitted | 3.24 MB |
| sanoTTS Heart (Kokopop F32) | Not submitted | Not submitted | Not submitted | Not submitted | 9.38 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| sanoTTS Amy 1.45M (Kokopop F16/F32) | [Report](../../results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) | [Report](../../results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) | Not submitted | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#sano-amy-gguf) | [Terms](../../docs/LICENSING.md) |
| sanoTTS Heart (Kokopop F32) | [Report](../../results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) | [Report](../../results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) | Not submitted | Not submitted | [Support details](../../docs/MODEL_SUPPORT.md#sano-heart-gguf) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
