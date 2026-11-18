# SupraTTS 1.0 Preview browser port

The benchmark uses the pinned [SupraLabs SupraTTS-1.0-Preview checkpoint and
MicroTTS runtime](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/tree/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c).
The model card identifies both as MIT and describes one fixed English voice.
It does not name the voice performer or grant separate rights in generated
recordings. The benchmark's original article is synthesized locally and is not
sent to an upstream service.

The benchmark exports four FP32 ONNX graphs from the pinned checkpoint. The
conversion script and pinned inputs are recorded in
[`tools/supratts-conversion.lock.json`](../../tools/supratts-conversion.lock.json);
graph hashes and source lineage are included in the
[`supratts-onnx-v1` release manifest](https://github.com/ngelik/tts-bench/releases/download/supratts-onnx-v1/conversion.json).
The graphs derive from the MIT checkpoint and are not separately licensed by
the root repository's code license.

The browser worker runs the pinned upstream dictionary-first G2P implementation
and NumPy OOV fallback data. The model card identifies the bundled English G2P
dictionaries and OOV data as Apache-2.0; their license and notice are staged
alongside the local asset cache. `web/supratts/fft.mjs` is original benchmark
glue implementing the checkpoint's centered Hann inverse STFT and DC blocker.

Runtime components and their separately staged notices:

- ONNX Runtime Web 1.23.2: MIT, with third-party notices.
- Pyodide 0.29.3: MPL-2.0.
- CPython 3.13.2: Python Software Foundation license.
- NumPy 2.2.5: BSD-3-Clause and bundled component notices.

No runtime weights, model assets or Python runtime files are committed here.
Inference assets are fetched from immutable, digest-verified sources listed in
[`assets.lock.json`](../../assets.lock.json). The two approved benchmark excerpts
are committed under `audio/samples/` and linked to their scored warm trial receipts
in [`audio/manifest.json`](../../audio/manifest.json).
