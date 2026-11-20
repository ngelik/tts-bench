# Individual Sano GGUF size profiles

These six configurations use the pinned Kokopop browser runtime from the converted heart-nano profile. Each model is an individual voice GGUF, so its payload does not include unused voices. They remain separate from the official Ampixa CPU/WASM configurations and from the already measured heart-nano F32 profile.

| Profile | Source parameters | Stored tensors | Rate | GGUF bytes |
|---|---:|---|---:|---:|
| `sano-heart-gguf` | 2,272,145 | F32 | 24,000 Hz | 9,375,272 |
| `sano-amy-gguf` | 1,454,284 | F16/F32 | 22,050 Hz | 3,236,900 |
| `sano-amy-small-gguf` | 1,084,972 | F16/F32 | 22,050 Hz | 2,489,188 |
| `sano-amy-1p8m-gguf` | 1,834,380 | F16/F32 | 22,050 Hz | 4,007,428 |
| `sano-hfc-gguf` | 1,834,380 | F16/F32 | 22,050 Hz | 4,007,492 |
| `sano-kristin-gguf` | 1,396,151 | F16/F32 | 22,050 Hz | 3,115,300 |

Exact source input and output hashes are in [the conversion pins](sano-kokopop-size-pins.json). Source counts cover duration, acoustic and decoder components. The converter validates tensor names, shapes, source counts and byte hashes. It emits the original Heart F32 representation and mixed F16/F32 Piperlite tensors from the source FP16 distributions, retaining F32 for precision-sensitive operations. These are distinct precision/runtime profiles; do not claim a matched speedup against the official CPU rows.

## Source and build

- Kokopop: [`73ed5710cb37ca0384bc4bfdd7138d13605c9a88`](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88), including its `convert_sanotts_to_gguf.py` and voice-specific frontend.
- Voice inputs: [`ampixa/sanoTTS@25410576d005d7f08d186990fd91f6a2651243de`](https://huggingface.co/ampixa/sanoTTS/tree/25410576d005d7f08d186990fd91f6a2651243de).
- Conversion: Python **3.13**, Unicode **15.1.0**, NumPy **2.4.4**. Unicode is pinned because the converter embeds the normalization table.
- Runtime: the unchanged pinned Kokopop/GGML browser JS, WASM and English eSpeak data, with the existing seeded LONG_FORM API and separate dispatch telemetry patch. CPU and GPU use identical runtime/model bytes.

Follow the [runtime build prerequisites](SANO_HEART_NANO.md), then run `bash tools/build-sano-kokopop-webgpu.sh`. This builds the original runtime and calls `tools/build-sano-size-models.py` to verify all source inputs, convert individual voice files and check each output against the reviewed registry pins. `SANO-SIZE-MANIFEST.json` records the outputs. Generated binaries remain in the private build artifact; import with `node bin/bench.mjs assets import --model MODEL --source .cache/sano-kokopop-build/release --accept-license`, followed by `assets verify` for that model.

## Inference and validation

Heart uses the Misaki-normalized eSpeak IPA frontend. Piperlite uses the pinned Piper eSpeak frontend, Unicode NFD and interleaved PAD token layout. Its source voice is `en-us` except Kristin, whose upstream config explicitly selects `en`; this is retained and recorded. Kokopop LONG_FORM normalizes and internally chunks the complete canonical span, derives internal seeds, and can trim, crossfade and insert pauses. The benchmark passes each raw canonical span once, with speed 1 and base seed `42 + canonical span ID`. It does not pretruncate or resample the output. The compiled selected-voice sample rate is checked at load, probe and every generation response.

CPU is explicit `cpu/wasm`; GPU is explicit `webgpu+wasm`, with CPU preprocessing and fallback-sensitive operators retained. GPU admission requires a nonsoftware shader-f16 hardware adapter, positive actual compute dispatches and repeated named neural MUL_MAT assignments during a separate probe. A metadata flag alone cannot pass. Probe instrumentation is removed before timed generation; timing resolves only after CPU-readable PCM. No extra PCM scans were added inside timing.

A separate instrumentation-only browser build audits all 93 canonical spans through the same LONG_FORM chunker, eSpeak and actual tokenizer. It records every omitted symbol in the planning passes and once per final inference-token sequence, verifies repeated tokenization equality, and records duration/acoustic vocabulary substitutions. These counts require review: separators and meaningful phoneme losses must be distinguished. The ordinary runtime files are SHA-checked before and after diagnostic compilation and are used for timing unchanged.

The workflow builds/imports each model independently, performs headed Chrome CPU/WebGPU smoke and checks their sample rate, output length, correlation and RMS error, then exercises the regular offline harness and validates its original GPU receipt. Smoke is not a score or speech-quality judgment. Any incompatibility or failed parity remains diagnostic evidence; full warm measurement requires a clean, committed source and independently reviewed real results. New full warm cells use one excluded complete article and five scored articles on each accepted backend. Heart-nano's completed scores are not rerun.

## Terms

Retain [license details](LICENSING.md), [the size-profile notice](../web/sano-kokopop/SIZE-PROFILES-NOTICE.txt) and runtime sidecars. The source distribution is GPL-3.0-tagged; package manifests do not independently grant alternative model terms. Conversion does not relicense source models or establish unrestricted recording rights. The integration publishes code and hashes, not model binaries.
