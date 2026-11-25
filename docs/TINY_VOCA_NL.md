# Tiny Voca Dutch browser candidate

## Pinned source and scope

Candidate model ID: `tiny-voca-nl`. Publication language key: `nl`. The only
eligible fixture is the existing immutable `nl-article-v1` fixture
(`afbadecd4e0b7db057056fb8f6bb220f51a281a7cd956b9ead633590ea4389d8`, 101
ordered spans). The fixture is an AI-assisted translation; its paragraph
sequence, names, plot details, numeric values and frontend coverage were checked
by Codex, but it has not had independent human translation review. Preserve
that qualification anywhere its score is shown.

Pinned inputs:

- Tiny Voca NL source: `tetsuo/tiny-voca-nl` commit
  `63566400b13c184d10d6da1a563c4f6c7f3ccac5`.
- Model repo: `xxy998/tiny-voca-nl` revision
  `ba761f35b72b76d473af2f1daea079944601c69f`.
- Official browser Space: `xxy998/tiny-voca-nl` revision
  `cccbdddce753130c2d449225438c82b45af1d3da`.
- Model: FP32 ONNX, 22,469,180 bytes, SHA-256
  `e892f027d2d378748bfcd1b061894219f513f2e42490aeeccb3c779e0387483c`.
- Model metadata: 24 kHz mono, hop 256, Dutch `nl-NL`, one bundled voice `alex`,
  max 512 tokens, max 3,000 frames, training step 30,000, `calibrated_excitation`
  enabled, eSpeak NG frontend fingerprint
  `d85fba8e2c83feb45bb9dea9ce28ae4e299684d42b126c53e824a42aa5d5ef20`.
- The model card reports 4,537,291 base parameters. Calibration adds 4,053
  values; report graph-level parameter totals only after verifying the exact
  exported graph initializer count. The model card's rounded 4.54M is not an
  exact graph count.

The pinned browser Space includes ONNX Runtime Web 1.20.1 and eSpeak NG 1.52.0
compiled for WebAssembly. Its worker forces `executionProviders: ['wasm']` and
`ort.env.wasm.numThreads = 1`. It does not call a hosted inference service. The
model configuration declares a calibrated graph; this is not the same graph as
an uncalibrated Tiny Voca checkpoint. Do not export, quantize, or replace it
without a new model identity and evidence.

## Runtime protocol that must be preserved

The upstream worker uses voice index 0 (`alex`), speed 1 for its default,
`pitch_shift = 0`, and `pitch_range = 1`. It normalizes and phonemizes Dutch
locally through the pinned `dutch.mjs` and eSpeak data. It synthesizes each
sentence/utterance with the pinned graph, rejects malformed or silent output,
and caps each utterance's peak at 0.99 before playback. It places no silence
between output utterances. The effective token limit is
`min(config.max_tokens, 256)`; when token or frame limits are exceeded, the
stock worker recursively splits first at comma/semicolon/colon/em dash and then
at a word midpoint. The maximum frame count is 3,000.

The graph uses stochastic calibrated excitation. The stock worker does not
accept a synthesis seed. A campaign seed may record/randomize the cell order,
but must not be represented as controlling waveform generation. Repeated
outputs may differ; retain the audio and run receipts when interpreting
timings.

The pinned source project's native `infer.py::_voice` rejects a Dutch
`Phonemized` value when `phones.unknown` is nonempty. Its `speak_text` path uses
the same Dutch phonemizer and does not turn these cases into a supported `<unk>`
fallback. Therefore, the adapter preserves the stock browser's strict unknown
phone error. It does not map, drop, or substitute these phones.

## Full-fixture failure evidence

The unmodified pinned browser worker successfully rendered spans 0–2 at
24 kHz, but the first article-order failure is span 31: `recorder` yields the
unsupported eSpeak phone `e`. A qualification-only bulk frontend pass over all
101 original spans found these five affected spans:

| Span | Source-span SHA-256 | Word | First strict-worker error | Other unsupported phone in trace |
|---:|---|---|---|---|
| 31 | `c33bc4f422e422fd5bcb2e464566af1aca704f29d6185e51267677883eef934e` | recorder | `e` | — |
| 54 | `f5e36faf87d6b13c1b0a73360392b5cb286b12591baaae8fe4c101f438c8d408` | Hardware | `ɑː` | — |
| 74 | `e8862af6d88b546e6b331f9ac36aabb956c996cfe00142ee1808f02ee1d15d58` | Hardware | `ɑː` | — |
| 88 | `b1d5237f51318edced439543dde1ebb5e2cd9bf5e10763e009a942f3d63d7a49` | recorder | `e` | — |
| 99 | `c9dae211a81b9f4c2e9620bdf5e1cb6049ea047a811bc1f1a55b4264ea8d7b33` | recorder | `e` | — |

The publisher's text-only Node verification procedure reproduced browser plans
for the other 96 spans. The browser version, fixture and per-span rejection
digests are summarized in the [stock worker reference](campaigns/tiny-voca-nl/stock-reference.json).
The all-span stock phonemizer audit rejects span 31 first in article order.
Three fresh warm attempts and a separate cached attempt on the reference Mac all
returned the original Dutch phonemizer error at span 31. Each warm attempt
stopped during the excluded warmup. The Dutch board links a 30-second opening
from a separate three-span run and reports zero completed full-article rounds.
[Original article attempts](campaigns/tiny-voca-nl/article-outcome.json) · [Dutch board](https://ngelik.github.io/tts-bench/?lang=nl&model=tiny-voca-nl)

The stock worker's exact first three spans produced 31.0613 seconds of audio
in total (not execution time) and were synthesized twice. Their sample counts
were 261,120, 251,136 and 233,216 (three, three and two utterances). The paired
float PCM relative RMS differences were 0.299713, 0.267336 and 0.312971, which
confirms material stochastic variation despite fixed text/settings. These are
diagnostic reference outputs, not benchmark scores. The summary evidence is in
the [stock worker reference](campaigns/tiny-voca-nl/stock-reference.json);
raw PCM remains outside the source repository.

The original 101-span fixture remains byte-for-byte unchanged. A genuine
full-article attempt may run in article order to capture the worker's actual
failure and preserve its error receipt. This model and stock frontend are
**not qualified for a complete `nl-article-v1` result**; they cannot be ranked
until all fixture spans render. Any change to the frontend/model or a new
versioned fixture must be identified separately, never folded into this model
ID.

A graph-level native CPU timing, an ONNX Runtime CPU execution provider, or a
worker that changes the stock 256-token split, frontend, speed, per-utterance
peak cap, or concatenation is a different protocol. The candidate must use the
stock one-thread WASM backend and browser phonemizer. Label the registered
`cpu` backend as benchmark ONNX Runtime WASM in run notes, and verify the
effective backend from the receipt. No hardware GPU backend is offered by the
upstream worker.

## Terms and attribution

The Dutch model repo and source declare Apache-2.0. The source training voice is
Piper `nl_NL-alex-medium`, whose pinned voice card identifies CC0/OHF Voice
source audio. These are separate attributions: do not infer that the model's
Apache declaration changes the training voice's terms or covers unrelated
dataset rights. The training dataset card does not supply a license declaration
that this candidate can independently verify. The runtime also includes
ONNX Runtime Web under MIT with its third-party notices and eSpeak NG under
GPL-3.0-or-later. Preserve the exact Space notices and eSpeak license with any
local asset bundle. Review [the benchmark's license policy](LICENSING.md)
before a scored run.

## Qualification sequence

Before scoring, publish the exact adapter/profile/worker and lockfile source.
Then:

1. Fetch and verify each model, metadata, frontend, eSpeak and ONNX Runtime asset
   against the immutable source revision and SHA-256 asset lock. Confirm the
   staged artifact closure contains no weights or caches in Git.
2. Keep the all-span frontend audit outside synthesis qualification. Run it
   against the unchanged fixture and record token/stress coverage and every
   unknown phone, without pre-reading spans in benchmark initialization.
3. A headed Chrome smoke may exercise the supported opening spans using a
   disposable profile and no fallback. A full article-order attempt must invoke
   the actual worker in order and retain the first failing span. Confirm
   first PCM, complete chunk receipts, 24 kHz output, worker-reported WASM
   dispatch and playable decoded audio. Compare opening spans with the pinned
   stock-worker reference; account for stochastic output rather than requiring
   bit-identical waveforms. The known span-31 error means this smoke is only a
   supported-prefix diagnostic, not full-fixture qualification.
4. A full article attempt is allowed as a diagnostic and must preserve the
   actual article-order error. Do not publish a complete-fixture score or rank
   while any spans fail. The warm/cached plan is a proposed schedule only; it
   does not turn the blocked model/fixture pairing into an eligible result.

This document is intake/provenance, not a claim that an adapter, asset bundle,
browser smoke, or score has been completed.
