# Tiny Voca Russian M profile

This is an adapter integration for the Russian article fixture, not a scored
result. It pins model `egnch/tiny-voca-ru` at
`2723b0e71fea216001bd4f6caf0866eb06879339`, source
`yilbegan/tiny-voca-ru` at `aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784`, and
browser Space `egnch/tiny-voca-ru-demo` at
`bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e`. The profile accepts only
`ru-article-v1` / `ru`.

The pinned publisher card reports **4,534,411 parameters**, including the
waveform generator. It lists two bundled synthetic voices (`F`, `M`), 24 kHz
mono output, and Apache-2.0 weights. This benchmark selects the demo's default
male voice `M` (index 1), FP32 waveform graph, speed 1, pitch shift 0 and pitch
range 1. The model and output configuration are Russian only.

## Browser path

The Space's `phonemizer.zip`, `config.json`, FP32 `model.onnx`, OOV
`accent.onnx`, and contextual INT8 `omograph.onnx` are SHA-256 and byte-count
pinned in `assets.lock.json`. Pyodide 0.26.4 and ONNX Runtime Web 1.20.1 reuse
the existing shared pins. Assets must be staged under the model-revision and
Space-revision path and are verified before use; no model data is committed.

The classic worker preserves the Space's sentence splitting, terminal
punctuation, OOV-accent-first processing, per-sentence homograph resolution,
and recursive token fitting order. It does not compute IPA/display strings on
the timed generation path. The waveform session is created and awaited before
either stress session is created. Only the waveform session uses the selected
backend (`wasm`, or `webgpu` followed by `wasm`); OOV accent and contextual
homograph sessions always use single-thread WASM. Speed, shift, range, voice,
precision and sample rate match the pinned profile on both backends. Tensors,
ONNX sessions and Pyodide proxy handles are disposed at teardown.

For WebGPU, the adapter requires a non-fallback hardware adapter and observes a
real waveform compute dispatch in the separate capability probe. A zero-dispatch
probe is unsupported. Dispatch counts from separate Space qualification controls
are evidence about those controls, not values assumed by this adapter.

## Smoke frontend oracle

Only smoke initialization receives `auditTexts`. The adapter compares its full
fixture frontend output with the pinned all-span oracle before returning
`settings.fixtureAudit`. Both initialization phases of a cached smoke return the same audit in settings.
Normal full-mode initialization uses the usual first-span capability probe with
an empty audit input.

The oracle covers 95 spans and 324 utterances, with a maximum of 205 tokens,
zero unknown phones, 61 first-seen OOV accent requests, 152 contextual
homograph queries, and token/stress SHA-256
`dd87fc357784ef2b74dbb70ab6c884746fccd55fffc4908db2838b6185b449f9`. Its
fixture hash is `14bd6d91b7738d8f3e275885d235540a362f5bf956294e3dfb779e0f3e5abf2f`.

The provided stock waveform CPU and GPU controls use identical utterance
lengths; the GPU control observed 840 genuine Metal dispatches per utterance.
Those are qualification controls, not benchmark scores or adapter defaults.
No Chrome score, audio-quality assessment, or recording release is part of this
adapter integration.

## Attribution and licensing

The pinned model card and Space identify the code and waveform weights as
Apache-2.0. The Russian stress dictionary and the accent/homograph models derive
from `ruaccent` and carry MIT terms. Exact upstream `LICENSE`, `NOTICE`, and
`LICENSE-ruaccent` files accompany the adapter in
[`web/tiny-voca-ru/`](../web/tiny-voca-ru/). The training speech uses synthetic
Qwen3-TTS VoiceDesign voices and the dataset declares CC BY 4.0.

Primary sources: [pinned model card](https://huggingface.co/egnch/tiny-voca-ru/blob/2723b0e71fea216001bd4f6caf0866eb06879339/README.md),
[pinned browser source](https://github.com/yilbegan/tiny-voca-ru/tree/aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784),
[pinned Space](https://huggingface.co/spaces/egnch/tiny-voca-ru-demo/tree/bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e),
[ruaccent](https://github.com/Den4ikAI/ruaccent),
[pinned training dataset license](https://huggingface.co/datasets/egnch/tiny-voca-ru-dataset/blob/641a71953589e7faceab6022b55f599e03578043/LICENSE.md).
