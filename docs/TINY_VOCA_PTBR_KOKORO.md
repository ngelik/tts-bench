# Tiny Voca pt-BR Kokoro

This is Haple's independent Brazilian Portuguese checkpoint, registered beside
the SemFence Tiny Voca profile. It does not reuse SemFence's Dizione frontend,
lexicon, or weights.

## Pinned configuration

- Model: `Haple/tiny-voca-ptbr-kokoro`, Hugging Face revision
  `596401fc87f1635f73326872001e370d3aedab9b`.
- Source: Git commit
  [`1e7ed993260ecdd91552762f7403c00632bf5dab`](https://github.com/Haple/tiny-voca-ptbr-kokoro/tree/1e7ed993260ecdd91552762f7403c00632bf5dab).
- ONNX graph: FP32, 21,374,289 bytes, SHA-256
  `f6819ce8cd6eebf5cee2f5a9911c017fe348373fcb1dd42fe56ef885561eecde`.
- Author-reported parameter count: 4,535,755, including the waveform
  generator.
- Voices: F/index 0 is the default and was distilled from Kokoro
  `pf_dora*0.7 + af_heart*0.3`; M/index 1 was distilled from `pm_santa`.
- Audio: 24 kHz mono; 512 maximum tokens, 500-token frontend limit, 3,000
  maximum frames; one-thread ONNX Runtime Web 1.31.1.
- Supported language: Brazilian Portuguese (`pt-BR`) only. English eSpeak trace
  output is useful for a fallback diagnostic; it does not add English to the
  model's supported-language profile or benchmark fixtures.

## Frontend and evidence

The model's frontend is the pinned Portuguese normalizer plus eSpeak NG `pt-br`
1.51. The 68-symbol ABI is NFD-normalized and has fingerprint
`8fcf234a3759b90b7f8b3c399c6632a22a6bb3d50ce290636b3ab80936d09dee`. eSpeak
1.51 is part of the training text ABI; newer versions are not substituted.
The browser runtime is built from eSpeak NG source commit
`2e9a5fccbb0095e87b2769e9249ea1f821918ecd`, archive SHA-256
`57aefafeff07f11a91b39cce4c96f4f9e88a13a26b3aeef22556fbf78cede684`, using
the project-owned `tools/tiny-voca-ptbr-kokoro-espeak/build.sh` and its pinned
tool versions. Its three browser artifacts are digest-pinned in
`assets.lock.json` under `runtimes/espeak-ng/tiny-voca-ptbr-kokoro-1.51/`.

With Emscripten 5.0.3, Autoconf 2.73, Automake 1.18.1 and GNU Libtool 2.5.4
on `PATH`, build the local phonemizer and verify the model assets.

```sh
bash tools/tiny-voca-ptbr-kokoro-espeak/build.sh
npm run assets -- fetch --model tiny-voca-ptbr-kokoro
npm run assets -- verify --model tiny-voca-ptbr-kokoro
```

The immutable `pt-br-article-v1` frontend oracle matches all 101 spans and 310
utterances, with a maximum 228 tokens, zero unknown tokens, and token/stress
SHA-256 `c51bbed7e6e3264f39319fd3eeb33ce0fb6ce4d02cd2400a62d4173f9df462b2`.
This is text/frontend parity evidence, not a timing score. CPU/WASM and
WebGPU+WASM smoke runs are diagnostics only. The graph's WebGPU smoke must show
hardware compute dispatch and return CPU-readable PCM.

## Terms

The checkpoint and port are Apache-2.0; preserve the adjacent `LICENSE` and
`NOTICE` plus [`NOTICE-BROWSER.md`](../web/tiny-voca-ptbr-kokoro/NOTICE-BROWSER.md).
The eSpeak runtime and data are a separate GPL-3.0-or-later component;
the corresponding COPYING file and source build pins are recorded separately.
ONNX Runtime Web is MIT, with its license and third-party notices pinned in the
asset lock. The upstream terms cover the source and model weights. The public
benchmark uses approved 30-second excerpts generated from the fixed article,
with model attribution and a link to the scored receipt. Complete WAVs stay local.
