# Zerre TTS browser adapter

The benchmark loads the pinned official `web/public/phonemize-tr.js` unchanged
from Zerre TTS at Git source commit
`cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4`. Its Apache-2.0 license and upstream
NOTICE are retained alongside this file. The Turkish adaptation derives from
tiny-voca and preserves the upstream attribution in `UPSTREAM-NOTICE`.

The benchmark worker and profile under `web/workers/zerre-tts.mjs` and
`web/zerre-tts/profile.mjs` are original integration code. They load only the
hash-pinned graph, metadata, lexicon, phonemizer and ONNX Runtime Web 1.20.1
assets recorded in `assets.lock.json`. The worker implements the official
browser path: Turkish locale phonemization, official sentence boundaries,
3–512-token acceptance, unpadded sentence concatenation and final peak scaling
only above 0.99. It adds a benchmark RPC interface, provider selection, untimed
dispatch proof, source-span validation and fixture-only frontend audit. It does
not apply the demo page's playback EQ or 0.95 UI gain.

The locked ONNX Runtime Web modules are MIT and its license is retained in the
local asset cache. The upstream v1.20.1 third-party notices apply. The model
weights are Apache-2.0.
That license does not resolve the publisher's stated uncertainty about the
copyright and personality rights of the audiobook recordings used for training,
and does not establish blanket rights for generated audio.

Sources: [pinned browser source](https://github.com/erkinemreta1/zerre-tts/tree/cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4),
[model snapshot](https://huggingface.co/erkint/zerre-tts/tree/55753a04ae624998cba86f7c17625616e318124e),
[upstream license](https://github.com/erkinemreta1/zerre-tts/blob/cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4/LICENSE),
[data-source caveat](https://github.com/erkinemreta1/zerre-tts/blob/cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4/docs/data_sources.md),
[ORT 1.20.1](https://github.com/microsoft/onnxruntime/tree/v1.20.1).
