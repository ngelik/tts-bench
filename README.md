# Browser TTS Benchmark

[![Validate benchmark submissions](https://github.com/ngelik/tts-bench/actions/workflows/validate.yml/badge.svg)](https://github.com/ngelik/tts-bench/actions/workflows/validate.yml)

Repeatable, local text-to-speech benchmarks in **Google Chrome**: CPU/WASM,
and WebGPU. Select a model and a registered article language, then contribute
baseline results or request an evaluation through a pull request. English is the
default. Anyone can [contribute a translated article](docs/MULTILINGUAL.md).

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
- **E7**: Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E8**: Apple MacBook Pro M1 Pro / 16 GB · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E9**: Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E10**: Apple M1 Pro 8-core / 16 GiB baseline · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E11**: MacBook Pro (Apple M1 Pro, 16 GB, native arm64; macOS 26.6.2) · Google Chrome 157.0.8103.40 · Darwin 25.6.0.
- **E12**: MacBook Pro (Apple M1 Pro, 8 cores, 16 GiB) · Google Chrome 157.0.8103.79 · Darwin 25.6.0.
- **E13**: MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.79 · Darwin 25.6.0.
- **E14**: MacBook Pro 18,3 / Apple M1 Pro 8-core / 16 GB / arm64 · Google Chrome 157.0.8103.79 · Darwin 25.6.0.

### Austrian German (de-AT) — de-at-article-v1

23898 characters / 109 spans · fixture SHA-256 `13d72aa0ab868b492fd22384a374df6acd05c1648267da92c2db21bdc05c1324`. Compare timing only within this exact fixture and compatible source/settings/environment. Translations are separate workloads.

| Model | Environment | Model weights (MB) | CPU warm median | WebGPU warm median | Evidence scope |
|---|---|---:|---:|---:|---|
| Apptor Tiny TTS 4.5M (Austrian German) | E13 | 38.04 | [222.99 s (n=3)](results/2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536/summary.md) | [156.42 s (n=3)](results/2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22/summary.md) | Native; matched configuration |

### German (de) — de-article-v1

23885 characters / 109 spans · fixture SHA-256 `f171154d19dc0598f221e45f15365be632ed8d275eb07822c2134971190d0931`. Compare timing only within this exact fixture and compatible source/settings/environment. Translations are separate workloads.

| Model | Environment | Model weights (MB) | CPU warm median | WebGPU warm median | Evidence scope |
|---|---|---:|---:|---:|---|
| Apptor Tiny TTS 4.5M (Standard German) | E13 | 38.03 | [189.32 s (n=3)](results/2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d/summary.md) | [136.04 s (n=3)](results/2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c/summary.md) | Native; matched configuration |
| Tiny Voca DE/EN 4.6M (Voca64) | E14 | 21.49 | [72.53 s (n=3)](results/2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be/summary.md) | [22.88 s (n=3)](results/2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567/summary.md) | Native; matched configuration |

### English (en) — english-20k-v1

20000 characters / 93 spans · fixture SHA-256 `4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b`. Compare timing only within this exact fixture and compatible source/settings/environment. Translations are separate workloads.

| Model | Environment | Model weights (MB) | CPU warm median | WebGPU warm median | Evidence scope |
|---|---|---:|---:|---:|---|
| Leokani 4.5M INT8 | E1 | 5.14 | [55.96 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [61.57 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Leokani 7M INT8 | E1 | 7.84 | [75.19 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [58.11 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Paradee 8M INT8 | E1 | 8.46 | [111.15 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [18.72 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Phonon 31M q8 | E1 | 64.51 | [270.41 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [51.73 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| PiVo 1.4M curated (Pi voice) | E1 | 5.84 | [87.92 s (n=5)](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [2562.69 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Underdog Woof one-voice (Isla) | E1 | 31.71 | — | [181.81 s (n=5)](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | Historical; distinct timing protocols |
| Inflect Mini v3 Browser Port | E10 | 137.11 | [2398.30 s (n=5)](results/2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d/summary.md) | [2342.30 s (n=5)](results/2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4/summary.md) | Archived native; independent attempts |
| ZONOS3-Mini (Imogen) | E11 | 2081.59 | [3649.82 s (n=1)](results/2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f/summary.md) | — | Native; independent attempts |
| Kale TTS 1 Nano 7.5M (FP32 WebGPU) | E12 | 30.59 | — | [18.83 s (n=5)](results/2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76/summary.md) | Native; independent attempts |
| Kale TTS 1 Nano 7.5M (INT8 CPU) | E12 | 14.77 | [49.78 s (n=5)](results/2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8/summary.md) | — | Native; independent attempts |
| Tiny Voca DE/EN 4.6M (Voca64) | E14 | 21.49 | [52.09 s (n=3)](results/2026-11-22t07-18-39-233z-tiny-voca-de-en-cpu-warm-f0321520/summary.md) | [17.76 s (n=3)](results/2026-11-22t07-22-17-062z-tiny-voca-de-en-webgpu-warm-94bbf192/summary.md) | Native; matched configuration |
| Paradee 8M INT8 | E2 | 8.46 | [103.92 s (n=5)](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [18.74 s (n=5)](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | Native; matched configuration |
| Piper en-GB Southern English Female low | E2 | 63.10 | [170.64 s (n=5)](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [12.07 s (n=5)](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | Native; matched configuration |
| Supertonic 3 FP32 (M3) | E3 | 398.08 | [1332.06 s (n=5)](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [67.09 s (n=5)](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | Native; matched configuration |
| Inflect Micro v2 FP32 | E4 | 37.75 | [916.34 s (n=5)](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [48.23 s (n=5)](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | Native; matched configuration |
| Inflect Micro v3 FP32 | E4 | 47.57 | [259.52 s (n=5)](results/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326/summary.md) | [218.89 s (n=5)](results/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1/summary.md) | Native; matched configuration |
| Kitten Nano 0.8 FP32 | E4 | 56.77 | [754.08 s (n=5)](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [66.15 s (n=5)](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | Native; matched configuration |
| Kokoro 82M FP32 | E4 | 325.53 | [2550.00 s (n=5)](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [272.86 s (n=5)](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | Native; matched configuration |
| MMS English FP32 | E4 | 114.26 | [1553.40 s (n=5)](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [59.39 s (n=5)](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | Native; matched configuration |
| Sano Amy 1.46M (English) | E4 | 5.82 | [737.23 s (n=5)](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [unsupported](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/summary.md) | Native; independent attempts |
| Silencio-2 28M FP32 | E4 | 74.51 | [607.96 s (n=5)](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [1962.27 s (n=5)](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | Native; matched configuration |
| SupraTTS 1.0 Preview FP32 | E4 | 6.96 | [21.88 s (n=5)](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [16.47 s (n=5)](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | Native; matched configuration |
| Audio8 TTS Realistic 0.6B INT4 | E5 | 587.71 | [24251.09 s (n=1 of 5 planned; selected)](docs/campaigns/audio8-codec-repair/cpu-warm-selection.md) | [9783.96 s (n=5)](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | Native; independent attempts |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | E5 | 905.67 | [15119.14 s (n=2 of 5 planned; selected)](reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection) | [1600.61 s (n=5)](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | Native; independent attempts |
| Inflect Atom v3 157K FP32 | E5 | 0.71 | [89.67 s (n=5)](results/2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db/summary.md) | [88.79 s (n=5)](results/2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60/summary.md) | Native; matched configuration |
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
| sanoTTS Amy 1.83M (Kokopop F16/F32) | E7 | 4.01 | [1123.00 s (n=5)](results/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb/summary.md) | [170.54 s (n=5)](results/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0/summary.md) | Native; matched configuration |
| sanoTTS Amy 1.45M (Kokopop F16/F32) | E7 | 3.24 | [1118.90 s (n=5)](results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) | [173.41 s (n=5)](results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) | Native; matched configuration |
| sanoTTS Amy small (Kokopop F16/F32) | E7 | 2.49 | [831.37 s (n=5)](results/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a/summary.md) | [141.77 s (n=5)](results/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce/summary.md) | Native; matched configuration |
| sanoTTS Heart (Kokopop F32) | E7 | 9.38 | [39.17 s (n=5)](results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) | [6.06 s (n=5)](results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) | Native; matched configuration |
| sanoTTS heart-nano 294k (Kokopop F32) | E7 | 1.46 | [11.57 s (n=5)](results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/summary.md) | [3.71 s (n=5)](results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/summary.md) | Native; matched configuration |
| sanoTTS HFC (Kokopop F16/F32) | E7 | 4.01 | [901.17 s (n=5)](results/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10/summary.md) | [140.06 s (n=5)](results/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f/summary.md) | Native; matched configuration |
| sanoTTS Kristin (Kokopop F16/F32) | E7 | 3.12 | [1015.97 s (n=5)](results/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/summary.md) | [157.80 s (n=5)](results/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b/summary.md) | Native; matched configuration |
| ZONOS3-Mini (Imogen) | E8 | 2081.59 | — | [153.41 s (n=1)](results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/summary.md) | Native; independent attempts |
| SanoTTS Robot MCU INT8 (English, US) | E9 | 0.68 | [28.06 s (n=5)](results/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8/summary.md) | [unsupported](results/2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf/summary.md) | Native; independent attempts |
| SanoTTS Trellis experimental FP32 (English, US) | E9 | 3.98 | [132.56 s (n=5)](results/2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc/summary.md) | [unsupported](results/2026-11-19t16-13-20-544z-sano-trellis-webgpu-warm-0d8cc66d/summary.md) | Native; independent attempts |

### Ukrainian (uk) — uk-article-v1

19980 characters / 92 spans · fixture SHA-256 `542130c28a312d8e29d4ab7615280bcb661d8c1d8f74e8f2d9c298e4eaceff40`. Compare timing only within this exact fixture and compatible source/settings/environment. Translations are separate workloads.

| Model | Environment | Model weights (MB) | CPU warm median | WebGPU warm median | Evidence scope |
|---|---|---:|---:|---:|---|
| Serhiy 0.58M (Ukrainian) | E11 | 2.34 | [8.92 s (n=5)](results/2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285/summary.md) | [9.36 s (n=5)](results/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093/summary.md) | Native; independent attempts |

Each native warm score shows the number of timed articles (n) using the fixture size shown in its section after the excluded warm-up. For n=1 the reported time is a single observation. A reviewed partial selection also shows the original planned count. Open the receipts for timing boundaries, observed ranges, voice, precision and power conditions.

**Reviewed CosyVoice3 CPU selection:** the displayed median uses two completed scored articles from five originally planned. The operator stopped during trial 3; the native receipt remains error (page.evaluate: Target page, context or browser has been closed). [Review the raw receipt](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/summary.md) and [hash-bound selection with checkpoints](docs/campaigns/nov14-english/cosy-cpu-warm-selection.json). The following incomplete trial is excluded.

**Reviewed Audio8 TTS Realistic 0.6B INT4 CPU selection:** the displayed time uses 1 completed scored article from 5 originally planned, after one excluded warm-up. At the user’s request, the operator sent SIGTERM to the native CLI after scored trial 1 completed and status had advanced to trial 2. Trial 2 did not complete; trials 3–5 were not run. These repetitions contribute no score. The native receipt remains unchanged with error status after Chrome closed. The native receipt remains error (page.evaluate: Target page, context or browser has been closed). [Review the selection](docs/campaigns/audio8-codec-repair/cpu-warm-selection.md), [raw receipt](results/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/summary.md), and [hash-bound sidecar](docs/campaigns/audio8-codec-repair/cpu-warm-selection.json). Uncompleted repetitions contribute no score.

**Original Audio8 WebGPU waveform fault.** 90.31% of this recording is constant at one PCM value. Its elapsed time describes a diagnostic execution. The CPU recording has no constant interval lasting 0.10 s. [Full waveform audit](https://github.com/ngelik/tts-bench/tree/main/diagnostics/audio8-waveform) and [interval data](diagnostics/audio8-waveform/evidence.json).

### Output-length observations

These notes report the shortest measured PCM output per source chunk. A sub-second output alone does not establish truncation or transcript fidelity. Warm-up audio is not archived. Any published clip belongs to the scored trial listed by `trialIndex` in the audio manifest and may not match the trial with the shortest source chunk. Excluded warm-up observations are listed separately from scored trials.

| Model | Language / fixture | Backend | Evidence | Observation | Receipt |
|---|---|---|---|---|---|
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | en / english-20k-v1 | WebGPU | Scored output | The shortest source-chunk output in scored trial 5 was 0.88 s (21,120 samples at 24,000 Hz). Check audio; this is an output-length observation only, not a diagnosis of truncation or transcript fidelity. | [2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | en / english-20k-v1 | WebGPU | Excluded warm-up | The excluded warm-up's shortest source-chunk output was 0.64 s (warm-up 1; 15,360 samples at 24,000 Hz). It is not part of the scored trials and is an output-length observation only, not a diagnosis of truncation or transcript fidelity. | [2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) |

MB = 1,000,000 bytes. Model size counts pinned core model-weight files (including the vocoder), verified against the displayed run receipts; it excludes runtime, G2P, voice/config files and transfer overhead.

### Chrome RAM during generation

Dedicated full-article memory runs measure an isolated Chrome instance with one benchmark tab, including inference workers and browser baseline. These are separate resource diagnostics; their timings do not replace the warm speed measurements above. RSS may double-count shared pages and is not model-only RAM or GPU VRAM. Values are the mean of generation-window samples, averaged equally across recorded articles. [Method and reproduction](docs/MEMORY.md).

**RAM 1** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.39 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`fb3290e1`](https://github.com/ngelik/tts-bench/commit/fb3290e1fca0c3a416e1352a1cb7fc8232ea826c).

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

**RAM 2** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`955a8768`](https://github.com/ngelik/tts-bench/commit/955a87683c0c899cc299161a7b8b127fb75617be).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Micro v2 FP32 | 37.75 | [1299.45](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/summary.md) | [2060.21](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/summary.md) |
| Kitten Nano 0.8 FP32 | 56.77 | [1343.17](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/summary.md) | [2337.99](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/summary.md) |
| Kokoro 82M FP32 | 325.53 | [2293.74](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/summary.md) | [394.93](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/summary.md) |
| MMS English FP32 | 114.26 | [1524.37](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/summary.md) | [2303.14](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/summary.md) |
| Sano Amy 1.46M (English) | 5.82 | [997.53](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/summary.md) | [unsupported](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/summary.md) |

**RAM 3** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`150db9ef`](https://github.com/ngelik/tts-bench/commit/150db9efe48086e488bf2a206279b2384826b245).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | 1403.44 | — | [1878.80](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/summary.md) |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | 1606.47 | — | [2232.98](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/summary.md) |

**RAM 4** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`f8fc69dd`](https://github.com/ngelik/tts-bench/commit/f8fc69dd4860cbae48fe4e398f16419a4af1673f).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | 2276.67 | [3668.69](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/summary.md) | — |

**RAM 5** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`35f6b198`](https://github.com/ngelik/tts-bench/commit/35f6b1982836fe137fa2293810d9e4a144f76cd7).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | 2494.57 | [4137.23](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/summary.md) | — |

**RAM 6** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`4a72310b`](https://github.com/ngelik/tts-bench/commit/4a72310bcacf9b2a09b0d9f69982ebe36ee5cce4).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Mach Boom 3.5-bit (browser WASM port) | 18.16 | [1085.29](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/summary.md) | [unsupported](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/summary.md) |
| Pocket TTS 100M English (INT8/FP32) | 146.16 | [1761.60](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/summary.md) | [2135.24](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/summary.md) |

**RAM 7** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`ab5aec3e`](https://github.com/ngelik/tts-bench/commit/ab5aec3e510420adbcac9971f35f92152b19959c).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | 905.67 | [3738.68](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [2706.94](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | 838.60 | [1882.03](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | — |

**RAM 8** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`6ad6b9f4`](https://github.com/ngelik/tts-bench/commit/6ad6b9f4f062c77514e1fc8da4254327b2cf2e59).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Tiny Voca 4.5M | 21.39 | [1294.69](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [2349.25](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) |

**RAM 9** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`d77c6428`](https://github.com/ngelik/tts-bench/commit/d77c64289955a57526291d39b22caceffae40413).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | 1742.28 | [1706.77](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [893.58](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) |

**RAM 10** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`9c7d8801`](https://github.com/ngelik/tts-bench/commit/9c7d880199e87a15a3959ae94b632f9d9cdd40da).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Audio8 TTS Realistic 0.6B INT4 | 587.71 | [3062.81](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [2912.53](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) |

**RAM 11** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`60565a58`](https://github.com/ngelik/tts-bench/commit/60565a58e6c3240c14a21b462c5f8fd9435ba924).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 6.96 | [1234.29](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/summary.md) | — |

**RAM 12** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`0d5dd8e4`](https://github.com/ngelik/tts-bench/commit/0d5dd8e407191485dcb34565e7f42baa961f5f3f).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Silencio-2 28M FP32 | 74.51 | [1601.69](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/summary.md) | [1664.92](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/summary.md) |

**RAM 13** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`ef1163d7`](https://github.com/ngelik/tts-bench/commit/ef1163d7a243fe0d82b4c0ecccb5de113d58a9a1).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| SupraTTS 1.0 Preview FP32 | 6.96 | [1212.81](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/summary.md) | [2024.57](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/summary.md) |

**RAM 14** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`37fa12d5`](https://github.com/ngelik/tts-bench/commit/37fa12d505a3691f783fbbe34f4628c55bde9ca1).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Sopro v2 Turbo | 509.82 | [1680.16](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [1792.63](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) |

**RAM 15** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`1bf51870`](https://github.com/ngelik/tts-bench/commit/1bf5187012bad86ab324679b05dfc0a712896f80).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Klein-TTS X1.5 Pro FP32 | 52.88 | [1331.76](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/summary.md) | [1903.43](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/summary.md) |

**RAM 16** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro · Apple M1 Pro · 8-core CPU · 16 GiB RAM · Chrome 157.0.8103.40 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`1866106d`](https://github.com/ngelik/tts-bench/commit/1866106d8dc126273b4405d664e006a644c83516).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Linnet en-35m (f1) | 83.08 | [1284.58](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/summary.md) | [2778.33](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/summary.md) |

**RAM 17** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`913fb381`](https://github.com/ngelik/tts-bench/commit/913fb381bba216d744b3168705029d0da3ab9a5c).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Atom v3 157K FP32 | 0.71 | [1047.34](results/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c/summary.md) | [1788.98](results/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a/summary.md) |

**RAM 18** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · Apple MacBook Pro M1 Pro / 16 GB · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`de9dded4`](https://github.com/ngelik/tts-bench/commit/de9dded4722f160d185b4dcbbb720edec8ee595f).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| ZONOS3-Mini (Imogen) | 2081.59 | — | [1126.22](results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/summary.md) |

**RAM 19** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`7f9b7982`](https://github.com/ngelik/tts-bench/commit/7f9b7982e5336be8642f91404584114371582fcd).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| SanoTTS Robot MCU INT8 (English, US) | 0.68 | [835.66](results/2026-11-19t09-36-45-778z-sano-robot-mcu-cpu-cached-0c917edc/summary.md) | — |
| SanoTTS Trellis experimental FP32 (English, US) | 3.98 | [745.52](results/2026-11-19t11-12-09-964z-sano-trellis-cpu-cached-7b7a68cf/summary.md) | — |

**RAM 20** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`796a1274`](https://github.com/ngelik/tts-bench/commit/796a12747ad7c7ed79b3592dfa88c875629c0084).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Micro v3 FP32 | 47.57 | [939.74](results/2026-11-19t11-14-33-448z-inflect-micro-v3-cpu-cached-2c490708/summary.md) | [1108.40](results/2026-11-19t13-58-17-329z-inflect-micro-v3-webgpu-cached-90200a0e/summary.md) |

**RAM 21** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · Apple M1 Pro 8-core / 16 GiB baseline · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`3aa0b423`](https://github.com/ngelik/tts-bench/commit/3aa0b423b8ba6c36fea0b6ab2db2c046bfb57c49).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Mini v3 Browser Port | 137.11 | [1136.97](results/2026-11-19t14-44-23-057z-inflect-mini-v3-browser-port-cpu-cached-fcce4af1/summary.md) | — |

**RAM 22** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · Apple M1 Pro 8-core / 16 GiB baseline · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`c1ec07c3`](https://github.com/ngelik/tts-bench/commit/c1ec07c3555ab43926a5fdc9213f46f3357065ed).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Inflect Mini v3 Browser Port | 137.11 | — | [1109.12](results/2026-11-19t20-24-45-805z-inflect-mini-v3-browser-port-webgpu-cached-1daec6ab/summary.md) |

**RAM 23** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`01d9c9f5`](https://github.com/ngelik/tts-bench/commit/01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| sanoTTS Amy 1.83M (Kokopop F16/F32) | 4.01 | [1406.88](results/2026-11-20t12-24-52-820z-sano-amy-1p8m-gguf-cpu-cached-6661f50b/summary.md) | [1819.99](results/2026-11-20t13-45-35-048z-sano-amy-1p8m-gguf-webgpu-cached-41ff0a84/summary.md) |
| sanoTTS Amy 1.45M (Kokopop F16/F32) | 3.24 | [1311.49](results/2026-11-20t11-28-38-392z-sano-amy-gguf-cpu-cached-93814559/summary.md) | [1719.46](results/2026-11-20t11-48-26-627z-sano-amy-gguf-webgpu-cached-2bfae2ec/summary.md) |
| sanoTTS Amy small (Kokopop F16/F32) | 2.49 | [1233.33](results/2026-11-20t11-56-16-736z-sano-amy-small-gguf-cpu-cached-8ed20ff7/summary.md) | [1765.19](results/2026-11-20t12-11-40-215z-sano-amy-small-gguf-webgpu-cached-6366cda4/summary.md) |
| sanoTTS Heart (Kokopop F32) | 9.38 | [1066.71](results/2026-11-20t11-13-31-659z-sano-heart-gguf-cpu-cached-4b20114d/summary.md) | [1087.79](results/2026-11-20t11-15-05-502z-sano-heart-gguf-webgpu-cached-4f56c5e6/summary.md) |
| sanoTTS heart-nano 294k (Kokopop F32) | 1.46 | [1037.36](results/2026-11-20t14-28-12-714z-sano-heart-nano-gguf-f32-cpu-cached-d4f0b122/summary.md) | [1068.82](results/2026-11-20t14-28-42-585z-sano-heart-nano-gguf-f32-webgpu-cached-2e67019f/summary.md) |
| sanoTTS HFC (Kokopop F16/F32) | 4.01 | [1324.27](results/2026-11-20t13-48-44-853z-sano-hfc-gguf-cpu-cached-42b2bb60/summary.md) | [1751.92](results/2026-11-20t14-04-43-133z-sano-hfc-gguf-webgpu-cached-54adeaeb/summary.md) |
| sanoTTS Kristin (Kokopop F16/F32) | 3.12 | [1159.06](results/2026-11-20t14-07-22-110z-sano-kristin-gguf-cpu-cached-2680b64b/summary.md) | [1878.49](results/2026-11-20t14-25-16-804z-sano-kristin-gguf-webgpu-cached-9bc5cbe1/summary.md) |

**RAM 24** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro (Apple M1 Pro, 16 GB, native arm64; macOS 26.6.2) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`df27dba5`](https://github.com/ngelik/tts-bench/commit/df27dba55480c7c3c79414bd5461f07eb99b0b00).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| ZONOS3-Mini (Imogen) | 2081.59 | [1879.09](results/2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700/summary.md) | — |

**RAM 25** · English (en) · fixture `english-20k-v1` · 20000 characters / 93 spans · MacBook Pro 18,3 / Apple M1 Pro 8-core / 16 GB / arm64 · Google Chrome 157.0.8103.79 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`144f1e4a`](https://github.com/ngelik/tts-bench/commit/144f1e4a2e9913f921b3ad559517c0cc9970067d).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Tiny Voca DE/EN 4.6M (Voca64) | 21.49 | [1200.00](results/2026-11-22t07-23-37-629z-tiny-voca-de-en-cpu-cached-13c87a78/summary.md) | [1688.26](results/2026-11-22t07-24-38-536z-tiny-voca-de-en-webgpu-cached-7e83045b/summary.md) |

**RAM 26** · Austrian German (de-AT) · fixture `de-at-article-v1` · 23898 characters / 109 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.79 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`e49d51e6`](https://github.com/ngelik/tts-bench/commit/e49d51e6aaa9ee77d700285ca17b02003dda5f00).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Austrian German) | 38.04 | [1105.30](results/2026-11-22t06-05-39-761z-apptor-tiny-tts-at-cpu-cached-903191c8/summary.md) | [1491.75](results/2026-11-22t06-09-40-697z-apptor-tiny-tts-at-webgpu-cached-d43f6809/summary.md) |

**RAM 27** · German (de) · fixture `de-article-v1` · 23885 characters / 109 spans · MacBook Pro (Apple M1 Pro, 16 GB) · Google Chrome 157.0.8103.79 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`4786ead9`](https://github.com/ngelik/tts-bench/commit/4786ead9110d21ee878e1fc4bee70d594cfe4a4d).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Apptor Tiny TTS 4.5M (Standard German) | 38.03 | [1192.76](results/2026-11-22t01-40-25-874z-apptor-tiny-tts-cpu-cached-f7c1946a/summary.md) | [1760.56](results/2026-11-22t01-43-52-365z-apptor-tiny-tts-webgpu-cached-04dcbe0e/summary.md) |

**RAM 28** · German (de) · fixture `de-article-v1` · 23885 characters / 109 spans · MacBook Pro 18,3 / Apple M1 Pro 8-core / 16 GB / arm64 · Google Chrome 157.0.8103.79 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`fc901126`](https://github.com/ngelik/tts-bench/commit/fc90112669fe6fff8663a853d17d06cfaf4d6ce7).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Tiny Voca DE/EN 4.6M (Voca64) | 21.49 | [1094.16](results/2026-11-22t07-06-16-939z-tiny-voca-de-en-cpu-cached-6982d19e/summary.md) | [1437.48](results/2026-11-22t07-07-40-234z-tiny-voca-de-en-webgpu-cached-78525d07/summary.md) |

**RAM 29** · Ukrainian (uk) · fixture `uk-article-v1` · 19980 characters / 92 spans · MacBook Pro (Apple M1 Pro, 16 GB, native arm64; macOS 26.6.2) · Google Chrome 157.0.8103.40 · Darwin 25.6.0 · browser-tts-cached-v1-resources · 1 full article(s) per measured cell · source [`9870c198`](https://github.com/ngelik/tts-bench/commit/9870c198651481dfed69ece7dc7bb88d870edabd).

| Model | Model weights (MB) | CPU avg Chrome RAM (MB) | WebGPU avg Chrome RAM (MB) |
|---|---:|---:|---:|
| Serhiy 0.58M (Ukrainian) | 2.34 | [1085.64](results/2026-11-20t23-20-52-422z-ua-serhiy-0p58m-cpu-cached-54c94956/summary.md) | [1964.76](results/2026-11-20t23-22-14-572z-ua-serhiy-0p58m-webgpu-cached-ac55e923/summary.md) |

![Average Chrome RAM during generation — English](docs/reference-memory.svg)

![Average Chrome RAM during generation — Austrian German](docs/reference-memory-de-AT.svg)

![Average Chrome RAM during generation — German](docs/reference-memory-de.svg)

![Average Chrome RAM during generation — Ukrainian](docs/reference-memory-uk.svg)

### Voice and language support

Counts describe the pinned model/catalog, not the number of voices or languages benchmarked. Measured languages come from each receipt’s fixture and are separated above; catalog language support does not establish which language was measured. Other checkpoints in a family are excluded.

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
| Tiny Voca DE/EN 4.6M (Voca64) | 64 | 64 | 2 (de, en) | [Details](docs/MODEL_SUPPORT.md#tiny-voca-de-en) |
| Apptor Tiny TTS 4.5M (Standard German) | 2 | 2 | 1 (de) | [Details](docs/MODEL_SUPPORT.md#apptor-tiny-tts) |
| Sopro v2 Turbo | Unknown | 0 | 4 (en, pt, fr, de) | [Details](docs/MODEL_SUPPORT.md#sopro-v2-turbo) |
| SupraTTS 1.0 Preview FP32 | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#supratts-1.0-preview) |
| Klein-TTS X1.5 Pro FP32 | 17 | 17 | 4 (en, es, fr, it) | [Details](docs/MODEL_SUPPORT.md#klein-tts-x1.5-pro) |
| Linnet en-35m (f1) | 2 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#linnet-en-35m) |
| Silencio-2 28M FP32 | 8 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#silencio-2) |
| ZONOS3-Mini (Imogen) | 27 | 1 | 43 | [Details](docs/MODEL_SUPPORT.md#zonos3-mini) |
| sanoTTS heart-nano 294k (Kokopop F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-heart-nano-gguf-f32) |
| SanoTTS Robot MCU INT8 (English, US) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-robot-mcu) |
| SanoTTS Trellis experimental FP32 (English, US) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-trellis) |
| Inflect Atom v3 157K FP32 | 6 | 6 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#inflect-atom-v3) |
| sanoTTS Heart (Kokopop F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-heart-gguf) |
| sanoTTS Amy 1.45M (Kokopop F16/F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-amy-gguf) |
| sanoTTS Amy small (Kokopop F16/F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-amy-small-gguf) |
| sanoTTS Amy 1.83M (Kokopop F16/F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-amy-1p8m-gguf) |
| sanoTTS HFC (Kokopop F16/F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-hfc-gguf) |
| sanoTTS Kristin (Kokopop F16/F32) | 1 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#sano-kristin-gguf) |
| Inflect Micro v3 FP32 | 6 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#inflect-micro-v3) |
| Inflect Mini v3 Browser Port | 6 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#inflect-mini-v3-browser-port) |
| Serhiy 0.58M (Ukrainian) | 1 | 1 | 1 (uk) | [Details](docs/MODEL_SUPPORT.md#ua-serhiy-0p58m) |
| Kale TTS 1 Nano 7.5M (INT8 CPU) | 10 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#kale-tts-1-nano-int8) |
| Kale TTS 1 Nano 7.5M (FP32 WebGPU) | 10 | 1 | 1 (en) | [Details](docs/MODEL_SUPPORT.md#kale-tts-1-nano-fp32) |
| Apptor Tiny TTS 4.5M (Austrian German) | 2 | 2 | 1 (de-AT) | [Details](docs/MODEL_SUPPORT.md#apptor-tiny-tts-at) |
| Tiny Voca Italian 6.77M (Lorenzo) | 2 | 2 | 1 (it) | [Details](docs/MODEL_SUPPORT.md#tiny-voca-it) |

### Controlled native comparisons

Only compatible receipts enter these comparisons; source, settings, fixture and environment checks must pass.

[five-tiny-models — table and input receipts](comparisons/five-tiny-models/summary.md)

![five-tiny-models](comparisons/five-tiny-models/chart.svg)

[inflect-micro-v3 — table and input receipts](comparisons/inflect-micro-v3/summary.md)

![inflect-micro-v3](comparisons/inflect-micro-v3/chart.svg)

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

[sano-heartnano-f32-m1 — table and input receipts](comparisons/sano-heartnano-f32-m1/summary.md)

![sano-heartnano-f32-m1](comparisons/sano-heartnano-f32-m1/chart.svg)

[sano-kokopop-sizes-m1 — table and input receipts](comparisons/sano-kokopop-sizes-m1/summary.md)

![sano-kokopop-sizes-m1](comparisons/sano-kokopop-sizes-m1/chart.svg)

[tiny-voca-english — table and input receipts](comparisons/tiny-voca-english/summary.md)

![tiny-voca-english](comparisons/tiny-voca-english/chart.svg)

### Campaign overviews

Each report states its selected scenarios and keeps their measurement boundaries separate.

[apptor-tiny-tts-at-de-at — all-metrics table and source receipts](reports/apptor-tiny-tts-at-de-at/overview.md)

![apptor-tiny-tts-at-de-at — campaign metrics](reports/apptor-tiny-tts-at-de-at/overview.svg)

[apptor-tiny-tts-de — all-metrics table and source receipts](reports/apptor-tiny-tts-de/overview.md)

![apptor-tiny-tts-de — campaign metrics](reports/apptor-tiny-tts-de/overview.svg)

[audio8-codec-repair — all-metrics table and source receipts](reports/audio8-codec-repair/overview.md)

![audio8-codec-repair — campaign metrics](reports/audio8-codec-repair/overview.svg)

[erogol-sopro — all-metrics table and source receipts](reports/erogol-sopro/overview.md)

![erogol-sopro — campaign metrics](reports/erogol-sopro/overview.svg)

[erogol-sopro-cpu — all-metrics table and source receipts](reports/erogol-sopro-cpu/overview.md)

![erogol-sopro-cpu — campaign metrics](reports/erogol-sopro-cpu/overview.svg)

[five-tiny-models — all-metrics table and source receipts](reports/five-tiny-models/overview.md)

![five-tiny-models — campaign metrics](reports/five-tiny-models/overview.svg)

[inflect-atom-v3 — all-metrics table and source receipts](reports/inflect-atom-v3/overview.md)

![inflect-atom-v3 — campaign metrics](reports/inflect-atom-v3/overview.svg)

[inflect-micro-v3 — all-metrics table and source receipts](reports/inflect-micro-v3/overview.md)

![inflect-micro-v3 — campaign metrics](reports/inflect-micro-v3/overview.svg)

[inflect-mini-v3-cpu-native — all-metrics table and source receipts](reports/inflect-mini-v3-cpu-native/overview.md)

![inflect-mini-v3-cpu-native — campaign metrics](reports/inflect-mini-v3-cpu-native/overview.svg)

[inflect-mini-v3-webgpu-hybrid — all-metrics table and source receipts](reports/inflect-mini-v3-webgpu-hybrid/overview.md)

![inflect-mini-v3-webgpu-hybrid — campaign metrics](reports/inflect-mini-v3-webgpu-hybrid/overview.svg)

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

[sano-heartnano-f32-m1 — all-metrics table and source receipts](reports/sano-heartnano-f32-m1/overview.md)

![sano-heartnano-f32-m1 — campaign metrics](reports/sano-heartnano-f32-m1/overview.svg)

[sano-kokopop-sizes-m1 — all-metrics table and source receipts](reports/sano-kokopop-sizes-m1/overview.md)

![sano-kokopop-sizes-m1 — campaign metrics](reports/sano-kokopop-sizes-m1/overview.svg)

[sano-robot-mcu-m1 — all-metrics table and source receipts](reports/sano-robot-mcu-m1/overview.md)

![sano-robot-mcu-m1 — campaign metrics](reports/sano-robot-mcu-m1/overview.svg)

[sano-trellis-m1 — all-metrics table and source receipts](reports/sano-trellis-m1/overview.md)

![sano-trellis-m1 — campaign metrics](reports/sano-trellis-m1/overview.svg)

[silencio2-m1-2026-11-18 — all-metrics table and source receipts](reports/silencio2-m1-2026-11-18/overview.md)

![silencio2-m1-2026-11-18 — campaign metrics](reports/silencio2-m1-2026-11-18/overview.svg)

[supratts-1.0-preview-m1pro — all-metrics table and source receipts](reports/supratts-1.0-preview-m1pro/overview.md)

![supratts-1.0-preview-m1pro — campaign metrics](reports/supratts-1.0-preview-m1pro/overview.svg)

[tiny-voca-de-en-de — all-metrics table and source receipts](reports/tiny-voca-de-en-de/overview.md)

![tiny-voca-de-en-de — campaign metrics](reports/tiny-voca-de-en-de/overview.svg)

[tiny-voca-de-en-en — all-metrics table and source receipts](reports/tiny-voca-de-en-en/overview.md)

![tiny-voca-de-en-en — campaign metrics](reports/tiny-voca-de-en-en/overview.svg)

[tiny-voca-english — all-metrics table and source receipts](reports/tiny-voca-english/overview.md)

![tiny-voca-english — campaign metrics](reports/tiny-voca-english/overview.svg)

[ua-serhiy-uk-cpu — all-metrics table and source receipts](reports/ua-serhiy-uk-cpu/overview.md)

![ua-serhiy-uk-cpu — campaign metrics](reports/ua-serhiy-uk-cpu/overview.svg)

[ua-serhiy-uk-webgpu — all-metrics table and source receipts](reports/ua-serhiy-uk-webgpu/overview.md)

![ua-serhiy-uk-webgpu — campaign metrics](reports/ua-serhiy-uk-webgpu/overview.svg)

[zonos3-mini-webgpu — all-metrics table and source receipts](reports/zonos3-mini-webgpu/overview.md)

![zonos3-mini-webgpu — campaign metrics](reports/zonos3-mini-webgpu/overview.svg)

### Historical resource measurements

Startup, memory and download figures below belong to the original English campaign. They were not remeasured in subsequent warm-only runs. CPU and later GPU timer boundaries differ; do not calculate a speedup ratio across them.

![Historical generation, startup, memory and transfer](docs/reference-overview.svg)

### Listening samples

[▶ Open the listening room](https://ngelik.github.io/tts-bench/audio/) — play and compare recordings in your browser, without cloning. GitHub README previews do not embed audio controls; each Listen link opens the matching player.

Synthetic speech from the actual recorded runs. [Listening instructions and attribution](audio/README.md). Compact clips stay in Git. When a full recording is published, its download link appears beside the clip. The manifest retains each source WAV digest and size either way.

| Model | Backend | Language | Source run | 30-second clip | Full article WAV |
|---|---|---|---|---|---|
| Apptor Tiny TTS 4.5M (Austrian German) | cpu | de-AT | [Receipt](results/2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536--apptor-tiny-tts-at--cpu.wav) | Not published |
| Apptor Tiny TTS 4.5M (Austrian German) | webgpu | de-AT | [Receipt](results/2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22--apptor-tiny-tts-at--webgpu.wav) | Not published |
| Apptor Tiny TTS 4.5M (Standard German) | cpu | de | [Receipt](results/2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d--apptor-tiny-tts--cpu.wav) | Not published |
| Apptor Tiny TTS 4.5M (Standard German) | webgpu | de | [Receipt](results/2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c--apptor-tiny-tts--webgpu.wav) | Not published |
| Audio8 TTS Realistic 0.6B INT4 | cpu | en | [Receipt](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93--audio8-realistic-0.6b-int4--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93--audio8-realistic-0.6b-int4--cpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | cpu | en | [Receipt](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | en | [Receipt](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | en | [Receipt](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Audio8 TTS Realistic 0.6B INT4 | webgpu | en | [Receipt](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c--audio8-realistic-0.6b-int4--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c--audio8-realistic-0.6b-int4--webgpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | cpu | en | [Receipt](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | webgpu | en | [Receipt](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4--fun-cosyvoice3-0.5b-2512--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4--fun-cosyvoice3-0.5b-2512--webgpu-full.wav) |
| Fun-CosyVoice3 0.5B (Q8/Q4 ONNX) | webgpu | en | [Receipt](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6--fun-cosyvoice3-0.5b-2512--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6--fun-cosyvoice3-0.5b-2512--webgpu-full.wav) |
| Inflect Atom v3 157K FP32 | cpu | en | [Receipt](results/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c--inflect-atom-v3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c--inflect-atom-v3--cpu-full.wav) |
| Inflect Atom v3 157K FP32 | cpu | en | [Receipt](results/2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db--inflect-atom-v3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db--inflect-atom-v3--cpu-full.wav) |
| Inflect Atom v3 157K FP32 | webgpu | en | [Receipt](results/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a--inflect-atom-v3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a--inflect-atom-v3--webgpu-full.wav) |
| Inflect Atom v3 157K FP32 | webgpu | en | [Receipt](results/2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60--inflect-atom-v3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60--inflect-atom-v3--webgpu-full.wav) |
| Inflect Micro v2 FP32 | cpu | en | [Receipt](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6--inflect-micro-v2--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6--inflect-micro-v2--cpu-full.wav) |
| Inflect Micro v2 FP32 | webgpu | en | [Receipt](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201--inflect-micro-v2--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201--inflect-micro-v2--webgpu-full.wav) |
| Inflect Micro v3 FP32 | cpu | en | [Receipt](results/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326--inflect-micro-v3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326--inflect-micro-v3--cpu-full.wav) |
| Inflect Micro v3 FP32 | webgpu | en | [Receipt](results/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1--inflect-micro-v3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1--inflect-micro-v3--webgpu-full.wav) |
| Inflect Mini v3 Browser Port | cpu | en | [Receipt](results/2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d--inflect-mini-v3-browser-port--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d--inflect-mini-v3-browser-port--cpu-full.wav) |
| Inflect Mini v3 Browser Port | webgpu | en | [Receipt](results/2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4--inflect-mini-v3-browser-port--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4--inflect-mini-v3-browser-port--webgpu-full.wav) |
| Kale TTS 1 Nano 7.5M (FP32 WebGPU) | webgpu | en | [Receipt](results/2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76--kale-tts-1-nano-fp32--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76--kale-tts-1-nano-fp32--webgpu-full.wav) |
| Kale TTS 1 Nano 7.5M (INT8 CPU) | cpu | en | [Receipt](results/2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8--kale-tts-1-nano-int8--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8--kale-tts-1-nano-int8--cpu-full.wav) |
| Kitten Nano 0.8 FP32 | cpu | en | [Receipt](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636--kitten-nano-0.8--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636--kitten-nano-0.8--cpu-full.wav) |
| Kitten Nano 0.8 FP32 | webgpu | en | [Receipt](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4--kitten-nano-0.8--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4--kitten-nano-0.8--webgpu-full.wav) |
| Klein-TTS X1.5 Pro FP32 | cpu | en | [Receipt](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee--klein-tts-x1.5-pro--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee--klein-tts-x1.5-pro--cpu-full.wav) |
| Klein-TTS X1.5 Pro FP32 | webgpu | en | [Receipt](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb--klein-tts-x1.5-pro--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb--klein-tts-x1.5-pro--webgpu-full.wav) |
| Kokoro 82M FP32 | cpu | en | [Receipt](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21--kokoro-82m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21--kokoro-82m--cpu-full.wav) |
| Kokoro 82M FP32 | webgpu | en | [Receipt](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7--kokoro-82m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7--kokoro-82m--webgpu-full.wav) |
| Leokani 4.5M INT8 | cpu | en | [Receipt](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b--leokani-4.5m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b--leokani-4.5m--cpu-full.wav) |
| Leokani 4.5M INT8 | cpu | en | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--leokani-4.5m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--leokani-4.5m--cpu-full.wav) |
| Leokani 4.5M INT8 | webgpu | en | [Receipt](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc--leokani-4.5m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc--leokani-4.5m--webgpu-full.wav) |
| Leokani 4.5M INT8 | webgpu | en | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--leokani-4.5m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--leokani-4.5m--webgpu-full.wav) |
| Leokani 7M INT8 | cpu | en | [Receipt](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530--leokani-7m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530--leokani-7m--cpu-full.wav) |
| Leokani 7M INT8 | cpu | en | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--leokani-7m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--leokani-7m--cpu-full.wav) |
| Leokani 7M INT8 | webgpu | en | [Receipt](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50--leokani-7m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50--leokani-7m--webgpu-full.wav) |
| Leokani 7M INT8 | webgpu | en | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--leokani-7m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--leokani-7m--webgpu-full.wav) |
| LFM3-Audio-2B (Fusor q7 / CPU 6 threads) | cpu | en | [Receipt](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4--lfm3-audio-2b-fusor-q7-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4--lfm3-audio-2b-fusor-q7-cpu--cpu-full.wav) |
| LFM3-Audio-2B (GGUF Q4_K_M / Q8_0) | webgpu | en | [Receipt](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073--lfm3-audio-2b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073--lfm3-audio-2b-gguf--webgpu-full.wav) |
| LFM3-Omni-2B (Fusor q7 / CPU 6 threads) | cpu | en | [Receipt](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428--lfm3-omni-2b-fusor-q7-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428--lfm3-omni-2b-fusor-q7-cpu--cpu-full.wav) |
| LFM3-Omni-2B (GGUF Q4_K_M / Q8_0) | webgpu | en | [Receipt](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7--lfm3-omni-2b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7--lfm3-omni-2b-gguf--webgpu-full.wav) |
| Linnet en-35m (f1) | cpu | en | [Receipt](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4--linnet-en-35m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4--linnet-en-35m--cpu-full.wav) |
| Linnet en-35m (f1) | webgpu | en | [Receipt](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30--linnet-en-35m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30--linnet-en-35m--webgpu-full.wav) |
| Mach Boom 3.5-bit (browser WASM port) | cpu | en | [Receipt](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed--mach-boom--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed--mach-boom--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | cpu | en | [Receipt](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Fusor mixed quantization / CPU) | cpu | en | [Receipt](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7--ming-3.0-tts-0.5b-fusor-mix-cpu--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | cpu | en | [Receipt](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742--ming-3.0-tts-0.5b-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742--ming-3.0-tts-0.5b-gguf--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | cpu | en | [Receipt](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112--ming-3.0-tts-0.5b-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112--ming-3.0-tts-0.5b-gguf--cpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | en | [Receipt](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | en | [Receipt](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | en | [Receipt](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| Ming 3.0 TTS 0.5B (Q8_0 GGUF) | webgpu | en | [Receipt](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29--ming-3.0-tts-0.5b-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29--ming-3.0-tts-0.5b-gguf--webgpu-full.wav) |
| MMS English FP32 | cpu | en | [Receipt](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2--mms-english--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2--mms-english--cpu-full.wav) |
| MMS English FP32 | webgpu | en | [Receipt](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a--mms-english--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a--mms-english--webgpu-full.wav) |
| Paradee 8M INT8 | cpu | en | [Receipt](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f--paradee--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f--paradee--cpu-full.wav) |
| Paradee 8M INT8 | cpu | en | [Receipt](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05--paradee--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05--paradee--cpu-full.wav) |
| Paradee 8M INT8 | webgpu | en | [Receipt](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0--paradee--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0--paradee--webgpu-full.wav) |
| Paradee 8M INT8 | webgpu | en | [Receipt](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822--paradee--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822--paradee--webgpu-full.wav) |
| Phonon 31M q8 | cpu | en | [Receipt](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34--phonon--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34--phonon--cpu-full.wav) |
| Phonon 31M q8 | cpu | en | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--phonon--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--phonon--cpu-full.wav) |
| Phonon 31M q8 | webgpu | en | [Receipt](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e--phonon--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e--phonon--webgpu-full.wav) |
| Phonon 31M q8 | webgpu | en | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--phonon--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--phonon--webgpu-full.wav) |
| Piper en-GB Southern English Female low | cpu | en | [Receipt](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981--piper-en-gb-southern-english-female-low--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981--piper-en-gb-southern-english-female-low--cpu-full.wav) |
| Piper en-GB Southern English Female low | cpu | en | [Receipt](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea--piper-en-gb-southern-english-female-low--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea--piper-en-gb-southern-english-female-low--cpu-full.wav) |
| Piper en-GB Southern English Female low | webgpu | en | [Receipt](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392--piper-en-gb-southern-english-female-low--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392--piper-en-gb-southern-english-female-low--webgpu-full.wav) |
| Piper en-GB Southern English Female low | webgpu | en | [Receipt](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8--piper-en-gb-southern-english-female-low--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8--piper-en-gb-southern-english-female-low--webgpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | cpu | en | [Receipt](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6--pivo-curated--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6--pivo-curated--cpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | cpu | en | [Receipt](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-primary-warm--pivo-curated--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-primary-warm--pivo-curated--cpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | webgpu | en | [Receipt](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4--pivo-curated--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4--pivo-curated--webgpu-full.wav) |
| PiVo 1.4M curated (Pi voice) | webgpu | en | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--pivo-curated--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--pivo-curated--webgpu-full.wav) |
| Pocket TTS 100M English (INT8/FP32) | cpu | en | [Receipt](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412--pocket-tts-100m-english-int8--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412--pocket-tts-100m-english-int8--cpu-full.wav) |
| Pocket TTS 100M English (INT8/FP32) | webgpu | en | [Receipt](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93--pocket-tts-100m-english-int8--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93--pocket-tts-100m-english-int8--webgpu-full.wav) |
| sanoTTS Amy 1.83M (Kokopop F16/F32) | cpu | en | [Receipt](results/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb--sano-amy-1p8m-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb--sano-amy-1p8m-gguf--cpu-full.wav) |
| sanoTTS Amy 1.83M (Kokopop F16/F32) | webgpu | en | [Receipt](results/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0--sano-amy-1p8m-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0--sano-amy-1p8m-gguf--webgpu-full.wav) |
| sanoTTS Amy 1.45M (Kokopop F16/F32) | cpu | en | [Receipt](results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu-full.wav) |
| sanoTTS Amy 1.45M (Kokopop F16/F32) | webgpu | en | [Receipt](results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu-full.wav) |
| sanoTTS Amy small (Kokopop F16/F32) | cpu | en | [Receipt](results/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a--sano-amy-small-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a--sano-amy-small-gguf--cpu-full.wav) |
| sanoTTS Amy small (Kokopop F16/F32) | webgpu | en | [Receipt](results/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce--sano-amy-small-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce--sano-amy-small-gguf--webgpu-full.wav) |
| Sano Amy 1.46M (English) | cpu | en | [Receipt](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0--sano-amy--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0--sano-amy--cpu-full.wav) |
| sanoTTS Heart (Kokopop F32) | cpu | en | [Receipt](results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu-full.wav) |
| sanoTTS Heart (Kokopop F32) | webgpu | en | [Receipt](results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu-full.wav) |
| sanoTTS heart-nano 294k (Kokopop F32) | cpu | en | [Receipt](results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa--sano-heart-nano-gguf-f32--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa--sano-heart-nano-gguf-f32--cpu-full.wav) |
| sanoTTS heart-nano 294k (Kokopop F32) | webgpu | en | [Receipt](results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57--sano-heart-nano-gguf-f32--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57--sano-heart-nano-gguf-f32--webgpu-full.wav) |
| sanoTTS HFC (Kokopop F16/F32) | cpu | en | [Receipt](results/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10--sano-hfc-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10--sano-hfc-gguf--cpu-full.wav) |
| sanoTTS HFC (Kokopop F16/F32) | webgpu | en | [Receipt](results/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f--sano-hfc-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f--sano-hfc-gguf--webgpu-full.wav) |
| sanoTTS Kristin (Kokopop F16/F32) | cpu | en | [Receipt](results/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20--sano-kristin-gguf--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20--sano-kristin-gguf--cpu-full.wav) |
| sanoTTS Kristin (Kokopop F16/F32) | webgpu | en | [Receipt](results/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b--sano-kristin-gguf--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b--sano-kristin-gguf--webgpu-full.wav) |
| SanoTTS Robot MCU INT8 (English, US) | cpu | en | [Receipt](results/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8--sano-robot-mcu--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8--sano-robot-mcu--cpu-full.wav) |
| SanoTTS Trellis experimental FP32 (English, US) | cpu | en | [Receipt](results/2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc--sano-trellis--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc--sano-trellis--cpu-full.wav) |
| Silencio-2 28M FP32 | cpu | en | [Receipt](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf--silencio-2--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf--silencio-2--cpu-full.wav) |
| Silencio-2 28M FP32 | webgpu | en | [Receipt](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55--silencio-2--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55--silencio-2--webgpu-full.wav) |
| Sopro v2 Turbo | cpu | en | [Receipt](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e--sopro-v2-turbo--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e--sopro-v2-turbo--cpu-full.wav) |
| Sopro v2 Turbo | cpu | en | [Receipt](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c--sopro-v2-turbo--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c--sopro-v2-turbo--cpu-full.wav) |
| Sopro v2 Turbo | webgpu | en | [Receipt](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a--sopro-v2-turbo--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a--sopro-v2-turbo--webgpu-full.wav) |
| Sopro v2 Turbo | webgpu | en | [Receipt](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d--sopro-v2-turbo--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d--sopro-v2-turbo--webgpu-full.wav) |
| Supertonic 3 FP32 (M3) | cpu | en | [Receipt](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0--supertonic-3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0--supertonic-3--cpu-full.wav) |
| Supertonic 3 FP32 (M3) | cpu | en | [Receipt](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c--supertonic-3--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c--supertonic-3--cpu-full.wav) |
| Supertonic 3 FP32 (M3) | webgpu | en | [Receipt](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808--supertonic-3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808--supertonic-3--webgpu-full.wav) |
| Supertonic 3 FP32 (M3) | webgpu | en | [Receipt](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf--supertonic-3--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf--supertonic-3--webgpu-full.wav) |
| SupraTTS 1.0 Preview FP32 | cpu | en | [Receipt](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76--supratts-1.0-preview--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76--supratts-1.0-preview--cpu-full.wav) |
| SupraTTS 1.0 Preview FP32 | webgpu | en | [Receipt](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6--supratts-1.0-preview--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6--supratts-1.0-preview--webgpu-full.wav) |
| Tiny Voca DE/EN 4.6M (Voca64) | cpu | de | [Receipt](results/2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be--tiny-voca-de-en--cpu.wav) | Not published |
| Tiny Voca DE/EN 4.6M (Voca64) | cpu | en | [Receipt](results/2026-11-22t07-18-39-233z-tiny-voca-de-en-cpu-warm-f0321520/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t07-18-39-233z-tiny-voca-de-en-cpu-warm-f0321520--tiny-voca-de-en--cpu.wav) | Not published |
| Tiny Voca DE/EN 4.6M (Voca64) | webgpu | de | [Receipt](results/2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567--tiny-voca-de-en--webgpu.wav) | Not published |
| Tiny Voca DE/EN 4.6M (Voca64) | webgpu | en | [Receipt](results/2026-11-22t07-22-17-062z-tiny-voca-de-en-webgpu-warm-94bbf192/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-22t07-22-17-062z-tiny-voca-de-en-webgpu-warm-94bbf192--tiny-voca-de-en--webgpu.wav) | Not published |
| Tiny Voca 4.5M | cpu | en | [Receipt](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10--tiny-voca--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10--tiny-voca--cpu-full.wav) |
| Tiny Voca 4.5M | cpu | en | [Receipt](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20--tiny-voca--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20--tiny-voca--cpu-full.wav) |
| Tiny Voca 4.5M | webgpu | en | [Receipt](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec--tiny-voca--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec--tiny-voca--webgpu-full.wav) |
| Tiny Voca 4.5M | webgpu | en | [Receipt](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d--tiny-voca--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d--tiny-voca--webgpu-full.wav) |
| Serhiy 0.58M (Ukrainian) | cpu | uk | [Receipt](results/2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285--ua-serhiy-0p58m--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285--ua-serhiy-0p58m--cpu-full.wav) |
| Serhiy 0.58M (Ukrainian) | webgpu | uk | [Receipt](results/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093--ua-serhiy-0p58m--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093--ua-serhiy-0p58m--webgpu-full.wav) |
| Underdog Woof one-voice (Isla) | webgpu | en | [Receipt](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663--woof--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663--woof--webgpu-full.wav) |
| Underdog Woof one-voice (Isla) | webgpu | en | [Receipt](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=historical-2026-11-08-m1pro-gpu-warm--woof--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/historical-2026-11-08-m1pro-gpu-warm--woof--webgpu-full.wav) |
| ZONOS3-Mini (Imogen) | cpu | en | [Receipt](results/2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700--zonos3-mini--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700--zonos3-mini--cpu-full.wav) |
| ZONOS3-Mini (Imogen) | cpu | en | [Receipt](results/2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f--zonos3-mini--cpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f--zonos3-mini--cpu-full.wav) |
| ZONOS3-Mini (Imogen) | webgpu | en | [Receipt](results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772--zonos3-mini--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772--zonos3-mini--webgpu-full.wav) |
| ZONOS3-Mini (Imogen) | webgpu | en | [Receipt](results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/summary.md) | [▶ Listen](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76--zonos3-mini--webgpu.wav) | [Download / listen](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76--zonos3-mini--webgpu-full.wav) |

<details>
<summary>All submitted results — every scenario and earlier run</summary>

| Run | Models / backends | Language / fixture | Scenario / protocol | Status | Table | Chart |
|---|---|---|---|---|---|---|
| 1 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | cached / legacy-storage-v0-network-cached-return | measured | [Report](results/historical-2026-11-08-m1pro-network-cached-return/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-cached-return/chart.svg) |
| 2 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | network / legacy-storage-v0-network-cold | measured | [Report](results/historical-2026-11-08-m1pro-network-cold/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-cold/chart.svg) |
| 3 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | switch / legacy-storage-v0-network-switch | measured | [Report](results/historical-2026-11-08-m1pro-network-switch/summary.md) | [SVG](results/historical-2026-11-08-m1pro-network-switch/chart.svg) |
| 4 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | offline / legacy-storage-v0-offline-cache-verification | measured | [Report](results/historical-2026-11-08-m1pro-offline-cache-verification/summary.md) | [SVG](results/historical-2026-11-08-m1pro-offline-cache-verification/chart.svg) |
| 5 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | cached / legacy-storage-v0-primary-cached | measured | [Report](results/historical-2026-11-08-m1pro-primary-cached/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-cached/chart.svg) |
| 6 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | cold / legacy-storage-v0-primary-cold | measured | [Report](results/historical-2026-11-08-m1pro-primary-cold/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-cold/chart.svg) |
| 7 · 2026-11-08 | phonon/cpu, paradee/cpu, leokani-7m/cpu, leokani-4.5m/cpu, pivo-curated/cpu, woof/webgpu | en / english-20k-v1 | warm / legacy-storage-v0-primary-warm | measured | [Report](results/historical-2026-11-08-m1pro-primary-warm/summary.md) | [SVG](results/historical-2026-11-08-m1pro-primary-warm/chart.svg) |
| 8 · 2026-11-08 | woof/webgpu, phonon/webgpu, paradee/webgpu, leokani-7m/webgpu, pivo-curated/webgpu, leokani-4.5m/webgpu | en / english-20k-v1 | warm / legacy-gpu-pcm-v0 | measured | [Report](results/historical-2026-11-08-m1pro-gpu-warm/summary.md) | [SVG](results/historical-2026-11-08-m1pro-gpu-warm/chart.svg) |
| 9 · 2026-11-09 | paradee/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/summary.md) | [SVG](results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/chart.svg) |
| 10 · 2026-11-09 | paradee/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/summary.md) | [SVG](results/2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0/chart.svg) |
| 11 · 2026-11-09 | piper-en-gb-southern-english-female-low/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/summary.md) | [SVG](results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/chart.svg) |
| 12 · 2026-11-09 | piper-en-gb-southern-english-female-low/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/summary.md) | [SVG](results/2026-11-09t20-33-26-966z-piper-en-gb-southern-english-female-low-cpu-warm-9a0ba981/chart.svg) |
| 13 · 2026-11-09 | piper-en-gb-southern-english-female-low/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/summary.md) | [SVG](results/2026-11-09t20-52-18-629z-piper-en-gb-southern-english-female-low-webgpu-warm-d8fb8392/chart.svg) |
| 14 · 2026-11-10 | supertonic-3/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/summary.md) | [SVG](results/2026-11-10t07-43-34-755z-supertonic-3-cpu-warm-a07fded0/chart.svg) |
| 15 · 2026-11-10 | supertonic-3/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/summary.md) | [SVG](results/2026-11-10t09-58-29-882z-supertonic-3-webgpu-warm-97865808/chart.svg) |
| 16 · 2026-11-10 | paradee/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | error | [Report](results/2026-11-10t12-11-42-908z-paradee-cpu-cached-f3fc560d/summary.md) | [SVG](results/2026-11-10t12-11-42-908z-paradee-cpu-cached-f3fc560d/chart.svg) |
| 17 · 2026-11-10 | paradee/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/summary.md) | [SVG](results/2026-11-10t12-13-43-130z-paradee-cpu-cached-becd1b05/chart.svg) |
| 18 · 2026-11-10 | paradee/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/summary.md) | [SVG](results/2026-11-10t12-18-50-239z-paradee-webgpu-cached-66f2f822/chart.svg) |
| 19 · 2026-11-10 | leokani-4.5m/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/summary.md) | [SVG](results/2026-11-10t12-19-17-960z-leokani-4.5m-cpu-cached-31b8534b/chart.svg) |
| 20 · 2026-11-10 | leokani-4.5m/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/summary.md) | [SVG](results/2026-11-10t12-20-20-070z-leokani-4.5m-webgpu-cached-2527e2cc/chart.svg) |
| 21 · 2026-11-10 | leokani-7m/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/summary.md) | [SVG](results/2026-11-10t12-21-33-736z-leokani-7m-cpu-cached-05654530/chart.svg) |
| 22 · 2026-11-10 | leokani-7m/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/summary.md) | [SVG](results/2026-11-10t12-22-54-319z-leokani-7m-webgpu-cached-fd1cde50/chart.svg) |
| 23 · 2026-11-10 | phonon/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/summary.md) | [SVG](results/2026-11-10t12-24-03-928z-phonon-cpu-cached-26724b34/chart.svg) |
| 24 · 2026-11-10 | phonon/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/summary.md) | [SVG](results/2026-11-10t12-28-29-585z-phonon-webgpu-cached-4f21d78e/chart.svg) |
| 25 · 2026-11-10 | woof/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-10t12-29-27-973z-woof-cpu-cached-0c9a58d8/summary.md) | [SVG](results/2026-11-10t12-29-27-973z-woof-cpu-cached-0c9a58d8/chart.svg) |
| 26 · 2026-11-10 | woof/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/summary.md) | [SVG](results/2026-11-10t12-29-29-399z-woof-webgpu-cached-14969663/chart.svg) |
| 27 · 2026-11-10 | piper-en-gb-southern-english-female-low/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/summary.md) | [SVG](results/2026-11-10t12-32-39-591z-piper-en-gb-southern-english-female-low-cpu-cached-fff0c4ea/chart.svg) |
| 28 · 2026-11-10 | piper-en-gb-southern-english-female-low/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/summary.md) | [SVG](results/2026-11-10t12-35-36-473z-piper-en-gb-southern-english-female-low-webgpu-cached-b3f670b8/chart.svg) |
| 29 · 2026-11-10 | supertonic-3/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/summary.md) | [SVG](results/2026-11-10t12-35-56-902z-supertonic-3-webgpu-cached-3af494cf/chart.svg) |
| 30 · 2026-11-10 | supertonic-3/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/summary.md) | [SVG](results/2026-11-10t12-37-17-447z-supertonic-3-cpu-cached-9f32062c/chart.svg) |
| 31 · 2026-11-10 | pivo-curated/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/summary.md) | [SVG](results/2026-11-10t12-59-54-018z-pivo-curated-cpu-cached-60e6cfd6/chart.svg) |
| 32 · 2026-11-10 | pivo-curated/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/summary.md) | [SVG](results/2026-11-10t13-01-23-404z-pivo-curated-webgpu-cached-d9ffb3e4/chart.svg) |
| 33 · 2026-11-10 | kitten-nano-0.8/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/summary.md) | [SVG](results/2026-11-10t15-16-09-599z-kitten-nano-0.8-cpu-warm-624ea636/chart.svg) |
| 34 · 2026-11-10 | sano-amy/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/summary.md) | [SVG](results/2026-11-10t16-32-02-384z-sano-amy-webgpu-warm-24afcdc7/chart.svg) |
| 35 · 2026-11-10 | sano-amy/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/summary.md) | [SVG](results/2026-11-10t16-32-03-827z-sano-amy-cpu-warm-0a4ec2a0/chart.svg) |
| 36 · 2026-11-10 | mms-english/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/summary.md) | [SVG](results/2026-11-10t17-46-17-830z-mms-english-webgpu-warm-3eb8b06a/chart.svg) |
| 37 · 2026-11-10 | inflect-micro-v2/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/summary.md) | [SVG](results/2026-11-10t17-52-21-838z-inflect-micro-v2-cpu-warm-c57a83a6/chart.svg) |
| 38 · 2026-11-10 | kitten-nano-0.8/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/summary.md) | [SVG](results/2026-11-10t19-24-19-116z-kitten-nano-0.8-webgpu-warm-cef85ae4/chart.svg) |
| 39 · 2026-11-10 | mms-english/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/summary.md) | [SVG](results/2026-11-10t19-31-08-081z-mms-english-cpu-warm-b81daec2/chart.svg) |
| 40 · 2026-11-11 | kokoro-82m/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/summary.md) | [SVG](results/2026-11-10t22-06-51-166z-kokoro-82m-cpu-warm-a9cc8d21/chart.svg) |
| 41 · 2026-11-11 | kokoro-82m/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/summary.md) | [SVG](results/2026-11-11t02-22-33-290z-kokoro-82m-webgpu-warm-58b6b9b7/chart.svg) |
| 42 · 2026-11-11 | inflect-micro-v2/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/summary.md) | [SVG](results/2026-11-11t02-50-06-191z-inflect-micro-v2-webgpu-warm-e21ef201/chart.svg) |
| 43 · 2026-11-11 | inflect-micro-v2/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/summary.md) | [SVG](results/2026-11-11t02-55-05-893z-inflect-micro-v2-webgpu-cached-51e2acf0/chart.svg) |
| 44 · 2026-11-11 | kokoro-82m/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/summary.md) | [SVG](results/2026-11-11t02-56-02-596z-kokoro-82m-webgpu-cached-b4638a41/chart.svg) |
| 45 · 2026-11-11 | kokoro-82m/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/summary.md) | [SVG](results/2026-11-11t03-00-52-961z-kokoro-82m-cpu-cached-9b2283f1/chart.svg) |
| 46 · 2026-11-11 | mms-english/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/summary.md) | [SVG](results/2026-11-11t03-44-05-639z-mms-english-cpu-cached-446def8a/chart.svg) |
| 47 · 2026-11-11 | kitten-nano-0.8/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/summary.md) | [SVG](results/2026-11-11t04-10-31-407z-kitten-nano-0.8-webgpu-cached-25f950b4/chart.svg) |
| 48 · 2026-11-11 | inflect-micro-v2/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/summary.md) | [SVG](results/2026-11-11t04-11-48-039z-inflect-micro-v2-cpu-cached-d7106d59/chart.svg) |
| 49 · 2026-11-11 | mms-english/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/summary.md) | [SVG](results/2026-11-11t04-27-23-653z-mms-english-webgpu-cached-6aa1e983/chart.svg) |
| 50 · 2026-11-11 | sano-amy/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/summary.md) | [SVG](results/2026-11-11t04-28-31-035z-sano-amy-cpu-cached-c0371d1a/chart.svg) |
| 51 · 2026-11-11 | sano-amy/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/summary.md) | [SVG](results/2026-11-11t04-41-18-742z-sano-amy-webgpu-cached-78dfb9fa/chart.svg) |
| 52 · 2026-11-11 | kitten-nano-0.8/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/summary.md) | [SVG](results/2026-11-11t04-41-26-026z-kitten-nano-0.8-cpu-cached-5dc541fc/chart.svg) |
| 53 · 2026-11-11 | lfm3-audio-2b-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/summary.md) | [SVG](results/2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073/chart.svg) |
| 54 · 2026-11-11 | lfm3-omni-2b-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/summary.md) | [SVG](results/2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7/chart.svg) |
| 55 · 2026-11-11 | lfm3-audio-2b-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/summary.md) | [SVG](results/2026-11-11t08-50-49-901z-lfm3-audio-2b-gguf-webgpu-cached-ffbdd243/chart.svg) |
| 56 · 2026-11-11 | lfm3-omni-2b-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/summary.md) | [SVG](results/2026-11-11t08-57-29-900z-lfm3-omni-2b-gguf-webgpu-cached-f692b3e2/chart.svg) |
| 57 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/summary.md) | [SVG](results/2026-11-11t09-27-11-391z-lfm3-audio-2b-fusor-q7-cpu-cpu-warm-174f10d4/chart.svg) |
| 58 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-11t10-20-13-321z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-72b62949/summary.md) | [SVG](results/2026-11-11t10-20-13-321z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-72b62949/chart.svg) |
| 59 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t10-36-42-360z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-a50978d5/summary.md) | [SVG](results/2026-11-11t10-36-42-360z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-a50978d5/chart.svg) |
| 60 · 2026-11-11 | lfm3-audio-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/summary.md) | [SVG](results/2026-11-11t10-46-24-864z-lfm3-audio-2b-fusor-q7-cpu-cpu-cached-b8404098/chart.svg) |
| 61 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/summary.md) | [SVG](results/2026-11-11t11-02-51-665z-lfm3-omni-2b-fusor-q7-cpu-cpu-warm-4378e428/chart.svg) |
| 62 · 2026-11-11 | lfm3-omni-2b-fusor-q7-cpu/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/summary.md) | [SVG](results/2026-11-11t11-57-01-791z-lfm3-omni-2b-fusor-q7-cpu-cpu-cached-42d33e30/chart.svg) |
| 63 · 2026-11-12 | mach-boom/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/summary.md) | [SVG](results/2026-11-11t23-29-37-690z-mach-boom-cpu-warm-3e5836ed/chart.svg) |
| 64 · 2026-11-12 | pocket-tts-100m-english-int8/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/summary.md) | [SVG](results/2026-11-12t01-52-33-830z-pocket-tts-100m-english-int8-webgpu-warm-69de3d93/chart.svg) |
| 65 · 2026-11-12 | pocket-tts-100m-english-int8/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/summary.md) | [SVG](results/2026-11-12t05-28-59-020z-pocket-tts-100m-english-int8-cpu-warm-72714412/chart.svg) |
| 66 · 2026-11-12 | mach-boom/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-12t06-54-44-012z-mach-boom-webgpu-warm-50fcc07b/summary.md) | [SVG](results/2026-11-12t06-54-44-012z-mach-boom-webgpu-warm-50fcc07b/chart.svg) |
| 67 · 2026-11-12 | mach-boom/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/summary.md) | [SVG](results/2026-11-12t06-54-45-636z-mach-boom-cpu-cached-3e01ad4c/chart.svg) |
| 68 · 2026-11-12 | pocket-tts-100m-english-int8/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/summary.md) | [SVG](results/2026-11-12t07-18-18-704z-pocket-tts-100m-english-int8-webgpu-cached-1bbe1503/chart.svg) |
| 69 · 2026-11-12 | pocket-tts-100m-english-int8/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/summary.md) | [SVG](results/2026-11-12t07-54-10-491z-pocket-tts-100m-english-int8-cpu-cached-b6c2a919/chart.svg) |
| 70 · 2026-11-12 | mach-boom/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | unsupported | [Report](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/summary.md) | [SVG](results/2026-11-12t08-08-33-241z-mach-boom-webgpu-cached-0aeac0ab/chart.svg) |
| 71 · 2026-11-14 | fun-cosyvoice3-0.5b-2512/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/summary.md) | [SVG](results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/chart.svg) |
| 72 · 2026-11-14 | ming-3.0-tts-0.5b-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/summary.md) | [SVG](results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/chart.svg) |
| 73 · 2026-11-14 | audio8-realistic-0.6b-int4/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/summary.md) | [SVG](results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/chart.svg) |
| 74 · 2026-11-14 | ming-3.0-tts-0.5b-fusor-mix-cpu/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/summary.md) | [SVG](results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/chart.svg) |
| 75 · 2026-11-14 | fun-cosyvoice3-0.5b-2512/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/summary.md) | [SVG](results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/chart.svg) |
| 76 · 2026-11-15 | ming-3.0-tts-0.5b-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | error | [Report](results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/summary.md) | [SVG](results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/chart.svg) |
| 77 · 2026-11-15 | audio8-realistic-0.6b-int4/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/summary.md) | [SVG](results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/chart.svg) |
| 78 · 2026-11-15 | audio8-realistic-0.6b-int4/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92/summary.md) | [SVG](results/2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92/chart.svg) |
| 79 · 2026-11-15 | fun-cosyvoice3-0.5b-2512/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md) | [SVG](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/chart.svg) |
| 80 · 2026-11-15 | ming-3.0-tts-0.5b-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/summary.md) | [SVG](results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/chart.svg) |
| 81 · 2026-11-15 | tiny-voca/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) | [SVG](results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/chart.svg) |
| 82 · 2026-11-15 | tiny-voca/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) | [SVG](results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/chart.svg) |
| 83 · 2026-11-16 | fun-cosyvoice3-0.5b-2512/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/summary.md) | [SVG](results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/chart.svg) |
| 84 · 2026-11-16 | ming-3.0-tts-0.5b-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/summary.md) | [SVG](results/2026-11-16t12-55-40-269z-ming-3.0-tts-0.5b-gguf-cpu-cached-f62b1742/chart.svg) |
| 85 · 2026-11-16 | audio8-realistic-0.6b-int4/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) | [SVG](results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/chart.svg) |
| 86 · 2026-11-16 | tiny-voca/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/summary.md) | [SVG](results/2026-11-16t17-55-16-727z-tiny-voca-cpu-warm-be739c20/chart.svg) |
| 87 · 2026-11-16 | ming-3.0-tts-0.5b-fusor-mix-cpu/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/summary.md) | [SVG](results/2026-11-16t18-03-47-233z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-warm-5b9985a7/chart.svg) |
| 88 · 2026-11-16 | ming-3.0-tts-0.5b-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/summary.md) | [SVG](results/2026-11-16t19-35-49-962z-ming-3.0-tts-0.5b-gguf-webgpu-cached-069b2bf8/chart.svg) |
| 89 · 2026-11-17 | audio8-realistic-0.6b-int4/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) | [SVG](results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/chart.svg) |
| 90 · 2026-11-17 | tiny-voca/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/summary.md) | [SVG](results/2026-11-17t13-36-15-139z-tiny-voca-webgpu-warm-4f28ad8d/chart.svg) |
| 91 · 2026-11-17 | ming-3.0-tts-0.5b-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/summary.md) | [SVG](results/2026-11-17t13-41-42-641z-ming-3.0-tts-0.5b-gguf-cpu-warm-7d9eb112/chart.svg) |
| 92 · 2026-11-17 | ming-3.0-tts-0.5b-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/summary.md) | [SVG](results/2026-11-17t18-11-26-404z-ming-3.0-tts-0.5b-gguf-webgpu-warm-d6f2bd29/chart.svg) |
| 93 · 2026-11-18 | audio8-realistic-0.6b-int4/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) | [SVG](results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/chart.svg) |
| 94 · 2026-11-18 | silencio-2/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/summary.md) | [SVG](results/2026-11-18t03-09-55-956z-silencio-2-cpu-warm-df3b96bf/chart.svg) |
| 95 · 2026-11-18 | silencio-2/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/summary.md) | [SVG](results/2026-11-18t04-11-04-421z-silencio-2-webgpu-warm-a22e3d55/chart.svg) |
| 96 · 2026-11-18 | supratts-1.0-preview/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t07-30-36-660z-supratts-1.0-preview-cpu-warm-3c3a78a9/summary.md) | [SVG](results/2026-11-18t07-30-36-660z-supratts-1.0-preview-cpu-warm-3c3a78a9/chart.svg) |
| 97 · 2026-11-18 | supratts-1.0-preview/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/summary.md) | [SVG](results/2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f/chart.svg) |
| 98 · 2026-11-18 | supratts-1.0-preview/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t07-33-33-066z-supratts-1.0-preview-webgpu-warm-dbe1775e/summary.md) | [SVG](results/2026-11-18t07-33-33-066z-supratts-1.0-preview-webgpu-warm-dbe1775e/chart.svg) |
| 99 · 2026-11-18 | linnet-en-35m/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t07-33-48-667z-linnet-en-35m-cpu-warm-1fa1636c/summary.md) | [SVG](results/2026-11-18t07-33-48-667z-linnet-en-35m-cpu-warm-1fa1636c/chart.svg) |
| 100 · 2026-11-18 | klein-tts-x1.5-pro/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3/summary.md) | [SVG](results/2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3/chart.svg) |
| 101 · 2026-11-18 | silencio-2/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/summary.md) | [SVG](results/2026-11-18t08-02-54-453z-silencio-2-cpu-cached-ef3f099f/chart.svg) |
| 102 · 2026-11-18 | linnet-en-35m/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t08-13-25-604z-linnet-en-35m-cpu-warm-3b452224/summary.md) | [SVG](results/2026-11-18t08-13-25-604z-linnet-en-35m-cpu-warm-3b452224/chart.svg) |
| 103 · 2026-11-18 | supratts-1.0-preview/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/summary.md) | [SVG](results/2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76/chart.svg) |
| 104 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t08-16-32-717z-klein-tts-x1.5-pro-webgpu-warm-94682c35/summary.md) | [SVG](results/2026-11-18t08-16-32-717z-klein-tts-x1.5-pro-webgpu-warm-94682c35/chart.svg) |
| 105 · 2026-11-18 | supratts-1.0-preview/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/summary.md) | [SVG](results/2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0/chart.svg) |
| 106 · 2026-11-18 | sopro-v2-turbo/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-17-08-445z-sopro-v2-turbo-cpu-cached-519c04ea/summary.md) | [SVG](results/2026-11-18t08-17-08-445z-sopro-v2-turbo-cpu-cached-519c04ea/chart.svg) |
| 107 · 2026-11-18 | supratts-1.0-preview/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/summary.md) | [SVG](results/2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6/chart.svg) |
| 108 · 2026-11-18 | sopro-v2-turbo/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/summary.md) | [SVG](results/2026-11-18t08-29-56-036z-sopro-v2-turbo-webgpu-cached-548c984a/chart.svg) |
| 109 · 2026-11-18 | supratts-1.0-preview/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/summary.md) | [SVG](results/2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47/chart.svg) |
| 110 · 2026-11-18 | sopro-v2-turbo/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md) | [SVG](results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/chart.svg) |
| 111 · 2026-11-18 | silencio-2/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/summary.md) | [SVG](results/2026-11-18t08-49-53-356z-silencio-2-webgpu-cached-d95444ac/chart.svg) |
| 112 · 2026-11-18 | sopro-v2-turbo/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/summary.md) | [SVG](results/2026-11-18t09-23-18-739z-sopro-v2-turbo-cpu-warm-db42548c/chart.svg) |
| 113 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/summary.md) | [SVG](results/2026-11-18t10-25-17-102z-klein-tts-x1.5-pro-webgpu-warm-47eae0fb/chart.svg) |
| 114 · 2026-11-18 | sopro-v2-turbo/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/summary.md) | [SVG](results/2026-11-18t10-34-26-402z-sopro-v2-turbo-webgpu-warm-d6dbad7d/chart.svg) |
| 115 · 2026-11-18 | klein-tts-x1.5-pro/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/summary.md) | [SVG](results/2026-11-18t11-25-32-056z-klein-tts-x1.5-pro-cpu-warm-9ca9d2ee/chart.svg) |
| 116 · 2026-11-18 | klein-tts-x1.5-pro/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/summary.md) | [SVG](results/2026-11-18t11-54-42-795z-klein-tts-x1.5-pro-cpu-cached-289eb3eb/chart.svg) |
| 117 · 2026-11-18 | linnet-en-35m/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/summary.md) | [SVG](results/2026-11-18t12-05-28-956z-linnet-en-35m-cpu-warm-f59450f4/chart.svg) |
| 118 · 2026-11-18 | klein-tts-x1.5-pro/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/summary.md) | [SVG](results/2026-11-18t12-26-55-316z-klein-tts-x1.5-pro-webgpu-cached-d9dafc80/chart.svg) |
| 119 · 2026-11-18 | linnet-en-35m/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/summary.md) | [SVG](results/2026-11-18t12-28-45-296z-linnet-en-35m-webgpu-warm-6ac9ec30/chart.svg) |
| 120 · 2026-11-18 | linnet-en-35m/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/summary.md) | [SVG](results/2026-11-18t13-57-01-943z-linnet-en-35m-cpu-cached-ba06fb4d/chart.svg) |
| 121 · 2026-11-18 | linnet-en-35m/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/summary.md) | [SVG](results/2026-11-18t14-04-23-116z-linnet-en-35m-webgpu-cached-d77f90c2/chart.svg) |
| 122 · 2026-11-18 | audio8-realistic-0.6b-int4/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18/summary.md) | [SVG](results/2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18/chart.svg) |
| 123 · 2026-11-19 | audio8-realistic-0.6b-int4/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | error | [Report](results/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/summary.md) | [SVG](results/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/chart.svg) |
| 124 · 2026-11-19 | sano-heart-nano-gguf-f32/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/summary.md) | [SVG](results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/chart.svg) |
| 125 · 2026-11-19 | sano-heart-nano-gguf-f32/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/summary.md) | [SVG](results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/chart.svg) |
| 126 · 2026-11-19 | zonos3-mini/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/summary.md) | [SVG](results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/chart.svg) |
| 127 · 2026-11-19 | sano-heart-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) | [SVG](results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/chart.svg) |
| 128 · 2026-11-19 | inflect-atom-v3/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c/summary.md) | [SVG](results/2026-11-19t07-16-09-709z-inflect-atom-v3-cpu-cached-41e2ea1c/chart.svg) |
| 129 · 2026-11-19 | sano-heart-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) | [SVG](results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/chart.svg) |
| 130 · 2026-11-19 | inflect-atom-v3/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a/summary.md) | [SVG](results/2026-11-19t07-19-24-698z-inflect-atom-v3-webgpu-cached-6cca4c3a/chart.svg) |
| 131 · 2026-11-19 | sano-amy-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) | [SVG](results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/chart.svg) |
| 132 · 2026-11-19 | inflect-atom-v3/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db/summary.md) | [SVG](results/2026-11-19t09-17-11-130z-inflect-atom-v3-cpu-warm-9a4a58db/chart.svg) |
| 133 · 2026-11-19 | zonos3-mini/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/summary.md) | [SVG](results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/chart.svg) |
| 134 · 2026-11-19 | sano-robot-mcu/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t09-36-45-778z-sano-robot-mcu-cpu-cached-0c917edc/summary.md) | [SVG](results/2026-11-19t09-36-45-778z-sano-robot-mcu-cpu-cached-0c917edc/chart.svg) |
| 135 · 2026-11-19 | sano-amy-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) | [SVG](results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/chart.svg) |
| 136 · 2026-11-19 | inflect-atom-v3/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60/summary.md) | [SVG](results/2026-11-19t09-55-07-605z-inflect-atom-v3-webgpu-warm-f29e7b60/chart.svg) |
| 137 · 2026-11-19 | sano-trellis/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t11-12-09-964z-sano-trellis-cpu-cached-7b7a68cf/summary.md) | [SVG](results/2026-11-19t11-12-09-964z-sano-trellis-cpu-cached-7b7a68cf/chart.svg) |
| 138 · 2026-11-19 | inflect-micro-v3/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t11-14-33-448z-inflect-micro-v3-cpu-cached-2c490708/summary.md) | [SVG](results/2026-11-19t11-14-33-448z-inflect-micro-v3-cpu-cached-2c490708/chart.svg) |
| 139 · 2026-11-19 | sano-amy-small-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce/summary.md) | [SVG](results/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce/chart.svg) |
| 140 · 2026-11-19 | sano-robot-mcu/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf/summary.md) | [SVG](results/2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf/chart.svg) |
| 141 · 2026-11-19 | inflect-micro-v3/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t13-58-17-329z-inflect-micro-v3-webgpu-cached-90200a0e/summary.md) | [SVG](results/2026-11-19t13-58-17-329z-inflect-micro-v3-webgpu-cached-90200a0e/chart.svg) |
| 142 · 2026-11-19 | sano-amy-1p8m-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0/summary.md) | [SVG](results/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0/chart.svg) |
| 143 · 2026-11-19 | sano-robot-mcu/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8/summary.md) | [SVG](results/2026-11-19t14-27-42-754z-sano-robot-mcu-cpu-warm-e90bd1a8/chart.svg) |
| 144 · 2026-11-19 | sano-trellis/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc/summary.md) | [SVG](results/2026-11-19t14-30-39-998z-sano-trellis-cpu-warm-e51e98cc/chart.svg) |
| 145 · 2026-11-19 | inflect-mini-v3-browser-port/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t14-44-23-057z-inflect-mini-v3-browser-port-cpu-cached-fcce4af1/summary.md) | [SVG](results/2026-11-19t14-44-23-057z-inflect-mini-v3-browser-port-cpu-cached-fcce4af1/chart.svg) |
| 146 · 2026-11-19 | inflect-micro-v3/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326/summary.md) | [SVG](results/2026-11-19t15-32-05-910z-inflect-micro-v3-cpu-warm-eeb09326/chart.svg) |
| 147 · 2026-11-19 | sano-hfc-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f/summary.md) | [SVG](results/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f/chart.svg) |
| 148 · 2026-11-19 | sano-trellis/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | unsupported | [Report](results/2026-11-19t16-13-20-544z-sano-trellis-webgpu-warm-0d8cc66d/summary.md) | [SVG](results/2026-11-19t16-13-20-544z-sano-trellis-webgpu-warm-0d8cc66d/chart.svg) |
| 149 · 2026-11-19 | inflect-mini-v3-browser-port/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d/summary.md) | [SVG](results/2026-11-19t16-23-50-621z-inflect-mini-v3-browser-port-cpu-warm-2bdd861d/chart.svg) |
| 150 · 2026-11-19 | inflect-mini-v3-browser-port/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-19t20-24-45-805z-inflect-mini-v3-browser-port-webgpu-cached-1daec6ab/summary.md) | [SVG](results/2026-11-19t20-24-45-805z-inflect-mini-v3-browser-port-webgpu-cached-1daec6ab/chart.svg) |
| 151 · 2026-11-19 | inflect-micro-v3/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1/summary.md) | [SVG](results/2026-11-19t21-04-48-801z-inflect-micro-v3-webgpu-warm-28aa8bb1/chart.svg) |
| 152 · 2026-11-19 | sano-kristin-gguf/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b/summary.md) | [SVG](results/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b/chart.svg) |
| 153 · 2026-11-19 | sano-amy-small-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a/summary.md) | [SVG](results/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a/chart.svg) |
| 154 · 2026-11-20 | sano-amy-1p8m-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb/summary.md) | [SVG](results/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb/chart.svg) |
| 155 · 2026-11-20 | inflect-mini-v3-browser-port/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4/summary.md) | [SVG](results/2026-11-20t01-14-02-658z-inflect-mini-v3-browser-port-webgpu-warm-aa3f07b4/chart.svg) |
| 156 · 2026-11-20 | sano-hfc-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10/summary.md) | [SVG](results/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10/chart.svg) |
| 157 · 2026-11-20 | sano-kristin-gguf/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/summary.md) | [SVG](results/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/chart.svg) |
| 158 · 2026-11-20 | sano-heart-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t11-13-31-659z-sano-heart-gguf-cpu-cached-4b20114d/summary.md) | [SVG](results/2026-11-20t11-13-31-659z-sano-heart-gguf-cpu-cached-4b20114d/chart.svg) |
| 159 · 2026-11-20 | sano-heart-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t11-15-05-502z-sano-heart-gguf-webgpu-cached-4f56c5e6/summary.md) | [SVG](results/2026-11-20t11-15-05-502z-sano-heart-gguf-webgpu-cached-4f56c5e6/chart.svg) |
| 160 · 2026-11-20 | sano-amy-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t11-28-38-392z-sano-amy-gguf-cpu-cached-93814559/summary.md) | [SVG](results/2026-11-20t11-28-38-392z-sano-amy-gguf-cpu-cached-93814559/chart.svg) |
| 161 · 2026-11-20 | sano-amy-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t11-48-26-627z-sano-amy-gguf-webgpu-cached-2bfae2ec/summary.md) | [SVG](results/2026-11-20t11-48-26-627z-sano-amy-gguf-webgpu-cached-2bfae2ec/chart.svg) |
| 162 · 2026-11-20 | sano-amy-small-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t11-56-16-736z-sano-amy-small-gguf-cpu-cached-8ed20ff7/summary.md) | [SVG](results/2026-11-20t11-56-16-736z-sano-amy-small-gguf-cpu-cached-8ed20ff7/chart.svg) |
| 163 · 2026-11-20 | sano-amy-small-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t12-11-40-215z-sano-amy-small-gguf-webgpu-cached-6366cda4/summary.md) | [SVG](results/2026-11-20t12-11-40-215z-sano-amy-small-gguf-webgpu-cached-6366cda4/chart.svg) |
| 164 · 2026-11-20 | sano-amy-1p8m-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t12-24-52-820z-sano-amy-1p8m-gguf-cpu-cached-6661f50b/summary.md) | [SVG](results/2026-11-20t12-24-52-820z-sano-amy-1p8m-gguf-cpu-cached-6661f50b/chart.svg) |
| 165 · 2026-11-20 | sano-amy-1p8m-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t13-45-35-048z-sano-amy-1p8m-gguf-webgpu-cached-41ff0a84/summary.md) | [SVG](results/2026-11-20t13-45-35-048z-sano-amy-1p8m-gguf-webgpu-cached-41ff0a84/chart.svg) |
| 166 · 2026-11-20 | sano-hfc-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t13-48-44-853z-sano-hfc-gguf-cpu-cached-42b2bb60/summary.md) | [SVG](results/2026-11-20t13-48-44-853z-sano-hfc-gguf-cpu-cached-42b2bb60/chart.svg) |
| 167 · 2026-11-20 | sano-hfc-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-04-43-133z-sano-hfc-gguf-webgpu-cached-54adeaeb/summary.md) | [SVG](results/2026-11-20t14-04-43-133z-sano-hfc-gguf-webgpu-cached-54adeaeb/chart.svg) |
| 168 · 2026-11-20 | sano-kristin-gguf/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-07-22-110z-sano-kristin-gguf-cpu-cached-2680b64b/summary.md) | [SVG](results/2026-11-20t14-07-22-110z-sano-kristin-gguf-cpu-cached-2680b64b/chart.svg) |
| 169 · 2026-11-20 | sano-kristin-gguf/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-25-16-804z-sano-kristin-gguf-webgpu-cached-9bc5cbe1/summary.md) | [SVG](results/2026-11-20t14-25-16-804z-sano-kristin-gguf-webgpu-cached-9bc5cbe1/chart.svg) |
| 170 · 2026-11-20 | sano-heart-nano-gguf-f32/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-28-12-714z-sano-heart-nano-gguf-f32-cpu-cached-d4f0b122/summary.md) | [SVG](results/2026-11-20t14-28-12-714z-sano-heart-nano-gguf-f32-cpu-cached-d4f0b122/chart.svg) |
| 171 · 2026-11-20 | sano-heart-nano-gguf-f32/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-28-42-585z-sano-heart-nano-gguf-f32-webgpu-cached-2e67019f/summary.md) | [SVG](results/2026-11-20t14-28-42-585z-sano-heart-nano-gguf-f32-webgpu-cached-2e67019f/chart.svg) |
| 172 · 2026-11-20 | zonos3-mini/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700/summary.md) | [SVG](results/2026-11-20t14-37-16-739z-zonos3-mini-cpu-cached-4bf21700/chart.svg) |
| 173 · 2026-11-20 | zonos3-mini/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f/summary.md) | [SVG](results/2026-11-20t15-39-21-013z-zonos3-mini-cpu-warm-8680490f/chart.svg) |
| 174 · 2026-11-20 | ua-serhiy-0p58m/cpu | uk / uk-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t23-20-52-422z-ua-serhiy-0p58m-cpu-cached-54c94956/summary.md) | [SVG](results/2026-11-20t23-20-52-422z-ua-serhiy-0p58m-cpu-cached-54c94956/chart.svg) |
| 175 · 2026-11-20 | ua-serhiy-0p58m/cpu | uk / uk-article-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285/summary.md) | [SVG](results/2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285/chart.svg) |
| 176 · 2026-11-20 | ua-serhiy-0p58m/webgpu | uk / uk-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-20t23-22-14-572z-ua-serhiy-0p58m-webgpu-cached-ac55e923/summary.md) | [SVG](results/2026-11-20t23-22-14-572z-ua-serhiy-0p58m-webgpu-cached-ac55e923/chart.svg) |
| 177 · 2026-11-20 | ua-serhiy-0p58m/webgpu | uk / uk-article-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093/summary.md) | [SVG](results/2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093/chart.svg) |
| 178 · 2026-11-21 | kale-tts-1-nano-int8/cpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8/summary.md) | [SVG](results/2026-11-21t00-53-06-603z-kale-tts-1-nano-int8-cpu-warm-1537bbc8/chart.svg) |
| 179 · 2026-11-21 | kale-tts-1-nano-fp32/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v1 | measured | [Report](results/2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76/summary.md) | [SVG](results/2026-11-21t00-58-31-330z-kale-tts-1-nano-fp32-webgpu-warm-fa99fd76/chart.svg) |
| 180 · 2026-11-22 | apptor-tiny-tts/cpu | de / de-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d/summary.md) | [SVG](results/2026-11-22t01-18-02-717z-apptor-tiny-tts-cpu-warm-1107507d/chart.svg) |
| 181 · 2026-11-22 | apptor-tiny-tts/webgpu | de / de-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c/summary.md) | [SVG](results/2026-11-22t01-30-59-189z-apptor-tiny-tts-webgpu-warm-050c577c/chart.svg) |
| 182 · 2026-11-22 | apptor-tiny-tts/cpu | de / de-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t01-40-25-874z-apptor-tiny-tts-cpu-cached-f7c1946a/summary.md) | [SVG](results/2026-11-22t01-40-25-874z-apptor-tiny-tts-cpu-cached-f7c1946a/chart.svg) |
| 183 · 2026-11-22 | apptor-tiny-tts/webgpu | de / de-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t01-43-52-365z-apptor-tiny-tts-webgpu-cached-04dcbe0e/summary.md) | [SVG](results/2026-11-22t01-43-52-365z-apptor-tiny-tts-webgpu-cached-04dcbe0e/chart.svg) |
| 184 · 2026-11-22 | apptor-tiny-tts-at/cpu | de-AT / de-at-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536/summary.md) | [SVG](results/2026-11-22t05-39-38-969z-apptor-tiny-tts-at-cpu-warm-106ec536/chart.svg) |
| 185 · 2026-11-22 | apptor-tiny-tts-at/webgpu | de-AT / de-at-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22/summary.md) | [SVG](results/2026-11-22t05-54-50-412z-apptor-tiny-tts-at-webgpu-warm-6c488d22/chart.svg) |
| 186 · 2026-11-22 | apptor-tiny-tts-at/cpu | de-AT / de-at-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t06-05-39-761z-apptor-tiny-tts-at-cpu-cached-903191c8/summary.md) | [SVG](results/2026-11-22t06-05-39-761z-apptor-tiny-tts-at-cpu-cached-903191c8/chart.svg) |
| 187 · 2026-11-22 | apptor-tiny-tts-at/webgpu | de-AT / de-at-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t06-09-40-697z-apptor-tiny-tts-at-webgpu-cached-d43f6809/summary.md) | [SVG](results/2026-11-22t06-09-40-697z-apptor-tiny-tts-at-webgpu-cached-d43f6809/chart.svg) |
| 188 · 2026-11-22 | tiny-voca-de-en/cpu | de / de-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be/summary.md) | [SVG](results/2026-11-22t06-59-31-757z-tiny-voca-de-en-cpu-warm-9cd2b0be/chart.svg) |
| 189 · 2026-11-22 | tiny-voca-de-en/webgpu | de / de-article-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567/summary.md) | [SVG](results/2026-11-22t07-04-33-937z-tiny-voca-de-en-webgpu-warm-18d91567/chart.svg) |
| 190 · 2026-11-22 | tiny-voca-de-en/cpu | de / de-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t07-06-16-939z-tiny-voca-de-en-cpu-cached-6982d19e/summary.md) | [SVG](results/2026-11-22t07-06-16-939z-tiny-voca-de-en-cpu-cached-6982d19e/chart.svg) |
| 191 · 2026-11-22 | tiny-voca-de-en/webgpu | de / de-article-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t07-07-40-234z-tiny-voca-de-en-webgpu-cached-78525d07/summary.md) | [SVG](results/2026-11-22t07-07-40-234z-tiny-voca-de-en-webgpu-cached-78525d07/chart.svg) |
| 192 · 2026-11-22 | tiny-voca-de-en/cpu | en / english-20k-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t07-18-39-233z-tiny-voca-de-en-cpu-warm-f0321520/summary.md) | [SVG](results/2026-11-22t07-18-39-233z-tiny-voca-de-en-cpu-warm-f0321520/chart.svg) |
| 193 · 2026-11-22 | tiny-voca-de-en/webgpu | en / english-20k-v1 | warm / browser-tts-warm-v2 | measured | [Report](results/2026-11-22t07-22-17-062z-tiny-voca-de-en-webgpu-warm-94bbf192/summary.md) | [SVG](results/2026-11-22t07-22-17-062z-tiny-voca-de-en-webgpu-warm-94bbf192/chart.svg) |
| 194 · 2026-11-22 | tiny-voca-de-en/cpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t07-23-37-629z-tiny-voca-de-en-cpu-cached-13c87a78/summary.md) | [SVG](results/2026-11-22t07-23-37-629z-tiny-voca-de-en-cpu-cached-13c87a78/chart.svg) |
| 195 · 2026-11-22 | tiny-voca-de-en/webgpu | en / english-20k-v1 | cached / browser-tts-cached-v1-resources | measured | [Report](results/2026-11-22t07-24-38-536z-tiny-voca-de-en-webgpu-cached-7e83045b/summary.md) | [SVG](results/2026-11-22t07-24-38-536z-tiny-voca-de-en-webgpu-cached-7e83045b/chart.svg) |

</details>

<!-- benchmark-results:end -->

## Use with an AI agent

Give your agent this instruction:

> Use the [browser-tts-benchmark skill](skills/browser-tts-benchmark/SKILL.md).
> Evaluate MODEL for this benchmark. If this machine is an Apple M1 Pro MacBook
> running natively as arm64, follow the baseline result workflow. Otherwise,
> prepare an evaluation-request PR containing the model link, without running it.
> I authorize publishing the reviewed source, results or request to my fork.

For a multilingual evaluation, give the agent the model and the language:

> Use $browser-tts-benchmark to test Supertonic 3 in French on CPU and WebGPU. Use the registered French article if available. If it needs a translation, prepare it from the English article and open a fixture PR first.

Contributors on any machine can add an article edition. List available editions with `npm run fixtures -- list`. The [language contributor guide](docs/MULTILINGUAL.md) covers translation, registration, a target-language smoke test and result publication.

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
