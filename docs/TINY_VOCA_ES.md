# Tiny Voca Spanish F2

This profile uses Marcos's `marcosmaceo/tiny-voca-es` checkpoint at Hugging Face
revision `9898eaef9b245d7a5240156eed919ee1bd2a9b84` and the browser source at
Git commit `a4bf2bd979fc40b1bd7e34e13c0164db627d14ec`. The model card reports
4,534,411 parameters and 22.7 hours of synthetic Castilian training speech.
[Model card](https://huggingface.co/marcosmaceo/tiny-voca-es/tree/9898eaef9b245d7a5240156eed919ee1bd2a9b84) ·
[Browser source](https://github.com/stdevMac/tiny-voca/tree/a4bf2bd979fc40b1bd7e34e13c0164db627d14ec).

The benchmark uses the default F2 voice (index 0), Castilian Spanish
(`es-ES`), 24 kHz mono, speed 1.0, pitch shift 0 and pitch range 1. M2
(index 1) is the alternate Castilian voice. The demo also offers Rioplatense
and Cuban phoneme transforms for those voices. The upstream English
development route requires a separate English checkpoint.

## Frontend and generation

The adapter uses the exact upstream `site/frontend.js` and `site/sentences.js`
plus eSpeak NG 1.52.0. The stock 61-symbol inventory and fingerprint are
verified against the checkpoint metadata. The pinned `es-es-article-v1`
fixture has 22,965 characters in 105 spans and SHA-256
`8acee2d2fe70fb184d7a3f30e000d4a7cf5a9e09fc7523f32e958e7b1451653e`.

The smoke audit matches the native and browser token and stress output across
334 utterances. It checks a maximum of 180 tokens, zero unknown phones and
token/stress SHA-256
`8fb2b2b0e26412f8301606488ed6cbfd00ce7c641e908f10c3c22fbbac492119`.

The stock model accepts int64 tokens, stress and voice, and float32 speed,
pitch shift and pitch range. It returns PCM and frame durations. The adapter
uses the stock 12-token safety margin on the 512-token limit and recursively
splits utterances above 3,000 frames. A 256-sample frame is 10.67 ms at 24 kHz.
The adapter reports the first genuine PCM, joins the pieces in source order
and caps peaks at 0.99 across the completed source span.

## Backends and assets

Both backends use ONNX Runtime Web 1.22.0 and the same FP32 graph. CPU uses
one WASM thread. The untimed WebGPU probe requires a hardware compute
dispatch, and WASM can execute unsupported operators. The adapter fetches
same-origin assets and checks their pinned sizes and SHA-256 hashes. The asset
tool stages the model and runtime locally in `.cache/public/`.

The model and frontend are Apache-2.0, eSpeak NG is GPL-3.0-or-later, and ONNX
Runtime Web declares MIT in the pinned npm package metadata. The Castilian
speech for training was generated with Qwen3-TTS VoiceDesign.
[Source notices](../web/tiny-voca-es/NOTICE.md) · [Asset pins](../assets.lock.json).

## Reproduction

```sh
npm run assets -- fetch --model tiny-voca-es
npm run assets -- verify --model tiny-voca-es
npm run bench -- models --language es-ES
npm run bench -- run --model tiny-voca-es --backend cpu --fixture es-es-article-v1 --smoke
npm run bench -- run --model tiny-voca-es --backend webgpu --fixture es-es-article-v1 --smoke
npm run bench -- run --model tiny-voca-es --backend cpu --fixture es-es-article-v1 --scenario warm --warm-protocol v2 --repetitions 3
npm run bench -- run --model tiny-voca-es --backend webgpu --fixture es-es-article-v1 --scenario warm --warm-protocol v2 --repetitions 3
```
