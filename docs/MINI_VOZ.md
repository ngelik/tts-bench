# Mini Voz Spanish (Spain)

The `mini-voz` profile evaluates the pinned Mini Voz FP32 ONNX checkpoint with
the stock browser frontend from source revision
`ad40085efb3fb13c905e4b4640855edf62471dd1`. It is fixed to the Spanish
(Spain) article fixture `es-es-article-v1` and Castilian eSpeak NG
(`set_voice("es", "es")`). The released browser profile covers Castilian
Spanish only.

The four fixed voice profiles are F1 (default/index 0), F2, M1 and M2. Output is
24 kHz. CPU uses one WASM thread. WebGPU requires hardware compute dispatch and
can use WASM for unsupported operators. The ONNX graph generates waveform noise
without a seed input, so parity checks use the source frontend's token and
stress output.

The stock frontend is retained byte-for-byte in `web/mini-voz/frontend.js`.
During the full fixture audit, the browser smoke must verify all 105 ordered
spans, 334 utterances, maximum length 180 tokens, zero unknown phones and the
recorded token/stress digest. The smoke path performs this before synthesis.

## Local assets and checks

Weights and bundled browser engines are fetched into ignored local asset storage
from the hashes and URLs in `assets.lock.json`. To stage them, use:

```sh
npm run assets -- fetch --model mini-voz
npm run assets -- verify --model mini-voz
npm run bench -- run --model mini-voz --backend cpu --fixture es-es-article-v1 --smoke
npm run bench -- run --model mini-voz --backend webgpu --fixture es-es-article-v1 --smoke
```

An offline smoke can be run after assets and model cache are populated. The
browser runner uses a disposable Chrome profile. If Chrome rejects a cache
write, the adapter checks the downloaded bytes against the pinned size and
SHA-256 before use.

## Sources and terms

- [Mini Voz source at the pinned revision](https://github.com/ElMariones/mini-voz/tree/ad40085efb3fb13c905e4b4640855edf62471dd1)
- [Mini Voz citation](https://github.com/ElMariones/mini-voz/blob/ad40085efb3fb13c905e4b4640855edf62471dd1/CITATION.cff)
- [tiny-voca source](https://github.com/n4ze3m/tiny-voca)
- [ONNX Runtime Web 1.20.1 package](https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.20.1.tgz)

The upstream Apache-2.0 license, citation, eSpeak NG GPL-3.0 COPYING and
component summary are retained in `web/mini-voz/`. ONNX Runtime Web package
metadata declares MIT, and the adapter records the npm package's integrity.
