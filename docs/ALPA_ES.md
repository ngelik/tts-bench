# Alpa-es browser profile

Francisco Carlos Erra's `alpa-es` has 4,529,035 parameters and fixed female
and male Rioplatense Spanish voices trained on OpenSLR 61 recordings. The
benchmark uses female (index 0), 24 kHz mono, a hop of 256 samples, speed 1,
neutral pitch and the released default Polish settings. The adapter supports
`es-AR`. [Pinned checkpoint](https://huggingface.co/FranciscoCarlosErra/alpa-es/tree/de2bf894bdd9eb768ae03fc6b385176a0ff505d1) ·
[OpenSLR 61](https://www.openslr.org/61/).

## Frontend and workload

The JavaScript frontend ports the released `alpa/text.py`. Its source hash is
`16957f0ba5e2b8ed9fcbc364b2d8b0d85f5df554ea52cb0cc9467488a84fdc95`.
It preserves the phonemes, vowel weights and unknown groups of the native
frontend. The smoke audit checks all 104 spans of `es-ar-article-v1`, with a
maximum of 218 tokens and 63 groups of digits across 34 spans.

The released frontend does not expand digits into words. It reports each
piece's non-letter characters as an unknown group. It drops digits from a
mixed piece such as “A-17” and emits `<unk>` for a numeric-only piece. The
adapter sends one utterance per article span and preserves the native limits
of 512 tokens and 3,000 frames.

## Browser export

The builder verifies the pinned checkpoint and source hashes. It uses CPython
3.12 on arm64 macOS with hash-locked Torch 2.6.0 and ONNX 1.17.0 wheels.
The only change to the released exporter casts the static
treble filter padding to a Python integer for tracing. The export retains
default Polish, uses opset 17, and keeps both graph-internal noise operators.
The tracing seed does not seed browser synthesis.

Both backends use the 22,533,274-byte FP32 graph and ONNX Runtime Web 1.31.1.
CPU uses one WASM thread. WebGPU requires a hardware dispatch in the untimed
probe and can use WASM for unsupported operators. The adapter returns raw
Float32 PCM. The builder verifies the graph and metadata before the assets
tool stages them in `.cache/public/`. [License and source notices](../web/alpa-es/NOTICE.md).

## Reproduction

```sh
node tools/build-alpa-es-browser.mjs
npm run assets -- verify --model alpa-es
npm run fixtures -- check --id es-ar-article-v1
npm run bench -- run --model alpa-es --backend cpu --fixture es-ar-article-v1 --smoke
npm run bench -- run --model alpa-es --backend webgpu --fixture es-ar-article-v1 --smoke
npm run bench -- run --model alpa-es --backend cpu --fixture es-ar-article-v1 --scenario offline --smoke
npm run bench -- run --model alpa-es --backend cpu --fixture es-ar-article-v1 --scenario warm --warm-protocol v2 --repetitions 3
npm run bench -- run --model alpa-es --backend webgpu --fixture es-ar-article-v1 --scenario warm --warm-protocol v2 --repetitions 3
```
