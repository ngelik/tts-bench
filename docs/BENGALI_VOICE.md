# Bengali Voice Compact

The `bengali-voice` profile uses Hansda's compact INT8 Bengali checkpoint and
the deployed Jahnavi voice at index zero. It supports the Bengali synthesis
language (`bn`) through native Bengali or Roman Bengali input. The benchmark
registers the native article as the default fixture; `bn-latn-article-v1` is a
separate Roman-input edition, not a second spoken language.

## Implementation

The worker integrates the pinned browser frontend and retains its Bengali
normalization, Roman-input conversion, phonemizer, trained G2P fallback, OOV
cache, sentence splitting, recursive clause/word planner, phone limit, voice,
speed, pitch, and peak limit. It executes ONNX Runtime Web 1.24.3 with one
SIMD-WASM thread. The adapter runs synthesis in a dedicated worker, uses only
same-origin hash-verified assets, and releases sessions on disposal. It adds no
inter-span silence. Each returned part covers exactly one complete benchmark
source span after peak normalization.

The profile reports WebGPU as unsupported. The pinned graph and tested runtime
combinations did not produce valid WebGPU PCM; automatic WASM fallback cannot
count as GPU execution.

## Fixture controls

The pinned upstream CPU control produced all 89 spans of `bn-article-v1` at
24 kHz, with no unknown words and 33,149,696 samples. The Roman-input control
produced all 101 spans of `bn-latn-article-v1` at 24 kHz, with no unknown words
and 33,694,976 samples. These are adapter-control observations, not scored
benchmark receipts or quality assessments. Compare normalized spoken text,
unknown-word lists, per-span sample counts, and aggregate samples against the
matching control. Waveform byte identity is not expected because the model uses
randomized synthesis noise.

The fixture texts and their own provenance live in `fixtures/registry.json`.
See [`web/bengali-voice/NOTICE.md`](../web/bengali-voice/NOTICE.md) for the
asset adaptation, attribution, and license scope.
