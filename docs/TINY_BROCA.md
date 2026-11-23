# Tiny Broca Brazilian Portuguese

This profile integrates `brenorb/tiny-broca` at immutable Hugging Face revision
`0ea879d8f532ad0c6e7308017b45105a74f81a95` and browser source commit
`56d68b9fd3375c52030b3de053a26bfcc6e823c2`. The checkpoint is 21,372,510 bytes
and reports 4,533,835 parameters. It is a 24 kHz mono FP32 ONNX graph with two
fixed synthetic voices: F1 (index 0, default) and M1 (index 1). The profile
supports only the `pt-br-article-v1` fixture and `pt-BR`.

The benchmark executes the unmodified upstream `text.py` in Pyodide 0.26.4 and
the upstream 1.20.1 ONNX Runtime Web worker stack. It uses explicit single-thread
WASM on CPU and `[webgpu, wasm]` for WebGPU. The WebGPU probe must observe actual
dispatches on a hardware adapter. All model and runtime assets are checked
against immutable size and SHA-256 pins and staged locally.

The exact canonical frontend audit is 101 spans, 294 utterances, maximum 262
tokens, and seven `<unk>` tokens, digest
`5d88f7fb947707c2551658ae587de602672087bda9ff0cc824d6857bd1c1e055`. The seven
unknown tokens come from digits retained by the upstream normalizer in `18h`,
`21h`, `16h`, and `1º` (which tokenizes as `1o`), in spans 5, 12, 63, and 75.
The benchmark keeps the released outputs and the fixed article. The English
input control runs through the Brazilian Portuguese letter frontend.

```sh
npm run assets -- fetch --model tiny-broca
npm run assets -- verify --model tiny-broca
```

The dataset card reports 9,384 sentences and 16,434 accepted clips totaling
17.3 hours. Qwen3-TTS 1.7B Base generated the training audio using two CC0
Common Voice prompts. The public benchmark publishes approved 30-second
excerpts from its own scored runs with attribution and receipt links. Complete
WAVs stay local. [Dataset card](https://github.com/brenorb/tiny-broca/blob/56d68b9fd3375c52030b3de053a26bfcc6e823c2/docs/dataset-card/README.md) · [Retained notices](../web/tiny-broca/NOTICE.md).
