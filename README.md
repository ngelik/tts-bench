# Browser TTS Benchmark

[![Validate benchmark submissions](https://github.com/ngelik/tts-bench/actions/workflows/validate.yml/badge.svg)](https://github.com/ngelik/tts-bench/actions/workflows/validate.yml)

Repeatable, local text-to-speech benchmarks in **Google Chrome**: CPU/WASM,
and WebGPU. Select a model, run a fixed
20,000-character English article, then contribute baseline results or request a
new model evaluation through a pull request.

All inference happens in the browser. A local Node process serves static assets
and controls Chrome; it never performs speech synthesis. Results are not uploaded
automatically. Model assets are pinned, verified and kept outside Git.

[**Explore the interactive dashboard →**](https://ngelik.github.io/tts-bench/) · [▶ Listen to the benchmark samples](https://ngelik.github.io/tts-bench/audio/) · [Run a benchmark](#run-a-benchmark) · [Request a model evaluation](#request-a-model-evaluation)

## Interactive dashboard

[**Open the benchmark dashboard**](https://ngelik.github.io/tts-bench/)
for searchable, sortable results, CPU/GPU charts, average Chrome RAM, model
weights and licenses, and inline audio playback. Open any model for memory peaks,
voice/language support, exact source receipts and recording attribution.
Historical protocols and native source cohorts remain distinct; this is an
explorer of published evidence, not a cross-cohort quality ranking.

The site is static and hosted on GitHub Pages. Its data is built from validated
result receipts, the pinned model catalog and the verified audio manifest.
No inference, analytics or external font services run on the dashboard. Audio
loads when you press play. Existing `/audio/` sample links continue to work.

```sh
npm run dashboard:build
npm run dashboard:preview
# Open the loopback URL printed by the preview server.
```

See [dashboard development and publication](docs/DASHBOARD.md) for the data
selection rules, local checks and deployment workflow.

## Reference results

Liquid LFM3: [interactive table](https://ngelik.github.io/tts-bench/?q=LFM3) · [generation charts](https://ngelik.github.io/tts-bench/?q=LFM3&view=charts) · [memory charts](https://ngelik.github.io/tts-bench/?q=LFM3&view=charts&metric=memory). Four CPU/GPU configurations represent two speech-generating models; their different quantizations and runtimes are not a controlled backend speedup comparison.

[Liquid LFM3 run notes](docs/LIQUID_LFM3_RUN_NOTES.md) document retained initialization failures, the selected clean memory repeat, and speech-completeness observations.

<!-- benchmark-results:start -->

Warm and memory tables prefer native receipts that verify the registered model and runtime files for each backend and environment. The latest attempt within that version is shown, including errors. When it has no receipt, earlier evidence stays visible. All runs and recordings remain linked below.

- **E1**: Apple M1 Pro reference machine · Google Chrome 157.0.8103.39 · macOS 26.6.2.
- **E2**: Apple M1 Pro / 16 GiB · Google Chrome 157.0.8103.39 · Darwin 25.6.0.
- **E3**: MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.39 · Darwin 25.6.0.
- **E4**: MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E5**: MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E6**: MacBook Pro · Apple M1 Pro · 8-core CPU · 16 GiB RAM · Chrome 157.0.8103.40 · Google Chrome 157.0.8103.40 · Darwin 25.6.0.

| Model | Environment | Model weights (MB) | CPU warm median | WebGPU warm median | Evidence scope |
|---|---|---:|---:|---:|---|
| Leokani 4.5M INT8 | E1 | 5.14 | [55.96 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [61.57 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Leokani 7M INT8 | E1 | 7.84 | [75.19 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [58.11 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Paradee 8M INT8 | E1 | 8.46 | [111.15 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [18.72 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Phonon 31M q8 | E1 | 64.51 | [270.41 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [51.73 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| PiVo 1.4M curated (Pi voice) | E1 | 5.84 | [87.92 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [2562.69 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Underdog Woof one-voice (Isla) | E1 | 31.71 | — | [181.81 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Paradee 8M INT8 | E2 | 8.46 | [103.92 s (n=5)](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [18.74 s (n=5)](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | Native; matched configuration |
| Piper en-GB Southern English Female low | E2 | 63.10 | [170.64 s (n=5)](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [12.07 s (n=5)](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | Native; matched configuration |
| Supertonic 3 FP32 (M3) | E3 | 398.08 | [1332.06 s (n=5)](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [67.09 s (n=5)](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | Native; matched configuration |
| Inflect Micro v2 FP32 | E4 | 37.75 | [916.34 s (n=5)](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [48.23 s (n=5)](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | Native; matched configuration |
| Kitten Nano 0.8 FP32 | E4 | 56.77 | [754.08 s (n=5)](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [66.15 s (n=5)](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | Native; matched configuration |
| Kokoro 82M FP32 | E4 | 325.53 | [2550.00 s (n=5)](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [272.86 s (n=5)](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | Native; matched configuration |
| MMS English FP32 | E4 | 114.26 | [1553.40 s (n=5)](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [59.39 s (n=5)](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | Native; matched configuration |
| Sano Amy 1.46M (English) | E4 | 5.82 | [737.23 s (n=5)](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [unsupported](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/summary.md) | Native; independent attempts |
| Silencio-2 28M FP32 | E4 | 74.51 | [607.96 s (n=5)](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [1962.27 s (n=5)](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | Native; matched configuration |
| SupraTTS 1.0 Preview FP32 | E4 | 6.96 | [21.88 s (n=5)](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [16.47 s (n=5)](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | Native; matched configuration |
| Audio8 TTS Realistic 0.6B INT4 | E5 | 587.71 | [error](results/2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18/summary.md) | [9783.96 s (n=5)](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | Native; independent attempts |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | E5 | 905.67 | [15119.14 s (n=2 of 5 planned; selected)](reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection) | [1600.61 s (n=5)](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | Native; independent attempts |
| Klein-TTS X1.5 Pro FP32 | E5 | 52.88 | [251.73 s (n=5)](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [22.00 s (n=5)](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | Native; matched configuration |
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | E5 | 2276.67 | [526.05 s (n=5)](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/summary.md) | — | Native; independent attempts |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | E5 | 1403.44 | — | [377.75 s (n=5)](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) | Native; independent attempts |
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | E5 | 2494.57 | [536.34 s (n=5)](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/summary.md) | — | Native; independent attempts |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | E5 | 1606.47 | — | [388.70 s (n=5)](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/summary.md) | Native; independent attempts |
| Mach Boom 3.5-bit (browser WASM port) | E5 | 18.16 | [1426.15 s (n=5)](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/summary.md) | [unsupported](results/2026-11-12t06-54-44-012z-mach-boom-webgpu-warm-50fcc07b/summary.md) | Native; independent attempts |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | E5 | 838.60 | [894.30 s (n=5)](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/summary.md) | — | Native; independent attempts |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | E5 | 1742.28 | [7539.10 s (n=1)](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/summary.md) | [5233.21 s (n=1)](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/summary.md) | Native; matched configuration |
| Pocket TTS 100M English (INT8/FP32) | E5 | 146.16 | [854.52 s (n=5)](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/summary.md) | [2158.19 s (n=5)](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/summary.md) | Native; matched configuration |
| Sopro v2 Turbo | E5 | 509.82 | [616.59 s (n=5)](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/summary.md) | [507.48 s (n=5)](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/summary.md) | Native; independent attempts |
| Tiny Voca 4.5M | E5 | 21.39 | [54.86 s (n=5)](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [21.47 s (n=5)](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | Native; matched configuration |
| Linnet en-35m (f1) | E6 | 83.08 | [212.58 s (n=5)](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/summary.md) | [831.84 s (n=5)](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/summary.md) | Native; independent attempts |

Each native warm score shows the number of timed 20,000-character articles (n) after the excluded warm-up. For n=1 the reported time is a single observation. A reviewed partial selection also shows the original planned count. Open the receipts for timing boundaries, observed ranges, voice, precision and power conditions.

**Reviewed CosyVoice3 CPU selection:** the displayed median uses two completed scored articles from five originally planned. The operator stopped during trial 3; the native receipt remains error (page.evaluate: Target page, context or browser has been closed). [Review the raw receipt](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/summary.md) and [hash-bound selection with checkpoints](docs/campaigns/nov14-english/cosy-cpu-warm-selection.json). The following incomplete trial is excluded.

**Original Audio8 WebGPU waveform fault.** 90.31% of this recording is constant at one PCM value. Its elapsed time describes a diagnostic execution. The CPU recording has no constant interval lasting 0.10 s. [Full waveform audit](https://github.com/ngelik/tts-bench/tree/main/diagnostics/audio8-waveform) and [interval data](diagnostics/audio8-waveform/evidence.json).

### Output-length observations

These notes report the shortest measured PCM output per source chunk. A sub-second output alone does not establish truncation or transcript fidelity. Warm-up audio is not archived. Any published clip belongs to the scored trial listed by `trialIndex` in the audio manifest and may not match the trial with the shortest source chunk. Excluded warm-up observations are listed separately from scored trials.

| Model | Backend | Evidence | Observation | Receipt |
|---|---|---|---|---|
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | WebGPU | Scored output | The shortest source-chunk output in scored trial 5 was 0.88 s (21,120 samples at 24,000 Hz). Check audio; this is an output-length observation only, not a diagnosis of truncation or transcript fidelity. | [2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | WebGPU | Excluded warm-up | The excluded warm-up's shortest source-chunk output was 0.64 s (warm-up 1; 15,360 samples at 24,000 Hz). It is not part of the scored trials and is an output-length observation only, not a diagnosis of truncation or transcript fidelity. | [2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) |

MB = 1,000,000 bytes. Model size counts pinned core model-weight files (including the vocoder), verified against the displayed run receipts; it excludes runtime, G2P, voice/config files and transfer overhead.

### Chrome RAM during generation

Dedicated full-article memory runs measure an isolated Chrome instance with one benchmark tab, including inference workers and browser baseline. These are separate resource diagnostics; their timings do not replace the warm speed measurements above. RSS may double-count shared pages and is not model-only RAM or GPU VRAM. Values are the mean of generation-window samples, averaged equally across recorded articles. [Method and reproduction](docs/MEMORY.md).

**RAM 1** · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.39 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`fb3290e1`](https://github.com/ngelik/tts-bench/commit/fb3290e1fca0c3a416e1352a1cb7fc8232ea826c).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Leokani 4.5M INT8 | 5.14 | [1292.11](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/summary.md) | [2321.36](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/summary.md) |
| Leokani 7M INT8 | 7.84 | [1424.72](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/summary.md) | [2503.38](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/summary.md) |
| Paradee 8M INT8 | 8.46 | [1317.83](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/summary.md) | [1864.65](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/summary.md) |
| Phonon 31M q8 | 64.51 | [1195.93](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/summary.md) | [1268.30](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/summary.md) |
| Piper en-GB Southern English Female low | 63.10 | [1384.05](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/summary.md) | [1909.32](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/summary.md) |
| PiVo 1.4M curated (Pi voice) | 5.84 | [1143.26](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/summary.md) | [1969.37](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/summary.md) |
| Supertonic 3 FP32 (M3) | 398.08 | [1971.02](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/summary.md) | [2506.28](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/summary.md) |
| Underdog Woof one-voice (Isla) | 31.71 | [unsupported](results/2026-11-10t12-29-27-973z-woof-cpu-cached-0c9a58d8/summary.md) | [1043.96](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/summary.md) |

**RAM 2** · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`955a8768`](https://github.com/ngelik/tts-bench/commit/955a87683c0c899cc299161a7b8b127fb75617be).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Micro v2 FP32 | 37.75 | [1299.45](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/summary.md) | [2060.21](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/summary.md) |
| Kitten Nano 0.8 FP32 | 56.77 | [1343.17](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/summary.md) | [2337.99](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/summary.md) |
| Kokoro 82M FP32 | 325.53 | [2293.74](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/summary.md) | [394.93](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/summary.md) |
| MMS English FP32 | 114.26 | [1524.37](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/summary.md) | [2303.14](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/summary.md) |
| Sano Amy 1.46M (English) | 5.82 | [997.53](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/summary.md) | [unsupported](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/summary.md) |

**RAM 3** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`150db9ef`](https://github.com/ngelik/tts-bench/commit/150db9efe48086e488bf2a206279b2384826b245).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | 1403.44 | — | [1878.80](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/summary.md) |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | 1606.47 | — | [2232.98](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/summary.md) |

**RAM 4** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`f8fc69dd`](https://github.com/ngelik/tts-bench/commit/f8fc69dd4860cbae48fe4e398f16419a4af1673f).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | 2276.67 | [3668.69](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/summary.md) | — |

**RAM 5** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`35f6b198`](https://github.com/ngelik/tts-bench/commit/35f6b1982836fe137fa2293810d9e4a144f76cd7).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | 2494.57 | [4137.23](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/summary.md) | — |

**RAM 6** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`4a72310b`](https://github.com/ngelik/tts-bench/commit/4a72310bcacf9b2a09b0d9f69982ebe36ee5cce4).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Mach Boom 3.5-bit (browser WASM port) | 18.16 | [1085.29](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/summary.md) | [unsupported](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/summary.md) |
| Pocket TTS 100M English (INT8/FP32) | 146.16 | [1761.60](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/summary.md) | [2135.24](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/summary.md) |

**RAM 7** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`ab5aec3e`](https://github.com/ngelik/tts-bench/commit/ab5aec3e510420adbcac9971f35f92152b19959c).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | 905.67 | [3738.68](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [2706.94](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | 838.60 | [1882.03](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | — |

**RAM 8** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`6ad6b9f4`](https://github.com/ngelik/tts-bench/commit/6ad6b9f4f062c77514e1fc8da4254327b2cf2e59).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Tiny Voca 4.5M | 21.39 | [1294.69](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [2349.25](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) |

**RAM 9** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`d77c6428`](https://github.com/ngelik/tts-bench/commit/d77c64289955a57526291d39b22caceffae40413).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | 1742.28 | [1706.77](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [893.58](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) |

**RAM 10** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`9c7d8801`](https://github.com/ngelik/tts-bench/commit/9c7d880199e87a15a3959ae94b632f9d9cdd40da).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Audio8 TTS Realistic 0.6B INT4 | 587.71 | [3062.81](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [2912.53](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) |

**RAM 11** · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`60565a58`](https://github.com/ngelik/tts-bench/commit/60565a58e6c3240c14a21b462c5f8fd9435ba924).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 6.96 | [1234.29](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/summary.md) | — |

**RAM 12** · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`0d5dd8e4`](https://github.com/ngelik/tts-bench/commit/0d5dd8e407191485dcb34565e7f42baa961f5f3f).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Silencio-2 28M FP32 | 74.51 | [1601.69](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/summary.md) | [1664.92](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/summary.md) |

**RAM 13** · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`ef1163d7`](https://github.com/ngelik/tts-bench/commit/ef1163d7a243fe0d82b4c0ecccb5de113d58a9a1).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 6.96 | [1212.81](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/summary.md) | [2024.57](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/summary.md) |

**RAM 14** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`37fa12d5`](https://github.com/ngelik/tts-bench/commit/37fa12d505a3691f783fbbe34f4628c55bde9ca1).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Sopro v2 Turbo | 509.82 | [1680.16](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [1792.63](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) |

**RAM 15** · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`1bf51870`](https://github.com/ngelik/tts-bench/commit/1bf5187012bad86ab324679b05dfc0a712896f80).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Klein-TTS X1.5 Pro FP32 | 52.88 | [1331.76](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/summary.md) | [1903.43](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/summary.md) |

**RAM 16** · MacBook Pro · Apple M1 Pro · 8-core CPU · 16 GiB RAM · Chrome 157.0.8103.40 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`1866106d`](https://github.com/ngelik/tts-bench/commit/1866106d8dc126273b4405d664e006a644c83516).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Linnet en-35m (f1) | 83.08 | [1284.58](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/summary.md) | [2778.33](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/summary.md) |

![Average Chrome RAM during generation](docs/reference-memory.svg)

### Voice and language support

Counts describe the pinned model/catalog, not the number of voices or languages benchmarked. All current measurements use English and one selected voice per model. Other checkpoints in a family are excluded.

| Model | Supported voices | Bundled voices | Supported languages | Scope / source |
|---|---:|---:|---|---|
| Paradee 8M INT8 | 4 | 4 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#paradee) |
| Phonon 31M q8 | 102 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#phonon) |
| Leokani 7M INT8 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#leokani-7m) |
| Leokani 4.5M INT8 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#leokani-4.5m) |
| PiVo 1.4M curated (Pi voice) | 2 | 2 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#pivo-curated) |
| Underdog Woof one-voice (Isla) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#woof) |
| Piper en-GB Southern English Female low | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#piper-en-gb-southern-english-female-low) |
| Supertonic 3 FP32 (M3) | 10 | 1 | 31 | [Details](docs/MODEL_SUPPORT.md#supertonic-3) |
| Kokoro 82M FP32 | 54 | 1 | 8 | [Details](docs/MODEL_SUPPORT.md#kokoro-82m) |
| MMS English FP32 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#mms-english) |
| Kitten Nano 0.8 FP32 | 8 | 8 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#kitten-nano-0.8) |
| Sano Amy 1.46M (English) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-amy) |
| Inflect Micro v2 FP32 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#inflect-micro-v2) |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | Unknown | Unknown | 18 | [Details](docs/MODEL_SUPPORT.md#lfm3-audio-2b-gguf) |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | Unknown | Unknown | 18 | [Details](docs/MODEL_SUPPORT.md#lfm3-omni-2b-gguf) |
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | Unknown | Unknown | 18 | [Details](docs/MODEL_SUPPORT.md#lfm3-audio-2b-fusor-q7-cpu) |
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | Unknown | Unknown | 18 | [Details](docs/MODEL_SUPPORT.md#lfm3-omni-2b-fusor-q7-cpu) |
| Mach Boom 3.5-bit (browser WASM port) | 4 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#mach-boom) |
| Pocket TTS 100M English (INT8/FP32) | 8 | 8 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#pocket-tts-100m-english-int8) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | Unknown | 1 | 9 | [Details](docs/MODEL_SUPPORT.md#fun-cosyvoice3-0.5b-2512) |
| Audio8 TTS Realistic 0.6B INT4 | Unknown | 0 | 23 | [Details](docs/MODEL_SUPPORT.md#audio8-realistic-0.6b-int4) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | 117 | 1 | 7 | [Details](docs/MODEL_SUPPORT.md#ming-3.0-tts-0.5b-gguf) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | 117 | 7 | 7 | [Details](docs/MODEL_SUPPORT.md#ming-3.0-tts-0.5b-fusor-mix-cpu) |
| Tiny Voca 4.5M | 2 | 2 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#tiny-voca) |
| Sopro v2 Turbo | Unknown | 0 | 4 (en, pt, fr, de) | [Details](docs/MODEL_SUPPORT.md#sopro-v2-turbo) |
| SupraTTS 1.0 Preview FP32 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#supratts-1.0-preview) |
| Klein-TTS X1.5 Pro FP32 | 17 | 17 | 4 (en, es, fr, it) | [Details](docs/MODEL_SUPPORT.md#klein-tts-x1.5-pro) |
| Linnet en-35m (f1) | 2 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#linnet-en-35m) |
| Silencio-2 28M FP32 | 8 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#silencio-2) |

### Controlled native comparisons

Only compatible receipts enter these comparisons; source, settings, fixture and environment checks must pass.

[five-tiny-models — table and input receipts](comparisons/five-tiny-models/summary.md)

![five-tiny-models](comparisons/five-tiny-models/chart.svg)

[m1-pro-lfm3-webgpu — table and input receipts](comparisons/m1-pro-lfm3-webgpu/summary.md)

![m1-pro-lfm3-webgpu](comparisons/m1-pro-lfm3-webgpu/chart.svg)

[m1-pro-paradee-native — table and input receipts](comparisons/m1-pro-paradee-native/summary.md)

![m1-pro-paradee-native](comparisons/m1-pro-paradee-native/chart.svg)

[m1-pro-piper-native — table and input receipts](comparisons/m1-pro-piper-native/summary.md)

![m1-pro-piper-native](comparisons/m1-pro-piper-native/chart.svg)

[m1-pro-supertonic3-native — table and input receipts](comparisons/m1-pro-supertonic3-native/summary.md)

![m1-pro-supertonic3-native](comparisons/m1-pro-supertonic3-native/chart.svg)

[mach-pocket — table and input receipts](comparisons/mach-pocket/summary.md)

![mach-pocket](comparisons/mach-pocket/chart.svg)

[nov17-ming-v3-warm-single — table and input receipts](comparisons/nov17-ming-v3-warm-single/summary.md)

![nov17-ming-v3-warm-single](comparisons/nov17-ming-v3-warm-single/chart.svg)

[tiny-voca-english — table and input receipts](comparisons/tiny-voca-english/summary.md)

![tiny-voca-english](comparisons/tiny-voca-english/chart.svg)

### Campaign overviews

Each report states its selected scenarios and keeps their measurement boundaries separate.

[audio8-codec-repair — all-metrics table and source receipts](reports/audio8-codec-repair/overview.md)

![audio8-codec-repair — campaign metrics](reports/audio8-codec-repair/overview.svg)

[erogol-sopro — all-metrics table and source receipts](reports/erogol-sopro/overview.md)

![erogol-sopro — campaign metrics](reports/erogol-sopro/overview.svg)

[erogol-sopro-cpu — all-metrics table and source receipts](reports/erogol-sopro-cpu/overview.md)

![erogol-sopro-cpu — campaign metrics](reports/erogol-sopro-cpu/overview.svg)

[five-tiny-models — all-metrics table and source receipts](reports/five-tiny-models/overview.md)

![five-tiny-models — campaign metrics](reports/five-tiny-models/overview.svg)

[klein-x1-5-pro — all-metrics table and source receipts](reports/klein-x1-5-pro/overview.md)

![klein-x1-5-pro — campaign metrics](reports/klein-x1-5-pro/overview.svg)

[lfm3-audio-cpu — all-metrics table and source receipts](reports/lfm3-audio-cpu/overview.md)

![lfm3-audio-cpu — campaign metrics](reports/lfm3-audio-cpu/overview.svg)

[lfm3-omni-cpu — all-metrics table and source receipts](reports/lfm3-omni-cpu/overview.md)

![lfm3-omni-cpu — campaign metrics](reports/lfm3-omni-cpu/overview.svg)

[lfm3-webgpu — all-metrics table and source receipts](reports/lfm3-webgpu/overview.md)

![lfm3-webgpu — campaign metrics](reports/lfm3-webgpu/overview.svg)

[linnet-en-35m-cpu-m1pro — all-metrics table and source receipts](reports/linnet-en-35m-cpu-m1pro/overview.md)

![linnet-en-35m-cpu-m1pro — campaign metrics](reports/linnet-en-35m-cpu-m1pro/overview.svg)

[linnet-en-35m-webgpu-m1pro — all-metrics table and source receipts](reports/linnet-en-35m-webgpu-m1pro/overview.md)

![linnet-en-35m-webgpu-m1pro — campaign metrics](reports/linnet-en-35m-webgpu-m1pro/overview.svg)

[mach-pocket — all-metrics table and source receipts](reports/mach-pocket/overview.md)

![mach-pocket — campaign metrics](reports/mach-pocket/overview.svg)

[nov14-ming-v3 — all-metrics table and source receipts](reports/nov14-ming-v3/overview.md)

![nov14-ming-v3 — campaign metrics](reports/nov14-ming-v3/overview.svg)

[nov14-multilingual-english — all-metrics table and source receipts](reports/nov14-multilingual-english/overview.md)

![nov14-multilingual-english — campaign metrics](reports/nov14-multilingual-english/overview.svg)

[nov17-ming-v3-warm-single — all-metrics table and source receipts](reports/nov17-ming-v3-warm-single/overview.md)

![nov17-ming-v3-warm-single — campaign metrics](reports/nov17-ming-v3-warm-single/overview.svg)

[silencio2-m1-2026-11-18 — all-metrics table and source receipts](reports/silencio2-m1-2026-11-18/overview.md)

![silencio2-m1-2026-11-18 — campaign metrics](reports/silencio2-m1-2026-11-18/overview.svg)

[supratts-1.0-preview-m1pro — all-metrics table and source receipts](reports/supratts-1.0-preview-m1pro/overview.md)

![supratts-1.0-preview-m1pro — campaign metrics](reports/supratts-1.0-preview-m1pro/overview.svg)

[tiny-voca-english — all-metrics table and source receipts](reports/tiny-voca-english/overview.md)

![tiny-voca-english — campaign metrics](reports/tiny-voca-english/overview.svg)

### Historical resource measurements

Startup, memory and download figures below belong to the original campaign. They were not remeasured in subsequent warm-only runs. CPU and later GPU timer boundaries differ; do not calculate a speedup ratio across them.

![Historical generation, startup, memory and transfer](docs/reference-overview.svg)

### Listening samples

[▶ Open the listening room](https://ngelik.github.io/tts-bench/audio/) — play and compare recordings in your browser, without cloning. GitHub README previews do not embed audio controls; each Listen link opens the matching player.

Synthetic speech from the actual recorded runs. [Listening instructions and attribution](audio/README.md). Compact clips stay in Git; full recordings are repository release assets.

| Model | Backend | Source run | 30-second clip | Full article WAV |
|---|---|---|---|---|
| Audio8 TTS Realistic 0.6B INT4 | cpu | [Receipt](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93--audio8-realistic-0.6b-int4--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93--audio8-realistic-0.6b-int4--cpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | cpu | [Receipt](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | [Receipt](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | [Receipt](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | [Receipt](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | cpu | [Receipt](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | webgpu | [Receipt](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4--fun-cosyvoice3-0.5b-2512--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4--fun-cosyvoice3-0.5b-2512--webgpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | webgpu | [Receipt](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6--fun-cosyvoice3-0.5b-2512--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6--fun-cosyvoice3-0.5b-2512--webgpu-full.wav) |
| Inflect Micro v2 FP32 | cpu | [Receipt](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6--inflect-micro-v2--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6--inflect-micro-v2--cpu-full.wav) |
| Inflect Micro v2 FP32 | webgpu | [Receipt](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201--inflect-micro-v2--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201--inflect-micro-v2--webgpu-full.wav) |
| Kitten Nano 0.8 FP32 | cpu | [Receipt](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636--kitten-nano-0.8--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636--kitten-nano-0.8--cpu-full.wav) |
| Kitten Nano 0.8 FP32 | webgpu | [Receipt](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4--kitten-nano-0.8--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4--kitten-nano-0.8--webgpu-full.wav) |
| Klein-TTS X1.5 Pro FP32 | cpu | [Receipt](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee--klein-tts-x1.5-pro--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee--klein-tts-x1.5-pro--cpu-full.wav) |
| Klein-TTS X1.5 Pro FP32 | webgpu | [Receipt](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb--klein-tts-x1.5-pro--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb--klein-tts-x1.5-pro--webgpu-full.wav) |
| Kokoro 82M FP32 | cpu | [Receipt](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21--kokoro-82m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21--kokoro-82m--cpu-full.wav) |
| Kokoro 82M FP32 | webgpu | [Receipt](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7--kokoro-82m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7--kokoro-82m--webgpu-full.wav) |
| Leokani 4.5M INT8 | cpu | [Receipt](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b--leokani-4.5m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b--leokani-4.5m--cpu-full.wav) |
| Leokani 4.5M INT8 | cpu | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--leokani-4.5m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--leokani-4.5m--cpu-full.wav) |
| Leokani 4.5M INT8 | webgpu | [Receipt](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc--leokani-4.5m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc--leokani-4.5m--webgpu-full.wav) |
| Leokani 4.5M INT8 | webgpu | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--leokani-4.5m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--leokani-4.5m--webgpu-full.wav) |
| Leokani 7M INT8 | cpu | [Receipt](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530--leokani-7m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530--leokani-7m--cpu-full.wav) |
| Leokani 7M INT8 | cpu | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--leokani-7m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--leokani-7m--cpu-full.wav) |
| Leokani 7M INT8 | webgpu | [Receipt](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50--leokani-7m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50--leokani-7m--webgpu-full.wav) |
| Leokani 7M INT8 | webgpu | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--leokani-7m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--leokani-7m--webgpu-full.wav) |
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | cpu | [Receipt](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4--lfm3-audio-2b-fusor-q7-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4--lfm3-audio-2b-fusor-q7-cpu--cpu-full.wav) |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | webgpu | [Receipt](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073--lfm3-audio-2b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073--lfm3-audio-2b-gguf--webgpu-full.wav) |
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | cpu | [Receipt](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428--lfm3-omni-2b-fusor-q7-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428--lfm3-omni-2b-fusor-q7-cpu--cpu-full.wav) |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | webgpu | [Receipt](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7--lfm3-omni-2b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7--lfm3-omni-2b-gguf--webgpu-full.wav) |
| Linnet en-35m (f1) | cpu | [Receipt](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4--linnet-en-35m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4--linnet-en-35m--cpu-full.wav) |
| Linnet en-35m (f1) | webgpu | [Receipt](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30--linnet-en-35m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30--linnet-en-35m--webgpu-full.wav) |
| Mach Boom 3.5-bit (browser WASM port) | cpu | [Receipt](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed--mach-boom--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed--mach-boom--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | cpu | [Receipt](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | cpu | [Receipt](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | cpu | [Receipt](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742--ming-3.0-tts-0.5b-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742--ming-3.0-tts-0.5b-gguf--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | cpu | [Receipt](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112--ming-3.0-tts-0.5b-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112--ming-3.0-tts-0.5b-gguf--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | [Receipt](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | [Receipt](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | [Receipt](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | [Receipt](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| MMS English FP32 | cpu | [Receipt](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2--mms-english--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2--mms-english--cpu-full.wav) |
| MMS English FP32 | webgpu | [Receipt](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a--mms-english--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a--mms-english--webgpu-full.wav) |
| Paradee 8M INT8 | cpu | [Receipt](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f--paradee--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f--paradee--cpu-full.wav) |
| Paradee 8M INT8 | cpu | [Receipt](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05--paradee--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05--paradee--cpu-full.wav) |
| Paradee 8M INT8 | webgpu | [Receipt](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0--paradee--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0--paradee--webgpu-full.wav) |
| Paradee 8M INT8 | webgpu | [Receipt](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822--paradee--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822--paradee--webgpu-full.wav) |
| Phonon 31M q8 | cpu | [Receipt](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34--phonon--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34--phonon--cpu-full.wav) |
| Phonon 31M q8 | cpu | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--phonon--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--phonon--cpu-full.wav) |
| Phonon 31M q8 | webgpu | [Receipt](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e--phonon--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e--phonon--webgpu-full.wav) |
| Phonon 31M q8 | webgpu | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--phonon--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--phonon--webgpu-full.wav) |
| Piper en-GB Southern English Female low | cpu | [Receipt](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981--piper-en-gb-southern-english-female-low--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981--piper-en-gb-southern-english-female-low--cpu-full.wav) |
| Piper en-GB Southern English Female low | cpu | [Receipt](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea--piper-en-gb-southern-english-female-low--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea--piper-en-gb-southern-english-female-low--cpu-full.wav) |
| Piper en-GB Southern English Female low | webgpu | [Receipt](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392--piper-en-gb-southern-english-female-low--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392--piper-en-gb-southern-english-female-low--webgpu-full.wav) |
| Piper en-GB Southern English Female low | webgpu | [Receipt](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8--piper-en-gb-southern-english-female-low--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8--piper-en-gb-southern-english-female-low--webgpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | cpu | [Receipt](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6--pivo-curated--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6--pivo-curated--cpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | cpu | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--pivo-curated--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--pivo-curated--cpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | webgpu | [Receipt](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4--pivo-curated--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4--pivo-curated--webgpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | webgpu | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--pivo-curated--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--pivo-curated--webgpu-full.wav) |
| Pocket TTS 100M English (INT8/FP32) | cpu | [Receipt](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412--pocket-tts-100m-english-int8--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412--pocket-tts-100m-english-int8--cpu-full.wav) |
| Pocket TTS 100M English (INT8/FP32) | webgpu | [Receipt](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93--pocket-tts-100m-english-int8--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93--pocket-tts-100m-english-int8--webgpu-full.wav) |
| Sano Amy 1.46M (English) | cpu | [Receipt](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0--sano-amy--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0--sano-amy--cpu-full.wav) |
| Silencio-2 28M FP32 | cpu | [Receipt](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf--silencio-2--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf--silencio-2--cpu-full.wav) |
| Silencio-2 28M FP32 | webgpu | [Receipt](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55--silencio-2--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55--silencio-2--webgpu-full.wav) |
| Sopro v2 Turbo | cpu | [Receipt](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e--sopro-v2-turbo--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e--sopro-v2-turbo--cpu-full.wav) |
| Sopro v2 Turbo | cpu | [Receipt](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c--sopro-v2-turbo--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c--sopro-v2-turbo--cpu-full.wav) |
| Sopro v2 Turbo | webgpu | [Receipt](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a--sopro-v2-turbo--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a--sopro-v2-turbo--webgpu-full.wav) |
| Sopro v2 Turbo | webgpu | [Receipt](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d--sopro-v2-turbo--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d--sopro-v2-turbo--webgpu-full.wav) |
| Supertonic 3 FP32 (M3) | cpu | [Receipt](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0--supertonic-3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0--supertonic-3--cpu-full.wav) |
| Supertonic 3 FP32 (M3) | cpu | [Receipt](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c--supertonic-3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c--supertonic-3--cpu-full.wav) |
| Supertonic 3 FP32 (M3) | webgpu | [Receipt](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808--supertonic-3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808--supertonic-3--webgpu-full.wav) |
| Supertonic 3 FP32 (M3) | webgpu | [Receipt](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf--supertonic-3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf--supertonic-3--webgpu-full.wav) |
| SupraTTS 1.0 Preview FP32 | cpu | [Receipt](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76--supratts-1.0-preview--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76--supratts-1.0-preview--cpu-full.wav) |
| SupraTTS 1.0 Preview FP32 | webgpu | [Receipt](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6--supratts-1.0-preview--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6--supratts-1.0-preview--webgpu-full.wav) |
| Tiny Voca 4.5M | cpu | [Receipt](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10--tiny-voca--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10--tiny-voca--cpu-full.wav) |
| Tiny Voca 4.5M | cpu | [Receipt](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20--tiny-voca--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20--tiny-voca--cpu-full.wav) |
| Tiny Voca 4.5M | webgpu | [Receipt](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec--tiny-voca--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec--tiny-voca--webgpu-full.wav) |
| Tiny Voca 4.5M | webgpu | [Receipt](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d--tiny-voca--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d--tiny-voca--webgpu-full.wav) |
| Underdog Woof one-voice (Isla) | webgpu | [Receipt](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663--woof--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663--woof--webgpu-full.wav) |
| Underdog Woof one-voice (Isla) | webgpu | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--woof--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--woof--webgpu-full.wav) |

<details>
<summary>All submitted results — every scenario and earlier run</summary>

| Run | Models / backends | Scenario / protocol | Status | Table | Chart |
|---|---|---|---|---|---|
| 1 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | cached / legacy-storage-v0-network-cached-return | measured | [Report](results/historical-2026-11-08-m1pro-network-cached-return/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-cached-return/chart.svg) |
| 2 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | network / legacy-storage-v0-network-cold | measured | [Report](results/historical-2026-11-08-m1pro-network-cold/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-cold/chart.svg) |
| 3 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | switch / legacy-storage-v0-network-switch | measured | [Report](results/historical-2026-11-08-m1pro-network-switch/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-switch/chart.svg) |
| 4 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | offline / legacy-storage-v0-offline-cache-verification | measured | [Report](results/historical-2026-11-08-m1pro-offline-cache-verification/summary.md) | [SVG](results/historical-2026-11-08-m1pro-offline-cache-verification/chart.svg) |
| 5 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | cached / legacy-storage-v0-primary-cached | measured | [Report](results/historical-2026-11-08-m1pro-primary-cached/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-cached/chart.svg) |
| 6 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | cold / legacy-storage-v0-primary-cold | measured | [Report](results/historical-2026-11-08-m1pro-primary-cold/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-cold/chart.svg) |
| 7 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | warm / legacy-storage-v0-primary-warm | measured | [Report](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-warm/chart.svg) |
| 8 · 2026-11-08 | woof/webgpu, phonon/webgpu, paradee/webgpu, leokani-7m/webgpu, pivo-curated/webgpu, leokani-4.5m/webgpu | warm / legacy-gpu-pcm-v0 | measured | [Report](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [SVG](results/historical-2026-11-08-m1pro-gpu-warm/chart.svg) |
| 9 · 2026-11-09 | paradee/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [SVG](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/chart.svg) |
| 10 · 2026-11-09 | paradee/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | [SVG](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/chart.svg) |
| 11 · 2026-11-09 | piper-en-gb-southern-english-female-low/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/summary.md) | [SVG](results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/chart.svg) |
| 12 · 2026-11-09 | piper-en-gb-southern-english-female-low/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [SVG](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/chart.svg) |
| 13 · 2026-11-09 | piper-en-gb-southern-english-female-low/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | [SVG](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/chart.svg) |
| 14 · 2026-11-10 | supertonic-3/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [SVG](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/chart.svg) |
| 15 · 2026-11-10 | supertonic-3/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | [SVG](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/chart.svg) |
| 16 · 2026-11-10 | paradee/cpu | cached / browser-tts-cached-v1-resources | error | [Report](results/2026-11-10t12-11-42-908z-paradee-cpu-cached-f3fc560d/summary.md) | [SVG](results/2026-11-10t12-11-42-908z-paradee-cpu-cached-f3fc560d/chart.svg) |
| 17 · 2026-11-10 | paradee/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/summary.md) | [SVG](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/chart.svg) |
| 18 · 2026-11-10 | paradee/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/summary.md) | [SVG](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/chart.svg) |
| 19 · 2026-11-10 | leokani-4.5m/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/summary.md) | [SVG](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/chart.svg) |
| 20 · 2026-11-10 | leokani-4.5m/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/summary.md) | [SVG](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/chart.svg) |
| 21 · 2026-11-10 | leokani-7m/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/summary.md) | [SVG](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/chart.svg) |
| 22 · 2026-11-10 | leokani-7m/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/summary.md) | [SVG](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/chart.svg) |
| 23 · 2026-11-10 | phonon/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/summary.md) | [SVG](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/chart.svg) |
| 24 · 2026-11-10 | phonon/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/summary.md) | [SVG](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/chart.svg) |
| 25 · 2026-11-10 | woof/cpu | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-10t12-29-27-973z-woof-cpu-cached-0c9a58d8/summary.md) | [SVG](results/2026-11-10t12-29-27-973z-woof-cpu-cached-0c9a58d8/chart.svg) |
| 26 · 2026-11-10 | woof/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/summary.md) | [SVG](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/chart.svg) |
| 27 · 2026-11-10 | piper-en-gb-southern-english-female-low/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/summary.md) | [SVG](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/chart.svg) |
| 28 · 2026-11-10 | piper-en-gb-southern-english-female-low/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/summary.md) | [SVG](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/chart.svg) |
| 29 · 2026-11-10 | supertonic-3/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/summary.md) | [SVG](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/chart.svg) |
| 30 · 2026-11-10 | supertonic-3/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/summary.md) | [SVG](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/chart.svg) |
| 31 · 2026-11-10 | pivo-curated/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/summary.md) | [SVG](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/chart.svg) |
| 32 · 2026-11-10 | pivo-curated/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/summary.md) | [SVG](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/chart.svg) |
| 33 · 2026-11-10 | kitten-nano-0.8/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [SVG](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/chart.svg) |
| 34 · 2026-11-10 | sano-amy/webgpu | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/summary.md) | [SVG](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/chart.svg) |
| 35 · 2026-11-10 | sano-amy/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [SVG](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/chart.svg) |
| 36 · 2026-11-10 | mms-english/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | [SVG](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/chart.svg) |
| 37 · 2026-11-10 | inflect-micro-v2/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [SVG](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/chart.svg) |
| 38 · 2026-11-10 | kitten-nano-0.8/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | [SVG](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/chart.svg) |
| 39 · 2026-11-10 | mms-english/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [SVG](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/chart.svg) |
| 40 · 2026-11-11 | kokoro-82m/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [SVG](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/chart.svg) |
| 41 · 2026-11-11 | kokoro-82m/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | [SVG](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/chart.svg) |
| 42 · 2026-11-11 | inflect-micro-v2/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | [SVG](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/chart.svg) |
| 43 · 2026-11-11 | inflect-micro-v2/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/summary.md) | [SVG](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/chart.svg) |
| 44 · 2026-11-11 | kokoro-82m/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/summary.md) | [SVG](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/chart.svg) |
| 45 · 2026-11-11 | kokoro-82m/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/summary.md) | [SVG](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/chart.svg) |
| 46 · 2026-11-11 | mms-english/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/summary.md) | [SVG](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/chart.svg) |
| 47 · 2026-11-11 | kitten-nano-0.8/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/summary.md) | [SVG](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/chart.svg) |
| 48 · 2026-11-11 | inflect-micro-v2/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/summary.md) | [SVG](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/chart.svg) |
| 49 · 2026-11-11 | mms-english/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/summary.md) | [SVG](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/chart.svg) |
| 50 · 2026-11-11 | sano-amy/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/summary.md) | [SVG](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/chart.svg) |
| 51 · 2026-11-11 | sano-amy/webgpu | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/summary.md) | [SVG](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/chart.svg) |
| 52 · 2026-11-11 | kitten-nano-0.8/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/summary.md) | [SVG](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/chart.svg) |
| 53 · 2026-11-11 | lfm3-audio-2b-gguf/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) | [SVG](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/chart.svg) |
| 54 · 2026-11-11 | lfm3-omni-2b-gguf/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/summary.md) | [SVG](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/chart.svg) |
| 55 · 2026-11-11 | lfm3-audio-2b-gguf/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/summary.md) | [SVG](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/chart.svg) |
| 56 · 2026-11-11 | lfm3-omni-2b-gguf/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/summary.md) | [SVG](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/chart.svg) |
| 57 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/summary.md) | [SVG](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/chart.svg) |
| 58 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-11t10-20-13-321z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-72b62949/summary.md) | [SVG](results/2026-11-11t10-20-13-321z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-72b62949/chart.svg) |
| 59 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t10-36-42-360z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-a50978d5/summary.md) | [SVG](results/2026-11-11t10-36-42-360z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-a50978d5/chart.svg) |
| 60 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/summary.md) | [SVG](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/chart.svg) |
| 61 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/summary.md) | [SVG](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/chart.svg) |
| 62 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/summary.md) | [SVG](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/chart.svg) |
| 63 · 2026-11-12 | mach-boom/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/summary.md) | [SVG](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/chart.svg) |
| 64 · 2026-11-12 | pocket-tts-100m-english-int8/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/summary.md) | [SVG](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/chart.svg) |
| 65 · 2026-11-12 | pocket-tts-100m-english-int8/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/summary.md) | [SVG](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/chart.svg) |
| 66 · 2026-11-12 | mach-boom/webgpu | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-12t06-54-44-012z-mach-boom-webgpu-warm-50fcc07b/summary.md) | [SVG](results/2026-11-12t06-54-44-012z-mach-boom-webgpu-warm-50fcc07b/chart.svg) |
| 67 · 2026-11-12 | mach-boom/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/summary.md) | [SVG](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/chart.svg) |
| 68 · 2026-11-12 | pocket-tts-100m-english-int8/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/summary.md) | [SVG](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/chart.svg) |
| 69 · 2026-11-12 | pocket-tts-100m-english-int8/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/summary.md) | [SVG](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/chart.svg) |
| 70 · 2026-11-12 | mach-boom/webgpu | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/summary.md) | [SVG](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/chart.svg) |
| 71 · 2026-11-14 | fun-cosyvoice3-0.5b-2512/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) | [SVG](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/chart.svg) |
| 72 · 2026-11-14 | ming-3.0-tts-0.5b-gguf/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/summary.md) | [SVG](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/chart.svg) |
| 73 · 2026-11-14 | audio8-realistic-0.6b-int4/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/summary.md) | [SVG](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/chart.svg) |
| 74 · 2026-11-14 | ming-3.0-tts-0.5b-fusor-mix-cpu/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | [SVG](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/chart.svg) |
| 75 · 2026-11-14 | fun-cosyvoice3-0.5b-2512/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [SVG](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/chart.svg) |
| 76 · 2026-11-15 | ming-3.0-tts-0.5b-gguf/cpu | cached / browser-tts-cached-v1-resources | error | [Report](results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/summary.md) | [SVG](results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/chart.svg) |
| 77 · 2026-11-15 | audio8-realistic-0.6b-int4/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/summary.md) | [SVG](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/chart.svg) |
| 78 · 2026-11-15 | audio8-realistic-0.6b-int4/webgpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92/summary.md) | [SVG](results/2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92/chart.svg) |
| 79 · 2026-11-15 | fun-cosyvoice3-0.5b-2512/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | [SVG](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/chart.svg) |
| 80 · 2026-11-15 | ming-3.0-tts-0.5b-gguf/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/summary.md) | [SVG](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/chart.svg) |
| 81 · 2026-11-15 | tiny-voca/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [SVG](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/chart.svg) |
| 82 · 2026-11-15 | tiny-voca/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) | [SVG](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/chart.svg) |
| 83 · 2026-11-16 | fun-cosyvoice3-0.5b-2512/cpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/summary.md) | [SVG](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/chart.svg) |
| 84 · 2026-11-16 | ming-3.0-tts-0.5b-gguf/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [SVG](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/chart.svg) |
| 85 · 2026-11-16 | audio8-realistic-0.6b-int4/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) | [SVG](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/chart.svg) |
| 86 · 2026-11-16 | tiny-voca/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [SVG](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/chart.svg) |
| 87 · 2026-11-16 | ming-3.0-tts-0.5b-fusor-mix-cpu/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/summary.md) | [SVG](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/chart.svg) |
| 88 · 2026-11-16 | ming-3.0-tts-0.5b-gguf/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) | [SVG](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/chart.svg) |
| 89 · 2026-11-17 | audio8-realistic-0.6b-int4/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | [SVG](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/chart.svg) |
| 90 · 2026-11-17 | tiny-voca/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | [SVG](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/chart.svg) |
| 91 · 2026-11-17 | ming-3.0-tts-0.5b-gguf/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/summary.md) | [SVG](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/chart.svg) |
| 92 · 2026-11-17 | ming-3.0-tts-0.5b-gguf/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/summary.md) | [SVG](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/chart.svg) |
| 93 · 2026-11-18 | audio8-realistic-0.6b-int4/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [SVG](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/chart.svg) |
| 94 · 2026-11-18 | silencio-2/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [SVG](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/chart.svg) |
| 95 · 2026-11-18 | silencio-2/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | [SVG](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/chart.svg) |
| 96 · 2026-11-18 | supratts-1.0-preview/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t07-30-36-660z-supratts-1.0-preview-cpu-warm-3c3a78a9/summary.md) | [SVG](results/2026-11-18t07-30-36-660z-supratts-1.0-preview-cpu-warm-3c3a78a9/chart.svg) |
| 97 · 2026-11-18 | supratts-1.0-preview/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/summary.md) | [SVG](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/chart.svg) |
| 98 · 2026-11-18 | supratts-1.0-preview/webgpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t07-33-33-066z-supratts-1.0-preview-webgpu-warm-dbe1775e/summary.md) | [SVG](results/2026-11-18t07-33-33-066z-supratts-1.0-preview-webgpu-warm-dbe1775e/chart.svg) |
| 99 · 2026-11-18 | linnet-en-35m/cpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t07-33-48-667z-linnet-en-35m-cpu-warm-1fa1636c/summary.md) | [SVG](results/2026-11-18t07-33-48-667z-linnet-en-35m-cpu-warm-1fa1636c/chart.svg) |
| 100 · 2026-11-18 | klein-tts-x1.5-pro/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3/summary.md) | [SVG](results/2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3/chart.svg) |
| 101 · 2026-11-18 | silencio-2/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/summary.md) | [SVG](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/chart.svg) |
| 102 · 2026-11-18 | linnet-en-35m/cpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t08-13-25-604z-linnet-en-35m-cpu-warm-3b452224/summary.md) | [SVG](results/2026-11-18t08-13-25-604z-linnet-en-35m-cpu-warm-3b452224/chart.svg) |
| 103 · 2026-11-18 | supratts-1.0-preview/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [SVG](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/chart.svg) |
| 104 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t08-16-32-717z-klein-tts-x1.5-pro-webgpu-warm-94682c35/summary.md) | [SVG](results/2026-11-18t08-16-32-717z-klein-tts-x1.5-pro-webgpu-warm-94682c35/chart.svg) |
| 105 · 2026-11-18 | supratts-1.0-preview/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/summary.md) | [SVG](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/chart.svg) |
| 106 · 2026-11-18 | sopro-v2-turbo/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-17-08-445z-sopro-v2-turbo-cpu-cached-519c04ea/summary.md) | [SVG](results/2026-11-18t08-17-08-445z-sopro-v2-turbo-cpu-cached-519c04ea/chart.svg) |
| 107 · 2026-11-18 | supratts-1.0-preview/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | [SVG](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/chart.svg) |
| 108 · 2026-11-18 | sopro-v2-turbo/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) | [SVG](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/chart.svg) |
| 109 · 2026-11-18 | supratts-1.0-preview/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/summary.md) | [SVG](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/chart.svg) |
| 110 · 2026-11-18 | sopro-v2-turbo/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [SVG](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/chart.svg) |
| 111 · 2026-11-18 | silencio-2/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/summary.md) | [SVG](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/chart.svg) |
| 112 · 2026-11-18 | sopro-v2-turbo/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/summary.md) | [SVG](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/chart.svg) |
| 113 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | [SVG](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/chart.svg) |
| 114 · 2026-11-18 | sopro-v2-turbo/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/summary.md) | [SVG](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/chart.svg) |
| 115 · 2026-11-18 | klein-tts-x1.5-pro/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [SVG](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/chart.svg) |
| 116 · 2026-11-18 | klein-tts-x1.5-pro/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/summary.md) | [SVG](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/chart.svg) |
| 117 · 2026-11-18 | linnet-en-35m/cpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/summary.md) | [SVG](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/chart.svg) |
| 118 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/summary.md) | [SVG](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/chart.svg) |
| 119 · 2026-11-18 | linnet-en-35m/webgpu | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/summary.md) | [SVG](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/chart.svg) |
| 120 · 2026-11-18 | linnet-en-35m/cpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/summary.md) | [SVG](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/chart.svg) |
| 121 · 2026-11-18 | linnet-en-35m/webgpu | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/summary.md) | [SVG](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/chart.svg) |
| 122 · 2026-11-18 | audio8-realistic-0.6b-int4/cpu | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18/summary.md) | [SVG](results/2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18/chart.svg) |

</details>

<!-- benchmark-results:end -->

## Use with an AI agent

Give your agent this instruction:

> Use the [browser-tts-benchmark skill](skills/browser-tts-benchmark/SKILL.md).
> Evaluate MODEL for this benchmark. If this machine is an Apple M1 Pro MacBook
> running natively as arm64, follow the baseline result workflow. Otherwise,
> prepare an evaluation-request PR containing the model link, without running it.
> I authorize publishing the reviewed source, results or request to my fork.

Replace MODEL with a catalog ID or Hugging Face model URL. Follow the
[contribution routes](#contribute-a-new-model-for-evaluation) below. For measured
submissions, a new model goes through runtime/asset/license verification and a
code PR before scored results. For a
random model, the skill records the eligible pool, seed and selection before any
timing. It never treats smoke tests, native Python inference or CPU fallback as
successful browser GPU measurements.

The skill is agent-neutral Markdown with a small Node.js selection helper. Agents
can read it directly from the clone. For Codex discovery, copy the entire
`skills/browser-tts-benchmark/` folder to `~/.codex/skills/browser-tts-benchmark/`
when that destination does not already exist, then invoke `$browser-tts-benchmark`.
Review an existing installed copy before replacing it. Other agents can load the
same `SKILL.md`; no Codex-only tool is required by the workflow.

Publication follows the user's authorization. Without it, the skill prepares
local result files and does not push. Model binaries stay local; explicitly
authorized audio uses verified clips and repository release assets.

The [fresh-clone skill trial](docs/SKILL_TRIAL.md) exercised this workflow.
All submitted runs, including Piper, appear in [Reference results](#reference-results).

## Run a benchmark

Requirements: Node.js 22 or newer, npm, installed Google Chrome, enough free disk
space for selected assets, and a desktop session for headed Chrome. A hardware
WebGPU adapter is required for GPU measurements. Local runs can use other hardware;
reference-result PRs require the M1 Pro baseline described below. Start with one model.

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
npm ci
npm run assets -- fetch --model phonon
npm run bench -- run --model phonon --backend cpu --smoke
npm run bench -- run --model phonon --backend cpu --scenario warm
```

See the [command reference](docs/CLI.md) for model selection, GPU runs, cached,
cold, offline, bandwidth-limited and model-switch scenarios. Assets are fetched/imported separately and hash-verified before running.
Use a smoke check to validate installation. For each CPU or WebGPU warm result,
generate the full article once as an excluded warm-up. Then score **one article
for models over 1 billion parameters** or for Fun-CosyVoice3. Other models
default to five scored articles. Run each model and backend sequentially.

See the [14-cell Ming, Audio8 and CosyVoice3 campaign](docs/campaigns/nov14-english/README.md), the [Ming v3 runtime retest](docs/campaigns/nov14-ming-v3/README.md), the [Audio8 codec-routing repair retest](docs/campaigns/audio8-codec-repair/README.md), and the [four-cell Tiny Voca campaign](docs/campaigns/tiny-voca-english/README.md) for pinned schedules and reproduction commands.

[Download the November 15 interim listening report](https://github.com/ngelik/tts-bench/releases/download/nov14-english-m1-report-2026-11-15/three-model-m1-pro.zip) for the three-model campaign. Extract the ZIP and open `listen.html` to compare the measurements and play six recorded excerpts offline.

Pinned model IDs (use these with `--model`):

| Model ID | CPU/WASM | WebGPU | Local terms acknowledgment |
|---|---|---|---|
| `phonon` | Yes | Yes | No |
| `paradee` | Yes | Yes, mixed operators | No |
| `leokani-7m` | Yes | Yes, CPU G2P/iSTFT | `--accept-license` |
| `leokani-4.5m` | Yes | Yes, CPU G2P/iSTFT | `--accept-license` |
| `pivo-curated` | Yes | Yes, current adapter is slow | No |
| `woof` | Unavailable in pinned runtime | Yes | `--accept-license` |
| `piper-en-gb-southern-english-female-low` | Yes | Yes, mixed operators | `--accept-license` |
| `supertonic-3` | Yes | Yes, mixed operators | `--accept-license` |

Phonon, Woof and Piper use official browser runtimes. Supertonic 3 reuses its official MIT browser helper with documented module/lifecycle integration. Model-specific adapters
record their preprocessing, voice and allowed CPU operator fallback.

New native warm runs use one common CPU/GPU timing boundary: first chunk request
through final CPU-readable PCM, excluding warm-up, validation, hashing and export.
Model loading is excluded. Receipts record the number of timed articles on
the resident engine. A one-run score is a single observation. The historical
PiVo GPU configuration can take over four hours for its five-article sequence.

## Contribute a new model for evaluation

Choose the pull-request route that matches your hardware:

| Your machine | What to submit |
|---|---|
| MacBook Pro with **Apple M1 Pro**, running natively as **arm64** | A measured baseline result PR, using the protocol and evidence requirements below. |
| Any other machine, or baseline hardware cannot be verified | An **evaluation-request PR** with the TTS model link. Maintainers can evaluate it on baseline hardware. |

The current baseline is an Apple M1 Pro MacBook Pro with **8 CPU cores and 16 GiB
RAM**, using headed Google Chrome. M1 Pro result submissions are eligible for
acceptance after evidence and protocol review; hardware alone does not guarantee
acceptance. Record the actual CPU configuration, RAM, architecture, OS and Chrome
version. Different configurations, versions or protocols remain separate cohorts.
A different Apple Silicon chip, generic ARM machine, or Rosetta/x64 run does not
qualify as an M1 Pro baseline result. Existing published evidence is retained.

### Request a model evaluation

You only need the model name and a public TTS model URL, such as a Hugging Face
model card. No benchmark run, adapter implementation, model download or audio is
required for this request.

1. Fork this repository and create a branch such as `request/org-model`.
2. Copy [the request template](evaluation-requests/TEMPLATE.md) to
   `evaluation-requests/org-model.md`, replacing `org-model` with a unique model slug.
3. Add the model name and URL. Upstream code/browser runtime, license and preferred
   voice are optional details if known.
4. Commit that request file and open a PR titled **`[Evaluation request] org/model`**.
   Select the evaluation-request type in the PR template. Leave result-specific
   checks as not applicable.

For example, the new file can contain:

```markdown
# Evaluate org/model

Model URL: https://huggingface.co/org/model

Requested evaluation: English, CPU/WASM and WebGPU where supported,
using the repository's fixed article and M1 Pro baseline.
```

Maintainers review browser feasibility, upstream terms and the requested model.
An accepted request records a proposal for evaluation; it does not automatically
run code or guarantee a completion date. When evaluated, the implementation and
measured results follow the normal PR workflow, with results added to this same
[Reference results](#reference-results) section. Keep requests out of `results/`
and do not add placeholder scores to the generated tables.

## Publish your result through a pull request

Use this route for a verified **Apple M1 Pro / native arm64** run. If you do not
have that baseline hardware, use an [evaluation request](#request-a-model-evaluation).
For a new model, first follow [model onboarding](docs/ADDING_MODELS.md) and publish
the reviewed implementation before scoring from its clean source commit.

Fork `ngelik/tts-bench` on GitHub and keep `origin` pointed at upstream. Set
`run_id` to the ID in the native receipt. Start the result branch from current
upstream main after generation finishes.

```sh
run_id=YOUR_RUN_ID
git fetch origin main
git switch -c "results/$run_id" origin/main
npm run report -- "runs/$run_id/result.json"
npm run submit -- "runs/$run_id/result.json"
```

If you are publishing an authorized recording, follow the [audio instructions](audio/README.md)
now. Stage its manifest and the clips for this run after `npm run audio -- check` passes.

```sh
git add -- audio/manifest.json ":(glob)audio/samples/${run_id}--*.wav"
```

Refresh the reference table after adding audio or a comparison. Stage any generated
campaign or comparison directory included in the PR before running the publication
check. That check reads the Git index. You can correct a staging failure and retry
with the same native receipt and recording.

```sh
npm run reference
git add -- "results/$run_id" README.md docs/reference-memory.svg
git diff --cached --stat
npm test
npm run validate
node tools/publication-check.mjs
git commit -m "Add M1 Pro benchmark $run_id"
# Add this remote once; substitute your GitHub username.
git remote add fork https://github.com/YOUR_USERNAME/tts-bench.git
git push -u fork HEAD
```

Open a pull request from your fork. The submitted bundle contains a JSON receipt,
generated Markdown table, SVG chart and checksums. CI validates these artifacts;
it does not pretend a shared GitHub runner reproduces your laptop's GPU timings.
Use `npm run compare -- --out comparisons/my-machine results/<cpu-id>/result.json results/<gpu-id>/result.json` for a combined table and chart of compatible runs.
See [CONTRIBUTING.md](CONTRIBUTING.md) for review requirements and adding models.

## Generate speech with TTSBuddy

[TTSBuddy](https://www.ttsbuddy.com) converts text, documents and webpages to speech.
Use the [TTSBuddy CLI](https://github.com/ngelik/ttsbuddy-cli) from your terminal or
AI agent to choose voices from supported models, including Kokoro and Supertonic,
and save generated audio locally.

[CLI guide](https://www.ttsbuddy.com/docs/developers/cli) · [AI agent skill](https://github.com/ngelik/ttsbuddy-cli/blob/main/skills/tts-buddy/SKILL.md) · [Raw SKILL.md](https://raw.githubusercontent.com/ngelik/ttsbuddy-cli/main/skills/tts-buddy/SKILL.md)

TTSBuddy generation uses its hosted service and your account's plan allowance.
The benchmark results in this repository measure local browser inference.

## Scope and licensing

The original harness, agent skill and fixture are MIT licensed; [retained notices](NOTICE.md) identify exceptions. Model/runtime licenses are
separate: Leokani weights and Woof have noncommercial restrictions; Paradee's
tested frontend includes a GPL component. Restricted weights, upstream engine
bundles and browser profiles are not redistributed here. Authorized recording clips and full WAV release assets retain their [attribution and terms](audio/README.md).
Read [component licensing](docs/LICENSING.md) before downloading or deploying.

See the [implementation validation record](docs/VALIDATION.md) for checks and limits.
Supported commands and validation status are documented, including limitations;
an unsupported path is not replaced by a fabricated score. The result schema,
privacy rules and evidence limits are in [docs/RESULTS.md](docs/RESULTS.md).

## Model discovery

The [2026-11-10 five-model selection](docs/discovery/2026-11-10.md) records Hugging Face downloads/likes, exact revisions, eligibility and exclusions before timing. It is a curated small English TTS shortlist, not an objective global quality ranking. Full results belong in [Reference results](#reference-results).
