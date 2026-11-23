# Tiny Voca Hebrew AH

The profile pins the FP32 acoustic checkpoint
`buzagloidan/tiny-voca-he@fdc9b3080984c94768239989391fbaddcf9b5519` and one
male AH voice. The acoustic model has 4,531,147 parameters and is
21,361,734 bytes. The browser also downloads the separate INT8 RenikudPlus G2P
model `notmax123/RenikudPlus@679c56ca449d41873fb8ff7711ddf7563d28198f` at
311,605,741 bytes. Combined model weights are 332,967,475 bytes; G2P parameters
are not included in the acoustic parameter count.

The adapter uses the stock Tiny Voca Hebrew text frontend and sentence planner,
24 kHz sample rate, hop 256, speed 1, pitch shift 0, pitch range 1, a 140-token
natural utterance limit, and a 3,000-frame cap. It joins successful utterances
without added gaps and applies one 0.99 peak limit to each source span. Renikud
uses metadata extracted from ONNX ModelProto field 14, default MAP settings,
niqqud stripping, speaker and target 0, no custom lexicon and no phrase cache.
G2P uses CPU/WASM in both backend configurations; only the acoustic graph uses
WebGPU+WASM for the GPU configuration.

## Source audit and reproduction

The fixture source oracle for `he-article-v1` covers 71 spans and 320 utterance
plans, with a maximum of 140 tokens, zero unknowns, and token/stress SHA-256
`4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7`. The
required first-three smoke subset contains 16 plans (maximum 107 tokens) with
digest `78412e106e2a9df78c8669beed49f169b5c08ec55a34727d87b6695c162fd1f2`.
The independent evaluator has audited all final spans through the exact G2P
graph and decoder. The browser adapter repeats the small fixture audit and
native smoke per backend; a matching smoke does not replace a full scored run.

`tools/tiny-voca-he/extract-stock-planner.py` extracts the stock
`sentences`, `finished` and `shorter` functions and their constants from the
pinned upstream inference source in the same directory. It is reproducibility
tooling; the generated planner is the runtime source locked in the browser.

```sh
npm run assets -- fetch --model tiny-voca-he --accept-license
npm run assets -- verify --model tiny-voca-he --accept-license
npm run bench -- run --model tiny-voca-he --backend cpu --fixture he-article-v1 --smoke --accept-license
npm run bench -- run --model tiny-voca-he --backend webgpu --fixture he-article-v1 --smoke --accept-license
```

[Asset provenance and licensing notices](../web/tiny-voca-he/NOTICE.md)
