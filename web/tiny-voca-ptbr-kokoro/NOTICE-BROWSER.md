# Browser integration notices

The adjacent `NOTICE` and `LICENSE` are retained from the pinned Haple
checkpoint/source release. This browser integration ports its
`tiny_voca_ptbr/text.py`, `normalize_ptbr.py`, and `voice.py` behavior to
JavaScript and registers the checkpoint without changing the ONNX graph.

The browser loads eSpeak NG 1.51 as WebAssembly plus its data files. That
runtime is licensed separately under GPL-3.0-or-later. Its source commit,
archive digest, compiler versions,
generated artifact hashes, and COPYING file are recorded in `assets.lock.json`
and `docs/TINY_VOCA_PTBR_KOKORO.md`.

ONNX Runtime Web 1.31.1 is distributed under MIT and retains its third-party
notices in the pinned runtime asset set. The profile supports pt-BR only.
