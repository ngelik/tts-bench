# Tiny Ava Persian attribution

Powered by tiny-ava (Mehdi Allahyari / OncillaAI). The Parisa acoustic weights use CC BY 4.0. The browser code is adapted from Tiny Ava under Apache-2.0. The Apache license text accompanies the worker. [Model card and attribution](https://huggingface.co/mehdi-hf/tiny-ava/blob/cd2a2217ac31447763cbb500bdc2433973e6e4f4/README.md) · [Upstream browser worker](https://github.com/mallahyari/tiny-ava/blob/d4bd268a5386c60f15d1abb7e706df02b6ba4d32/demo/worker.js)

The pronunciation encoder and decoder are the ONNX exports bundled in the upstream demo. The Persian G2P model card identifies the pronunciation model as MIT-licensed. [Persian G2P model card](https://huggingface.co/mehdi-hf/persian-g2p-tiny/blob/596e9b915f2973ac476a32b4c8558c6544eb53db/README.md) · [Bundled pronunciation graphs](https://github.com/mallahyari/tiny-ava/tree/d4bd268a5386c60f15d1abb7e706df02b6ba4d32/demo/assets/g2p)

The adaptation loads locally pinned assets and uses a benchmark worker to return the generated PCM for each source span. It checks the Persian token and stress streams, retries overlong pronunciation clauses at word boundaries, and instruments the acoustic WebGPU probe. The pronunciation models run with one WASM thread. ONNX Runtime Web 1.20.1 uses the MIT license. [ONNX Runtime license](https://github.com/microsoft/onnxruntime/blob/v1.20.1/LICENSE)
