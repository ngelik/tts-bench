# Tiny Voca Greek browser adapter

The pinned `ComputationalLinguisticsPlatform/tiny-voca-gr` release provides two fixed Modern Greek (`el`) synthesis profiles trained on recorded STOMA speech. The benchmark uses M (index 0). F (index 1) is available for smoke diagnostics. The browser uses a local FP32 ONNX export of the released PyTorch checkpoint, with 24 kHz output, a hop of 256 samples, speed 1, neutral pitch and a 0.99 peak cap per source span.

The frontend ports the released Greek NFC normalization and sentence rules along with Tiny Voca's eSpeak IPA parsing, token and stress mapping, and recursive splitting above 500 tokens or 3,000 frames. The local worker runs the pinned eSpeak NG 1.51 build. Latin fragments can trigger a phonemizer language switch, with the Greek checkpoint inventory mapping unsupported phones to `<unk>`. Standalone English is unsupported.

## Pinned inputs

- Model and Greek source: `ComputationalLinguisticsPlatform/tiny-voca-gr` revision `927ea15cf4edcb8695b75328c9c90c5c53928554`.
- Base tiny-voca source: `n4ze3m/tiny-voca` revision `62e2adef158bc997042cc6234f541f1e0e4cd55d`.
- eSpeak NG: 1.51 source commit `2e9a5fccbb0095e87b2769e9249ea1f821918ecd`.
- ONNX Runtime Web: `onnxruntime-web-pocket` 1.31.1.
- Fixture: `el-article-v1`, SHA-256 `dbc35fd140cebb09299d642b3afef95ae78b610f28806fb3b92b5079e74c93e9`.

The `tiny-voca-gr` entry in `assets.lock.json` pins the build outputs and licenses. Use macOS arm64, CPython 3.12, uv, clang and Emscripten 5.0.3 with `emcc` revision `285c424dfa9e83b03cf8490c65ceadb7c45f28eb`. The tested SDK compiler archive has SHA-256 `91c38a2f68e7e307b351a3dc05637e2f4c5f083f185f7d59e70f6434889c5b94`. [Official macOS arm64 compiler archive](https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/065bfade0ee2c02138b83cb10049d8be95e146b6/wasm-binaries-arm64.tar.xz)

After activating that compiler, generate and import the local assets.

```sh
bash tools/tiny-voca-gr/build.sh .cache/tiny-voca-gr-assets
npm run assets -- import --model tiny-voca-gr --source .cache/tiny-voca-gr-assets
npm run assets -- verify --model tiny-voca-gr
```

The builder verifies the five output digests before copying them to the ignored artifact directory.

## Frontend evidence and limits

Native frontend verification covers 109 source spans and 335 utterances, with a maximum of 179 tokens and 28 unknown-phone instances. The token and stress SHA-256 is `e18578d68850f35da5143037440032de7ccd63aaeaf568940be00c25ef47323b`. The adapter verifies the per-span unknown-phone lists. Four short controls cover stress, accents, punctuation, normalization, digits and foreign names.

The model card lists pronunciation limitations for mixed Latin and Greek text, abbreviations, numbers and unusual spellings. [Pinned model card](https://huggingface.co/ComputationalLinguisticsPlatform/tiny-voca-gr/tree/927ea15cf4edcb8695b75328c9c90c5c53928554)
