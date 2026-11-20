# Separate cached Chrome memory measurements

These n=1 full-article runs are separate from the five-repetition warm timings. Sampling covers the owned Chrome process tree, including browser baseline; mean RSS uses only observations between generation start and final CPU-readable PCM. Full article-call peak has its own wider scope. Values use decimal MB. [Plans](cached-plans/) · [Exact observations and proof](resources.json).

| Converted profile | Backend | Mean generation RSS (MB) | Article-call peak (MB) | In-window samples | Cached generation (s) |
|---|---|---:|---:|---:|---:|
| sano-heart-gguf | cpu/wasm | 1066.712657 | 1794.670592 | 76 | 38.659125 |
| sano-heart-gguf | webgpu+wasm | 1087.790359 | 1749.270528 | 11 | 5.808900 |
| sano-amy-gguf | cpu/wasm | 1311.491865 | 1875.656704 | 2200 | 1104.719875 |
| sano-amy-gguf | webgpu+wasm | 1719.455492 | 2296.512512 | 341 | 171.500130 |
| sano-amy-small-gguf | cpu/wasm | 1233.326777 | 1518.256128 | 1658 | 832.538395 |
| sano-amy-small-gguf | webgpu+wasm | 1765.189997 | 2212.986880 | 275 | 138.489585 |
| sano-amy-1p8m-gguf | cpu/wasm | 1406.883245 | 1652.342784 | 2238 | 1123.292395 |
| sano-amy-1p8m-gguf | webgpu+wasm | 1819.994795 | 2334.310400 | 336 | 168.876355 |
| sano-hfc-gguf | cpu/wasm | 1324.271975 | 1558.757376 | 1797 | 902.334040 |
| sano-hfc-gguf | webgpu+wasm | 1751.924736 | 2436.874240 | 278 | 139.675140 |
| sano-kristin-gguf | cpu/wasm | 1159.063401 | 1488.715776 | 2025 | 1016.552115 |
| sano-kristin-gguf | webgpu+wasm | 1878.487066 | 2388.197376 | 310 | 155.718250 |
| sano-heart-nano-gguf-f32 | cpu/wasm | 1037.355809 | 1731.395584 | 23 | 11.748530 |
| sano-heart-nano-gguf-f32 | webgpu+wasm | 1068.817262 | 1453.883392 | 7 | 4.009885 |

Cached generation durations are diagnostic observations and do not replace warm medians. Original cached WAVs were verified privately. Where a warm recording is linked in the proof, its Float32 PCM hash, sample count, rate and actual WAV digest all match; its original warm-trial attribution is retained. No duplicate audio is attributed to a new recording. [Warm results and unmodified frontend behavior](README.md).

Heart Nano F32 has new cached memory evidence on the source pinned above. Its earlier five-run warm timings and recordings retain their original source and trial attribution; each linked recording includes that source commit in the proof. This does not create another warm measurement.

The source-pinned campaign overview does not include Nano warm timings from the earlier source. The public dashboard retains those original measurements. Original native warm receipts:

- [cpu warm receipt](../../../results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/summary.md), source `ca54c5ca1954406a72f4f0d705c6a37852ee7761`.
- [webgpu warm receipt](../../../results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/summary.md), source `ca54c5ca1954406a72f4f0d705c6a37852ee7761`.
