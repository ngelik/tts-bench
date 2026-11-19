# Code, models and publication

The MIT license applies to original harness code, benchmark result metadata,
documentation and the original English fixture. Downloaded components retain
their own licenses. A benchmark result is not a commercial-use clearance.

| Component | Recorded license / publication boundary |
|---|---|
| Phonon 31M weights, tokenizer, default voice | Apache-2.0 at the pinned revision |
| Official `phonon-tts` runtime | MIT OR Apache-2.0; compiled dependencies retain notices |
| Paradee weights | Apache-2.0 |
| Vendored Kokoro frontend / Paradee Misaki mapping | Apache-2.0; pinned sources, changes and full licenses in `web/paradee/` |
| Paradee browser phonemizer | Package Apache-2.0; compiled eSpeak NG is GPL-3.0; do not treat the whole stack as MIT |
| Derived Leokani config/vocabulary in `web/data/leokani/` | CC BY-NC 4.0; retain Milliwatt Labs attribution and adjacent change/source notice |
| Leokani 7M / 4.5M weights | CC BY-NC 4.0; commercial use needs additional rights |
| Leokani G2P | MIT code; CC BY 4.0 weights/lexicon |
| Leokani browser engine | Grant for the exact historical engine was not separately established; do not vendor it under MIT |
| Adapted PiVo frontend in `web/pivo/text.mjs` | Apache-2.0; source/change record and upstream notices in `web/pivo/` |
| PiVo | Apache-2.0 acoustic model/code, BSD/Opus FARGAN-derived component, CMU dictionary notices |
| Woof historical one-voice assets | Underdog noncommercial terms; exact one-voice lineage is less explicit than newer releases; weights/runtime assets remain excluded; opt-in attributed evaluation recordings are documented in audio/README.md |
| Piper en-GB Southern English Female low weights | The pinned card lists the training dataset as CC BY-SA 4.0 and says it was fine-tuned from Ryan low. The Ryan card lists its dataset as CC BY-NC-SA 4.0. The cards do not state a separate model or output license; model/runtime redistribution remains excluded; approved evaluation audio retains these notices separately from the code license. |
| Piper official browser files and eSpeak data | `rhasspy/piper-samples` at `da672d1157136d07365790f51da3357a17cf9650` has no separate license file in its pinned tree. Its JavaScript, WebAssembly, and data bundle remain in the ignored local cache; do not redistribute the runtime. The eSpeak NG COPYING file is staged for reference, but it does not establish terms for the overall browser bundle. |
| Supertonic 3 model and preset voice styles | OpenRAIL-M at the pinned revision; use-based restrictions apply. The licensor claims no rights in outputs except as stated in the license, and users remain responsible for outputs and their uses. Model/voice assets remain in the ignored cache. |
| Adapted official Supertonic browser helper | MIT, Supertone Inc.; retained license and exact source/change record in `web/supertonic/`. |
| Klein-TTS X1.5 Pro | Apache-2.0 model card and weights | The browser adapter is a disclosed port of the Apache-2.0 Node package. Misaki G2P/English dictionary and `phonemizer.js` are Apache-2.0; eSpeak NG is GPL-3.0-or-later; ONNX Runtime Web is MIT with third-party notices. See [`web/klein/NOTICE.md`](../web/klein/NOTICE.md). |
| ONNX Runtime Web | MIT, with third-party notices |
| Silencio-2 weights, converted ONNX graphs and model-bound voice-260 state | CC-BY-4.0 at the pinned model revision; retain BlueRose Labs, Kyutai Pocket TTS and Basis Global Emotions attribution. The fixed bundled synthetic voice is not a user-supplied voice-cloning input. Follow the model card's permission, anti-impersonation and synthetic-speech disclosure guidance. |
| Silencio-2 upstream inference source | MIT in `silencio2/core`; exporter attribution and source pins are in `tools/silencio2/NOTICE.md`. |
| ZONOS3-Mini model weights and the pinned Imogen default-voice files | Apache-2.0 as declared by the pinned Hugging Face model card; the benchmark stages Imogen reference codes and embedding for WebGPU, while CPU/WASM TTS uses only the same embedding. Unused preview audio is not staged. |
| ZONOS3-Mini official browser runtime | MIT at the pinned Zyphra source revision; source, unmodified upstream LICENSE/NOTICE and the documented voice-filter, disposal, dispatch-probe, EOS and streamed-error changes are retained in `web/zonos3/`. |
| ZONOS3-Mini CPU/WASM runtime | The audio.cpp browser build is separately versioned under Apache-2.0 with retained Zyphra/GGML MIT and other third-party notices staged with the locked runtime files; it does not inherit the model's Apache license. See [configuration and reproduction](ZONOS3_MINI.md). |

The small Apache-2.0 frontend source files in `web/paradee/` retain separate
license files and a source/change manifest. They are exceptions to the root MIT
license. The small derived Leokani configuration/vocabulary files in
`web/data/leokani/` retain CC BY-NC 4.0 terms and attribution.
Restricted or unclear-license runtime files belong only in a local ignored cache.
Use upstream download/import instructions and read their terms before running.
Accepting an upstream license is a local decision, not a grant from this project.
Do not upload weights, voices, minified upstream engines or browser profiles.
Explicitly authorized evaluation audio uses the documented audio manifest,
small in-repository clips and full-recording release assets. Preserve attribution
and applicable model/output terms; Woof requires credit wherever outputs play.
See [listening provenance and terms](../audio/README.md).

Changing a frontend to avoid a license obligation changes the implementation.
Benchmark it as a new configuration and compare its outputs before substituting it.

Primary sources:

- [Phonon model](https://huggingface.co/gradium/phonon-31m-en)
- [Phonon runtime](https://www.npmjs.com/package/phonon-tts/v/0.6.0)
- [Paradee model](https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.2)
- [Phonemizer source](https://github.com/xenova/phonemizer.js)
- [eSpeak NG license](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING)
- [Leokani 7M](https://huggingface.co/milliwattlabs/leokani-tts-7M)
- [Leokani 4.5M](https://huggingface.co/milliwattlabs/leokani-tts-4.5M)
- [PiVo](https://huggingface.co/empero-ai/PiVo-1.4M)
- [Woof](https://underdog.ai/woof)
- [Piper en-GB model card](https://huggingface.co/rhasspy/piper-voices/blob/e7229f7d33a10e145e109b886d661984201ac3c4/en/en_GB/southern_english_female/low/MODEL_CARD)
- [Piper Ryan low ancestry model card](https://huggingface.co/rhasspy/piper-voices/blob/e7229f7d33a10e145e109b886d661984201ac3c4/en/en_US/ryan/low/MODEL_CARD)
- [Piper browser sample source at the pinned revision](https://github.com/rhasspy/piper-samples/tree/da672d1157136d07365790f51da3357a17cf9650)
- [ONNX Runtime](https://github.com/microsoft/onnxruntime/blob/v1.23.2/LICENSE)

- [Supertonic 3 model license](https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/LICENSE)
- [Official Supertonic browser source](https://github.com/supertone-oss-archive/supertonic/tree/1e9799e964ea4c0dad7cde993b65c3c813a7b373/web)

## 2026-11-10 discovery cohort

| Component | Terms and source |
| --- | --- |
| Kokoro 82M v1 model and voice styles | [Apache-2.0 model card](https://huggingface.co/hexgrad/Kokoro-82M/blob/f3ff3571791e39611d31c381e3a41a3af07b4987/README.md). Weights/styles remain in ignored cache. |
| Kokoro official browser helper | Apache-2.0, hexgrad/Xenova. Readable adapted source, full license and change notice retained in `web/kokoro/`. |
| Kitten Nano 0.8 FP32 and voice archive | [Apache-2.0 model card](https://huggingface.co/KittenML/kitten-tts-nano-0.8-fp32/blob/e73cfb095bd949c786ccdcf3b8ab04eb36c47442/README.md). Weights/styles remain in ignored cache. |
| Kitten ONNX frontend port | Apache-2.0 upstream contract/token mapping; attribution and license retained in `web/kitten/`. Browser integration is original benchmark code. |
| MMS English | [CC BY-NC 4.0 model card](https://huggingface.co/facebook/mms-tts-eng/blob/c71de0fe7204c83f1c10820a7d696d0b450048ba/README.md). Noncommercial evaluation; Facebook/Meta MMS attribution retained. [Pinned ONNX export](https://huggingface.co/Xenova/mms-tts-eng/tree/3f8955a2adbd6487ce57420620d4916de22b9dac). |
| Transformers.js 3.5.1 | Apache-2.0. Its tokenizer-side WASM files are pinned separately from each adapter's ONNX Runtime. Silencio-2 uses ONNX Runtime Web 1.31.1 with its MIT license and third-party notices staged as runtime assets. |

The new recordings are authorized benchmark outputs with model/source attribution;
listing a model license does not claim it settles every output or voice right.
The small Apache-2.0 adapted source files are exceptions to the repository's root
MIT license. No model weights or bundled upstream engines are committed.

The Silencio-2 conversion is published separately as a versioned GitHub Release
because its pinned CC-BY-4.0 license permits redistribution with attribution.
The browser source and model-bound voice-state format remain in this repository;
the release carries the model notice, full attribution, graph provenance and
hash manifest. See `web/silencio2/NOTICE.md` and the generated `SOURCE.json`.

Sano Amy's pinned [model card](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/README.md)
lists GPL-3.0; the official `sanotts-web@0.3.0` browser runtime is
GPL-3.0-or-later. Runtime and model bytes stay in ignored cache with the GPL
text staged separately. The project's MCU/mobile MIT carve-outs do not cover
this browser runtime. The root MIT license does not relicense those components;
any redistribution of a combined browser application must respect their terms.

The separate Sano HFC and Kristin browser checkpoints and full-size Heart model
are GPL-3.0 at their pinned Hugging Face revision. They use either the official
`sanotts-web@0.3.0` runtime or the official `snt_nano` browser files, both
GPL-3.0-or-later, plus the eSpeak G2P/Trellis frontend. Amy-small and Amy 1.8M
are likewise GPL-3.0; their FP16 package weights are packed into the browser
runtime's FP32 ABI by the reproducible scripts in `tools/`. The conversion
does not change the model tensors or relicense the source package. Model and
runtime bytes stay in the ignored cache; the pinned license text and conversion
provenance are recorded separately.

The pinned [SanoTTS heart-nano model card](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/README.md)
and its weights are GPL-3.0. The selected G2P, Trellis frontend, nano WASM glue
and WebAssembly files are pinned from the official [SanoTTS browser source at
`c0584a51213721faba98135821faab71bae888f0`](https://github.com/Ampixa/sanoTTS/tree/c0584a51213721faba98135821faab71bae888f0/web)
and retain GPL-3.0-or-later terms. The license text is included at
[`web/sano/LICENSE`](../web/sano/LICENSE); runtime/model files remain in
ignored cache and are not redistributed by this repository. The benchmark
adapter and demo-derived sentence/clause split helper are identified in
[`web/sano/NOTICE.md`](../web/sano/NOTICE.md); the helper retains
GPL-3.0-or-later terms. The CPU registration does not include the separate
dequantized-F32 WebGPU conversion.

Inflect Micro v2's [official package](https://huggingface.co/owensong/Inflect-Micro-v2-ONNX/tree/91b1ab6432323064ec0e8e9704d92fcecd24855f)
is Apache-2.0; the VITS/Tacotron-derived symbol inventory retains its MIT notice.
The browser frontend port retains notices under `web/inflect/`. The fixed voice
is described upstream as synthetic, with no reference recording required.
The model's private training recipe/data are not fully released; open model
weights do not imply an open training corpus. Weights remain in ignored cache.

## Liquid AI LFM3 Audio / Omni GGUF

The official weights use **LFM Open License v1.0**, not an OSI-approved permissive
license. The license contains a USD 10 million annual revenue threshold for
commercial use; retain the upstream terms and notices and assess the exact use.
The pinned licenses are fetched with the weights. Sources:
[Audio terms](https://huggingface.co/LiquidAI/LFM3-Audio-2B-GGUF/blob/39670cb5c42e9c4bfe046519ba7ffbe47f9552ad/LICENSE),
[Omni terms](https://huggingface.co/LiquidAI/LFM3-Omni-2B-GGUF/blob/d508b88f08a5b4286f2d2805a6a8d69a0ff44c72/LICENSE).

The official WebGPU Space provides a JavaScript runtime without separately
established redistribution terms. It is pinned and downloaded into ignored local
storage; this repository does not relicense or redistribute that bundle or the
weights. The original benchmark adapter is MIT. Recordings use the benchmark's
original article and retain model attribution/terms in the audio manifest.
See [configuration and reproducibility details](LIQUID_LFM3.md).

## Liquid LFM3 Fusor q7 CPU bundles

The Audio and Omni q7 bundles retain **LFM Open License v1.0**, including its commercial revenue threshold. Their manifests identify the underlying Liquid AI checkpoints. Model terms are separate from the **MIT** Fusor app/runtime and **Apache-2.0** `wasm-bindgen-rayon` 1.3.0 helper terms. Pinned license files accompany the downloaded assets; copies and source attribution are retained in [the CPU adapter notice](../web/liquid-cpu/NOTICE.md). The benchmark does not relicense model weights or recordings under its root MIT license.

Sources: [Audio bundle license](https://huggingface.co/fusorlabs/lfm3-audio-2b-web/blob/e273326dda2bb26870549ed7b39324ae086e5fe7/LICENSE), [Omni bundle license](https://huggingface.co/fusorlabs/lfm3-omni-2b-web/blob/09f4fc6ddbbb3cc6cd30f74b1e76cc894f4901f4/LICENSE), [Fusor runtime source](https://github.com/fusor-rs/liquidai-lmf3-wasm/tree/d21345320af38a5f2246a6d2e608d7cf178d92ef), [threaded helper license](https://github.com/RReverser/wasm-bindgen-rayon/blob/6a09d723ed5eed586d1db808f9cc56625b36ff77/LICENSE). See [CPU configuration details](LIQUID_LFM3_CPU.md).

## Mach Boom browser port

[Mach Boom weights, four provided voices and runtime sources](https://huggingface.co/SyzygyResearch/Mach-Boom/blob/01860b06bdf8498761255ad1c64b99980b96486d/LICENSE)
use Apache-2.0; its [NOTICE](https://huggingface.co/SyzygyResearch/Mach-Boom/blob/01860b06bdf8498761255ad1c64b99980b96486d/NOTICE)
credits Gradium Phonon and Kyutai Pocket TTS/Mimi. Zoey is the tested preset.
The browser port retains upstream notices and records changes in
[its source notice](../web/mach-boom/NOTICE.md). Pyodide 0.29.3 is MPL-2.0,
CPython 3.13.2 retains PSF terms, NumPy 2.2.5 retains BSD-3-Clause and bundled
third-party terms, and Transformers.js 3.5.1 is Apache-2.0. Licenses are staged
with their respective assets; the root MIT license does not relicense them.

## Original Pocket TTS English ONNX

The public [KevinAHM ONNX export](https://huggingface.co/KevinAHM/pocket-tts-onnx/blob/58a6d00cf13d239b6748cb0769f35c580a8f606c/README.md)
declares **CC-BY-4.0** for model weights inherited from Kyutai Pocket TTS, and
includes upstream prohibited-use conditions. These cover, among other things,
unauthorized voice impersonation/cloning, deception, unlawful activity and
privacy-invasive content. The [pinned browser Space](https://huggingface.co/spaces/KevinAHM/pocket-tts-web/blob/d0c0c79b7712256a32d691c67f20b8ae2e020d00/README.md)
says its bundled voice assets inherit Pocket TTS terms. The benchmark uses the
provided **alba** preset with the repository's fictional English article; no
custom voice cloning or gated upstream downloads are involved.

The community frontend is **Apache-2.0**, ONNX Runtime Web is **MIT**, and component
notices remain applicable. The browser adapter retains the frontend's code
license and change notice. `--accept-license` acknowledges the documented model
conditions; it does not relicense weights, voices or recordings under this
repository's MIT license. Published recordings must retain source attribution and
these model terms. See [configuration and reproduction](POCKET_TTS.md).

## Ming 3.0, Audio8 and Fun-CosyVoice3

| Configuration | Model terms | Other terms in this configuration |
| --- | --- | --- |
| Ming 3.0 TTS 0.5B | MIT | The community GGUF preserves the original checkpoint terms. The browser build includes audio.cpp, GGML and their component notices. [Model](https://huggingface.co/inclusionAI/Ming-3.0-tts-0.5B) · [GGUF source](https://huggingface.co/audio-cpp/Ming-3.0-TTS-0.5B-GGUF) |
| Audio8 TTS Realistic Air 0.6B | Apache-2.0 | The INT4 conversion uses the Realistic acoustic weights. The evaluation uses reference-free synthesis. ONNX Runtime Web is MIT. [Configuration and notices](AUDIO8_REALISTIC.md) |
| Fun-CosyVoice3 0.5B (2512) | Apache-2.0 | The bundled English preset derives from LibriTTS-R under CC BY 4.0. Quick Inference frontend code uses PolyForm Noncommercial 1.0.0. ONNX Runtime Web is MIT. [Configuration and notices](COSYVOICE3.md) |

### Ming 3.0 TTS 0.5B, Fusor CPU

The inclusionAI model and Fusor runtime carry MIT licenses. The original usage disclaimer calls for synthetic labeling and limits impersonation and deceptive uses. The lock stages the original model license, Fusor license and cards. Benchmark recordings use the built-in synthetic US_James voice. [Model and usage disclaimer](https://huggingface.co/inclusionAI/Ming-3.0-tts-0.5B/blob/e5bd8da31ecf1b9276cdbdda821fa891068f1368/README.md#usage-disclaimer) · [Fusor weight export](https://huggingface.co/fusorlabs/ming-3.0-tts-0.5b-web/blob/62588575d91dceb33822fe1e3925e748393c6b3e/README.md) · [Fusor license](https://github.com/fusor-rs/ming-wasm/blob/bcbcf268f6b32db48c075aec94f3b7ff59208085/LICENSE)

### Tiny Voca 4.5M

The code and model weights are Apache-2.0. The training dataset is CC BY 4.0. The benchmark uses the released F2 synthetic voice. The pinned Dizione source archive includes its Apache-2.0 license. The model assets include separate CMUdict and homograph-data notices. ONNX Runtime Web is MIT. The Pyodide distribution uses MPL-2.0, CPython uses its PSF license, and the NumPy wheel includes its BSD and bundled component notices. [Model and dataset terms](https://github.com/n4ze3m/tiny-voca/blob/28e0722c6ad040d74a1f6e63d77621272477a71f/README.md#license) · [Dizione license](https://github.com/n4ze3m/dizione/blob/f8629fe989f3d0db5f440f9b3c6f0154f2e6110f/LICENSE) · [Runtime configuration and source](../web/tiny-voca/NOTICE.md)

## Sopro v2 Turbo

Sopro's code and model weights are Apache-2.0. ONNX Runtime Web is MIT and has bundled third-party notices. The fixed reference is the benchmark’s own published Tiny Voca synthetic F2 audio, generated from the benchmark article, and credited with the output. [Model terms](https://huggingface.co/samuel-vitorino/sopro-v2-turbo/blob/c12d0dc7c4a33b3cb6ea3d11ceb70bc60c7c6312/README.md) · [Runtime, prompt and modifications](../web/sopro/NOTICE.md)

### Linnet en-35m

The pinned [Linnet Weights License 1.0](https://github.com/VoxRT/LinnetTTS/releases/download/weights-v1/WEIGHTS_LICENSE.md)
is not open-source. It allows benchmarking, testing, CI and distributing generated
outputs, but forbids general-purpose TTS services, custom voice creation, model
training and distributing the licensed weights outside the terms in the license.
This registration uses fictional fixed fixture text and the built-in `f1` voice;
it performs no cloning or training. FP16 parameters are widened to FP32 only in
WASM memory for the SIMD128 runtime and are not persisted. The 83 MB weights,
tokenizer and voice stay in ignored local storage and are downloaded from the
pinned VoxRT release. Use `--accept-license` after reading the staged terms.

The official VoxRT browser WASM 0.1.1 binary supplies CPU/WebAssembly SIMD128
inference and is fetched directly from VoxRT's public deployment into ignored
local storage. VoxRT's Rust runtime source is Apache-2.0, but the demo-specific
browser binding is not separately licensed in the source tree. Do not commit,
mirror or publicly rehost that binary or its demo JavaScript. Its public URL and
SHA-256 are pinned; asset fetching fails if the bytes change. The WebGPU path
builds a separate hybrid WASM from the pinned Apache-2.0 Rust source and stages
it only in ignored local storage; its Rust toolchain, source commit, output size
and SHA-256 are pinned in `web/linnet/runtime-policy.mjs`. The hybrid binary is
distributed as a digest-versioned release with its upstream Apache `LICENSE`,
VoxRT `NOTICE`, and build-source/hash manifest. It dispatches eligible dense
operations to a non-fallback WebGPU adapter and keeps remaining operations
on WASM SIMD128/CPU. Only immutable `Mat::F32` model weights are cached; dynamic
attention K/V tensors are uploaded afresh for each dispatch. The build process does not rehost model weights or the
unlicensed demo binding. The benchmark adapter and safetensors memory conversion
are original project code; no model weights or voice files are committed.
Show both required notices with the documentation and any published sample:
**“Linnet model weights by VoxRT, licensed under the Linnet Weights License 1.0”**
and **“Powered by Linnet (VoxRT)”**.

Sources: [pinned model card and files](https://huggingface.co/VoxRT/linnet-en-35m/tree/a75fdfe50bc3d3e776b9c5040f149f49a054aaf5) ·
[Apache-2.0 CPU runtime source](https://github.com/VoxRT/LinnetTTS/tree/f3d3f68cbd8b7d07380d11c82bf75af06bc41281) ·
[Apache-2.0 hybrid runtime source](https://github.com/VoxRT/LinnetTTS/tree/29dfdd503a3930e4e36c1130e4c9aab0592201ca) ·
[official browser runtime and platform notes](https://www.voxrt.com/text-to-speech).

## SupraTTS 1.0 Preview browser ONNX

The pinned SupraTTS checkpoint and official MicroTTS runtime are MIT. The
benchmark's four FP32 ONNX graphs are a conversion of that checkpoint, with
conversion code and provenance recorded in the pinned release manifest. The
English G2P dictionary and OOV fallback assets are Apache-2.0 and retain their
upstream license and notice. The browser configuration uses ONNX Runtime Web
1.23.2 (MIT), Pyodide 0.29.3 (MPL-2.0), CPython 3.13.2 (PSF terms) and NumPy
2.2.5 (BSD-3-Clause and bundled notices); their pinned license files are staged
with the local assets. The benchmark uses the checkpoint's one fixed English
voice. The pinned card does not name a voice performer or grant separate output
rights. Keep model/runtime licenses separate from any rights in the voice or
recordings. [Pinned model card and license](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/README.md) · [Browser runtime and conversion notice](../web/supratts/NOTICE.md)
