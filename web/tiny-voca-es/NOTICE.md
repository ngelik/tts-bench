# tiny-voca-es source and notices

Marcos (marcosmaceo) adapted Muhammed Nazeem's tiny-voca for Castilian Spanish.
The Apache-2.0 checkpoint is pinned at model revision
`9898eaef9b245d7a5240156eed919ee1bd2a9b84`. The browser source is pinned at
commit `a4bf2bd979fc40b1bd7e34e13c0164db627d14ec`. This directory retains the
upstream license, base citation, and exact Spanish `frontend.js` and
`sentences.js`. [Checkpoint](https://huggingface.co/marcosmaceo/tiny-voca-es/tree/9898eaef9b245d7a5240156eed919ee1bd2a9b84) ·
[Browser source](https://github.com/stdevMac/tiny-voca/tree/a4bf2bd979fc40b1bd7e34e13c0164db627d14ec).

The browser uses eSpeak NG 1.52.0, voice `es`, built from eSpeak commit
`4870adfa25b1a32b4361592f1be8a40337c58d6c`. Its ESM, WASM and data are fetched
locally. `LICENSE-ESPEAK-NG.txt` preserves the GPL-3.0-or-later COPYING text.
[Upstream build recipe](https://github.com/stdevMac/tiny-voca/blob/a4bf2bd979fc40b1bd7e34e13c0164db627d14ec/scripts/build_espeak_wasm.sh).

ONNX Runtime Web 1.22.0 declares MIT in the pinned npm metadata and module
headers. The asset lock records the package integrity and component hashes.
[Official npm package](https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.22.0.tgz).
