# Tiny Voca Luganda source and change notice

The model and original frontend source are from Henry Hale's `tiny-voca-lg`.
The pinned Hugging Face model revision is
`dcb36749b11027ef8e57319d6508104e235ff783`; the pinned GitHub source revision
is `258107cba9bdf820a815554ce1b601369b8c1388`.

`lug.js` is based on the pinned upstream file `web/public/lug.js` (6,694 bytes,
SHA-256 `7e758d5826755eec1e015b5744cdf07e12c11275a40b52983b888257944cebb9`).
The only change to that file is an ES-module export for the existing `lug`
object so the benchmark worker can import the same spelling rules. The
benchmark-specific sentence span wrapper and graph adapter are separate files.
The pinned Python source is retained as provenance in the local qualification
scratch folder; it is not copied into the browser bundle.

The project is Apache-2.0. The checkpoint was trained on
`CraneAILabs/waxal-lug-clean`, derived from WaxalNLP and identified by the model
card as CC BY 4.0. F2 is the female voice derived from WAXAL speaker 5; M2 is
WAXAL speaker 1. This attribution does not independently verify dataset rights,
speaker consent, or a blanket license for generated audio. See the pinned model
card for the model and output terms. The benchmark selects F2 only.

The browser uses ONNX Runtime Web 1.31.1 (MIT) and the repository's retained
third-party notices under `docs/runtime-notices/onnxruntime-web-1.31.1/`.
