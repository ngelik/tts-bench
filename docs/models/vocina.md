# Vocina Italian v1.0

## Pinned profile

- Source: [OfficinePixel/vocina commit 8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34](https://github.com/OfficinePixel/vocina/tree/8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34)
- Release: [v1.0](https://github.com/OfficinePixel/vocina/releases/tag/v1.0)
- Graph: vocina-int8.onnx, 8,536,789 bytes, SHA-256 a899c64c380fd3ca6460b13b8162da0d9931c25326567c1e87e140a2aa1b743d
- Configuration SHA-256: 2f07dbe350d2fdc891126d4847fe251e7ab48d04c3d87836123030d5a3e1a3f8
- Release checksum manifest: SHA256SUMS (the graph and config match its entries)
- Runtime: ONNX Runtime Web 1.27.0 official browser bundles, single WASM thread; WebGPU plus explicit WASM fallback

The release profile is Italian (it, it-IT), 24,000 Hz, hop 256, 512 maximum model tokens, step 100,000 and 57 symbols (49 Italian symbols plus eight reserved IDs). It provides two released voices: I1 (Femminile, index 0) and I2 (Maschile, index 1). The benchmark selects I1; speed is 1, pitch shift 0, pitch range 1, and optional pronunciation variants are empty.

## Fixture and browser behavior

The profile requires the existing it-article-v1 fixture (107 source spans, source SHA-256 9deb44d6edb942644c0e018446040f24984e2c2a032a9665b3bb4d4bff17023a). Its adapter uses official g2p.frasi, official chunk fitting up to 200 tokens, the supplied Wiktionary pronunciation data, and the official per-piece pause including a final pause for every benchmark source span. It returns the official whole-span output after the 0.99 peak limiter. The 107-span frontend audit expects 336 plans, a maximum of 185 tokens, no unknown-token spans, and token/stress/pause digest 747da1dc5adadd77a003f2f481a2af9065ba6fb71d320bac537ccfc352b83916.

The benchmark worker omits only the official zero-delay UI-yield between pieces. This does not alter token plans, pauses, PCM, or the peak limiter. RandomNormalLike is unseeded, so exact PCM hashes may differ between repetitions and are not an audio correctness oracle. WebGPU timing may have real output-length differences from CPU; each backend reports its actual duration. See [adapter and license notice](../../web/vocina/NOTICE.md).

## Parameter evidence

The publisher describes the model as approximately 4.5 million parameters. A scan of the pinned released INT8 graph found 4,533,743 stored initializer values and 180,555 explicitly named FP32 weight/bias initializer values. The latter is retained as a scope-aware stored-initializer lower bound, not an exact count of trainable parameters. It does not meet the benchmark's greater-than-one-billion single-observation exception.

## Output and source terms

Vocina publishes the model and source under Apache-2.0. The pronunciation lexicon retains CC BY-SA 4.0 and its Wiktionary contributor attribution. The publisher describes I1 and I2 as synthetic Qwen3-TTS VoiceDesign presets. [Licensing notes](../LICENSING.md)

At retrieval, the repository's main branch and stable v1.0 release resolved to commit 8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34. The live demo's G2P, pronunciation data and Wiktionary lexicon byte-match that source, but its deployed model graph is still the earlier v0.2-60k file. A live fetch of the demo's cache-busted model URL on 2026-11-22 returned 8,536,789 bytes with SHA-256 15e0664c4761d6053670a4c306b36175a627ca8e3e48dd9e918c64eb54baaa29; its adjacent JSON reports step 60,796. The v1.0 release graph is the same byte length but has a different SHA-256 and 100,000 training steps. The benchmark pins the release graph and does not use the public demo's model file.
