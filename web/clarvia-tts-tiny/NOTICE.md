# Clarvia TTS Tiny browser profile

This profile uses `wite-tech/clarvia-tts-tiny` at model revision
`51023684a0a39742455c838e9d1d8714d3ae7289` and its declared
`wite-tech/clarvia-phonemizer` frontend at revision
`bf1b1aab40e24ca3f6700980427c386f4f171f6f`. Both declare Apache-2.0. The
model's exact Apache-2.0 license is retained at `notices-apache-2.0.txt` beside
this adapted planner. The frontend's Python source and three text tables are loaded from hash-pinned local
model assets into Pyodide's virtual filesystem; no package installation or
subprocess is used.

The incremental planner preserves the upstream `speak.py` sentence splitting,
punctuation completion, 500-token limit, comma/semicolon/colon splitting,
word midpoint fallback, and signs-only handling. It yields one plan at a time
so timed synthesis does not precompute the remainder of a source span. No pause
is added between the resulting utterances. The worker uses the public synthetic
`female_1` voice (index 2), 24 kHz output, speed 1, pitch shift 0 and pitch range
1. It reduces a source span's peak to 0.99 only when the upstream threshold is
exceeded. The ONNX graph has unseeded random noise, so PCM hashes are not an
identity oracle.

Pyodide 314.0.8 is MPL-2.0 and embeds CPython 3.14.2 (PSF license). ONNX Runtime
Web 1.20.1 is MIT; its upstream `ThirdPartyNotices.txt` applies. The exact runtime
bytes and Pyodide distribution files are hash-pinned in `assets.lock.json`.
Neither code licenses nor the model's synthetic-voice description grant a
separate blanket right to publish generated recordings. The upstream model asks
users to disclose AI-generated audio and not impersonate people.

The smoke-only frontend audit is bound to `tr-article-v1` source hash
`95e1958fe7385da7aa79d54c30230518e8be360848f2c824ce7639414ce8f3d3`; 94 spans
produce 304 plans, a maximum of 230 tokens, zero unknown symbols, and ordered
token/stress digest `d2f501f0fc31ebe553c7c605f4ea36fb5b4a05e0a635108743c9e5dde13559db`.
This is implementation parity evidence, not a pronunciation or quality review.

Sources: [pinned model card](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/README.md),
[pinned config](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/config.json),
[pinned frontend](https://huggingface.co/wite-tech/clarvia-phonemizer/tree/bf1b1aab40e24ca3f6700980427c386f4f171f6f),
[upstream speak.py](https://huggingface.co/wite-tech/clarvia-tts-tiny/blob/51023684a0a39742455c838e9d1d8714d3ae7289/speak.py),
[Pyodide license](https://github.com/pyodide/pyodide/blob/314.0.8/LICENSE),
[CPython license](https://github.com/python/cpython/blob/v3.14.2/LICENSE),
[ONNX Runtime Web third-party notices](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt).
