# Bengali Voice browser adapter notice

This adapter pins the Apache-2.0 `Hansda/bengali-voice-compact` checkpoint at
`18c8afbee3a4cf230e175a5f618350ed2c9560ac` and the Apache-2.0
`DarvinX/multilingual-browser-tts` browser frontend at
`f2977727b8baccb989f80b492ea8da00124ecba3`. Asset digests, immutable source
URLs, and staged license texts are listed in the root `assets.lock.json`.

The worker preserves the Bengali branch of the publisher's browser worker:
`finished(normalize(romanizeInput(text, frontend.roman)))`, Bengali
phonemization, its trained G2P fallback, 512-entry pronunciation cache,
sentence/clause/word-halving planner with a 125-phone cap, and 24 kHz output.
It adapts only model loading and worker RPC, uses the exact ONNX Runtime Web
1.24.3 single-thread WASM provider, copies and validates each output, then
concatenates the source span without adding silence and applies the publisher's
0.99 peak limit. The browser adapter does not claim GPU support; tested
WebGPU/runtime combinations did not produce valid PCM, and automatic CPU
fallback is not presented as GPU execution.

The bundled `frontend.json.gz`, `g2p-encode.onnx.gz`, and `g2p-decode.onnx.gz`
are the publisher's generated demo assets. They derive from the pinned Bengali
phone vocabulary, trained phonemizer/pronunciation resources, and the pinned
Google Bengali lexicon and transcription guide. The upstream notice identifies
the Google language resources as CC BY 4.0; its complete license is retained in
`google-language-resources-LICENSE.txt`. The model card attributes training to
the Bengali Maya 2 Native Jahnavi 20-hour dataset, released under CC BY 4.0,
with public-domain Common Voice Bengali prompts. The pinned model Apache
license and ONNX Runtime Web MIT license are retained beside this notice.

Only the Jahnavi voice at index zero is bundled and selected. `bn` and `bn-Latn`
are separate fixture language tags that exercise native Bengali and Roman
Bengali input through the same Bengali synthesis language. This does not claim
English support or general multilingual-family coverage. The Roman edition has
known stock-converter spelling approximations and is not a pronunciation
quality review. No blanket license for generated recordings is inferred.
