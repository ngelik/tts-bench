# Tui Voice Mini Malayalam

The benchmark profile pins `Cyrax321/tui-voice-mini-ml` at Hugging Face revision `9c2fee75373d81bbd62fbe2d683b1bad3c4415ea` and source reference `Cyrax321/tui-voice` commit `478761a10399c357e9ccc5380145906167e4d655`. It uses the 21,386,372-byte FP32 ONNX graph (SHA-256 `3fddc5a894eb1dd501921c6342cbbf350d56bbd08a55bf9e2a5a7ac614f355b5`) with the pinned `config.json` and `vocab_plan.json` digests in `assets.lock.json`. The checkpoint config reports 24 kHz audio, a 256-sample hop, 76 token slots and a 512-token limit. The model card reports 4,537,291 parameters.

The pinned model card labels the checkpoint Apache-2.0 and credits the CC BY 4.0 AI4Bharat Rasa dataset. The benchmark selects F2/index 0, named AI4Bharat Rasa Malayalam Female in the pinned config. The audio player shows the publisher and dataset credits.

## Frontend and scope

The browser adapter supports `ml-article-v1` only and selects `F2`/index 0, the only speaker with Malayalam metadata in the pinned config. It calls local eSpeak NG 1.51 in `ml` IPA mode with underscore phone separators and a trailing LF, applies the pinned published phone map, and passes one canonical source span to one ONNX graph call. Stress is all zero, speed is 1.0, pitch shift is +0.15 and pitch range is 0.85. The adapter returns the graph's 24 kHz PCM without inserting gaps or applying peak normalization. The encoder requires every phone to resolve through the published vocabulary or its documented merges.

The config records a Dizione frontend name and fingerprint, while the documented publisher behavior and pinned browser qualification use eSpeak `ml`. The result settings retain both identities. All benchmark spans matched the documented eSpeak route.

The independent 105-span frontend oracle has 461 source clauses, maximum 232 IDs per span, 53 emitted phones and 914 emissions through 15 explicit published merge mappings. It matched the pinned native trace's normalized text and token-ID digests, with no unplanned phones, unknown IDs or fallback mapping. The fixture was evaluated against the canonical text and publisher frontend.

A headed-browser qualification recorded successful CPU/single-thread-WASM and WebGPU-plus-WASM runs on the same FP32 graph. The WebGPU route requests hardware dispatch and uses an untimed capability probe; ONNX Runtime Web may use WASM for unsupported operators. The benchmark measures full articles in a separate scored campaign.

## Asset preparation

Build the pinned eSpeak profile using the repository-owned reproducible script:

```sh
bash tools/tiny-voca-ptbr-kokoro-espeak/build.sh '' tui-voice-mini-ml
npm run assets -- fetch --model tui-voice-mini-ml
npm run assets -- verify --model tui-voice-mini-ml
```

The generated eSpeak runtime is staged under `runtimes/espeak-ng/tui-voice-mini-ml-1.51/`. ONNX Runtime Web 1.31.1 files are shared from the existing pinned runtime package; CPU uses its single-thread WASM route and WebGPU uses the asyncify WASM support route. eSpeak COPYING and the ONNX Runtime license/third-party notices are retained and hash-pinned in `assets.lock.json`.

## Smoke and measured runs

Use the exact registered fixture and model. Run the frontend smoke first, then qualify the explicit backend; run each measured campaign sequentially in headed Google Chrome with the benchmark's disposable profile requirements.

```sh
npm run bench -- models --language ml
npm run bench -- run --model tui-voice-mini-ml --backend cpu --fixture ml-article-v1 --smoke
npm run bench -- run --model tui-voice-mini-ml --backend webgpu --fixture ml-article-v1 --smoke
```

The fixture smoke audits all 105 ordered spans, source language, normalization, punctuation, exact token-ID digest, and strict phone coverage before the probe. The WebGPU smoke must report a verified hardware dispatch; unsupported backend/device conditions have no timing value. Keep the exact fixture edition, graph, runtime, frontend and source commit fixed across any later CPU/WebGPU comparison.

## Notices

See [`web/tui-voice-mini-ml/NOTICE.md`](../web/tui-voice-mini-ml/NOTICE.md) and the exact model/runtime/license entries in [`assets.lock.json`](../assets.lock.json). The model card labels the model release Apache-2.0; the eSpeak runtime/data are separately GPL-3.0-or-later and ONNX Runtime Web is MIT.
