# Tiny Voca Greek browser profile notices

This benchmark adapter is a local browser port of the released Greek frontend and inference boundary. The profile pins separate revisions:

- The model checkpoint is CC BY 4.0 and the Greek inference source is Apache-2.0. This browser build uses an FP32 ONNX export of the released PyTorch checkpoint. [Pinned Greek model and source](https://huggingface.co/ComputationalLinguisticsPlatform/tiny-voca-gr/tree/927ea15cf4edcb8695b75328c9c90c5c53928554)
- Base model implementation: [`n4ze3m/tiny-voca` at `62e2adef158bc997042cc6234f541f1e0e4cd55d`](https://github.com/n4ze3m/tiny-voca/tree/62e2adef158bc997042cc6234f541f1e0e4cd55d), Apache-2.0. This adapter derives its IPA tokenization and fit behavior from that source and preserves its required notice.
- Phonemizer: [eSpeak NG 1.51 at `2e9a5fccbb0095e87b2769e9249ea1f821918ecd`](https://github.com/espeak-ng/espeak-ng/tree/2e9a5fccbb0095e87b2769e9249ea1f821918ecd), GPL-3.0-or-later. Its locally compiled quiet ESM, WASM and Greek language data remain separate runtime assets; `LICENSE-ESPEAK-NG` is the corresponding license text.
- ONNX Runtime Web: 1.31.1, MIT, with the package's third-party notices. The shared package license files are staged by the asset lock.

The model card asks users to credit Konstantinos, “tiny-voca-gr,” link to the model page, cite STOMA, and indicate model modification. STOMA is by Michail Raptakis, Yannis Pantazis, and Alexandros Angelakis (CC BY 4.0; dataset revision `fcb947d49abd2736701d8ce3786136812bac85fa`). The model card notes that STOMA terms do not cover third-party text such as CGL Text Bank material. No training recordings or transcripts are packaged here.

The browser adapter follows the released Greek normalization, eSpeak stress parsing, Greek symbol inventory, unknown-phone output and recursive splitting. eSpeak can switch pronunciation rules for Latin fragments, and the checkpoint continues to use the Greek inventory. The fixture records 28 `<unk>` token instances across its 109 spans. Standalone English is unsupported.

The benchmark selects synthesis profile M (index 0) by default. Profile F (index 1) is available for smoke diagnostics. Published benchmark clips carry model and corpus attribution in the audio manifest.

The model weights are generated locally from the pinned checkpoint; neither weights nor built runtime binaries belong in Git. See the `tiny-voca-gr` entry in the root `assets.lock.json` and the reproducible builder at `tools/tiny-voca-gr/build.sh`.
