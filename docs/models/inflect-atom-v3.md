# Inflect Atom v3 browser port

This candidate ports the exact **157,190-parameter** Atom v3 core, not the 157,915-parameter experimental per-voice variant. The checkpoint is [owensong/Inflect-Atom-v3 at 6d517b3](https://huggingface.co/owensong/Inflect-Atom-v3/tree/6d517b3580e0167556148770760bbbb6a8870b99); `export.pt` is SHA-256 `aad761146483f24f2669223e54bc66db6cfb869da9a4f2fdc969b7e03f9f8e96`.

Six fixed voices are bundled: Hope, Sophia, Cassidy, James, Jasper and Mark. English is the supported language. The benchmark selects Cassidy, at 24 kHz, speed 1, base seed 7717. The official acoustic model predicts durations, pitch and harmonic/noise envelopes; a local DSP renderer produces the waveform. No teacher model, remote inference or neural vocoder is loaded.

## Browser implementation and qualification

The source offers a native Python runtime. This repository's browser port uses an FP32 ONNX encoder and decoder plus a C++/WebAssembly DSP renderer. The single unpadded utterance encoder omits PyTorch's packed-batch sorting operation; all encoder/decoder learned weights are retained. ONNX expresses `expm1(x)` as `exp(x)-1` before the duration clamp and rounding. Hosted parity checks compare to the pinned native model before scoring. Float32 kernel differences can cross a half-frame duration rounding boundary: qualification records every such token and permits at most one frame per token and one net frame (12.5 ms) per canonical span. It preserves the actual ONNX durations without a rounding bias and compares continuous decoder features against the original architecture given those same durations.

CPU uses one-thread ONNX Runtime Web WASM for both graphs. WebGPU selects the convolutional decoder with WASM fallback, while the bidirectional GRU encoder, frontend and DSP remain on WASM. A hardware compute-dispatch probe is required before a GPU score. Provider labels therefore explicitly describe a mixed WebGPU/WASM pipeline.

The optional upstream `espeak-light` frontend uses pinned eSpeak NG 1.52.0 and Misaki 0.9.4 conversion rules. This port normalizes CR, LF and TAB to spaces before G2P: the native optional frontend otherwise emits unsupported LF phones for 18 of the article's 93 spans. This normalization preserves every word and punctuation mark. The canonical 20,000-character fixture and its receipt hash are unchanged. Unknown phonemes fail; none are dropped. Exact frontend output is checked against native eSpeak-light for every canonical span.

The noise source is explicitly adapted to a specified MT19937/polar Box–Muller stream, reset per canonical span and incremented per internal piece. Both browser providers use the same generator. It is not the PyTorch RNG algorithm. DSP numerical parity supplies the same external noise to the native and ported renderers. No output clipping, normalization or fades are added; nonfinite and clipped output is rejected. The upstream 510-phone limit, 200-phone fallback splitting and 80 ms internal pauses are retained. A 4,096-frame cap fails rather than truncating speech.

## Source, build and licenses

`tools/inflect-atom/export.py`, `build-wasm.sh`, `check-dsp.py` and `check-frontend.mjs` reproduce the conversion and qualification; `.github/workflows/inflect-atom-export.yml` runs expensive work on a hosted machine. Hosted timings are diagnostics and never reference scores.

The current upstream [license grant](https://huggingface.co/owensong/Inflect-Atom-v3/blob/6d517b3580e0167556148770760bbbb6a8870b99/LICENSE.md) covers owner-controlled code and weights under Apache-2.0, and explicitly supersedes older evaluation/noncommercial language. Historical notices remain in the release; third-party licenses and voice/data provenance obligations remain separate. eSpeak NG and the ported phonemizer punctuation layer use GPL-3.0-or-later. Misaki uses Apache-2.0, ONNX Runtime Web uses MIT with its bundled notices, and Emscripten's LLVM/runtime notices apply to the built WASM modules. Source and notices must accompany redistributed runtime assets.

No native browser results are claimed until the pinned source, staged assets, acoustic/frontend/DSP parity and actual Chrome campaign pass qualification.
