# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `5576650cfde71cb70cea0f3bc8766c7094e767de` (source fingerprint `ed4fbf4774a1ab3ec4d06d3fe6c810fa031410ab287ced11290d9166b582f11d`), on MacBook Pro (Apple M1 Pro, 16 GB) · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.79 · GPU apple. Fixture: `pt-br-article-v1`, 22,164 characters / 101 chunks, SHA-256 `718c92e50ffeb66db7fa088018ff7860c3824348a6db5917be40d6d2cd6eb686`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` or `waveformExecutionProviders` identify the selected runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

Each warm run starts with one excluded 22,164-character article (101 chunks). Each generation time shows the observed range and the number of scored articles (n). When n=1, the median and both endpoints are the single observation. First PCM is the median time to the first audio samples. Output duration and real-time factor use the recorded sample count, sample rate and generation time.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Tiny Voca Brazilian Portuguese F (Haple Kokoro, FP32) | 72.78 s (72.73–72.79; n=3) | 20.93 s (20.92–20.94; n=3) | 183.14 ms (n=3) | 70.47 ms (n=3) | 1453.02 s / 0.050 | 1453.02 s / 0.014 |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Tiny Voca Brazilian Portuguese F (Haple Kokoro, FP32) | 1216.17 MB (n=1; 144 samples) | 1308.88 MB (sampled max; n=1; 144 samples) | 1846.59 MB (n=1; 42 samples) | 2046.36 MB (sampled max; n=1; 42 samples) | 21.37 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Tiny Voca Brazilian Portuguese F (Haple Kokoro, FP32) | [Report](../../results/2026-11-23t03-19-07-622z-tiny-voca-ptbr-kokoro-cpu-warm-f23b292d/summary.md) | [Report](../../results/2026-11-23t03-24-08-743z-tiny-voca-ptbr-kokoro-webgpu-warm-197906d5/summary.md) | [Report](../../results/2026-11-23t03-25-43-217z-tiny-voca-ptbr-kokoro-cpu-cached-95ba9870/summary.md) | [Report](../../results/2026-11-23t03-27-04-807z-tiny-voca-ptbr-kokoro-webgpu-cached-469b132c/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#tiny-voca-ptbr-kokoro) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
