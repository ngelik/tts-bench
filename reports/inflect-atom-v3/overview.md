# Browser TTS campaign overview

**Cohort:** native headed-Chrome results from source commit `913fb381bba216d744b3168705029d0da3ab9a5c` (source fingerprint `4526c64c6f4eebbba1a522a9416c3a071a5802521e3e3947f18d4279cbaec0ea`), on MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Darwin 25.6.0 · Apple M1 Pro · Google Chrome 157.0.8103.40 · GPU apple. Fixture: `english-20k-v1`, 20,000 characters / 93 chunks, SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`.

The included receipts share one source, exact environment and fixture; voice, precision and non-backend settings are checked per model. The recorded non-backend model settings match; `executionProviders` identifies the requested runtime providers. Scenarios remain separate and are never pooled. Model support and terms: [voice/language counts](../../docs/MODEL_SUPPORT.md) · [licensing and publication boundaries](../../docs/LICENSING.md).

## Warm generation

This report contains no scored warm generation times. The receipt table identifies the submitted scenarios and any terminal errors.

| Model | CPU generation median (min–max) | WebGPU generation median (min–max) | CPU first PCM median | WebGPU first PCM median | CPU audio / RTF median | WebGPU audio / RTF median |
|---|---:|---:|---:|---:|---:|---:|
| Inflect Atom v3 157K FP32 | Not submitted | Not submitted | Not submitted | Not submitted | Not submitted | Not submitted |

## Resource diagnostics

Cached RAM is the mean process-tree RSS sampled during one full generation in a separate one-tab Chrome session. It includes browser baseline and inference workers, may double-count shared pages, and is not model-only RAM or VRAM. The peak column is the largest RSS sample inside the same generation window; process RSS does not measure total CPU plus GPU allocations. Decimal MB = 1,000,000 bytes.

| Model | CPU mean Chrome RSS | CPU max sampled RSS | WebGPU mean Chrome RSS | WebGPU max sampled RSS | Pinned model weights |
|---|---:|---:|---:|---:|---:|
| Inflect Atom v3 157K FP32 | 1047.34 MB (n=1; 180 samples) | 1114.51 MB (sampled max; n=1; 180 samples) | 1788.98 MB (n=1; 178 samples) | 1865.83 MB (sampled max; n=1; 178 samples) | 0.71 MB |

## Submitted receipts

Each cell links to its submitted receipt and full per-run report. Missing entries are labeled, not treated as zero.

| Model | Warm CPU | Warm WebGPU | Cached CPU RAM | Cached WebGPU RAM | Support | License |
|---|---|---|---|---|---|---|
| Inflect Atom v3 157K FP32 | Not submitted | Not submitted | [Report](../../results/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c/summary.md) | [Report](../../results/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a/summary.md) | [Support details](../../docs/MODEL_SUPPORT.md#inflect-atom-v3) | [Terms](../../docs/LICENSING.md) |

## Unsupported and error outcomes

All submitted cells are measured.


![Campaign metrics chart](overview.svg)

This overview reports measured browser execution and resource diagnostics only. It does not rank speech quality or establish intelligibility. Compare scenarios only within their named protocol boundaries; unsupported, unavailable, unrecorded and not-submitted values remain distinct.
