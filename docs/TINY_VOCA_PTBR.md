# Tiny Voca Brazilian Portuguese

The browser profile registers the pinned `semfence/tiny-voca-ptbr` FP32 ONNX
checkpoint for the complete `pt-br-article-v1` fixture. The model revision is
`f231cbe318c9f972e27fd8dad5d8ebcfb40a672f`; the pinned demo Space is
`a456470df5589478e3fb3f1973457771f4c056bd`. The checkpoint bundles synthetic
voices `F_s4` (index 0, default) and `M_sm4` (index 1), with 24 kHz output.

The browser worker uses the pinned `@semfence/dizione-ptbr` engine, G2P,
normalizer, symbols, tokenizer, MFA-derived lexicon and open-vowel table from
the demo Space. The source files and dictionary are staged below the
model/source revision path and checked against their locked sizes and SHA-256
values before use. The profile applies the demo's normalization, sentence
splitting, token-limit split policy, speed 1, pitch shift 0, pitch range 1,
and whole-source-span peak cap 0.99. It does not rewrite the fixture text or
silently omit unknown symbols.

The exact fixture frontend audit is **101 spans**, **310 utterances**, maximum
**225 tokens**, **zero `<unk>` phones**, and token/stress SHA-256
`b3c86da3ee2e3bc10286af2b7b6423c7c50ce4c622d862eb01b95d6fa47982fc`. This is
frontend diagnostic evidence, not a quality review or benchmark score. The
checkpoint has no seed input, so generated waveforms are not deterministic.

CPU explicitly requests the `wasm` execution provider. WebGPU explicitly
requests `webgpu`; a separate short synthesis must observe real WebGPU compute
dispatch before it is reported as GPU. The pinned ONNX Runtime Web 1.22.0
`ort.webgpu.min.mjs` and JSEP WASM files are URL-backed in `assets.lock.json` and
used for both provider modes, avoiding the checkout's installed ORT version.
The WebGPU session is not relabeled as CPU if it has no dispatch. ONNX Runtime
may run operators without a WebGPU kernel on its internal CPU/WASM kernels;
that mixed operator work is disclosed in settings. Asset fetch, inference and
model G2P use the local same-origin server after setup.

License and attribution files are retained under [`web/tiny-voca-ptbr/`](../web/tiny-voca-ptbr/): the model's exact CC BY 4.0 license and notice, the Tiny Voca code license and notice, and the separate Dizione Apache notice and license. The lexicon license records its derivation from the Portuguese (Brazil) MFA dictionary v2.0.0a under CC BY 4.0. Credit the checkpoint as **“tiny-voca-ptbr, by SemFence (Gustavo Toledo)”** and indicate changes when redistributing model material. Code rights do not provide a blanket license for generated recordings.

## Pinned sources

- [Checkpoint and card](https://huggingface.co/semfence/tiny-voca-ptbr/tree/f231cbe318c9f972e27fd8dad5d8ebcfb40a672f)
- [Demo Space](https://huggingface.co/spaces/semfence/tiny-voca-ptbr-demo/tree/a456470df5589478e3fb3f1973457771f4c056bd)
- [Dizione browser source](https://github.com/SemFence/dizione-ptbr-js/tree/8fbb77e579fe684f3afd9cb2a801d0adce8c89cf)
- [MFA Brazilian Portuguese dictionary release](https://github.com/MontrealCorpusTools/mfa-models/tree/dictionary-portuguese_brazil_mfa-v2.0.0a)
- [ONNX Runtime Web 1.22.0 package](https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.22.0.tgz)
