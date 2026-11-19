# Sano Robot/MCU and Trellis

Two distinct official English models, each with one bundled US-English voice:

| ID | Complete parameters | Weights | Rate | Runtime |
| --- | ---: | --- | ---: | --- |
| `sano-robot-mcu` | 567,008 | INT8 front + decoder | 22,050 Hz | Official `snt_tts` CPU/WASM |
| `sano-trellis` | 995,058 | FP32 bundle | 24,000 Hz | Official experimental Trellis-RIFT CPU/WASM |

Robot is the MCU model, **not** the larger Kristin PiperLite voice. Trellis is an
experimental text-to-wave pipeline, not the frontend shared with Heart/Nano.
[Official demo and source](https://github.com/Ampixa/sanoTTS/tree/c0584a51213721faba98135821faab71bae888f0/web)
and [source/license notice](../../web/sano/robot-trellis-NOTICE.md) define the pins.
No WebGPU runtime exists in this selected official path; GPU requests return an
explicit unsupported result without constructing a CPU worker.

The official demo splits each canonical span into sentence/clause pieces of at
most 120 characters. All non-whitespace source characters are preserved. G2P,
ID boundary validation, allocation, native inference and PCM copies occur inside each
timed call. No phoneme or audio output is precomputed for timing. First PCM means
the first complete internal piece is transferred to the page; the unchanged
browser API does not expose its internal neural sink callbacks.

Robot retains the demo's 2 MiB arena and 400,000-sample output capacity; negative
native returns, missing BOS/EOS and cap-sized output fail. Its ID buffer is 1,024
entries and is checked for saturation. A separate full-fixture raw-IPA check rejects unknown phones before scoring; timed Robot calls invoke the official ID frontend once, without duplicate G2P. Trellis retains the official 207-token
limit, default ID-derived deterministic seed and waveform-only handle (`keep=0`).
Every handle and temporary allocation is freed, including failure paths. Output
sample finiteness is checked by the common harness **after** generation timing.

Before scoring, stage each model independently and run the complete frontend
check in headed Chrome:

```sh
npm run assets -- fetch --model sano-robot-mcu --accept-license
node tools/check-sano-robot-trellis-frontend.mjs sano-robot-mcu
npm run assets -- fetch --model sano-trellis --accept-license
node tools/check-sano-robot-trellis-frontend.mjs sano-trellis
```

The frontend audit does not synthesize or cache audio. Full benchmark scoring
follows the standard CPU warm and cached-resource protocols on a clean committed
source. Hosted smoke results are diagnostics, not M1 Pro reference scores.
