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

Cached generation durations are diagnostic observations and do not replace warm medians. Original cached WAVs were verified privately. Where a warm recording is linked in the proof, its Float32 PCM hash, sample count, rate and actual WAV digest all match; its original warm-trial attribution is retained. No duplicate audio is attributed to a new recording. [Warm results and unmodified frontend behavior](README.md).
