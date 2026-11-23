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
| Apptor Tiny TTS Standard German model and G2P | Apache-2.0 at pinned revision `0b6962273a1d6618f250cdbd621b56ba04b62cef`; Vocos second-stage ONNX is separately MIT. The adapted neutral browser frontend is Apache-2.0, pinned to author source revision `e28eb444250b4d06162e6ba8e5090c4284345913`. ONNX Runtime Web is MIT with bundled third-party notices. This profile excludes Austrian weights and pronunciation data. See [`web/apptor-de/NOTICE.md`](../web/apptor-de/NOTICE.md). |
| Apptor Tiny TTS Austrian German model and G2P | Apache-2.0 at pinned revision `e28eb444250b4d06162e6ba8e5090c4284345913`; Vocos second-stage ONNX is separately MIT. The adapted Austrian browser frontend and pronunciation data are Apache-2.0 from the pinned author source; ONNX Runtime Web is MIT with bundled third-party notices. The model card describes synthetic F2/M2 speakers and an early-preview mild/inconsistent Austrian Standard German accent; the internal `AT` label is the accent style, not a third public voice. See [`web/apptor-at/NOTICE.md`](../web/apptor-at/NOTICE.md). |
| Supertonic 3 model and preset voice styles | OpenRAIL-M at the pinned revision; use-based restrictions apply. The licensor claims no rights in outputs except as stated in the license, and users remain responsible for outputs and their uses. Model/voice assets remain in the ignored cache. |
| Adapted official Supertonic browser helper | MIT, Supertone Inc.; retained license and exact source/change record in `web/supertonic/`. |
| Klein-TTS X1.5 Pro | Apache-2.0 model card and weights | The browser adapter is a disclosed port of the Apache-2.0 Node package. Misaki G2P/English dictionary and `phonemizer.js` are Apache-2.0; eSpeak NG is GPL-3.0-or-later; ONNX Runtime Web is MIT with third-party notices. See [`web/klein/NOTICE.md`](../web/klein/NOTICE.md). |
| Inflect Mini v3 browser-port checkpoint | Apache-2.0 at the pinned model-card revision. The separately named browser port uses FP32 ONNX conversion, the shared Inflect Micro v3 numeric/splitting helpers, Klein's Apache-2.0 contextual G2P/lexicon and browser phonemizer (including GPL-3.0-or-later eSpeak NG/data), plus ONNX Runtime Web MIT. The strict native waveform comparison remains failed and separate from score eligibility. See [`web/inflect-mini-v3/NOTICE.md`](../web/inflect-mini-v3/NOTICE.md). |
| ONNX Runtime Web | MIT, with third-party notices |
| Silencio-2 weights, converted ONNX graphs and model-bound voice-260 state | CC-BY-4.0 at the pinned model revision; retain BlueRose Labs, Kyutai Pocket TTS and Basis Global Emotions attribution. The fixed bundled synthetic voice is not a user-supplied voice-cloning input. Follow the model card's permission, anti-impersonation and synthetic-speech disclosure guidance. |
| Silencio-2 upstream inference source | MIT in `silencio2/core`; exporter attribution and source pins are in `tools/silencio2/NOTICE.md`. |
| ZONOS3-Mini model weights and the pinned Imogen default-voice files | Apache-2.0 as declared by the pinned Hugging Face model card; the benchmark stages Imogen reference codes and embedding for WebGPU, while CPU/WASM TTS uses only the same embedding. Unused preview audio is not staged. |
| ZONOS3-Mini official browser runtime | MIT at the pinned Zyphra source revision; source, unmodified upstream LICENSE/NOTICE and the documented voice-filter, disposal, dispatch-probe, EOS and streamed-error changes are retained in `web/zonos3/`. |
| ZONOS3-Mini CPU/WASM runtime | The audio.cpp browser build is separately versioned under Apache-2.0 with retained Zyphra/GGML MIT and other third-party notices staged with the locked runtime files; it does not inherit the model's Apache license. See [configuration and reproduction](ZONOS3_MINI.md). |
| Ukrainian Serhiy 0.58M distilled checkpoint and synthetic voice | GPL-3.0 at the pinned model revision. Its Apache-2.0 teacher and MIT corpus do not grant separate rights to the student checkpoint or outputs; the upstream notice says speaker-consent and dataset-rights review is not independently complete. The GPL license and upstream notice are retained in the asset lock. |
| Ukrainian Serhiy browser runtime | ONNX Runtime Web is MIT with bundled notices. eSpeak NG and dictionaries are GPL-3.0-or-later; the pinned Piper-samples eSpeak browser module has no separate license file in its pinned source tree and is fetched for local evaluation, not redistributed. The adapted stress frontend follows the checkpoint's GPL-3.0 source. See [conversion and source record](UA_SERHIY.md) and [frontend notice](../web/ua-serhiy-0p58m/NOTICE.md). |
| Mini Voz Spanish model and stock frontend | Apache-2.0 with the upstream license, contributor citation and attribution to Muhammed Nazeem's tiny-voca. The bundled eSpeak NG module and data retain GPL-3.0 terms and COPYING. ONNX Runtime Web 1.20.1 declares MIT, and the adapter records the npm package integrity. [Profile and notices](MINI_VOZ.md) · [Frontend notice](../web/mini-voz/NOTICE.md). |
| Tiny Voca Spanish model and stock frontend | Apache-2.0 model and frontend from Marcos (marcosmaceo), with attribution to Muhammed Nazeem's tiny-voca. The eSpeak NG 1.52.0 WASM and data retain GPL-3.0-or-later and COPYING. ONNX Runtime Web 1.22.0 declares MIT in the pinned npm package metadata and module headers. [Profile and notices](TINY_VOCA_ES.md) · [Source notice](../web/tiny-voca-es/NOTICE.md). |
| Tiny Voca French model and stock frontend | Apache-2.0 checkpoint and frontend from Daniel Suncost, with attribution to Muhammed Nazeem's tiny-voca. The eSpeak NG 1.0.2 browser package retains GPL-3.0-or-later and COPYING. CPU uses MIT ONNX Runtime Web 1.20.1; WebGPU uses the existing MIT 1.31.1 runtime alias and its bundled third-party notices. [Profile](TINY_VOCA_FR.md) · [Source notice](../web/tiny-voca-fr/NOTICE.md). |
| Tiny Swara Bengali INT8 checkpoint | Apache-2.0 checkpoint and ported frontend from Xeven7. eSpeak NG 1.52.0 plus bundled language data are GPL-3.0-or-later and built from the hash-pinned source archive. ONNX Runtime Web 1.31.1 is MIT with third-party notices. Training data is AI4Bharat Rasa under CC BY 4.0; the model card asks users to follow its terms when redistributing derived audio. No blanket recording rights are claimed. [Profile](TINY_SWARA.md) · [Source and build notice](../web/tiny-swara/NOTICE.md). |
| Tiny Voca Arabic M2 model and frontend | Apache-2.0 checkpoint and Python source with attribution to tiny-voca. The retained notice attributes the CC BY 4.0 ClArTTS transcript text and Arabic Speech Corpus teacher reference. It records the publisher’s unresolved clearance for client use. Pyodide 0.26.4 is MPL-2.0 with CPython PSF terms. ONNX Runtime Web 1.20.1 is MIT. [Profile](TINY_VOCA_AR.md) · [Notices](../web/tiny-voca-ar/NOTICE.md). |
| Tiny Voca Arabic Halabi F2 model and frontend | Apache-2.0 code and weights, with attribution to Muhammed Nazeem's tiny-voca. The release credits the CC BY 4.0 Halabi corpus and derivatives. Retain the thesis citation and extracted attribution asset. Pyodide 0.26.4 is MPL-2.0 with CPython PSF terms. ONNX Runtime Web 1.20.1 is MIT. [Profile](TINY_VOCA_AR_HALABI.md) · [Notices](../web/tiny-voca-ar-halabi/NOTICE.md). |
| Tiny Voca Hebrew AH | Tiny Voca code is Apache-2.0. The acoustic weights use CC BY 4.0 and require credit to Idan Buzaglo and ivrit.ai when generated audio is shared. The RenikudPlus INT8 graph is Apache-2.0 and its pinned 0.6.0 code is MIT. HebrewNum2Words is Apache-2.0. [Profile](TINY_VOCA_HE.md) · [Retained notices](../web/tiny-voca-he/NOTICE.md). |
| Tiny Voca Hindi Rasa Q8_0 | CC BY 4.0 checkpoint weights trained on AI4Bharat Rasa, also CC BY 4.0. Benchmark clips credit the publisher, dataset, and browser adaptation. Publisher frontend is Apache-2.0; ggml is MIT. [Profile](TINY_VOCA_HI.md) · [Retained notice](../tools/tiny-voca-hindi/NOTICE-UPSTREAM.txt). |
| Oddadmix Tiny Voca Arabic and CATT frontend | Apache-2.0 for the released speech checkpoint and current CATT v2 distribution. The notices preserve Abjad AI’s license history and the CATT utility’s BSD notice. NumPy 1.26.4 is BSD-3-Clause. Pyodide 0.26.4 uses MPL-2.0 and CPython PSF terms. ONNX Runtime Web 1.20.1 is MIT. [Profile](TINY_VOCA_ARABIC.md) · [Notices and licenses](../web/tiny-voca-arabic/NOTICE.md). |
| Tiny Voca Brazilian Portuguese checkpoint | CC BY 4.0; credit “tiny-voca-ptbr, by SemFence (Gustavo Toledo)” and indicate model changes. The Tiny Voca inference code and pinned Dizione browser source are Apache-2.0 with separate retained notices and attribution to Muhammed Nazeem. The Dizione lexicon and vowel table are derived from the Portuguese (Brazil) MFA dictionary under CC BY 4.0; see the retained dictionary notice. ONNX Runtime Web 1.22.0 is MIT and its exact browser bundle is URL-backed and hash-pinned. Generated recordings have no blanket redistribution grant. [Profile](TINY_VOCA_PTBR.md) · [Retained notices](../web/tiny-voca-ptbr/NOTICE.md). |
| Tiny Voca Brazilian Portuguese Kokoro checkpoint | Apache-2.0 Haple checkpoint and code, with attribution to Muhammed Nazeem's tiny-voca; trained on Kokoro-82M synthetic teacher speech. The browser's pinned eSpeak NG 1.51 WebAssembly runtime/data are a separate GPL-3.0-or-later component with retained COPYING and a source-pinned build. ONNX Runtime Web 1.31.1 is MIT with third-party notices. Generated recordings have no blanket redistribution grant. [Profile](TINY_VOCA_PTBR_KOKORO.md) · [Retained Apache notice](../web/tiny-voca-ptbr-kokoro/NOTICE) · [eSpeak COPYING](../web/licenses/ESPEAK-NG-COPYING-TINY-VOCA-PTBR-KOKORO.txt). |
| Alpa Spanish checkpoint and frontend | Apache-2.0 code and weights from Francisco Carlos Erra, with attribution to Alpa and Muhammed Nazeem's tiny-voca. The checkpoint was trained on OpenSLR 61 Argentinian Spanish recordings (CC BY-SA 4.0). The model card asks users to check how the corpus's share-alike terms apply to the weights. ONNX Runtime Web 1.31.1 is MIT with bundled notices. [Profile and export](ALPA_ES.md) · [Retained license and notices](../web/alpa-es/NOTICE.md). |
| Zerre TTS Turkish model/code | Apache-2.0; the original license and NOTICE are retained in `web/zerre-tts/`. ONNX Runtime Web 1.20.1 is MIT with bundled third-party notices. The source uploader labels its two audiobook corpora MIT, while the publisher says recording copyright and personality rights were not independently verified. This does not establish a blanket generated-audio grant. See [profile and source caveats](ZERRE_TTS.md). |
| Tiny Voca Japanese v3 F2 | Apache-2.0 model and public frontend source at pinned revisions. Japanese uses pyopenjtalk-plus MIT with its bundled Open JTalk, MeCab, NAIST dictionary and HTS notices, plus Apache-2.0 SudachiPy/SudachiDict-core. English uses a pinned eSpeak NG GPL-3.0-or-later 1.52.0 Emscripten binding and data. Pyodide is MPL-2.0; ONNX Runtime Web is MIT with third-party notices. The released `oj-en-1` fingerprint is disclosed, while unavailable training annotation scripts are not claimed to be reproduced. See [profile and notices](TINY_VOCA_JA_V3.md). |
| Tiny Voca Japanese Tsukuyomi-chan P1 | Model use follows the Tsukuyomi-chan Corpus conditions incorporated by the pinned model-card license, including restrictions on harmful uses and secondary use that enables reuse through audio assets or another synthesis model. The terms make generated-audio credit optional but require readable model credit and output conditions when the model/software is distributed. This benchmark profile displays “Tsukuyomi-chan Corpus (CV Rei Yumesaki)” with samples and labels narration as non-official. Inference source is separately Apache-2.0. Pyodide, pyopenjtalk-plus, Open JTalk/MeCab/NAIST dictionary/HTS components, SudachiPy, SudachiDict-core, and ONNX Runtime Web retain separate terms. See [profile and notices](TINY_VOCA_JA_TSUKUYOMI_CHAN.md). |

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

The separate **heart-nano Kokopop F32** profile derives a GGUF from the exact
heartnano Q8 front/decoder files at the pinned Ampixa revision using the pinned
MIT Kokopop converter. Ampixa's repository is GPL-3.0-or-later; the heartnano
metadata does not declare separate voice-package terms, so the weights are not
described as MIT-only. Kokopop, GGML and yyjson retain MIT notices; the bundled
eSpeak NG implementation and English data retain GPL-3.0-or-later. The locked
license sidecars accompany the generated artifact in the ignored asset cache.
The WebGPU path is a distinct F32 conversion profile, not the official int8
browser implementation. See [source/build provenance and configuration](SANO_HEART_NANO.md).

Inflect Micro v2's [official package](https://huggingface.co/owensong/Inflect-Micro-v2-ONNX/tree/91b1ab6432323064ec0e8e9704d92fcecd24855f)
is Apache-2.0; the VITS/Tacotron-derived symbol inventory retains its MIT notice.
The browser frontend port retains notices under `web/inflect/`. The fixed voice
is described upstream as synthetic, with no reference recording required.
The model's private training recipe/data are not fully released; open model
weights do not imply an open training corpus. Weights remain in ignored cache.

Inflect Micro v3 grants Apache-2.0 for the exact Inflect-owned weight file
identified by its pinned `LICENSE_SCOPE.json`; third-party and voice/recording
terms are separate. Its pinned notice lists Kokoro under Apache-2.0 and
StyleTTS2 under MIT, and the matching license texts are retained with the
registration. The browser G2P uses Klein 0.2.0 (Apache-2.0) and the pinned
English lexicon, `phonemizer.js` (Apache-2.0) and bundled eSpeak NG data/code
(GPL-3.0-or-later). ONNX Runtime Web is MIT; its third-party notices apply.
Only Cassidy is exported from the six-voice English checkpoint. See the
[Micro v3 source notice](../web/inflect-micro-v3/NOTICE.md) and
[configuration](INFLECT_MICRO_V3.md).

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

### Tiny Voca DE/EN (Voca64)

The pinned model code and weights declare Apache-2.0; its training data card
declares CC BY 4.0. The German MFA dictionary requires CC BY 4.0 attribution.
The browser frontend also carries Phony MIT, nrmlz Apache-2.0, QuickJS MIT,
Dizione and separate CMUdict/homograph-data notices. ONNX Runtime Web is MIT
with bundled third-party notices. Model terms do not grant a separate license
for generated audio. The official Space's frontend notice says English
production phonemization is not enabled, while its pinned worker exposes an
English route; the benchmark records that conflict and requires parity checks.
[Pinned model terms](https://huggingface.co/Fraunhofer-IEM/tiny-voca-de-en/blob/57fe34dfc061e6cc58e27d186bf7ba16d82d2def/README.md) · [Browser and component notices](../web/voca64/NOTICE.md)

### Tiny Voca Italian

The pinned model code and FP32 weights declare Apache-2.0. The CML-TTS Italian training data declares CC BY 4.0. The released voices are synthetic, designed with Qwen3-TTS; upstream asks users to label generated audio synthetic. No separate voice-output or blanket generated-audio redistribution grant was found. The browser uses eSpeak NG 1.0.2 under GPL-3.0-or-later; the bundled browser glue and WASM are unmodified and its license is included under `web/tiny-voca-it/`. ONNX Runtime Web 1.20.1 is MIT; its license text is included, and [upstream third-party notices](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt) apply. The pinned Italian frontend/number-expansion source is Apache-2.0. [Pinned release and terms](https://github.com/carbogninalberto/tiny-voca-it/releases/tag/v0.3.0) · [Pinned license](https://github.com/carbogninalberto/tiny-voca-it/blob/280f40c307acf04138a5227b6cf9b1544e5886b4/LICENSE) · [CML-TTS dataset card](https://github.com/carbogninalberto/tiny-voca-it/blob/280f40c307acf04138a5227b6cf9b1544e5886b4/README.md) · [Runtime and frontend notice](../web/tiny-voca-it/NOTICE.md)

### Zerre TTS Turkish

The pinned model weights and adapted tiny-voca code declare Apache-2.0; the full upstream `LICENSE` and `NOTICE` are retained in `web/zerre-tts/`. ONNX Runtime Web 1.20.1 is MIT and its matching license is staged with the local runtime assets; the upstream [v1.20.1 third-party notices](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt) apply. The publisher says the two audiobook corpora are labeled MIT by their uploaders, but it has not independently verified copyright or personality rights in those source recordings. The released voices use neutral SES-A/SES-B labels, without a speaker identity claim. No separate blanket generated-audio grant was identified. Do not redistribute original training recordings. [Pinned source and terms](https://github.com/erkinemreta1/zerre-tts/tree/cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4) · [HF model snapshot](https://huggingface.co/erkint/zerre-tts/tree/55753a04ae624998cba86f7c17625616e318124e) · [data-source caveat](https://github.com/erkinemreta1/zerre-tts/blob/cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4/docs/data_sources.md) · [adapter notice](../web/zerre-tts/NOTICE.md)

### Vocina Italian v1.0

This is a distinct model from Tiny Voca Italian. The pinned [OfficinePixel/vocina source](https://github.com/OfficinePixel/vocina/tree/8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34) and [v1.0 release](https://github.com/OfficinePixel/vocina/releases/tag/v1.0) provide the INT8 and FP32 checkpoints under Apache-2.0. The benchmark pins only the v1.0 dynamic-MatMul INT8 release graph by SHA-256; it selects released synthetic voice I1 (Femminile). The upstream notice says both released voices were designed with Qwen3-TTS and are not real-person clones. Common Voice Italian text is CC0; the source also includes self-written sentences. The G2P pronunciation lexicon is derived from Wiktionary and remains CC BY-SA 4.0; attribute Wiktionary contributors and preserve share-alike terms for that file. ONNX Runtime Web 1.27.0 is MIT and its exact license is staged with the runtime files. The benchmark adapter preserves Vocina's Italian frontend and model algorithm while moving inference into the benchmark worker and removing the frontend's zero-delay UI-yield between pieces. The original license and attribution notice accompany the adapted source. Benchmark clips identify the released synthetic voice and source graph. [Upstream NOTICE](../web/vocina/UPSTREAM-NOTICE) · [Adapter notice](../web/vocina/NOTICE.md)

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

## Official Sano Robot/MCU and Trellis

Both registrations pin the browser assets in [Ampixa/sanoTTS c0584a5](https://github.com/Ampixa/sanoTTS/tree/c0584a51213721faba98135821faab71bae888f0). Their weight directories have no separate adjacent licensing grant, so the manifest retains the containing repository's **GPL-3.0-or-later** terms; it does not infer distilled-weight rights from a teacher's license. G2P, the Trellis runtime/frontend and demo-derived helper follow GPL-3.0-or-later. The upstream `LICENSE.MIT` explicitly covers the Robot core/reference kernels/browser shim, but not the whole browser pipeline or Trellis files. Fetching requires acknowledgment. [Exact scope and modifications](../web/sano/robot-trellis-NOTICE.md). Upstream binaries and weights are fetched into ignored storage, not committed as benchmark source.

## Inflect Atom v3

The [pinned current license grant](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/LICENSE.md) covers owner-controlled Atom code and weights under **Apache-2.0** and explicitly supersedes older evaluation/noncommercial wording retained in historical notices. Third-party terms and voice/data provenance remain separate. The local eSpeak NG engine and ported phonemizer punctuation layer use **GPL-3.0-or-later**; Misaki uses Apache-2.0. ONNX Runtime's MIT/bundled notices and Emscripten's runtime notices are included in the asset lock. Asset fetching requires acknowledgment. [Exact source and notice inventory](../web/inflect-atom/NOTICE.md) · [Compiled runtime distribution](https://github.com/ngelik/tts-bench/releases/tag/inflect-atom-v3-browser-v1).

## Additional Kokopop Sano voice-size profiles

`sano-heart-gguf`, `sano-amy-gguf`, `sano-amy-small-gguf`, `sano-amy-1p8m-gguf`, `sano-hfc-gguf` and `sano-kristin-gguf` use individual voice packages from [ampixa/sanoTTS at the immutable model revision](https://huggingface.co/ampixa/sanoTTS/tree/25410576d005d7f08d186990fd91f6a2651243de). Retain the GPL-3.0-tagged source distribution and its teacher/data provenance; the selected package manifests do not declare separate model license grants. The [pinned Kokopop converter/runtime](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88), GGML and yyjson are MIT; bundled eSpeak NG and English data are GPL-3.0-or-later. These are distinct from official Ampixa WASM profiles. Local build/import requires terms acknowledgement; generated model/runtime files are not publicly redistributed. See [scope and reproduction](SANO_KOKOPOP_SIZES.md) and [notice](../web/sano-kokopop/SIZE-PROFILES-NOTICE.txt).

### Kale TTS 1 Nano

KaleComputer releases the weights, synthetic presets, and browser frontend under Apache-2.0. The training dataset is CC BY 4.0. The asset lock retains the model license, Dizione license, and third-party notices for the front end and training ancestry. The upstream notices call for following Maya-1's use policy and identifying generated speech as synthetic. ONNX Runtime Web is MIT with bundled notices. [Pinned model terms](https://huggingface.co/KaleComputer/kale-tts-1-nano/blob/b6ce1887268c3667994fc3b0b2c82887c069915c/README.md#licence-and-credits) · [Third-party notices](https://huggingface.co/KaleComputer/kale-tts-1-nano/blob/b6ce1887268c3667994fc3b0b2c82887c069915c/THIRD_PARTY_NOTICES.md).

### Clarvia TTS Tiny

The pinned Turkish model and `clarvia-phonemizer` source declare Apache-2.0. Pyodide 314.0.8 is MPL-2.0 and embeds CPython 3.14.2 (PSF terms); ONNX Runtime Web 1.20.1 is MIT with upstream third-party notices. The selected `female_1` voice is described as synthetic. The model card's data summaries are publisher claims, not an independent dataset audit. It requests disclosure of generated speech and prohibits impersonation. Code/model licensing does not establish separate blanket rights to publish recordings. [Pinned model terms](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/README.md) · [Browser profile and notices](../web/clarvia-tts-tiny/NOTICE.md) · [ONNX Runtime third-party notices](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt).

## Korean TTS (KSS and Dizione F2)

The single pinned step-160000 FP32 graph contains KSS, F2, and M2 voices. The
published KSS terms identify CC BY-NC-SA 4.0 for the KSS corpus and state that
the Korean voice and shared model weights inherit its noncommercial condition.
That condition applies to F2 English as well because both voices are in the
same graph. Asset retrieval therefore requires `--accept-license`; that flag is
an acknowledgment for local noncommercial research use, not a commercial grant.
No blanket license for generated recordings is inferred.

The benchmark selects KSS index 0 with the `ko-loan` frontend for Korean and
Dizione F2 index 1 with `own` mode for English. M2 is retained in the source
graph but is not a benchmark profile. Code and runtime terms remain separate:
Tiny Voca/Dizione source is Apache-2.0, ONNX Runtime Web is MIT, Pyodide is
MPL-2.0, Python uses PSF terms, and NumPy uses BSD terms. NLTK and its
transitive package data retain their own notices. The asset lock pins the exact
model/frontend inputs and the six ORT runtime files; local staged copies remain
ignored. [Pinned final report](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/FINAL_REPORT_v2.md) ·
[KSS corpus card](https://huggingface.co/datasets/Bingsu/KSS_Dataset) ·
[CC BY-NC-SA 4.0 terms](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode) ·
[Dizione F2 source](https://huggingface.co/n4ze3m/tiny-voca/tree/a46fbe0c8514cb32f5e80be987e6c96ef0540f8d).

## Słyszę Głosy V1

The V1 graph weights and its synthetic voice data are CC BY-NC 4.0 and require
local noncommercial license acknowledgment. The upstream Python/frontend code
is Apache-2.0. The benchmark selects bundled synthetic voice F only; the M voice
and separate V2 model are not registered. The adapter preserves exact upstream
Polish text normalization, segmentation and fit policy. No blanket output or
recording redistribution rights are inferred. See the
[Słyszę Głosy source and change notice](../web/slyszeglosy-v1/NOTICE.md).

### Tiny Voca Russian

The pinned `egnch/tiny-voca-ru` model card declares Apache-2.0 for the model and
code. The browser Space bundles a Russian stress dictionary plus OOV accent and
contextual homograph assets derived from `ruaccent` under MIT. The synthetic
voices are described upstream as non-imitations of real people. The adapter
retains the upstream Apache `LICENSE`/`NOTICE` and ruaccent MIT notice beside
the port. The profile selects synthetic voice M (index 1); it does not publish
recordings. See [the pinned profile and sources](TINY_VOCA_RU.md) and
[adapter notices](../web/tiny-voca-ru/NOTICE.md).

### Tiny Voca Greek

The Greek model and inference source are pinned to `927ea15cf4edcb8695b75328c9c90c5c53928554`. Base Tiny Voca source is pinned to `62e2adef158bc997042cc6234f541f1e0e4cd55d`. CC BY 4.0 covers the released weights and upstream sample WAVs. Apache-2.0 covers the inference source. The benchmark uses a local FP32 ONNX export of the PyTorch checkpoint. The model card asks users to credit Konstantinos Perifanos, link the model page, cite STOMA and indicate modifications. STOMA is CC BY 4.0, with separate original terms for third-party material such as the CGL Text Bank.

The Greek phonemizer is built from eSpeak NG 1.51 at `2e9a5fccbb0095e87b2769e9249ea1f821918ecd` under GPL-3.0-or-later. ONNX Runtime Web 1.31.1 is MIT with bundled third-party notices. The asset lock pins each generated file and the associated license texts. See [profile and scope](TINY_VOCA_GR.md) and [notices](../web/tiny-voca-gr/NOTICE.md).

### Tiny Broca

The pinned Tiny Broca checkpoint and upstream Python frontend declare Apache-2.0. The worker uses Pyodide 0.26.4 (MPL-2.0; CPython PSF terms) and ONNX Runtime Web 1.20.1 (MIT); their license texts are staged in the model asset lock. The 1.20.1 npm tarball does not contain a standalone third-party-notice bundle, so this entry does not claim that a newer ONNX Runtime notice file applies. See [Tiny Broca profile](TINY_BROCA.md) and [adapter notices](../web/tiny-broca/NOTICE.md).

### Tiny Voca Arabic M2

The pinned checkpoint and frontend declare Apache-2.0. The retained notice
attributes the ClArTTS transcript text and Arabic Speech Corpus teacher
reference under CC BY 4.0. The publisher states that clearance for client use
of the reference voice remains unresolved. Pyodide 0.26.4 retains MPL-2.0 and
CPython PSF terms. ONNX Runtime Web 1.20.1 declares MIT.
[Profile](TINY_VOCA_AR.md) · [Retained notices](../web/tiny-voca-ar/NOTICE.md)

### Tiny Voca Arabic Halabi

The release-tagged F2 checkpoint and Arabic frontend declare Apache-2.0. The
publisher cites the CC BY 4.0 Arabic Speech Corpus license as its basis for
using the training data and states that it holds no separate written consent.
Retain Nawar Halabi’s 2016 thesis citation and the attribution file from the
release. Pyodide 0.26.4 retains MPL-2.0 and CPython PSF terms. ONNX Runtime Web
1.20.1 declares MIT.
[Profile and sources](TINY_VOCA_AR_HALABI.md) · [Retained notices](../web/tiny-voca-ar-halabi/NOTICE.md)

### Oddadmix Tiny Voca Arabic

The pinned speech checkpoint and frontend declare Apache-2.0. The CATT v2
archive comes from Abjad AI. The original tag retains its historical license
text. Abjad AI’s later announcement documents the move to Apache-2.0 and the
current repository points to the same v2 checkpoints. The CATT tokenizer and
Buckwalter code preserve their notices, including the BSD notice in the utility
source.

The runtime uses NumPy 1.26.4 under BSD-3-Clause, Pyodide 0.26.4 under MPL-2.0,
CPython 3.12 under PSF terms and ONNX Runtime Web 1.20.1 under MIT. The publisher
asks that generated speech be identified to listeners.
[Profile](TINY_VOCA_ARABIC.md) · [Release notice](../web/tiny-voca-arabic/NOTICE.md) · [Abjad AI license update](https://github.com/abjadai/catt/blob/8d5330499feb85f6625e6af632141ed2ed6065fd/README.md#license-change-cc-by-nc-to-apache-20)

### Bengali Voice Compact (Jahnavi)

The pinned compact checkpoint and browser frontend declare Apache-2.0. The
profile selects only the deployed Jahnavi voice at index zero. The trained
Bengali Maya 2 Native Jahnavi dataset is released under CC BY 4.0 and uses
public-domain Common Voice Bengali prompts. The bundled generated Bengali
frontend/G2P assets incorporate Google's Bengali lexicon and transcription
guide under CC BY 4.0; preserve their attribution and retained license. ONNX
Runtime Web 1.24.3 is MIT. The browser model and runtime assets remain in the
ignored cache; benchmark code does not relicense the checkpoint or generated
recordings. No blanket generated-audio redistribution grant is inferred.
[Profile and sources](BENGALI_VOICE.md) · [Retained notices](../web/bengali-voice/NOTICE.md) ·
[Pinned model](https://huggingface.co/Hansda/bengali-voice-compact/tree/18c8afbee3a4cf230e175a5f618350ed2c9560ac) ·
[Pinned browser source](https://github.com/DarvinX/multilingual-browser-tts/tree/f2977727b8baccb989f80b492ea8da00124ecba3) ·
[Dataset terms](https://huggingface.co/datasets/Hansda/bengali-maya2-jahnavi-20h)
