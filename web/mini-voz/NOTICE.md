# Mini Voz browser assets and attribution

This integration uses the Mini Voz model, metadata and browser eSpeak module and data from upstream revision `ad40085efb3fb13c905e4b4640855edf62471dd1`. It retains the exact upstream `site/tts/frontend.js` as `frontend.js` and fetches the weights and vendor files listed in `assets.lock.json`. [ElMariones/mini-voz](https://github.com/ElMariones/mini-voz)

Mini Voz is a Spanish adaptation of tiny-voca by Muhammed Nazeem. The upstream Apache-2.0 license and contributor citation are preserved in `LICENSE` and `CITATION.cff`. The bundled eSpeak NG browser code and data are GPL-3.0. Its upstream license text is preserved in `LICENSE-ESPEAK-NG.txt`.

ONNX Runtime Web is pinned to npm version 1.20.1. Its npm metadata declares MIT, and its ESM files retain the package's license banners. The adapter profile records the npm package integrity.
