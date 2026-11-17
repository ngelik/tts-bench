# Silencio-2 browser configuration

This browser configuration is named `silencio-2` and measures the
`BlueRoseLabs/Silencio-2` checkpoint at revision
`20930f5f6a6bb564f2a8207152fd5c5d8eecff03`, with bundled voice `260` and raw
24 kHz Float32 streaming output. The source for the comparison is
[Eren Golge's small TTS benchmark](https://erogol.com/small_tts_bench/); its
Silencio-2 row uses the same model, bundled voice and `stream()` API. The linked
reference is a reported result, not a result for this browser runtime.

Model weights and the model-bound voice state are CC-BY-4.0. The copied
`silencio2/core` source is MIT. The model is fine-tuned from Kyutai Pocket TTS;
the upstream notice also credits the Basis Global Emotions dataset. Full
attribution and exporter provenance are in
[`tools/silencio2/NOTICE.md`](../../tools/silencio2/NOTICE.md).

Silencio-2 is English-only. This benchmark configuration bundles the default
voice `260`; it does not expose the other voices or custom voice cloning.
Emotion and sound tags from the official tokenizer are supported. The adapter
rejects unknown tags rather than sending them through as ordinary speech text.
Speech generation uses a disclosed seeded browser noise generator; it is not
bit-for-bit PyTorch RNG parity. Both CPU/WASM and WebGPU use the same FP32
graphs and synthesis settings, with WASM operator fallback allowed on WebGPU.

The model card says to clone voices only with their owner's permission, not to
impersonate people or deceive, and to disclose synthetic speech where a
listener could mistake it for real. The only voice state shipped here is the
model-bundled synthetic voice `260`.
