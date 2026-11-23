# Tiny Voca Arabic Halabi F2

This profile uses the single F2 voice from Tiny Voca's Arabic Halabi release kit
at immutable release tag commit
`4601b2bdb44bc52ebf73e87d5082b49fa138c6fb`. The upstream `arabic-halabi-f2`
branch tip `242643faf066fea1dc051cbd4a0f3dae3b27c6c0` has byte-identical
worker and frontend files. This profile pins the release tag as both the model
and source revision.

- The FP32 ONNX graph is 21,367,894 bytes with SHA-256
  `121d285ce938dab1b3720f77ed02121d80f83ae2ec23d33ec13e095f321390d4`.
- The model generates 24 kHz PCM with a hop of 256 samples. It has a model
  limit of 512 tokens and 3,000 frames, 54 symbols, and one voice (`F2`,
  index 0). The released checkpoint was trained for 3,000 steps.
- Upstream reports 4,532,683 parameters including the waveform generator.
- The `ar-article-v1` fixture contains 129 spans and has SHA-256
  `3421fd109af55f52743b89b377a81e55e9ed524bd717f334d81638fc091f94d5`.
- Pyodide 0.26.4 executes the hash-pinned Python frontend unchanged
  with `phonemize(text, diacritized=True)`. ONNX Runtime Web 1.20.1 uses one
  WASM thread on both backends. The WebGPU configuration uses
  `[webgpu, wasm]`, the pinned JSEP runtime files, and verified hardware
  dispatch. Frontend work and operators without WebGPU support run on CPU.

The source frontend fingerprint is
`db4f0df92da8a498e795ff634ef2f30db5f406dc601625ab8a3e6c562aa3259d`. The lock records the
exact source SHA-256. The frontend receives the authored combining-mark order
and vowel marks directly. `finished()` and Arabic-aware sentence/fit logic
follow the pinned browser worker. Internal utterances are joined without added
audio, then one 0.99 peak cap is applied to each completed source span. The
first-PCM event is emitted when the first utterance has completed CPU-readable
PCM.

Across the full fixture, the browser matched the released frontend’s 557
utterance plans, 147-token maximum, zero unknown token IDs or graphemes, and
token/stress SHA-256
`8e6f250074d7930ba07fd5e552e57c5a54e8298e6f16c498d3524b5f41a7055e`. Raw graph
peaks exceeded 1.0 during qualification. The completed-span peak cap preserves
the release’s handling of these peaks. English-only and punctuation-only
controls yielded no PCM. The graph contains an unseeded `RandomNormalLike`
node, so audio hashes identify individual runs.

The model is experimental, has a Damascene accent, and upstream describes its
prosody as flatter than the reference. Use fully vowel-marked Arabic. The
frontend can mispronounce foreign names and complex numbers.
[License details](LICENSING.md) · [Adapter notice](../web/tiny-voca-ar-halabi/NOTICE.md)

## Pinned sources and assets

- [Release kit tag](https://github.com/BenkadourKhaled/tiny-voca/releases/tag/v0.1-ar-demo-kit)
- [Pinned release source](https://github.com/BenkadourKhaled/tiny-voca/tree/4601b2bdb44bc52ebf73e87d5082b49fa138c6fb)
- [Checked equivalent branch tip](https://github.com/BenkadourKhaled/tiny-voca/tree/242643faf066fea1dc051cbd4a0f3dae3b27c6c0)
- [Pyodide 0.26.4 distribution](https://cdn.jsdelivr.net/pyodide/v0.26.4/full/)
- [ONNX Runtime Web 1.20.1](https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.20.1.tgz)

Extract and verify the three locked release files, then fetch the remaining
assets. Python 3.11 or newer provides the extractor's file-digest function.

```sh
revision=4601b2bdb44bc52ebf73e87d5082b49fa138c6fb
python3 tools/tiny-voca-ar-halabi/extract-release.py \
  ".cache/public/models/tiny-voca-ar-halabi/$revision/$revision/assets"
npm run assets -- fetch --model tiny-voca-ar-halabi
npm run assets -- verify --model tiny-voca-ar-halabi
```

Pass `--archive /path/to/tiny-voca-ar-demo-kit.zip` to use a previously
downloaded release archive. The extractor checks the complete ZIP before staging
the graph, configuration and attribution file. The worker loads the pinned
inference assets from loopback.
