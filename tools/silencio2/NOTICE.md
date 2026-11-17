# Silencio-2 ONNX export

This exporter targets `BlueRoseLabs/Silencio-2` at revision
`20930f5f6a6bb564f2a8207152fd5c5d8eecff03`. The Silencio-2 model weights are
CC-BY-4.0. The upstream `silencio2/core` inference implementation is MIT
licensed. Silencio-2's notice also attributes the fine-tune to Kyutai Pocket TTS
and the Basis Global Emotions dataset (revision
`57f26ff90a6240e54df94a2fabaf0f744df02575`). See the pinned model card and
upstream notice:

- <https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/README.md>
- <https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/NOTICE.md>
- <https://huggingface.co/BlueRoseLabs/Silencio-2/blob/20930f5f6a6bb564f2a8207152fd5c5d8eecff03/silencio2/core/LICENSE>

The ONNX exporter adapts the explicit-state graph-export approach from
[`lomotron/pocket-tts-onnx-export`](https://github.com/lomotron/pocket-tts-onnx-export/tree/8f52199533098963fe1cbd90bed35bb20d871b5e),
MIT licensed; its license text is retained beside this notice and in the
versioned release. This repository's wrappers and adapter integration are
original Silencio-2-specific work. The generated graph bundle is a conversion of the
CC-BY-4.0 Silencio-2 checkpoint and is distributed under CC-BY-4.0 with the
same attribution requirements.

Only the precomputed reference state for the bundled model voice `260` is
included; it is derived from the pinned model checkpoint and the pinned
`voices/260.wav` reference file. It is specific to this exact model revision.

Silencio-2 asks users to obtain voice-owner permission before cloning, forbids
impersonation or deception, and asks users to disclose synthetic speech where
listeners could mistake it for real. This benchmark only exercises the
model-bundled synthetic voice `260`.
