# Tiny Voca Japanese — Tsukuyomi-chan

This adapter targets the P1 FP32 ONNX release of
[`ayousanz/tiny-voca-ja-tsukuyomi-chan`](https://huggingface.co/ayousanz/tiny-voca-ja-tsukuyomi-chan/tree/7ed75cc5f521cc6be4cb57689b2c038928259ae9)
at model revision `7ed75cc5f521cc6be4cb57689b2c038928259ae9`. Its adapted browser
integration follows upstream inference source commit
[`66ee00d2c8cd61b34be1cde5880bac0e45b89fcf`](https://github.com/ayutaz/tiny-voca/tree/66ee00d2c8cd61b34be1cde5880bac0e45b89fcf).
The model metadata and all graph/external-data bytes are size- and SHA-256-pinned
in `assets.lock.json`.

The two Python frontend files in this directory are from that pinned upstream
source. The browser worker uses the same pyopenjtalk-plus phone/accent/boundary
mapping and Japanese punctuation, sentence and recursive-fit rules. The Pyodide
OpenJTalk build changes its morphological pointer array to `uintptr_t` for
wasm32; the SudachiPy build adds the Emscripten platform cfg and 32-bit hash
seed. These targeted source/build changes are recorded under
`tools/tiny-voca-ja/` and in the profile guide. They preserve upstream
segmentation, dictionary lookup, label parsing and tokenization. Original model
graphs and inference precision are retained. Benchmark-specific browser changes
mount the shared external ONNX tensor in both sessions, run the separate
duration graph before waveform inference, and constrain the run to the
single-thread CPU/WASM runtime.

## Voice and usage terms

The selected synthetic voice is **Tsukuyomi-chan (つくよみちゃん)**, voice index
0, at 24 kHz. This profile displays **“Tsukuyomi-chan Corpus (CV Rei Yumesaki)”**
with presented samples and labels them non-official benchmark narration.
Official terms say generated-audio credit is optional, while requiring readable
display of credit and use conditions when distributing the model/software. Do
not imply affiliation or use character artwork or trademarks without the
separate character license. Corpus terms prohibit using output to attack or
criticize a person, advocate for or against a political/religious/ideological
position, publish explicit/shocking content without appropriate zoning, or
allow secondary use that lets others reuse the voice as an audio asset or
synthesis model. Read the complete [`LICENSE-CORPUS.txt`](LICENSE-CORPUS.txt) and
[`LICENSE-CODE.txt`](LICENSE-CODE.txt) before using the model. The Apache-2.0
inference-code license does not replace these model/output terms.

ONNX Runtime Web is MIT with its bundled third-party notices. Pyodide is
MPL-2.0. pyopenjtalk-plus is MIT; its bundled Open JTalk, MeCab, NAIST
dictionary and HTS engine components keep their separate notices in this
directory. SudachiPy and SudachiDict-core are Apache-2.0. See each adjacent
license file and the pinned runtime/dependency records before redistribution.

No model weights, browser runtime, dictionary binaries, or generated audio are
included in this source directory.
