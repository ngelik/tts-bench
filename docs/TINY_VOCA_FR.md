# Tiny Voca French diagnostic profile

This profile integrates Daniel Suncost's French Tiny Voca ONNX checkpoint with
the registered `fr-article-v1` fixture. The model revision is
`73f7700f514e70eef3b459aedcc49829d41945d4`; the browser source revision is
`4cc26ab23d934e3d33796eb06bf11f23f4c9ab34`. The pinned FP32 graph is 21,368,019
bytes with SHA-256
`698249cf63768ecd6011d9ddc4137ed16b4d2856a3bc3ba1ab7e1e4e153fc727`.

The profile exposes both released synthetic voices: `FR_F1` (index 0, default)
and `FR_M1` (index 1). It uses 24 kHz mono audio, speed 1, pitch shift 0, pitch
range 1, eSpeak NG 1.0.2 with `fr-fr`, and the unchanged pinned French frontend.
The frontend audit is smoke-only: 108 fixture spans, 318 utterances, at most
183 tokens, zero unknown phones, and token/stress SHA-256
`e5857a7fa90439790db21e41e6a24732d38762e9e63f2ecfa4179aacf4fae6dc`.

## Runtime compatibility

CPU/WASM uses ONNX Runtime Web 1.20.1, the upstream browser demo's runtime. The
upstream demo is CPU-only. Independent qualification found that 1.20.1 fails
WebGPU at `/Concat_6` with a non-concat dimension mismatch. The benchmark's
WebGPU+WASM path therefore uses the already pinned ONNX Runtime Web 1.31.1
assets. The two backend runtime versions are recorded separately; comparisons
between their timings do not isolate a backend effect because runtime versions
differ.

The WebGPU probe requires an observed compute dispatch from the model and keeps
the explicit WASM fallback available. No CPU path is reported as WebGPU.

## Frontend behavior and limits

The adapter preserves the upstream frontend and eSpeak inputs without
benchmark-specific number rewriting. In `17 h 40`, the `h` is handled as the
letter name between 17 and 40; it is not converted to a spoken “hours” word.
The upstream liaison limit in `comment‿allez` (the [t] liaison is absent) is
also preserved. These are known limitations, not adapter fixes.

The graph has no seed input and its waveform noise is unseeded. The adapter
concatenates utterance PCM for each source span and applies one 0.99 peak cap to
that completed span. The smoke audit checks frontend token/stress parity; it is
not an intelligibility or listening review. No scored workload or result
submission is included in this integration.

See [model and source notices](../web/tiny-voca-fr/NOTICE.md),
[license inventory](LICENSING.md), and [model support](MODEL_SUPPORT.md).
