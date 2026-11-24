# Voice and language support

Counts describe the pinned checkpoint and explicitly identified compatible catalog, not the coverage of a particular benchmark fixture. Every run tests one selected voice. Voice accents/locales do not count as additional languages. Unknown values must be null, not guessed.

<a id="clarvia-tts-tiny"></a>

### Clarvia TTS Tiny 4.54M FP32

Supported voices: **10**. Bundled voices: **10**. Supported languages: **1** (tr).

Pinned Turkish FP32 checkpoint with ten bundled synthetic voices. The browser
profile fixes `female_1`; only Turkish is supported by the paired checkpoint and
phonemizer. The model card's training-data summaries are publisher claims, not an
independent dataset audit.

[Pinned model card](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/README.md),
[pinned config](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/config.json),
[pinned Turkish phonemizer](https://huggingface.co/wite-tech/clarvia-phonemizer/tree/bf1b1aab40e24ca3f6700980427c386f4f171f6f),
[browser profile and notices](../web/clarvia-tts-tiny/NOTICE.md).

<a id="paradee"></a>

## Paradee 8M INT8

Supported voices: **4**. Bundled voices: **4**. Supported languages: **1** (en).

Pinned benchmark checkpoint. Four embedded voices: af_heart, bf_isabella, am_puck, bm_fable. Only af_heart is benchmarked. Accents are not separate languages.

[Primary source 1](https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.2/raw/ed2934d4df8a4fd891e29584c5e1104649409765/README.md), [Primary source 2](https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.2/resolve/ed2934d4df8a4fd891e29584c5e1104649409765/config.json).

<a id="silencio-2"></a>

## Silencio-2 FP32 browser conversion

Supported voices: **8**. Bundled voices: **1** (`260`). Supported languages:
**1** (English). Only bundled synthetic voice 260 is measured; custom voice
cloning and the other seven catalog voices are not exposed by this browser
configuration. The benchmark ports the model's official sentence splitting
(48-token target, 50-token generation capacity), sound/emotion tags, drifting flow and unnormalized
24 kHz stream. It uses a disclosed seeded JavaScript normal-noise generator,
not bitwise PyTorch RNG parity.

[Pinned Silencio-2 model card](https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/README.md) · [Primary benchmark source](https://erogol.com/small_tts_bench/) · [Browser conversion and license notice](../web/silencio2/NOTICE.md).

<a id="phonon"></a>

## Phonon 31M q8

Supported voices: **102**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned benchmark checkpoint plus separately pinned compatible voice catalog. 102 embeddings in the separately pinned official catalog; only default is staged and benchmarked. Voice catalog locales do not expand this English checkpoint language support.

[Primary source 1](https://huggingface.co/gradium/phonon-31m-en/raw/92741c5b07d085ff840e26fea8ce43110b87852f/README.md), [Primary source 2](https://huggingface.co/gradium/phonon-voices/resolve/0ee17205f254b5abc43b266c8a0f215565c352f7/voices.jsonl).

<a id="leokani-7m"></a>

## Leokani 7M INT8

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned benchmark checkpoint. One female American English voice; no other voice is exposed by this checkpoint.

[Primary source 1](https://huggingface.co/milliwattlabs/leokani-tts-7M/raw/ba0beb24f7b124dc1eb297ffc28d01db892462bd/README.md).

<a id="leokani-4.5m"></a>

## Leokani 4.5M INT8

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned benchmark checkpoint. One female American English voice, Dala; the 7M and 4.5M checkpoints share the voice.

[Primary source 1](https://huggingface.co/milliwattlabs/leokani-tts-4.5M/raw/d9eb742dfb6567872fe451d559674ec42c32e6c8/README.md).

<a id="pivo-curated"></a>

## PiVo 1.4M curated (Pi voice)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (en).

Pinned benchmark checkpoint. Two embedded voices, Pi and Vo; this adapter benchmarks Pi only.

[Primary source 1](https://huggingface.co/empero-ai/PiVo-1.4M/raw/515d84fc3420da6ae138f1b81017fcbc24d622a8/README.md).

<a id="woof"></a>

## Underdog Woof one-voice (Isla)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned benchmark checkpoint. The pinned browser one-voice case uses Isla. The separate two-voice Juno/Mira release is not this measured case.

[Primary source 1](https://huggingface.co/ConwayResearch/Underdog-Woof/raw/be702960539777fc3f698e54335276a8391b00f9/README.md), [Primary source 2](https://github.com/ngelik/tts-bench/blob/8dae4a37e61e662037fd73a58c7254e1dac9dd89/web/workers/woof.mjs).

<a id="piper-en-gb-southern-english-female-low"></a>

## Piper en-GB Southern English Female low

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned benchmark checkpoint. One British English speaker in this checkpoint. The broader Piper voice repository contains other independent models and languages; they are not included in this count.

[Primary source 1](https://huggingface.co/rhasspy/piper-voices/resolve/e7229f7d33a10e145e109b886d661984201ac3c4/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx.json), [Primary source 2](https://huggingface.co/rhasspy/piper-voices/raw/e7229f7d33a10e145e109b886d661984201ac3c4/en/en_GB/southern_english_female/low/MODEL_CARD).

<a id="supertonic-3"></a>

## Supertonic 3 FP32 (M3)

Supported preset voices: **10**. Bundled voices: **1**. Supported languages: **31** (en, ko, ja, ar, bg, cs, da, de, el, es, et, fi, fr, hi, hr, hu, id, it, lt, lv, nl, pl, pt, ro, ru, sk, sl, sv, tr, uk, vi).

The benchmark stages M3 (Robert) from the ten supplied F1–F5 and M1–M5 presets. It uses eight denoising steps and effective speed 1.05, which matches the linked demo's UI speed 1.0. The Spain Spanish and Brazilian Portuguese boards reuse their existing articles. Their receipts retain the exact fixture tags `es-ES` and `pt-BR` and record the shared native synthesis tags `es` and `pt` separately. The checkpoint's language list describes language support; it does not specify regional accent guarantees. The language-agnostic mode `na` and custom voices are outside this benchmark profile.

[Primary source 1](https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/README.md), [Primary source 2](https://huggingface.co/Supertone/supertonic-3/tree/3cadd1ee6394adea1bd021217a0e650ede09a323/voice_styles), [Primary source 3](https://huggingface.co/spaces/Supertone/supertonic-3/blob/4402acca094e2ff2b3dff446e0bf915f3fccc462/script.js).

<a id="kokoro-82m"></a>

## Kokoro 82M FP32

Supported voices: **54**. Bundled voices: **1**. Supported languages: **8** (en, es, fr, hi, it, ja, pt, zh).

Kokoro v1.0 model catalog; English browser runtime exercised. 54 named preset voices across 8 languages (English has US/GB accents). The export also contains a legacy af.bin alias, not a distinct named catalog voice. Official JS 1.2.1 exposes 28 English voices; only af_heart is staged and tested.

[Primary source 1](https://huggingface.co/hexgrad/Kokoro-82M/blob/f3ff3571791e39611d31c381e3a41a3af07b4987/VOICES.md).

<a id="mms-english"></a>

## MMS English FP32

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned English checkpoint, not the wider multilingual MMS family. Single English speaker. Official Xenova ONNX export removes training-only weights. Benchmark spells out numeric tokens before the official grapheme tokenizer to avoid dropping digits absent from its vocabulary.

[Primary source 1](https://huggingface.co/facebook/mms-tts-eng/blob/c71de0fe7204c83f1c10820a7d696d0b450048ba/README.md).

<a id="kitten-nano-0.8"></a>

## Kitten Nano 0.8 FP32

Supported voices: **8**. Bundled voices: **8**. Supported languages: **1** (en).

Pinned Kitten Nano 0.8 checkpoint and supplied voice archive. Eight preset voices; all styles bundled in voices.npz. Only Bella is tested. Official clean_text=false path with browser eSpeak and strict token mapping; no silent unknown-symbol skips.

[Primary source 1](https://huggingface.co/KittenML/kitten-tts-nano-0.8-fp32/blob/e73cfb095bd949c786ccdcf3b8ab04eb36c47442/config.json).

<a id="sano-amy"></a>

## Sano Amy 1.46M (English)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned Sano Amy 1.46M checkpoint and FP32 browser bundle only. Amy browser bundle uses the official en-us eSpeak frontend and synthesizes at 22,050 Hz. The broader Sano family supports additional voices and languages; they are outside this pinned checkpoint.

[Primary source 1](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/amy-en-1p46m/README.md), [Primary source 2](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/web/voices/amy/meta.json).

<a id="sano-heart-nano-gguf-f32"></a>

## sanoTTS heart-nano 294k (Kokopop F32)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned heartnano package, expanded from its exact int8 front/decoder source blobs into a separate F32 GGUF profile by the pinned Kokopop converter. The benchmark uses the fixed heartnano US English voice at 24 kHz and speed 1. CPU/WASM and hardware WebGPU use the same F32 weights and frontend; WebGPU reports `webgpu+wasm` and requires observed device dispatch. This is not the official Ampixa int8 browser build. Weights and generated runtime remain in the ignored asset cache and are imported from the hash-verified build artifact.

[Heartnano model metadata](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/heartnano/meta.json) · [Kokopop source](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88) · [Build and runtime details](SANO_HEART_NANO.md).

<a id="inflect-micro-v2"></a>

## Inflect Micro v2 FP32

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned Inflect Micro v2 complete English checkpoint and official FP32 ONNX export. One fixed synthetic English voice; no reference recording or voice-cloning model required. 9,356,513 deployable parameters including waveform decoder. Browser port uses a disclosed seeded JavaScript normal-noise generator rather than NumPy bitwise parity.

[Primary source 1](https://huggingface.co/owensong/Inflect-Micro-v2-ONNX/blob/91b1ab6432323064ec0e8e9704d92fcecd24855f/README.md), [Primary source 2](https://huggingface.co/owensong/Inflect-Micro-v2-ONNX/blob/91b1ab6432323064ec0e8e9704d92fcecd24855f/onnx/SOURCE.json), [Primary source 3](https://huggingface.co/owensong/Inflect-Micro-v2/blob/9d862840734dcc53afb5d27ef468459daad020fa/README.md).

<a id="inflect-micro-v3"></a>

## Inflect Micro v3 FP32

The pinned checkpoint lists **6 English voices**. The browser export bundles and
benchmarks **Cassidy (voice 2)** only. It contains three FP32 ONNX graphs and a
fixed Cassidy style bank; the exported model-weight assets total **47.57 MB**.
The browser frontend uses the separately pinned Klein 0.2.0 G2P adaptation and
does not claim exact native Misaki parity. Seeded JavaScript Gaussian noise is
not bitwise identical to the PyTorch generator. [Pinned model card](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/README.md) · [Weight license scope](https://huggingface.co/owensong/Inflect-Micro-v3/blob/c1a7db6ef44c931623fc2028cb0409659b83156c/LICENSE_SCOPE.json) · [Browser/export notes](INFLECT_MICRO_V3.md).

<a id="lfm3-audio-2b-gguf"></a>

## LFM3-Audio-2B (GGUF Q4_K_M / Q8_0)

Supported languages: **18** (en, ar, da, de, el, fi, fr, he, it, ja, ko, nl, pl, pt, es, sv, tr, zh). Fixed voice count: **unknown**. Male/female prompt controls are not a catalog of fixed voices; only American English female is tested.

18 spoken languages (English has US and UK locales). Female/male prompt controls do not establish a count of fixed voices. Benchmark selects American English female. Weight size includes complete pinned GGUF files, including modality components not exercised by TTS.

[Official checkpoint](https://huggingface.co/LiquidAI/LFM3-Audio-2B) · [Configuration](LIQUID_LFM3.md).

<a id="lfm3-omni-2b-gguf"></a>

## LFM3-Omni-2B (GGUF Q4_K_M / Q8_0)

Supported languages: **18** (en, ar, da, de, el, fi, fr, he, it, ja, ko, nl, pl, pt, es, sv, tr, zh). Fixed voice count: **unknown**. Male/female prompt controls are not a catalog of fixed voices; only American English female is tested.

18 spoken languages (English has US and UK locales). Female/male prompt controls do not establish a count of fixed voices. Benchmark selects American English female. Weight size includes complete pinned GGUF files, including modality components not exercised by TTS.

[Official checkpoint](https://huggingface.co/LiquidAI/LFM3-Omni-2B) · [Configuration](LIQUID_LFM3.md).

<a id="lfm3-audio-2b-fusor-q7-cpu"></a>

## LFM3-Audio-2B (Fusor q7 / CPU 6 threads)

Supported spoken languages: **18**. Fixed voice count: **unknown**. Male/female style controls are not fixed voice IDs. Only American English female is tested. The pinned q7 bundle runs on six CPU threads; no other language, voice or backend is implied by this measurement.

18 spoken languages; English has US and UK locales. Male/female prompt controls do not establish a fixed-voice count. Only American English female is tested. Six-thread Fusor WASM q7 configuration; different weights/runtime/sampling from the official WebGPU GGUF configuration.

[Bundle manifest](https://huggingface.co/fusorlabs/lfm3-audio-2b-web/blob/e273326dda2bb26870549ed7b39324ae086e5fe7/manifest.json) · [Runtime and configuration](LIQUID_LFM3_CPU.md).

<a id="lfm3-omni-2b-fusor-q7-cpu"></a>

## LFM3-Omni-2B (Fusor q7 / CPU 6 threads)

Supported spoken languages: **18**. Fixed voice count: **unknown**. Male/female style controls are not fixed voice IDs. Only American English female is tested. The pinned q7 bundle runs on six CPU threads; no other language, voice or backend is implied by this measurement.

18 spoken languages; English has US and UK locales. Male/female prompt controls do not establish a fixed-voice count. Only American English female is tested. Six-thread Fusor WASM q7 configuration; different weights/runtime/sampling from the official WebGPU GGUF configuration.

[Bundle manifest](https://huggingface.co/fusorlabs/lfm3-omni-2b-web/blob/09f4fc6ddbbb3cc6cd30f74b1e76cc894f4901f4/manifest.json) · [Runtime and configuration](LIQUID_LFM3_CPU.md).

<a id="mach-boom"></a>

## Mach Boom 3.5-bit browser port

English only (**1 language**). **4 named voices** ship in the
[pinned release](https://huggingface.co/SyzygyResearch/Mach-Boom/blob/01860b06bdf8498761255ad1c64b99980b96486d/voices/voices.jsonl):
Zoey, Juniper, Everly and Harper. Only Zoey is staged and measured (**1 bundled
benchmark voice**). Upstream also supports compatible Phonon voice files, but
that external catalog is not included in this four-voice count. CPU WebAssembly
is an experimental local port; no WebGPU inference path is implemented.

<a id="pocket-tts-100m-english-int8"></a>

## Original Pocket TTS English INT8/FP32

The selected `english_2026-04` checkpoint supports **1 language (English)** and
**8 bundled preset voices**: alba, azelma, cosette, eponine, fantine, javert, jean
and marius. Only **alba** is tested. Counts come from the
[pinned bundle metadata](https://huggingface.co/KevinAHM/pocket-tts-onnx/blob/58a6d00cf13d239b6748cb0769f35c580a8f606c/onnx/english_2026-04/bundle.json)
and [browser voice bundle](https://huggingface.co/spaces/KevinAHM/pocket-tts-web/tree/d0c0c79b7712256a32d691c67f20b8ae2e020d00/onnx/english_2026-04).
The broader export family advertises six languages; that is not the language
count for this English-only configuration. Arbitrary voice cloning is also not
counted as a finite preset catalog. This is the original approximately 100M model
[family described by Kyutai](https://kyutai.org/tts/) and shown in the screenshot,
not the newer 18.2M Pocket model.

<a id="audio8-realistic-0.6b-int4"></a>

## Audio8 TTS Realistic Air 0.6B

Edge0 lists **23 languages** and supports open-ended voice conditioning. This configuration uses English and a reference-free voice with **zero bundled presets**. [Checkpoint and export details](AUDIO8_REALISTIC.md).

<a id="fun-cosyvoice3-0.5b-2512"></a>

## Fun-CosyVoice3 0.5B (2512)

The checkpoint supports **9 languages** and open-ended reference voices. The browser export bundles **one English preset**, derived from LibriTTS-R speaker 4446. [Checkpoint, preset and license details](COSYVOICE3.md).

<a id="ming-3.0-tts-0.5b-gguf"></a>

## Ming 3.0 TTS 0.5B (Q8_0 GGUF)

The upstream catalog lists **117 named base voices**: 50 Chinese voices without emotion variants, 62 Chinese base voices with variants, and five English voices. Each base voice counts once. The benchmark exposes one preset, **US_James**. The checkpoint supports **seven languages** (Chinese, English, Japanese, Korean, German, French and Spanish). [Pinned voice catalog](https://github.com/inclusionAI/Ming-3.0-tts/blob/e999c39fa676722aaa9ea29b5aa19a90525b271f/cookbooks/instruction_en.md#built-in-premium-voices) · [Pinned GGUF model card](https://huggingface.co/audio-cpp/Ming-3.0-TTS-0.5B-GGUF/blob/2eb8d37c7f10672e69c8aa33091baa04c461b66c/README.md).

<a id="ming-3.0-tts-0.5b-fusor-mix-cpu"></a>

## Ming 3.0 TTS 0.5B, Fusor mixed-quantization CPU

The base cookbook lists 117 named voices. Fusor's pinned WASM runtime enumerates **seven built-in presets**. Five are English (US_James, US_Emma, US_Stella, UK_George and UK_Charlotte) and two are Chinese (灵小柔 and 灵楷). The benchmark evaluates US_James in English. Ming's base checkpoint lists Chinese, English, German, Spanish, French, Korean and Japanese. [Base voice catalog](https://github.com/inclusionAI/Ming-3.0-tts/blob/e999c39fa676722aaa9ea29b5aa19a90525b271f/cookbooks/instruction_en.md#built-in-premium-voices) · [Fusor runtime](https://huggingface.co/spaces/fusorlabs/ming-wasm/tree/bdf46b41e966340f398fdd82d3ca64f4058ad892/engine/dist/web-threaded-relaxed) · [Checkpoint card](https://huggingface.co/inclusionAI/Ming-3.0-tts-0.5B/blob/e5bd8da31ecf1b9276cdbdda821fa891068f1368/README.md)

<a id="tiny-voca"></a>

## Tiny Voca 4.5M

The pinned checkpoint has two built-in American English voices, F2 and M2, and supports one language. The benchmark uses F2 (speaker ID 0). [Model card](https://huggingface.co/n4ze3m/tiny-voca/blob/a46fbe0c8514cb32f5e80be987e6c96ef0540f8d/README.md) · [Export configuration](https://huggingface.co/n4ze3m/tiny-voca/blob/a46fbe0c8514cb32f5e80be987e6c96ef0540f8d/config.json)

<a id="tiny-voca-de-en"></a>

### Tiny Voca DE/EN 4.6M (Voca64)

The pinned Voca64 checkpoint supports German and English with 32 synthetic voices per language. The benchmark fixes `fresh-de-f00` for `de-article-v1` and `fresh-en-f00` for `english-20k-v1`. Its official static browser bundle performs local Phony/nrmlz text preparation and single-thread ONNX Runtime WebAssembly synthesis at 24 kHz; the benchmark also runs the pinned plan and wave graphs through WebGPU with WASM fallback and verified hardware dispatch. Full-fixture token/stress digests match the official worker in headed smoke diagnostics. The Space frontend notice conflicts with its worker about English production enablement, so that source inconsistency remains disclosed. The checkpoint has 4,563,403 parameters; model terms do not establish a standalone output license. [Pinned checkpoint](https://huggingface.co/Fraunhofer-IEM/tiny-voca-de-en/tree/57fe34dfc061e6cc58e27d186bf7ba16d82d2def) · [Pinned browser Space](https://huggingface.co/spaces/Fraunhofer-IEM/designed-voices-tts/tree/a8ee94178a6f9b703e89e113a3354549d1bdc38d) · [Configuration and attributions](../web/voca64/NOTICE.md)

<a id="tiny-voca-it"></a>

### Tiny Voca Italian 6.77M (Lorenzo)

The pinned `v0.3.0` FP32 checkpoint supports Italian (`it`, `it-IT`) at 24 kHz. The released browser profile exposes two named presets, Lorenzo (`EM4`) and Chiara (`EF4`); this benchmark fixes Lorenzo at voice index 12. The model metadata contains 14 embedding slots, which are not 14 released product voices. The graph stores 6,767,245 FP32 initializer values, including buffers and constants; this is an initializer count, not a trainable-parameter count. The model card describes approximately 6.77 million neural parameters. The catalog records a scoped lower bound of 446,157 explicitly named FP32 `.weight` and `.bias` initializer values; their trainability is not independently established.

The pinned official `frontend.js`, `numbers.js` and unmodified eSpeak NG 1.0.2 browser glue/WASM reproduce Italian number expansion, sentence splitting, token fitting, and token/stress inputs. The official route uses ONNX Runtime Web 1.20.1 with one-thread WASM. This profile additionally requests WebGPU with explicit WASM fallback and requires an untimed hardware-dispatch probe. Full-fixture smoke diagnostics check the 107-span token/stress digest; the official frontend maps `h` in span 30 and `d` plus combining dental mark in spans 57 and 79 to its unknown token. These symbols remain in the input. The model graph uses native unseeded `RandomNormalLike` noise, so PCM hashes may differ even when preprocessing and output dimensions match. No separate generated-audio rights or pronunciation review are established. [Pinned release](https://github.com/carbogninalberto/tiny-voca-it/releases/tag/v0.3.0) · [Pinned browser source](https://github.com/carbogninalberto/tiny-voca-it/tree/0c57fab284e58e0bad620f21790e631d5dec17f8) · [Adapter notice](../web/tiny-voca-it/NOTICE.md)

<a id="zerre-tts"></a>

### Zerre TTS ~4.5M INT8 (Turkish)

The pinned Turkish-only checkpoint exposes two neutral labels: SES-A (`MK`, index 0) and SES-B (`NK`, index 1); the benchmark fixes SES-A. Upstream describes the model as approximately 4.5M parameters. The parameter catalog records a scoped 181,515 named FP32 weight/bias initializer lower bound from the selected quantized graph; it is not an exact full-model count. The checkpoint is 24 kHz with a 62-symbol inventory, a 25,344-entry Turkish lexicon, 512-token and 3,000-frame limits, and one unseeded `RandomNormalLike` node.

The exact deployed Pages graph/config/lexicon/phonemizer are pinned at Zerre Git commit `cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4`; graph bytes also match HF snapshot `55753a04ae624998cba86f7c17625616e318124e`. The official worker uses single-thread CPU/WASM. Benchmark WebGPU is a separate explicit `webgpu,wasm` route on ORT Web 1.20.1 and requires an untimed hardware dispatch probe. Both routes retain the official whitespace collapse, `. ! ? …` sentence splitting, Turkish locale casing, 3–512-token acceptance, no inserted pauses and final 0.99 peak limiting. The tokenizer drops digits and splits apostrophe suffixes into separate words. Smoke-only frontend audit matches the 94-span, 307-plan canonical digest; 39 digit-bearing sentence pieces across 35 spans omit number tokens. The upstream demo UI applies separate playback equalization and 0.95 normalization. The benchmark measures the worker's output PCM. Native PCM is stochastic; CPU/GPU output may differ by one frame. English and Kurdish are unsupported. See [profile, limitations and oracle](ZERRE_TTS.md) and [adapter/source notice](../web/zerre-tts/NOTICE.md).

<a id="vocina-it"></a>

### Vocina Italian v1.0 INT8

The pinned Vocina v1.0 checkpoint offers two released Italian synthetic voices, I1 (Femminile) and I2 (Maschile); the benchmark selects I1. It uses the existing it-article-v1 fixture and the official Italian G2P, Wiktionary lexicon, fitting, pauses, and peak limiter. CPU uses the official ONNX Runtime Web 1.27.0 WASM bundle; WebGPU uses its same-version WebGPU bundle with the verified asyncify WASM and explicit WASM fallback. The adapter verifies the full-fixture token/stress/pause digest in smoke diagnostics. The graph's native RandomNormalLike makes PCM hashes stochastic. Publisher parameter count is approximate; the registered value is a scoped initializer lower bound. Model/source code is Apache-2.0, the lexicon remains CC BY-SA 4.0, and no separate generated-audio distribution grant was found. [Pinned source and v1.0 release](https://github.com/OfficinePixel/vocina/tree/8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34) · [Profile and terms](models/vocina.md) · [Adapter notice](../web/vocina/NOTICE.md)

<a id="apptor-tiny-tts"></a>

### Apptor Tiny TTS 4.5M (Standard German)

The pinned Standard German checkpoint provides F2 and M2 at 24 kHz. The upstream 4.5M figure refers to the acoustic checkpoint. The browser pipeline also runs the German G2P graph and the author's INT8 Vocos ONNX second stage. The benchmark fixes M2, speed 1.0, neutral pitch controls, and the pinned neutral browser frontend and exception data. A separate probe measures GPU dispatch during the combined speech and vocoder stages after text preparation. WebGPU may use WASM fallback. [Pinned model card and assets](https://huggingface.co/apptor/apptor-tiny-tts/tree/0b6962273a1d6618f250cdbd621b56ba04b62cef) · [Pinned browser source](https://huggingface.co/apptor/apptor-tiny-tts-at/tree/e28eb444250b4d06162e6ba8e5090c4284345913/web) · [Frontend and license notice](../web/apptor-de/NOTICE.md)

<a id="apptor-tiny-tts-at"></a>

### Apptor Tiny TTS 4.5M (Austrian German)

The pinned Austrian Standard German checkpoint exposes the synthetic F2 and M2 speakers; this profile selects M2 at internal index 1. The internal `AT` label is the accent conditioning style, not another public speaker. Inference fixes accent 1.0, speed 1.0, pitch shift 0, pitch range 1.0, 24 kHz, one WASM thread and the author's INT8 Vocos second stage. Austrian dictionary readings activate at accent values of at least 0.5. The upstream card calls this an early preview with a mild/inconsistent Austrian accent, not dialect. The diagnostic frontend audit compares the full 109-span token/stress digest with the pinned upstream 1.20.1 browser oracle; WebGPU smoke separately verifies actual compute dispatch and may use WASM fallback. [Pinned Austrian model card and assets](https://huggingface.co/apptor/apptor-tiny-tts-at/tree/e28eb444250b4d06162e6ba8e5090c4284345913) · [Frontend and attribution notice](../web/apptor-at/NOTICE.md)

<a id="sopro-v2-turbo"></a>

### Sopro v2 Turbo

The checkpoint supports English, European Portuguese, French and German. It conditions on an input voice, with zero preset voices and an open-ended number of possible references. This configuration uses one fixed synthetic English reference. [Model card](https://huggingface.co/samuel-vitorino/sopro-v2-turbo/blob/c12d0dc7c4a33b3cb6ea3d11ceb70bc60c7c6312/README.md) · [Reference and runtime configuration](../web/sopro/NOTICE.md)

<a id="supratts-1.0-preview"></a>

## SupraTTS 1.0 Preview FP32

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned English-only preview checkpoint with one fixed voice and no streaming API. The official checkpoint has 1,031,754 parameters. The browser build uses the official dictionary-first English G2P and NumPy OOV fallback, plus four FP32 opset-17 ONNX graphs derived from the pinned MIT weights. [Small TTS benchmark page](https://erogol.com/small_tts_bench/) · [Pinned model card](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/README.md) · [Checkpoint configuration](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/config.json) · [Browser ONNX release and conversion manifest](https://github.com/ngelik/tts-bench/releases/tag/supratts-onnx-v1)

<a id="klein-tts-x1.5-pro"></a>

## Klein-TTS X1.5 Pro FP32

Supported voices: **17**. Bundled voices: **17**. Supported languages: **4** (en, es, fr, it).

The pinned `model.json` lists 17 speaker embeddings with language prefixes for English, Spanish, French and Italian. The benchmark exercises Sarah (`af_heart`) in English only. [Model card at pinned revision](https://huggingface.co/klein-ml/Klein-TTS-X1.5-Pro/blob/25e0e73bebba71e5985bc369628ebdcb81bf7116/README.md) · [Pinned model metadata](https://huggingface.co/klein-ml/Klein-TTS-X1.5-Pro/blob/25e0e73bebba71e5985bc369628ebdcb81bf7116/onnx/model.json) · [Benchmark cohort and background-condition notes](campaigns/klein-x1-5-pro/conditions.md)

<a id="linnet-en-35m"></a>

## Linnet en-35m (f1)

Supported voices: **2**. Bundled voices: **1**. Supported languages: **1** (en).

Pinned English checkpoint with two built-in American English synthetic voices. Only `linnet-en-f1` is staged and benchmarked. Voice cloning is outside the included terms. CPU uses the official VoxRT WASM 0.1.1 demo runtime with SIMD128; its demo-specific binding is not separately licensed in source, so asset fetching uses its pinned official URL and the binary is not committed or publicly rehosted. WebGPU uses a separately source-built Apache-2.0 VoxRT LinnetTTS v0.1.1 runtime pinned to commit [`29dfdd5`](https://github.com/VoxRT/LinnetTTS/tree/29dfdd503a3930e4e36c1130e4c9aab0592201ca), Rust 1.95.0, and the output size/SHA-256 in [`web/linnet/runtime-policy.mjs`](../web/linnet/runtime-policy.mjs). The same runtime is available as a digest-versioned release asset through `assets fetch`; its Apache `LICENSE` and VoxRT `NOTICE` are pinned alongside it. It sends FP32 dense matrix operations of at least 32,768 multiply-accumulates to WebGPU while other work remains on WASM SIMD128/CPU. Immutable `Mat::F32` model weights may be cached; changing attention K/V values are uploaded fresh for each dispatch. Rebuilds use `npm run linnet:runtime:build`; the builder stages output and release metadata only in ignored `.cache/` and never uploads model weights. Scored WebGPU runs request a non-fallback adapter and reject known software renderers. The historical CPU implementation and results are unchanged.

[Pinned model card and files](https://huggingface.co/VoxRT/linnet-en-35m/tree/a75fdfe50bc3d3e776b9c5040f149f49a054aaf5) · [Apache-2.0 Rust runtime at the CPU source pin](https://github.com/VoxRT/LinnetTTS/tree/f3d3f68cbd8b7d07380d11c82bf75af06bc41281) · [Apache-2.0 Rust runtime at the hybrid source pin](https://github.com/VoxRT/LinnetTTS/tree/29dfdd503a3930e4e36c1130e4c9aab0592201ca) · [Browser runtime details](https://www.voxrt.com/text-to-speech).

Current M1 Pro measurements, per-backend reports and the validation-only WebGPU receipt recovery with hosted audio audit are documented in the [five-family results](campaigns/erogol-small-tts/README.md#five-family-m1-pro-results) and [Linnet recovery/audit record](campaigns/erogol-small-tts/linnet-result-recovery-and-audio-audit.json).

<a id="zonos3-mini"></a>

## ZONOS3-Mini (Imogen)

Supported voices: **27**. Bundled voices: **1**. Supported languages: **43**.

The pinned model publishes 27 preset voices, 43 languages and 44 server locale codes. This configuration stages and benchmarks Imogen (English, British female) only. CPU/WASM and WebGPU use the same pinned speaker embedding; the browser benchmark loads Imogen's reference codes and embedding but skips the unused preview clip. See [configuration and asset closure](ZONOS3_MINI.md), the [pinned model card](https://huggingface.co/Zyphra/ZONOS3-Mini/blob/2921b8821772b0bd10a04456863d21abf9d2f283/README.md), and the [pinned upstream browser runtime](https://github.com/Zyphra/ZONOS3-Mini/tree/a50e14117d99181ba7f28047b451ba03ba1a09a9/servers/web).

## sano-robot-mcu

The [pinned official browser demo](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/web/index.html) selects one English (US) Robot/MCU voice (`mcu`, en-us, slot 0). Supported/bundled voices: **1/1**; languages: **1** (`en`). This is the complete 567,008-parameter INT8 MCU model, not the larger Kristin PiperLite model. Runtime: official CPU/WASM only. [Implementation and input audit](models/sano-robot-trellis.md).

## sano-trellis

The [pinned official browser demo](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/web/index.html) selects one experimental Trellis-RIFT English (US) voice. Supported/bundled voices: **1/1**; languages: **1** (`en`). The complete 995,058-parameter FP32 bundle emits 24 kHz PCM through the official CPU/WASM implementation. Other Sano models and languages are excluded. [Implementation and input audit](models/sano-robot-trellis.md).

<a id="inflect-atom-v3"></a>

## Inflect Atom v3 157K FP32

Supported voices: **6**. Bundled voices: **6**. Supported languages: **1** (English).

The exact 157,190-parameter core embeds Hope, Sophia, Cassidy, James, Jasper and Mark. This benchmark selects Cassidy, with the official optional eSpeak-light English frontend and local DSP. CPU and WebGPU use the same FP32 weights; WebGPU accelerates the convolutional decoder while the encoder/frontend/DSP stay on WASM. [Pinned model and voice contract](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/atom_runtime_20261024.py) · [Port, qualification and reproduction](models/inflect-atom-v3.md).

<a id="inflect-mini-v3-browser-port"></a>

## Inflect Mini v3 Browser Port

Supported voices: **6**. Bundled voices: **1**. Supported languages: **1** (en).

The pinned checkpoint publishes six English preset voices; this profile includes only the Cassidy speaker/style table. It is a separately named frontend/source-DSP configuration, not the official native output path. Its ONNX graphs were compared with the pinned native implementation at base and dynamic lengths; both exceeded the unchanged strict waveform thresholds, so results must remain labeled as browser-port results. CPU uses WASM for all three graphs. The registered WebGPU profile uses WebGPU with WASM fallback for the duration graph only; the text-bridge and waveform graphs run on WASM, while deterministic source excitation/STFT run on CPU. A separate all-graph WebGPU control produced clipped output and is not registered. See [configuration and reproducibility](INFLECT_MINI_V3.md) and the [pinned model card](https://huggingface.co/owensong/Inflect-Mini-v3/blob/fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6/README.md).

## Additional individual Kokopop Sano profiles

<a id="sano-heart-gguf"></a>

### sanoTTS Heart (Kokopop F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `heart` at 24,000 Hz is selected. This separate converted profile contains 2,272,145 source synthesis parameters and F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/heart/meta.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="sano-amy-gguf"></a>

### sanoTTS Amy 1.45M (Kokopop F16/F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `amy` at 22,050 Hz is selected. This separate converted profile contains 1,454,284 source synthesis parameters and F16/F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p46m/manifest.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="sano-amy-small-gguf"></a>

### sanoTTS Amy small (Kokopop F16/F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `amy-1p1m` at 22,050 Hz is selected. This separate converted profile contains 1,084,972 source synthesis parameters and F16/F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p1m/manifest.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="sano-amy-1p8m-gguf"></a>

### sanoTTS Amy 1.83M (Kokopop F16/F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `amy-1p8m` at 22,050 Hz is selected. This separate converted profile contains 1,834,380 source synthesis parameters and F16/F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p8m/manifest.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="sano-hfc-gguf"></a>

### sanoTTS HFC (Kokopop F16/F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `hfc` at 22,050 Hz is selected. This separate converted profile contains 1,834,380 source synthesis parameters and F16/F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/hfc-en-1p8m/manifest.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="sano-kristin-gguf"></a>

### sanoTTS Kristin (Kokopop F16/F32)

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (en). Only `kristin` at 22,050 Hz is selected. This separate converted profile contains 1,396,151 source synthesis parameters and F16/F32 tensors. [Pinned source](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/kristin-en-1p4m/manifest.json) · [Build and inference details](SANO_KOKOPOP_SIZES.md).

<a id="ua-serhiy-0p58m"></a>

## Ukrainian Serhiy 0.58M

Supported voices: **1**. Bundled voices: **1**. Languages: **1** (`uk`). The
pinned student checkpoint contains one Serhiy synthetic voice. The browser
profile converts its 575,888 stored inference tensor values from the original
FP16 source bundle into four dynamic FP32 ONNX graphs. That count includes
stored tensor values and is not asserted as trainable-only. The profile uses
Piper eSpeak NG Ukrainian phonemization and the checkpoint's explicit stress
restoration; unknown symbols and overlong unsplittable pieces fail. The
checkpoint and voice rights are not broadened by the teacher/corpus licenses.
[Pinned model card](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/README.md) · [Pinned upstream notice](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/NOTICE.md) · [Browser conversion](UA_SERHIY.md).

<a id="kale-tts-1-nano-int8"></a>
<a id="kale-tts-1-nano-fp32"></a>

## Kale TTS 1 Nano 7.5M

Supported voices: **10**. Bundled voices: **1** (Kenzie). Supported languages: **1** (en).

Both pinned browser profiles select the first official voice, Kenzie (`s057b`), with American English pronunciation. The publisher also includes British English presets in the full catalog. The benchmark stages Kenzie's style table, decoder controls, and American English frontend.

[Pinned model card](https://huggingface.co/KaleComputer/kale-tts-1-nano/blob/b6ce1887268c3667994fc3b0b2c82887c069915c/README.md) · [Voice catalog](https://huggingface.co/KaleComputer/kale-tts-1-nano/blob/b6ce1887268c3667994fc3b0b2c82887c069915c/voices.json).

<a id="korean-tts"></a>

## Korean TTS (KSS and Dizione F2)

Supported voices: **3** (KSS, F2, M2), all present in one pinned graph. Languages: **2** (ko, en). The benchmark registers KSS index 0 with `ko-loan` for `ko-article-v1` and Dizione F2 index 1 with `own` for `english-20k-v1`. M2 is not evaluated; mode `ko` remains reserved. Mixed Korean text with embedded English follows the Korean loanword route.

The graph is the publisher's step-160000 FP32 export, pinned at source revision `c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c`; the published v2 report records 4,550,347 parameters including the waveform generator. Korean and English routes use the same exact local Pyodide frontend and graph, with ONNX Runtime Web 1.20.1 on single-thread WASM or verified hardware WebGPU. [Pinned source report](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/FINAL_REPORT_v2.md) · [KSS corpus](https://huggingface.co/datasets/Bingsu/KSS_Dataset) · [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode).

<a id="tiny-voca-ja-tsukuyomi-chan"></a>

## Tiny Voca Japanese Tsukuyomi-chan P1

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (ja).
The profile selects the released synthetic `tsukuyomi` voice (index 0) and the
`ja-article-v1` fixture. The original FP32 waveform graph contains 4,589,131
stored parameter values; the separate duration graph's shared external tensor is
not counted twice. The adapter retains the published float64 phase and supports
the original CPU/WASM graph pair only. Its pyopenjtalk/Sudachi frontend pins the
Japanese phone, accent and phrase-boundary inputs and audits the complete
fixture against 280 native frontend plans. Warm and cached three-span Chrome CPU
smokes passed; the cached smoke transferred 153,916,767 bytes from the local
asset server. Offline initialization is unsupported in the current runner/cache
path because the verified SudachiDict-core wheel was unavailable after the
profile reopened offline. Credit **Tsukuyomi-chan Corpus (CV Rei Yumesaki)**
with any presented sample. The corpus terms reserve secondary use rights in
reusable audio material; this code/model entry does not grant general output
redistribution rights.

[Pinned model card](https://huggingface.co/ayousanz/tiny-voca-ja-tsukuyomi-chan/blob/7ed75cc5f521cc6be4cb57689b2c038928259ae9/README.md) · [Pinned inference source](https://github.com/ayutaz/tiny-voca/tree/66ee00d2c8cd61b34be1cde5880bac0e45b89fcf) · [Profile and terms](TINY_VOCA_JA_TSUKUYOMI_CHAN.md).

<a id="tiny-voca-ja-v3"></a>

## Gachimoto Tiny Voca Japanese v3

Supported voices: **2** (F2, M2), both bundled. Supported benchmark languages:
**2** (ja, en). Both fixture routes select synthetic F2, index 0, with the
original 24 kHz step-134000 FP32 ONNX graph. The published graph contains
4,538,827 FP32 parameters and runs on CPU/WASM or verified hardware
WebGPU+WASM under ONNX Runtime Web 1.31.1.

The Japanese route uses the published OpenJTalk prosody mapping with the
pinned pyopenjtalk-plus and Sudachi packages. The English route uses eSpeak NG
1.52.0 `en-us` with the published English token and stress projection.
The benchmark runs the standalone Japanese and English article fixtures
independently. The Japanese fixture retains one unknown emitted by the
original frontend for an en dash. [Pinned model and voice credits](https://huggingface.co/gachimoto/tiny-voca-ja/blob/9b2305c81b9ca92ef8347eba473ea096c86f55c4/README.md) · [Profile and reproduction](TINY_VOCA_JA_V3.md).

<a id="slyszeglosy-v1"></a>

## Słyszę Głosy V1 (Polish F)

Supported voices: **2** bundled in the pinned graph (F and M); benchmarked: **1** (F, index 0). Supported languages: **1** (pl). Only `pl-article-v1` is accepted. The separate V2 model is outside this V1 profile.

The pinned V1 ONNX graph is FP32 at model revision `23b63ff12db5f19260985031e64c2f45b89cc609`; the publisher reports 4,533,451 parameters including waveform generation. The adapter keeps the upstream Polish `text.py` and `wymowa` source byte-for-byte, runs it in classic-worker Pyodide 0.26.4, and uses ONNX Runtime Web 1.20.1 with explicit WASM or hardware WebGPU plus WASM fallback. WebGPU is accepted only after an actual compute dispatch is observed. The fixture frontend oracle covers 98 spans, 324 utterances, 233 maximum tokens, zero unknown phones, and token/stress digest `fde1d51a074ed33d0c8fba076150d4045549bb9e45bc0bf9dc656e82cceb9bf1`.

[Model card and weights](https://huggingface.co/Damaon/slyszeglosy/tree/23b63ff12db5f19260985031e64c2f45b89cc609) · [Pinned source](https://github.com/Damaon/slyszeglosy/tree/605a13f5d9994ad8c897dff3463ce1f339acfb5f) · [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/legalcode) · [Adapter source/terms](../web/slyszeglosy-v1/NOTICE.md).

<a id="tiny-voca-ru"></a>

## Tiny Voca Russian M

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`ru`).

The pinned Russian FP32 graph bundles synthetic F and M voices; this profile
selects the Space default, M (index 1). It uses 24 kHz output and the full
contextual Russian stress route: Pyodide phonemization, first-seen OOV accent
inference, then contextual homograph resolution. The waveform uses explicit
WASM or WebGPU with WASM fallback; both stress graphs stay single-thread WASM.
The all-span oracle is attached to smoke initialization settings only.

[Model card](https://huggingface.co/egnch/tiny-voca-ru/tree/2723b0e71fea216001bd4f6caf0866eb06879339) · [Browser source](https://github.com/yilbegan/tiny-voca-ru/tree/aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784) · [Space](https://huggingface.co/spaces/egnch/tiny-voca-ru-demo/tree/bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e) · [Profile notes](TINY_VOCA_RU.md) · [Notices](../web/tiny-voca-ru/NOTICE.md).

<a id="tiny-voca-gr"></a>

## Tiny Voca Greek M (FP32)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`el`).

The pinned Greek release contains two fixed synthesis profiles trained on recorded STOMA speech. The benchmark uses M (index 0), and F (index 1) is available for smoke diagnostics. The browser uses an FP32 ONNX export of the released PyTorch checkpoint with Greek eSpeak NG 1.51, 24 kHz output and upstream model limits of 512 tokens and 3,000 frames. ONNX Runtime runs in single-thread WASM or hardware WebGPU with WASM available for unsupported operators.

Native frontend verification covers all 109 spans and 335 utterances, with a maximum of 179 tokens and 28 preserved `<unk>` instances. eSpeak may switch pronunciation rules for Latin fragments, and the checkpoint still uses the Greek phone inventory. Standalone English is unsupported. See [adapter profile and limitations](TINY_VOCA_GR.md) and [license notices](../web/tiny-voca-gr/NOTICE.md).

[Model and Greek source](https://huggingface.co/ComputationalLinguisticsPlatform/tiny-voca-gr/tree/927ea15cf4edcb8695b75328c9c90c5c53928554) · [Base tiny-voca source](https://github.com/n4ze3m/tiny-voca/tree/62e2adef158bc997042cc6234f541f1e0e4cd55d) · [eSpeak NG 1.51 source](https://github.com/espeak-ng/espeak-ng/tree/2e9a5fccbb0095e87b2769e9249ea1f821918ecd).

<a id="mini-voz"></a>

## Mini Voz 4.5M FP32 (F1)

Supported voices: **4**. Bundled voices: **4**. Supported languages: **1** (`es-ES`).

The browser profile pins Mini Voz and its stock Spanish frontend at
`ad40085efb3fb13c905e4b4640855edf62471dd1`. It uses the complete Spanish (Spain)
fixture, Castilian eSpeak NG, 24 kHz output and the default F1 voice. F2, M1 and
M2 are fixed alternate voices. The frontend oracle verifies 334 utterances
across 105 spans, with a maximum of 180 tokens and zero unknown phones. CPU uses
single-thread WASM. WebGPU requires hardware dispatch and can use WASM for
unsupported operators. The graph generates waveform noise without a seed input.
[Profile and reproduction](MINI_VOZ.md) · [Retained notices](../web/mini-voz/NOTICE.md).

[Pinned Mini Voz source](https://github.com/ElMariones/mini-voz/tree/ad40085efb3fb13c905e4b4640855edf62471dd1) · [Base tiny-voca source](https://github.com/n4ze3m/tiny-voca).

<a id="tiny-voca-es"></a>

## Tiny Voca Spanish 4.5M FP32 (F2)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`es-ES`).

The profile uses the released FP32 checkpoint with default F2 and alternate M2
voices. It produces 24 kHz mono audio using eSpeak NG 1.52.0 and ONNX Runtime
Web 1.22.0. CPU uses one WASM thread. WebGPU requires hardware dispatch and can
use WASM for unsupported operators. The smoke audit checks the exact token and
stress output across all 105 spans. The retained English frontend in the
upstream source requires a separate English checkpoint.
[Profile and reproduction](TINY_VOCA_ES.md) · [Retained notices](../web/tiny-voca-es/NOTICE.md).

[Pinned Spanish checkpoint](https://huggingface.co/marcosmaceo/tiny-voca-es/tree/9898eaef9b245d7a5240156eed919ee1bd2a9b84) · [Pinned browser source](https://github.com/stdevMac/tiny-voca/tree/a4bf2bd979fc40b1bd7e34e13c0164db627d14ec).

<a id="tiny-voca-fr"></a>

## Tiny Voca French (FP32)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`fr`).

Pinned French checkpoint with synthetic voices FR_F1 and FR_M1; FR_F1/index 0
is the benchmark default. CPU uses ONNX Runtime Web 1.20.1; WebGPU uses the
existing pinned 1.31.1 WebGPU+WASM runtime because 1.20.1 fails on `/Concat_6`.
The upstream browser demo is CPU-only. Frontend diagnostics match all 108
registered fixture spans. French `17 h 40` and liaison behavior remain as released;
see the [profile and limits](TINY_VOCA_FR.md).

[Pinned French checkpoint](https://huggingface.co/DanielSuncost/tiny-voca-fr/tree/73f7700f514e70eef3b459aedcc49829d41945d4) · [Pinned browser source](https://github.com/DanielSuncost/tiny-voca-fr/tree/4cc26ab23d934e3d33796eb06bf11f23f4c9ab34).

<a id="tiny-voca-ptpt"></a>
### Tiny Voca European Portuguese

The `tiny-voca-ptpt` profile uses the released FP32 graph with voice F3 at
24 kHz, speed 1 and the native Portuguese pronunciation rules. The
`pt-pt-article-v1` fixture contains 106 spans. The released pronunciation
code and open-vowel list produced 350 utterances, a maximum of 185 tokens,
and zero unknown phones. The evaluator matched the browser frontend against
all 632 upstream Python pronunciation vectors. The registered oracle binds
each utterance’s token and stress sequences to its source span.

The CPU route requests one WASM thread. The WebGPU route requires a hardware
adapter and an observed compute dispatch. Performance values come from the
published browser receipts. [Checkpoint](https://huggingface.co/joserui/tiny-voca-pt-pt/tree/9d547821151d1f009eada6f49b5be73af77ae245) · [Browser frontend](https://github.com/joseruimemory/tiny-voca-pt-pt/tree/744e42406fd481fbe61f3b67bf8012a7d29cb57a) · [Notices](../web/tiny-voca-ptpt/NOTICE.md)

<a id="tiny-voca-ptbr"></a>

## Tiny Voca Brazilian Portuguese 4.5M FP32 (F_s4)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`pt-BR`).

The pinned checkpoint bundles F_s4 and M_sm4; the benchmark default is F_s4,
24 kHz mono. The adapter uses the stock Dizione-ptbr browser engine, tokenizer,
MFA-derived lexicon and open-vowel table. Its full fixture frontend audit is
101 spans, 310 utterances, a maximum of 225 tokens and zero unknown phones.
CPU explicitly uses one-thread WASM. WebGPU explicitly requests the WebGPU
provider, requires real dispatch in the separate probe, and may use ONNX
Runtime's internal CPU/WASM kernels for operators without WebGPU support.
Only the exact pt-BR checkpoint/profile is registered; European Portuguese is
unsupported. See [profile and reproduction](TINY_VOCA_PTBR.md) and the
[retained licenses and attribution](../web/tiny-voca-ptbr/NOTICE.md).

[Pinned checkpoint](https://huggingface.co/semfence/tiny-voca-ptbr/tree/f231cbe318c9f972e27fd8dad5d8ebcfb40a672f) · [Pinned browser Space](https://huggingface.co/spaces/semfence/tiny-voca-ptbr-demo/tree/a456470df5589478e3fb3f1973457771f4c056bd).

<a id="tiny-voca-ptbr-kokoro"></a>

## Tiny Voca Brazilian Portuguese Kokoro 4.5M FP32 (F)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`pt-BR`).

The independent Haple checkpoint bundles F and M; F/index 0 is the benchmark
default. It uses the upstream Portuguese normalizer and eSpeak NG 1.51 with a
68-symbol NFD frontend. The exact frontend audit matches the immutable fixture's
101 spans and 310 utterances, maximum 228 tokens, zero unknown tokens, and
token/stress digest. This is a frontend diagnostic, not a score. CPU uses
single-thread WASM. WebGPU+WASM requires actual hardware dispatch in the
separate probe. This profile supports pt-BR only; English traces are not an
English support claim. See [profile and evidence](TINY_VOCA_PTBR_KOKORO.md) and
[retained notices](../web/tiny-voca-ptbr-kokoro/NOTICE).

[Pinned checkpoint](https://huggingface.co/Haple/tiny-voca-ptbr-kokoro/tree/596401fc87f1635f73326872001e370d3aedab9b) · [Pinned source](https://github.com/Haple/tiny-voca-ptbr-kokoro/tree/1e7ed993260ecdd91552762f7403c00632bf5dab).

<a id="tiny-broca"></a>

## Tiny Broca Brazilian Portuguese (F1)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`pt-BR`).

The pinned checkpoint bundles F1/index 0 and M1/index 1 at 24 kHz. The benchmark
uses F1 and the upstream letter-and-stress frontend in Pyodide 0.26.4. The
registered article produces 294 utterances across 101 spans. Seven digit tokens
remain unknown in three standalone hour values and one ordinal. Both backends
keep the released frontend output. The WebGPU probe verifies compute dispatch
on hardware, with WASM available for unsupported operators.

[Profile and reproduction](TINY_BROCA.md) · [Pinned checkpoint](https://huggingface.co/brenorb/tiny-broca/tree/0ea879d8f532ad0c6e7308017b45105a74f81a95).

<a id="tiny-voca-ar-halabi"></a>

## Tiny Voca Arabic Halabi F2 (FP32)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`ar`).

The pinned release contains one 24 kHz synthetic F2 voice with a Damascene
accent. It requires fully vocalized Arabic and uses the unchanged rules frontend
in Pyodide 0.26.4. The 129-span `ar-article-v1` audit yields 557 utterances,
maximum 147 tokens, zero unknown IDs/graphemes, and token/stress SHA-256
`8e6f250074d7930ba07fd5e552e57c5a54e8298e6f16c498d3524b5f41a7055e`.
The worker preserves Arabic sentence splitting, applies one 0.99 cap per
completed source span, and checks hardware WebGPU dispatch with WASM fallback.

[Profile and reproduction](TINY_VOCA_AR_HALABI.md) · [Adapter notices](../web/tiny-voca-ar-halabi/NOTICE.md) · [Release source](https://github.com/BenkadourKhaled/tiny-voca/tree/4601b2bdb44bc52ebf73e87d5082b49fa138c6fb) · [Arabic Speech Corpus citation](https://en.arabicspeechcorpus.com/).

<a id="tiny-voca-ar"></a>

## Tiny Voca Arabic M2 (FP32)

Supported voices **1** · Bundled trained voices **1** · Language `ar`

The profile selects trained M2 at index 1. The ONNX checkpoint also contains
an untrained F2 slot. The adapter reads fully vowel-marked Modern Standard
Arabic using the exact Python frontend from the pinned 0.2.0 wheel in
Pyodide 0.26.4. The browser matched all 340 utterance plans in the 129-span
Arabic fixture, with a maximum of 189 tokens and zero unknown IDs or words.

The worker retains the demo’s sentence, fit and peak-cap behavior. WebGPU
uses the pinned JSEP runtime with WASM fallback and requires observed hardware
dispatch. The publisher reports unresolved clearance for client use of the
reference voice.

[Profile and provenance](TINY_VOCA_AR.md) · [License and notices](../web/tiny-voca-ar/NOTICE.md) · [Pinned checkpoint](https://huggingface.co/abdullah/tiny-voca-ar/tree/dcdf56c10c536d4df74576f036b512c0d212e17f) · [Publisher demo](https://tiny-voca-ar-site.pages.dev/).

<a id="tiny-voca-arabic"></a>

## Oddadmix Tiny Voca Arabic a000 (FP32)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`ar`).

The profile uses the publisher’s synthetic Modern Standard Arabic voice a000
at index 0 and 24 kHz mono. CATT v2 re-diacritizes uncached phrases on CPU/WASM.
The released Python rules run in Pyodide 0.26.4 with NumPy 1.26.4. The acoustic
graph supports CPU/WASM and verified hardware WebGPU+WASM. The 21.364 MB
speech checkpoint and 92.749 MB of CATT weights total 114.113 MB.

The headed Chrome audit matched the fixed 129 spans and all 339 utterance
plans with zero unknown IDs or words. It reproduced stock number expansion,
sentence fitting, 120 ms inter-utterance silence, and a 0.99 peak cap on each
completed span. The warm repetitions reuse the phrase cache populated by the
excluded full article. The separate cached-resource trial uses a fresh
worker and runs CATT for new phrases.

[Profile and reproduction](TINY_VOCA_ARABIC.md) · [Notices](../web/tiny-voca-arabic/NOTICE.md) · [Pinned checkpoint](https://huggingface.co/oddadmix/tiny-voca-arabic/tree/e529f716965142f51835adc9e5661f224c3fa103).

<a id="tiny-voca-he"></a>

## Tiny Voca Hebrew AH FP32

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`he`).

The pinned profile selects the male AH voice at 24 kHz mono. The exact
FP32 acoustic checkpoint has 4,531,147 parameters and is 21,361,734 bytes. Its
separate INT8 RenikudPlus G2P graph is 311,605,741 bytes; together the two model
weights are 332,967,475 bytes. The acoustic parameter count excludes G2P. The
stock Hebrew text frontend uses the 140-token planner limit. RenikudPlus runs
CPU/WASM in both backend configurations; WebGPU applies to acoustic inference
only.

The exact source audit covers 71 spans and 320 plans, maximum 140 tokens, zero
unknowns, digest
`4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7`. The
first-three smoke oracle is 16 plans, maximum 107 tokens, digest
`78412e106e2a9df78c8669beed49f169b5c08ec55a34727d87b6695c162fd1f2`.

[Profile and reproduction](TINY_VOCA_HE.md) · [Retained notices](../web/tiny-voca-he/NOTICE.md) ·
[pinned model](https://github.com/buzagloidan/tiny-voca-he/tree/fdc9b3080984c94768239989391fbaddcf9b5519).

<a id="tiny-voca-hindi"></a>

## Tiny Voca Hindi Rasa Q8_0

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`hi`). Locale: `hi-IN`.

This profile pins the 11.14 MB Q8_0 GGUF at release
`b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe`. It uses the one Rasa-trained
female voice, neutral style/index zero, and 24 kHz CPU/WASM synthesis. The
checkpoint has eight styles, but no alternate style is selected for scoring.
WebGPU is unsupported.

The pinned publisher Hindi normalizer is used with `english: true`; English is
not an independently supported route because unknown words can be dropped. The
fixed Devanagari fixture audit covers 91 spans and 322 sentence plans, with no
unknown tokens or skipped sentences. The browser C ABI does not expose a
token-level audit. Benchmark clips credit RL10x, the AI4Bharat Rasa dataset,
and the browser adaptation.

[Profile and reproduction](TINY_VOCA_HI.md) ·
[Pinned release](https://huggingface.co/RL10x/tiny-voca-hindi/tree/b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe) ·
[Release notice](https://huggingface.co/RL10x/tiny-voca-hindi/blob/b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe/NOTICE).

<a id="alpa-es"></a>

## Alpa Spanish 4.53M FP32 (female)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`es-AR`).

The pinned checkpoint has fixed female and male voices trained from OpenSLR 61 recorded Argentinian Spanish speech. The benchmark selects female/index 0, 24 kHz mono, neutral speed and pitch, and the released default Polish settings. The exact JavaScript port of the released Rioplatense spelling frontend matches all 104 fixture spans; smoke-only parity records 63 native unknown digit groups and a maximum of 218 tokens. Numeric input is not expanded. CPU uses one-thread WASM. WebGPU requires real hardware dispatch and may use WASM for unsupported operators. The exported graph produces raw PCM with unseeded noise and breath.
[Profile and reproduction](ALPA_ES.md) · [Retained license and notices](../web/alpa-es/NOTICE.md).

[Pinned Alpa Spanish checkpoint](https://huggingface.co/FranciscoCarlosErra/alpa-es/tree/de2bf894bdd9eb768ae03fc6b385176a0ff505d1) · [Pinned base tiny-voca source](https://github.com/n4ze3m/tiny-voca/tree/28e0722) · [OpenSLR 61 corpus](https://www.openslr.org/61/).

<a id="bengali-voice"></a>

## Hansda Bengali Voice Compact INT8 (Jahnavi)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`bn`).

The profile pins the compact INT8 Bengali checkpoint and the deployed Jahnavi
voice at index zero. The same frontend accepts Bengali script and Roman
Bengali input; `bn-Latn` is a fixture/input-script route, not a second spoken
language. The benchmark uses the exact publisher Bengali frontend and G2P
fallback with ONNX Runtime Web 1.24.3 single-thread WASM. WebGPU is unsupported
because tested runtime/graph controls did not return valid PCM. The model card
reports 930,224 acoustic parameters; this lower bound excludes the G2P encoder
and decoder. See [profile and reproduction](BENGALI_VOICE.md), [adapter notice](../web/bengali-voice/NOTICE.md),
[pinned model](https://huggingface.co/Hansda/bengali-voice-compact/tree/18c8afbee3a4cf230e175a5f618350ed2c9560ac),
and [browser source](https://github.com/DarvinX/multilingual-browser-tts/tree/f2977727b8baccb989f80b492ea8da00124ecba3).

<a id="tiny-swara"></a>

## Tiny Swara Bengali BF (INT8)

Supported voices: **2**. Bundled voices: **2**. Supported languages: **1** (`bn`).

The pinned INT8 checkpoint bundles BF/index 0 and BM/index 1; BF is the
benchmark default. It produces 24 kHz mono audio with speed 1, pitch shift 0
and pitch range 1. The profile uses the existing Bengali article. Its eSpeak
NG 1.52.0 frontend keeps the released Bengali inventory and lexicon. Known
Latin lexicon words route through Bengali spelling; other Latin words use
`en-us` phones mapped through the Bengali inventory. This code-mix path is not
an English model/voice or registered English profile. See [profile and
behavior](TINY_SWARA.md) and [source/license notice](../web/tiny-swara/NOTICE.md).

The frontend audit matches 89 fixture spans and 305 sentence plans, maximum
220 tokens, 2,908 primary-stress marks and zero unknown phones. The checkpoint
card reports 4,537,483 synthesis parameters, including the waveform generator.
CPU uses one-thread WASM. WebGPU requires a separate hardware dispatch probe and
returns CPU-readable PCM; ONNX Runtime Web may use WASM for unsupported GPU
operators. The graph includes `RandomNormalLike`, so PCM is stochastic.

The checkpoint config declares frontend fingerprint
`54cece4f400be1fbb56c30bbeedbcdcf5d432702e6d8c6389f44fbb79dc4c94b`; the
complete released inventory computes
`9b2e2c1495ada4f44cb6a52c1fb7811fb7756beda6ae20185d9b66ef6195bada`. Native
Bengali fixture tokens and stress match the source oracle under both. Rasa
training data is CC BY 4.0; follow its terms for redistributed derived audio.

[Pinned model card](https://huggingface.co/Xeven7/tiny-swara/tree/9432a340c46249c8acae4ff4b062d46b9cbd1991) ·
[pinned eSpeak NG source](https://github.com/espeak-ng/espeak-ng/tree/4870adfa25b1a32b4361592f1be8a40337c58d6c) ·
[ONNX Runtime Web 1.31.1](https://github.com/microsoft/onnxruntime/tree/v1.31.1).

<a id="tui-voice-mini-ml"></a>

## Tui Voice Mini Malayalam F2 (FP32)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`ml`).

This profile pins the 4,537,291-parameter checkpoint reported by the publisher
and selects F2/index 0, the only voice with Malayalam speaker metadata. The
21,386,372-byte FP32 ONNX graph is Apache-2.0. The model card separately credits
the CC BY 4.0 AI4Bharat Rasa dataset. The benchmark supports
`ml-article-v1`, 24 kHz mono, and only the F2 voice.

The browser route uses eSpeak NG 1.51 `ml` IPA with the pinned phone map. The
result settings also record the Dizione fingerprint declared in the config. The independent
frontend oracle covers 105 spans/461 clauses, maximum 232 tokens, 53 emitted
phones and 914 explicit merge emissions with no unknown phones or token IDs.
CPU uses single-thread WASM. WebGPU uses hardware dispatch during its separate
untimed probe and returns CPU-readable PCM; ONNX Runtime Web may execute
unsupported operators through WASM. Reported timings come from the full scored
article runs.

[Profile and reproduction](TUI_VOICE_MINI_ML.md) ·
[Retained notices](../web/tui-voice-mini-ml/NOTICE.md) ·
[Pinned model card](https://huggingface.co/Cyrax321/tui-voice-mini-ml/blob/9c2fee75373d81bbd62fbe2d683b1bad3c4415ea/README.md) ·
[Rasa CC BY 4.0 dataset at pinned revision](https://huggingface.co/datasets/ai4bharat/Rasa/tree/632f55c7ac590219d41cd7adffce5b440e4604f5).

<a id="tiny-urdu"></a>

## Tiny Urdu M2 (FP32)

Supported voices: **1**. Bundled voices: **1**. Supported languages: **1** (`ur`).
The benchmark takes Roman Urdu (`ur-Latn`) and synthesizes Urdu with M2/index 1. The English controls follow Urdu pronunciation rules.

The pinned [model card](https://huggingface.co/zafar205/tiny-urdu-tts-4.5-million-parameters/blob/4fe6566118972ea0d44b517f413191e0e30f5880/README.md)
reports a 4.5-million-parameter, 21 MB model, trained for 25,000 steps on 5,000
UrduTTS clips. It identifies one male Urdu voice, M2, and a 24 kHz mono output.
The pinned ONNX graph stores 4,545,739 FP32 scalars across 184 initializer tensors.

The adapter loads the hash-locked stock Roman Urdu frontend from the ignored
asset cache. `tools/tiny-urdu/build-frontend.mjs` verifies the upstream
[`urdu.ts`](https://github.com/Zafar205/tiny-urdu/blob/5770756e05f33591eab29498a47f6644664beae7/web/lib/urdu.ts)
at commit `5770756e05f33591eab29498a47f6644664beae7` (12,843 bytes,
SHA-256 `92fac4d08fdb5b0c219e6972c0a79e4467dbc238396e57ada353c1ab878b870d`)
and its stripped `frontend/urdu.mjs` output (12,843 bytes, SHA-256
`f054aeba85685000a13af39dd40b4f4683ff9730b24c462270c98f84bd6369dc`). The route keeps the stock punctuation
sentence split and recursive 500-token fit, inserts 150 ms only between
utterances within each source span, and applies a 0.99 peak cap once per span.
The fixed `ur-latn-article-v1` audit covers 103 ordered spans and 319 utterances,
with a maximum of 177 tokens, zero unknown token IDs and zero nonzero stress
values. Its token/stress digest is pinned in the adapter profile.

Both CPU/WASM and WebGPU use ONNX Runtime Web 1.31.1, the stock basic graph
optimization setting, one WASM thread, and disabled CPU memory arena/memory
pattern. WebGPU permits WASM fallback for unsupported operators and must show a
separate untimed hardware dispatch probe. An independent headed-Chrome qualification
compared the publisher’s CPU setup with both 1.31.1 routes. The integrated
CPU and WebGPU adapters each emitted 1,055,072 samples in a separate cached
smoke run, with 835 hardware dispatches in the WebGPU capability probe.

### Reproduction

After reviewing the noncommercial dataset terms, prepare and verify the pinned
assets, then run both backends against the same fixture. The builder accepts a
local copy of the upstream TypeScript when network access is unavailable; it
checks that copy against the source SHA above before creating the ignored cache
artifact. The benchmark harness uses disposable Chrome profiles and sequential
headed runs.

```sh
node tools/tiny-urdu/build-frontend.mjs
npm run assets -- fetch --model tiny-urdu --accept-license
npm run assets -- verify --model tiny-urdu --accept-license
npm run bench -- models --language ur-Latn
npm run bench -- run --model tiny-urdu --backend cpu --fixture ur-latn-article-v1 --smoke --accept-license
npm run bench -- run --model tiny-urdu --backend webgpu --fixture ur-latn-article-v1 --smoke --accept-license
npm run bench -- run --model tiny-urdu --backend cpu --fixture ur-latn-article-v1 --scenario warm --warm-protocol v2 --repetitions 3 --machine "<actual machine>" --accept-license
npm run bench -- run --model tiny-urdu --backend webgpu --fixture ur-latn-article-v1 --scenario warm --warm-protocol v2 --repetitions 3 --machine "<actual machine>" --accept-license
```

The WebGPU run is usable only when its separate untimed probe confirms hardware
dispatch; fallback alone is not GPU qualification. Keep backend runs
sequential, preserve the fixture and all asset pins, and record the actual
machine and Chrome version with results. Never substitute a CPU run for a
requested WebGPU result.

The model card describes common English loanwords as spoken with Urdu rules;
this is not an independent English route. UrduTTS is [CC BY-NC 4.0](https://huggingface.co/datasets/kaab4321/UrduTTS): benchmark use and any derived-audio sharing must be noncommercial and retain attribution. No blanket recording redistribution right is inferred. The model card also says its source audio uses four male speakers, while this checkpoint has one M2 output voice.

[Pinned model](https://huggingface.co/zafar205/tiny-urdu-tts-4.5-million-parameters/tree/4fe6566118972ea0d44b517f413191e0e30f5880) ·
[UrduTTS dataset and attribution](https://huggingface.co/datasets/kaab4321/UrduTTS) ·
[Pinned frontend repository](https://github.com/Zafar205/tiny-urdu/tree/5770756e05f33591eab29498a47f6644664beae7) ·
[ONNX Runtime Web 1.31.1](https://github.com/microsoft/onnxruntime/tree/v1.31.1).

### Tiny Voca Kiswahili

The benchmark uses adoamesh’s 55,000-step FP32 ONNX release with WAXAL speaker ID 1 at index 0. The graph bundles seven speaker IDs (1–6 and 8). Both browser routes use 24 kHz mono PCM, speed 1, pitch shift 0 and pitch range 1. The 21,394,052-byte graph contains 4,539,211 logical scalars across 184 FP32 initializers.

The publisher describes a deterministic Kiswahili letter-to-phone frontend and distributes four reference sentences with token and stress arrays. The benchmark implements those documented rules independently, matches all four arrays exactly, and applies the Kiswahili phoneme inventory to the full fixed article. Pronunciation outside those four examples is an approximation, including the explicit pronunciation of City in a place name. The route handles the Kiswahili fixture only.

The article has 109 fixed spans. The browser frontend divides them into sentences and concatenates the raw PCM in source order at each span boundary. Each graph call checks the token budget, the 3,000-frame limit and the exact correspondence between the duration head and the audio samples. Headed Chrome runs ONNX Runtime Web 1.31.1 with one WASM thread and graph optimization set to all. Apple WebGPU uses the same graph with WASM operator fallback and an untimed hardware dispatch probe. The release’s pretokenized reference cases produced identical sample counts on the two browser routes.

[Model and reference inputs](https://huggingface.co/adoamesh/tiny-voca-swahili/tree/408b7b783b0c77ed66030521f8cec88f5c6d6e2b) · [WAXAL dataset and license](https://huggingface.co/datasets/google/WaxalNLP/blob/5f4d8ca24f2b9d168b2ee545f1febaaff4b40580/README.md).

### SobbieTTS

The pinned expressive English FP32 ONNX checkpoint bundles voices F and M. The benchmark uses the publisher’s default F at index 0, 24 kHz mono PCM, speed 1, pitch shift 0 and pitch range 1.15. The 21,386,372-byte graph contains 4,537,291 logical scalars across 184 FP32 initializers.

The benchmark uses the released pronunciation dictionary and a pinned snapshot of the Dizione source selected by the publisher’s demo builder. It preserves the demo’s sentence segmentation, abbreviation handling, token budget, terminal punctuation and 0.99 peak cap. The canonical English fixture supplies all 93 source spans. Each graph call validates its PCM and predicted token durations.

Both scored routes use ONNX Runtime Web 1.31.1 with one WASM thread. Apple WebGPU requires an untimed hardware dispatch proof and permits WASM for unsupported operators. Four English controls produced the same audio lengths in the original 1.20.1 browser worker, the benchmark’s CPU route and its Apple WebGPU route.

[Model card](https://huggingface.co/PatnaikAshish/SobbieTTS/blob/6b6132c6d34b5fc163d8f5553580678a60532ac3/README.md) · [Publisher browser worker](https://huggingface.co/PatnaikAshish/SobbieTTS/blob/6b6132c6d34b5fc163d8f5553580678a60532ac3/web/public/worker.js).

### Alpa (Sanskrit)

The benchmark uses the exact Alpa v0.2 FP32 graph loaded by the publisher’s browser demo. It contains 4,531,723 logical scalars across 184 FP32 initializers and bundles female and male voices. The fixed benchmark voice is female at index 0. Both routes use 24 kHz mono PCM, speed 1, pitch shift 0 and pitch range 1.

The browser worker uses the publisher’s versioned JavaScript frontend directly from the verified local asset cache. The official JavaScript and Python frontends agree on phoneme IDs and syllable weights across all 90 fixed Devanagari spans. The stock planner produces 90 plans, with a maximum of 262 tokens and zero unknowns. The demo’s ITRANS input mode converts Roman Sanskrit to Devanagari. The English control produced unknown inputs in the Sanskrit frontend.

The publisher’s original one-thread ORT 1.20.1 browser worker and both benchmark routes returned matching sample lengths for four Sanskrit text controls. The benchmark fixes one WASM thread in ONNX Runtime Web 1.31.1. WebGPU uses the same graph with WASM operator fallback and an untimed hardware dispatch probe. The worker checks raw PCM length against the duration outputs before returning the stock parts in source order.

[Model release](https://huggingface.co/77ethers/alpa/tree/b3973a79888b9c63b2fc6f56140c1699c0bd44d6) · [Official browser demo](https://alpa.blog/) · [Exact browser frontend](https://alpa.blog/js/text.js?v=ab33b3eb).

### Fiato

Fiato’s pinned English FP32 ONNX graph contains 4,537,867 scalar initializer values and bundles American English voices F1 and M1. The benchmark uses F1 at index 0, 24 kHz mono PCM, speed 1, pitch shift 0 and pitch range 1.

The adapter uses the Dizione archive and dictionary shipped with the release. It follows the publisher’s sentence splitting and punctuation rules, checks the sample count against each sentence’s predicted durations, and applies the publisher’s 0.99 peak cap after concatenating each source span’s PCM. The fixed English article contains 93 spans. The publisher’s sigh, exhale and gasp tokens have separate controls outside the scored article.

Both backend routes use ONNX Runtime Web 1.31.1 with one WASM thread. The WebGPU route checks hardware dispatch separately and permits WASM operator fallback. The original browser worker and both benchmark routes matched the audio lengths of four plain English controls and three expression controls.

[Model and assets](https://huggingface.co/cfahlgren1/fiato/tree/967de50b6a9ab673ef7de9f8f276fa93a8c0db81) · [Publisher browser worker](https://huggingface.co/cfahlgren1/fiato/blob/967de50b6a9ab673ef7de9f8f276fa93a8c0db81/demo/worker.js).
