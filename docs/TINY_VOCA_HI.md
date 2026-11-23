# Tiny Voca Hindi Rasa Q8_0

This profile pins `RL10x/tiny-voca-hindi` at release
`b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe`. The GGUF v3 checkpoint is
11,141,472 bytes, SHA-256
`649259b3bc566e978c7b37c4cb3ce5744b2dadfb9dbeaa61697096250e3fda39`.
The verified header contains 205 tensors and 9,711,883 tensor elements.
[Pinned model](https://huggingface.co/RL10x/tiny-voca-hindi/tree/b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe) ·
[Model card](https://huggingface.co/RL10x/tiny-voca-hindi/blob/b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe/README.md).

The browser profile uses one Rasa-trained female voice, Hindi (`hi-IN`),
24 kHz mono, speed 1, one CPU thread, and the neutral style at index zero.
The checkpoint exposes eight styles: `neutral`, `conv`, `happy`, `sad`,
`anger`, `fear`, `surprise`, and `disgust`. The benchmark fixes neutral as its
documented default. Its pitch limiter is 1.6. The model/runtime pair is CPU/WASM
only; WebGPU is reported unsupported.

## Frontend and generation

The adapter imports the pinned publisher `web/hindi_norm.js` after checking its
107,957-byte size and SHA-256
`8b24b24979289f5868b814becf80167b353ff3b412685558d3b19f99ca3a6af0`. For each
canonical fixture span it calls `globalThis.normalizeHi(text, { english: true })`
and changes danda (`।`) to period before sending the complete span to the
publisher C++ engine. The engine performs its stock sentence splitting and
recursive fit. One bridge call returns the full span PCM without inserting
sentence gaps. The engine uses seed zero for each source span and
increments it by sentence ordinal inside that span, then applies its stock
0.99 peak limit.

The released engine does not expose G2P token IDs through its C ABI. The
independent fixture audit checked 91 spans, 322 sentence plans, a maximum of
170 tokens, zero unknown tokens, zero skipped sentences, and 403 nasal tokens.
The English controls are not a separate supported route: the released
normalizer respells only some English words, and the C++ Hindi G2P drops
unmapped words. Use the Devanagari `hi-article-v1` fixture; its numbers and
identifiers are written as Hindi words or spoken letter names.

## Runtime, licensing, and assets

The browser runtime is locally built from the pinned ggml v0.29.0 commit
`57e2c2ca2a7cae756b1c4dfafa0cdfef9051d234` and the publisher's Apache-2.0 C++
engine. The checked Emscripten outputs are
`benchmark-hindi.mjs` (60,273 bytes, SHA-256
`05109d8eb42710f9ea39c81800c9cad48c049c86d59cb7c68aa85e7f25b411b5`) and
`benchmark-hindi.wasm` (1,077,517 bytes, SHA-256
`e53e68baeda877603bded3973ec7caa1398eb45f12c094e948e1622146fc1110`). They
are staged locally under
`runtimes/tiny-voca-hindi/ggml-0.29.0/`; generated binaries and model weights
stay in the ignored asset cache.

The released weights are CC BY 4.0. The publisher credits the CC BY 4.0
AI4Bharat Rasa dataset. Benchmark clips credit RL10x, AI4Bharat, and the browser
adaptation of the publisher's engine. The publisher's code and normalizer are
Apache-2.0, and ggml is MIT. See the
[pinned release notice](https://huggingface.co/RL10x/tiny-voca-hindi/blob/b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe/NOTICE),
[retained upstream notice](../tools/tiny-voca-hindi/NOTICE-UPSTREAM.txt),
[Apache-2.0 license](../tools/tiny-voca-hindi/LICENSE-APACHE-2.0.txt),
[ggml MIT license](../tools/tiny-voca-hindi/LICENSE-GGML-MIT.txt), and
[asset lock](../assets.lock.json).

```sh
bash tools/tiny-voca-hindi/build.sh
npm run assets -- fetch --model tiny-voca-hindi
npm run assets -- verify --model tiny-voca-hindi
npm run bench -- models --language hi
npm run bench -- run --model tiny-voca-hindi --backend cpu --fixture hi-article-v1 --smoke
npm run bench -- run --model tiny-voca-hindi --backend cpu --fixture hi-article-v1 --scenario warm --warm-protocol v2 --repetitions 3
```
