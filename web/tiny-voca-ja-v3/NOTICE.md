# Tiny Voca Japanese v3 F2

This profile targets the original FP32 ONNX graph from
[`gachimoto/tiny-voca-ja`](https://huggingface.co/gachimoto/tiny-voca-ja/tree/9b2305c81b9ca92ef8347eba473ea096c86f55c4)
(model revision `9b2305c81b9ca92ef8347eba473ea096c86f55c4`). Browser frontend
source is pinned to upstream commit
[`49632c552d54a13664c1beb96904bef0154fbfc3`](https://github.com/gachimoto-code/tiny-voca-ja/tree/49632c552d54a13664c1beb96904bef0154fbfc3).
Model and upstream source code are Apache-2.0; see `LICENSE`.

Japanese text uses the upstream `experiments/frontend-swap/oj_frontend.py`
with pyopenjtalk-plus 0.4.1.post10 `g2p_prosody`, voice index 0 (F2), and the
unaltered dictionary bytes bundled in the native/Pyodide package. The browser
uses the three pinned Japanese wheels and does not inject the separate
Tsukuyomi-chan dictionary overlay. The package's default optional Nani-prediction
path was unavailable in the native parity environment and is not included in the
browser; the package fallback was used for both the canonical fixture and its
`何` text. The independent 38-span Japanese oracle preserves its one `<unk>` at
source span 5.

English text uses the upstream `src/tiny_voca/text.py` parser, tokenizer,
normalizer and sentence/chunk rules. A small worker-local Python-to-JavaScript
callback supplies raw `en-us` phoneme traces from the pinned eSpeak NG 1.52.0
quiet binding. The generated ESM, WASM and data files are hash-pinned in
`assets.lock.json`; their build source remains under
`tools/tiny-voca-ja-v3-espeak/`. They reproduce the native CLI traces and
canonical 93-span / 266-utterance English token/stress oracle.

The released frontend fingerprint is `oj-en-1` /
`bca0b6c0ff471d257a723e3d903d115f3e79780bdba2685905c7eb20373a60ff`. This
profile implements the publicly released frontend source; it does not claim to
reproduce unavailable training annotation scripts.

pyopenjtalk-plus is MIT and includes separately licensed Open JTalk, MeCab,
NAIST dictionary and HTS Engine components. SudachiPy and SudachiDict-core are
Apache-2.0. eSpeak NG is GPL-3.0-or-later; see
`LICENSE-ESPEAK-NG-GPL-3.0.txt`. Pyodide is MPL-2.0. ONNX Runtime Web is MIT
with bundled third-party notices. No user recordings, training data, or
annotation datasets are included.
