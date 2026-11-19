# Inflect Micro v3 browser integration notices

The exported graphs and Cassidy style bank are derived from the identified
Inflect Micro v3 checkpoint weights at revision
`c1a7db6ef44c931623fc2028cb0409659b83156c`. The pinned upstream
`LICENSE_SCOPE.json` identifies the exact source weight SHA-256 and grants
Apache-2.0 for those Inflect-owned weights. Its scope does not relicense
third-party components or establish separate voice/recording rights. The
source license, scope and third-party notices are retained beside this file.
The Kokoro Apache-2.0 and StyleTTS2 MIT texts named by the upstream notice are
also included under `LICENSES/`.

The browser adapter and source-filter DSP are benchmark integration code; no
upstream Python inference runtime is bundled. English G2P uses the separately
pinned Klein 0.2.0 browser G2P and English lexicon, the Apache-2.0
`phonemizer.js` package, and its bundled eSpeak NG data/code under
GPL-3.0-or-later. Their existing notices and licenses remain applicable. The
Klein frontend is a disclosed adaptation and is not claimed to match native
Misaki output exactly.

The hosted export uses ONNX Runtime 1.23.2 on CPU for graph parity. Browser
inference uses the separately pinned ONNX Runtime Web 1.23.2 distribution
(MIT; bundled third-party notices apply). The graph export is FP32 and the
fixed browser voice is Cassidy; six voices are supported by the upstream
checkpoint, but only one is exported and benchmarked here.

Upstream source: <https://huggingface.co/owensong/Inflect-Micro-v3/tree/c1a7db6ef44c931623fc2028cb0409659b83156c>.
