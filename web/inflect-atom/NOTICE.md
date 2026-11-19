Inflect Atom v3 core and DSP: Apache-2.0, owensong. Pinned source:
https://huggingface.co/owensong/Inflect-Atom-v3/tree/6d517b3580e0167556148770760bbbb6a8870b99

The source-controlled browser adapter and DSP port are Apache-2.0. The explicit eSpeak binding and phonemizer punctuation port are GPL-3.0-or-later; the GPL source is available in this repository's `tools/inflect-atom`, `web/inflect-atom/frontend.mjs` and the pinned upstream below. Frontend conversion also follows Apache-2.0 Misaki 0.9.4. Applicable notices are retained under `notices/`, in staged runtime assets and with the compiled distribution.

Phonemizer punctuation: Copyright 2015–2021 Mathieu Bernard, GPL-3.0-or-later. Exact implementation comes from phonemizer-fork 3.3.2's PyPI wheel.

Misaki: https://pypi.org/project/misaki/0.9.4/ (Apache-2.0).

eSpeak NG: https://github.com/espeak-ng/espeak-ng/tree/4870adfa25b1a32b4361592f1be8a40337c58d6c (GPL-3.0-or-later). The seven English/shared data files are exact copies from espeakng-loader 0.2.4, verified by the official Atom frontend. `build-wasm.sh` provides the pinned build and binding source, including the Emscripten system-header include-order compatibility fix. No engine behavior or pronunciation table is edited.

Emscripten 3.1.74: MIT/University of Illinois-NCSA and bundled LLVM/runtime components; `emscripten-LICENSE` is distributed with the WASM files. ONNX Runtime Web: MIT with its full pinned bundled third-party notices.

The deterministic browser noise generator differs from PyTorch's random stream. Its seed, generator and supplied-noise numerical parity are disclosed in the model documentation. No remote inference or text/audio upload is used.
