# Tiny Voca Italian browser profile

This profile uses the `v0.3.0` FP32 checkpoint at model revision
`280f40c307acf04138a5227b6cf9b1544e5886b4` and the official browser frontend
at `0c57fab284e58e0bad620f21790e631d5dec17f8`. The checkpoint is the released
Italian Tiny Voca model, not the separate Vocina model. The model JSON's 14
speaker embeddings are distinct from its two released web presets: Lorenzo
(`EM4`, index 12) and Chiara (`EF4`, index 13). The benchmark fixes Lorenzo.

`frontend.js` and `numbers.js` are the official pinned source files. The
`espeak-ng.js` and `espeak-ng.wasm` assets are unmodified files from npm
`espeak-ng` 1.0.2, built on eSpeak NG 1.52-dev. Their exact sizes and SHA-256
digests are in `assets.lock.json`. The bundled eSpeak NG license is copied at
`notices-espeak-ng-LICENSE.txt`.

ONNX Runtime Web is pinned to 1.20.1. Its MIT license text is included at
`notices-onnxruntime-web-LICENSE.txt`; the upstream runtime's bundled third-party
notices also apply. Runtime JavaScript and WebAssembly files are individually
hash-pinned as local model assets. No npm runtime dependency is added.

The adapter preserves the official Italian number expansion, punctuation
sentence split, recursive token fitting, and int64 token/stress/voice/emotion
feeds with float32 controls. It adds the benchmark worker/RPC integration and a
WebGPU provider route with explicit WASM fallback and an untimed dispatch probe.
The fixed profile is 24 kHz, speed 1, neutral emotion index 0, intensity 0,
pitch shift 0, and pitch range 1. A 250 ms pause is inserted between utterances
within each fixture source span.

The released graph contains unseeded `RandomNormalLike` operations. Exact PCM
hash equality is not expected; frontend token/stress parity, duration shape,
finite PCM, and backend evidence are checked independently. The official
frontend emits its unknown token for `h` in span 30 and `d` plus combining
dental mark in spans 57 and 79. The adapter retains these symbols and does not
rewrite the fixture. Their presence is a known frontend limitation, not a
pronunciation assessment.

Sources: [release v0.3.0](https://github.com/carbogninalberto/tiny-voca-it/releases/tag/v0.3.0),
[release source](https://github.com/carbogninalberto/tiny-voca-it/tree/280f40c307acf04138a5227b6cf9b1544e5886b4),
[model graph](https://raw.githubusercontent.com/carbogninalberto/tiny-voca-it/0c57fab284e58e0bad620f21790e631d5dec17f8/models/tiny-voca-it-preview-fp32.onnx),
[model metadata](https://raw.githubusercontent.com/carbogninalberto/tiny-voca-it/0c57fab284e58e0bad620f21790e631d5dec17f8/models/tiny-voca-it-preview-fp32.json),
[eSpeak browser assets](https://raw.githubusercontent.com/carbogninalberto/tiny-voca-it/0c57fab284e58e0bad620f21790e631d5dec17f8/espeak-ng/),
[browser worker](https://github.com/carbogninalberto/tiny-voca-it/blob/0c57fab284e58e0bad620f21790e631d5dec17f8/worker.js),
[Italian frontend](https://github.com/carbogninalberto/tiny-voca-it/blob/0c57fab284e58e0bad620f21790e631d5dec17f8/frontend.js),
[number expansion](https://github.com/carbogninalberto/tiny-voca-it/blob/0c57fab284e58e0bad620f21790e631d5dec17f8/numbers.js),
[eSpeak NG package](https://www.npmjs.com/package/espeak-ng),
[ONNX Runtime Web 1.20.1](https://www.npmjs.com/package/onnxruntime-web/v/1.20.1),
[ONNX Runtime Web third-party notices](https://github.com/microsoft/onnxruntime/blob/v1.20.1/ThirdPartyNotices.txt).
