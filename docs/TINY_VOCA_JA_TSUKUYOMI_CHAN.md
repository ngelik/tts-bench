# Tiny Voca Japanese — Tsukuyomi-chan

This profile pins the P1 FP32 ONNX release
[`7ed75cc5f521cc6be4cb57689b2c038928259ae9`](https://huggingface.co/ayousanz/tiny-voca-ja-tsukuyomi-chan/tree/7ed75cc5f521cc6be4cb57689b2c038928259ae9)
and inference source commit
[`66ee00d2c8cd61b34be1cde5880bac0e45b89fcf`](https://github.com/ayutaz/tiny-voca/tree/66ee00d2c8cd61b34be1cde5880bac0e45b89fcf).
The benchmark selects synthetic voice `tsukuyomi` (index 0), Japanese `ja`, and
24 kHz mono output. It uses the complete original waveform and duration graphs
with their shared external weights. The model reports 4,589,131 stored FP32
parameter values in the waveform graph. Its released float64 phase is retained
and executes on CPU. The duration graph shares external weights but its
initializer values are not added a second time.

## Browser cache qualification

Warm and cached three-span Chrome CPU smokes passed. The cached smoke transferred
153,916,767 bytes from the local asset server during initialization. The offline
smoke is unsupported on the current runner/cache path: reopening the profile
while offline failed to fetch the pinned 76,937,301-byte
SudachiDict-core 20261015 wheel. The worker now uses hash-checked, cacheable
same-origin reads for pinned local assets, but this has not established offline
availability for that wheel.

## Frontend and runtime

The frontend uses pyopenjtalk-plus 0.4.1.post10, SudachiPy 0.7.0, and
SudachiDict-core 20261015 with the released Japanese symbol, three-channel
accent, phrase-boundary, NFC normalization, and `use_sudachi_kanji_yomi` rules.
The dictionary and dependency identity is checked against fingerprint
`1f2f2a3d433e12c8f0c3851b81d7efddf06e7f43f4e8ae3077d9eb9e7cc2deb1`. The
planner preserves the source sentence segmentation, the 500-token fitting
threshold, duration guard limit of 3,000 frames, punctuation-first recursive
splitting, and one-span peak normalization to 0.99.

Only CPU/WASM is supported for this original graph pair with ONNX Runtime Web
1.31.1. The graph retains a float64 phase that does not work with the repository's
older ORT runtime. Tests of the original graph with ORT 1.31.1 also failed
WebGPU provider assignment at `/Cast_9`; no converted graph or CPU substitution
is presented as a GPU result. Keep the model and frontend qualification separate
from timed inference; a Japanese full-fixture smoke is required before scoring.

## Rebuilding the WASM frontend

The browser frontend build uses the upstream PyPI source distributions for
pyopenjtalk-plus 0.4.1.post10 and SudachiPy 0.7.0, verified by SHA-256. It
applies the pointer-width correction and the two minimal Emscripten platform
cfg changes retained in [`tools/tiny-voca-ja/`](../tools/tiny-voca-ja/). The
fixed compiled Cargo lock only prunes unused platform/development entries from
the upstream lock and adds no crate versions. Build with CPython 3.14, Pyodide-
build 0.39.4, the Pyodide 314.0.8 xbuildenv, Emscripten 5.0.3, Rust 1.95.0,
`SOURCE_DATE_EPOCH=315532800`, CMake 4.4.5, Cython 3.3.1, setuptools 84.2.1,
and Maturin 1.16.0:

```sh
bash tools/build-tiny-voca-ja-wheels.sh
npm run assets -- fetch --model tiny-voca-ja-tsukuyomi-chan --accept-license
npm run assets -- verify --model tiny-voca-ja-tsukuyomi-chan --accept-license
```

The build script checks the final OpenJTalk and SudachiPy wheel hashes against
`assets.lock.json` and stages those two generated wheels at their pinned model
targets. The normal asset fetch then verifies those local generated files and
fetches the original graph, dictionary, runtime and license assets. To import
from an offline mirror instead, provide a complete mirror containing every
asset at its lockfile-relative target path. The SudachiDict-core wheel is the
unmodified PyPI 20261015 wheel. The five OpenJTalk dictionary text files are overlaid from the
publisher's hash-pinned `dictionary-assets.json` at runtime; all nine
dictionary files are checked through the exact frontend fingerprint.

## Voice credit and restrictions

This profile displays **Tsukuyomi-chan Corpus (CV Rei Yumesaki)** next to any
presented sample and labels the voice as non-official benchmark narration. The
corpus terms prohibit specified harmful uses and secondary use that lets others
reuse the voice through redistributed audio assets or another synthesis model.
The terms say generated-audio credit is optional, but require readable display
of model credit and output conditions when the model/software is distributed.
Do not use character artwork or imply affiliation; artwork and trademark have
separate terms. A model license is not a general grant to publish outputs. Full
details and separate source-code/frontend licenses are in
[`web/tiny-voca-ja-tsukuyomi-chan/NOTICE.md`](../web/tiny-voca-ja-tsukuyomi-chan/NOTICE.md).

Primary sources: [pinned model card](https://huggingface.co/ayousanz/tiny-voca-ja-tsukuyomi-chan/blob/7ed75cc5f521cc6be4cb57689b2c038928259ae9/README.md),
[Tsukuyomi-chan Corpus terms](https://tyc.rei-yumesaki.net/material/corpus/),
[pinned inference source](https://github.com/ayutaz/tiny-voca/tree/66ee00d2c8cd61b34be1cde5880bac0e45b89fcf).
