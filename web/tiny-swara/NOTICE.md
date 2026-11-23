# Tiny Swara source and change notice

The checkpoint, configuration, Bengali phoneme inventory and Latin-word lexicon
come from [Xeven7/tiny-swara](https://huggingface.co/Xeven7/tiny-swara/tree/9432a340c46249c8acae4ff4b062d46b9cbd1991),
licensed Apache-2.0. The pinned INT8 ONNX file is `onnx/tiny-swara-int8.onnx`.
The corresponding upstream Python inference/frontend source is retained only as
local audit evidence; the browser frontend is an independent JavaScript port of
its `tiny_voca/text.py` v3 eSpeak path and sentence inference behavior.

The port injects a synchronous raw phoneme-trace callback. It preserves NFKC and
punctuation normalization, sentence splitting, Latin lexicon routing, eSpeak
voice selection, token IDs, fallback mapping, stress placement, unknown-phone
rejection and sentence-level `0.9 / peak` normalization. Inference runs in the
benchmark's dedicated Chrome worker with ONNX Runtime Web 1.31.1; CPU uses one
WASM thread and WebGPU retains WASM fallback and requires observed GPU dispatch.
The acoustic graph contains `RandomNormalLike`, so duration and PCM output are
not expected to be bit-identical across executions or providers.

The model config declares frontend fingerprint
`54cece4f400be1fbb56c30bbeedbcdcf5d432702e6d8c6389f44fbb79dc4c94b`. The
complete released `inventory.json` has additional code-mix fallback mappings;
including those produces fingerprint
`9b2e2c1495ada4f44cb6a52c1fb7811fb7756beda6ae20185d9b66ef6195bada`. The
native Bengali fixture's 305 token/stress plans match the source oracle under
both inventory identities. The adapter records both fingerprints and verifies
the full fixture audit before smoke synthesis.

The exact eSpeak NG 1.52.0 WebAssembly phoneme-trace runtime is built from the
GPL-3.0-or-later source archive pinned in
[`tools/tiny-swara-espeak/build.sh`](../../tools/tiny-swara-espeak/build.sh).
The build uses the quiet trace binding in `tools/tiny-swara-espeak/` and keeps
its JS/WASM/data artifacts in the ignored asset cache. `LICENSE-ESPEAK-NG.txt`
contains its COPYING text. The eSpeak runtime and its bundled data remain under
their separate GPL terms.

The training corpus is [AI4Bharat Rasa](https://huggingface.co/datasets/ai4bharat/Rasa),
licensed CC BY 4.0. Tiny Swara's card asks users to follow Rasa's terms when
redistributing derived audio. The benchmark profile does not grant blanket
recording rights. Any published clips need their source/model attribution and a
separate review of the dataset's applicable terms. See
[`docs/LICENSING.md`](../../docs/LICENSING.md) and [`audio/README.md`](../../audio/README.md).
