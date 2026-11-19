# Inflect Micro v3 browser configuration

## Pinned selection

- Checkpoint: `owensong/Inflect-Micro-v3`, revision
  `c1a7db6ef44c931623fc2028cb0409659b83156c`.
- Scope: the upstream card lists six English preset voices; this browser export
  contains Cassidy (voice 2) only.
- Export: three FP32 ONNX graphs plus a fixed FP32 Cassidy style bank, produced
  by hosted export workflow run [44468829531](https://github.com/ngelik/tts-bench/actions/runs/44468829531).
  The release manifest records exact byte sizes, SHA-256 values, source weight
  hash and PyTorch-to-ONNX CPU parity error bounds.
- Runtime: ONNX Runtime Web 1.23.2. CPU uses the WASM provider; WebGPU uses
  WebGPU with WASM fallback and must pass an actual inference dispatch probe.
- Output: 24 kHz mono floating-point PCM, fixed speed 1, seeded JS Gaussian
  source noise, and a 120 ms silence between internal utterances only.

## Frontend and output differences

The browser frontend uses the repository's pinned Klein 0.2.0 English G2P and
lexicon with the exported strict 178-symbol Micro vocabulary. This is a
disclosed Misaki-derived adaptation; exact native Micro Misaki phoneme parity
has not been established. Unknown symbols and over-limit text fail explicitly
instead of being silently dropped or truncated. Numeric rewriting is
conservative and recorded in the run configuration.

The adapter ports the pinned real-valued source-filter head in JavaScript. Its
seeded Gaussian sequence is reproducible for a given canonical span and
internal utterance, but differs from PyTorch's random generator, so waveform
bit parity is not claimed. Exported ONNX graphs are checked against the source
PyTorch model on several token lengths before publication.

## Terms and source notices

The Apache-2.0 model grant applies to the exact Inflect-owned source weights
identified in the retained upstream `LICENSE_SCOPE.json`; third-party and
voice/recording terms are separate. The Klein G2P/lexicon and phonemizer
components retain their own Apache notices; the eSpeak NG data/code retains
GPL-3.0-or-later terms. ONNX Runtime Web is MIT and its bundled third-party
notices apply. See [`web/inflect-micro-v3/NOTICE.md`](../web/inflect-micro-v3/NOTICE.md)
and [the project license index](LICENSING.md).
