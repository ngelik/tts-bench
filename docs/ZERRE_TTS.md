# Zerre TTS Turkish browser profile

## Pinned implementation

- Model: `erkint/zerre-tts`, HF snapshot `55753a04ae624998cba86f7c17625616e318124e`.
- Deployed Pages/browser source: `erkinemreta1/zerre-tts` commit `cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4`.
- The int8 graph is 8,549,070 bytes, SHA-256
  `4c3d0d989a0376675f27645e4a6116bbff0dd8cd12208185c8069b6f7330115e`.
  The pinned source graph, deployed Pages graph and HF graph were independently
  verified byte-identical. Metadata, Turkish lexicon and phonemizer are pinned
  to the same deployed source commit in `assets.lock.json`.
- ONNX Runtime Web 1.20.1 uses one WASM thread. CPU requests WASM explicitly.
  The benchmark's separately qualified GPU path requests `webgpu,wasm` and
  requires observed compute dispatch; the upstream demo itself is CPU/WASM.
- The graph configuration is step 65,000, 24 kHz, hop 256, 62 symbols,
  maximum 512 tokens and 3,000 frames. The matching lexicon contains 25,344
  entries. The model card's approximately 4.5M parameter figure is an upstream
  estimate, not an exact count. The parameter catalog records only the
  independently tallied 181,515 explicitly named FP32 weight/bias values as a
  scoped lower bound.

## Fixed profile and official browser behavior

The benchmark fixes `SES-A`, internal `MK`, speaker index 0; the other neutral
label is `SES-B`, internal `NK`, index 1. Speed is 1, pitch shift 0, pitch range
1. The pinned model is Turkish-only. It does not support English or Kurdish.

The official worker collapses whitespace, then splits sentence pieces at
whitespace after `.`, `!`, `?` or `…`. It phonemizes each sentence in order,
accepts 3–512 tokens, skips pieces outside that range, inserts no silence,
concatenates worker PCM, and scales down only when peak exceeds 0.99. The demo's
streaming playback applies additional 0.95 normalization and WebAudio EQ; those
effects are outside the scored worker PCM and are not included here.

The Turkish tokenizer uses `toLocaleLowerCase("tr")` and the pinned 25,344-word
lexicon with the source's rule-based fallback. Its token pattern accepts letters
and `[.,!?;:—…]`. It drops digit runs while retaining punctuation and any suffix
that remains after the digits; possessive apostrophes split the name and suffix
into separate word tokens. For the frozen `tr-article-v1`, 39 sentence pieces
containing digits across spans 3, 5, 10–16, 19–20, 28, 32–34, 37, 41–43, 45,
49–50, 55–60, 63, 69–70, 76, 79, 82, 86 and 92–93 are affected. The fixture is
kept unchanged; the worker follows this behavior instead of adding number
normalization.

The GPU route is a separate benchmark variant using the same ORT 1.20.1 release,
with explicit WASM fallback. Evaluator samples found native unseeded
`RandomNormalLike` noise, so repeated PCM hashes differ. CPU and GPU can differ
by one output frame (256 samples); lengths, finite/nonzero PCM, provider proof
and token-plan parity are validated independently.

## Fixture audit and diagnostics

Smoke initialization audits all 94 Turkish source spans before the three smoke
chunks are generated. It checks 307 official sentence plans, a maximum of 204
tokens, no omitted plans, and canonical digest
`dc815086a7cf78ec351cbc7e2e33de2254e08e7413eb45761fadce630c6c063c` over ordered
`[spanId, [[tokenIds, stress, included], ...]]` rows. This audit is limited to
smoke initialization and is not run in timed work.

The independently verified reference produced 378,624 samples for the first
canonical span and 2,847 GPU dispatches for that utterance; these are diagnostic
reference values, not benchmark scores. The checks use the public Git and HF
asset pins above. The receipt settings record both source revisions and graph
SHA-256.

## License and data provenance

The model/code use Apache-2.0; the Apache license and upstream NOTICE are
retained in `web/zerre-tts/`. ORT Web 1.20.1 is MIT with bundled third-party
notices. The publisher says the two source audiobook corpora are labeled MIT by
their uploaders, but copyright and personality rights in those recordings were
not independently verified. Voice labels remain the neutral `SES-A` and
`SES-B`; no speaker identity is claimed. The model license is not treated as a
blanket generated-audio grant. See [licensing](LICENSING.md#zerre-tts-turkish)
and the [adapter notice](../web/zerre-tts/NOTICE.md).
