# Tiny Voca Sinhala adapter

## Pinned release

- Model: `eminduperera/tiny-voca-sinhala` at Hugging Face revision `c54a456ed65ac8173a666a69b81d99c4ac882dd6`.
- Source: `Emindu/tiny-voca-sinhala` at `f9f903be847f89458dbc9af750b0ffc6d66a2c9b`, based on upstream Tiny Voca commit `60d965d7ea0a4b2a51f9abb011bfe810ae8074d0`.
- Fixture: `si-article-v1`, SHA-256 `6bf7b054ee96b965287c7b4473f7e66cac06436fac16a0ad9aaea6d31ef00f15`, 90 source spans.
- Voices: M1 (Ven. Mettananda, graph index 0) and F1 (Mrs. Oshadi, graph index 1). Both donations permit non-obscene, non-offensive speech only. Impersonation, deceptive, obscene and offensive use is prohibited. Asset and run commands require license acceptance.
- Parameters: 4,536,715 logical scalar values, the exact sum of all 184 FP32 initializers in the pinned ONNX speech graph, including constants. The publisher rounds the model to 4.5 million.

## Runtime behavior

The adapter imports the publisher's Apache-2.0 `frontend.js`, Unicode tables, and eSpeak wrapper unchanged. It loads the pinned 73-symbol model metadata, eSpeak NG 1.52.0 Sinhala voice `inc/si`, and calls the native `sentences()` and recursive `shorter()` functions. Each graph call preserves the model's token/stress, voice, speed, pitch and duration interface. The stock `max_tokens - 12` margin is enforced.

Only the stock one-thread ONNX Runtime Web 1.20.1 CPU/WASM route is enabled. Its closure is `ort.wasm.min.mjs`, `ort-wasm-simd-threaded.mjs`, and `ort-wasm-simd-threaded.wasm`; no WebGPU assets are included. Model, metadata, eSpeak WASM/data, runtime and license assets are pinned by byte count and SHA-256 in `assets.lock.json`.

The stock page defaults to a 0.35-second pause after sentence-ending chunks. Its downloaded playback joins sentence audio, inserts those pauses, and normalizes the complete playable buffer to a maximum peak of 0.99. The adapter applies that same policy to each canonical source span, omitting the trailing pause after the last sentence of the span. It does not add pauses between short pieces created by `shorter()` within one sentence.

The staged frontend oracle binds every source span and each expected utterance's token count and token/stress digest: 373 utterances, maximum 207 tokens and zero unknown phones. These are text-frontend controls; they are not acoustic evaluation or pronunciation review.

## First three span comparison

The M1 voice reproduced the stock playback length for each of the first three fixture spans in headed Google Chrome. Two recordings from the publisher's stochastic graph provided a reference for the 20 ms energy-envelope comparison. Both controls and the benchmark used speed 1, pitch shift 0, pitch range 1 and the same sentence pauses.

Run the adapter check with the registered fixture.

```sh
npm run bench -- run --model tiny-voca-sinhala --backend cpu --fixture si-article-v1 --smoke --accept-license
```

## Provenance and licenses

`web/tiny-voca-si/frontend.js`, `unicode-tables.js` and `espeak.js` match the staged source hashes in the profile. `UPSTREAM-NOTICE.txt` preserves the pinned upstream notice. `LICENSE` is the Apache-2.0 source-code license. `LICENSE-GPL-3.0.txt` is retained for the model and eSpeak runtime terms. `docs/LICENSING.md` records the voice-use restrictions and required acceptance.

The publisher reports that eSpeak NG's Sinhala frontend does not distinguish ඬ from ණ්ඩ, reads digits word-by-word, and approximates some Pali/Sanskrit words, abbreviations and Latin-script text. No fluent-speaker or pronunciation review is claimed here.
