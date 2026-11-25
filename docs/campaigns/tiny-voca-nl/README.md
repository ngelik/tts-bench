# Tiny Voca Dutch article results

Three independent warm CPU/WASM attempts and one cached memory attempt stopped
at source span 31 of the fixed 101-span article. The publisher’s Dutch frontend
rejects the phone `e` in “recorder”. Each warm attempt failed during the excluded
warmup, so the model has zero scored rounds. A separate three-span run generated
31.061 seconds of speech with the Alex voice. Its first 30 seconds are playable
on the Dutch board. [Four full-article receipts](article-outcome.json) · [Recording and source receipt](https://ngelik.github.io/tts-bench/?lang=nl&model=tiny-voca-nl)

A text-only scan also identified unsupported phones at spans 54, 74, 88 and 99.
The browser attempts stopped before reaching those spans.
[Phonemizer findings](../../TINY_VOCA_NL.md#full-fixture-failure-evidence) · [Stock worker reference](stock-reference.json)

## Original qualification plan

This plan is a proposed qualification cell for `tiny-voca-nl` using the
immutable `nl-article-v1` fixture. The article is 22,195 characters across 101
spans. The fixture is an AI-assisted translation that has not had independent
human translation review; see [fixture source metadata](../../../fixtures/nl-article-v1.meta.json)
and the [candidate's provenance and protocol notes](../../TINY_VOCA_NL.md).

The only proposed backend is the benchmark `cpu` slot, which must run the
upstream browser's one-thread ONNX Runtime WASM backend. This is not native CPU
inference. The upstream model worker is stochastic and has no synthesis seed;
the protocol's warm-v2 repetitions measure repeated browser executions, not
seed-controlled identical waveforms. Do not add a GPU cell because the pinned
upstream worker explicitly uses WASM.

## Before running

Publish the source/provenance implementation, verify the full asset bundle and
fixture, then run the all-span frontend audit as a separate qualification
artifact. A supported-prefix Chrome smoke is diagnostic only. A full article
attempt may synthesize chunks in order and preserve the first failure. The
known unsupported phones mean this pairing cannot produce a rankable complete
fixture result. Do not add an unknown-phone substitution or change the stock 256-token
split policy, frontend, voice, speed, pitch, per-utterance 0.99 peak cap, or
audio concatenation under this model ID.

The stock worker's first three fixture spans rendered twice, with relative RMS
differences of 0.299713, 0.267336 and 0.312971 due to stochastic excitation. Their total
produced audio duration was 31.0613 seconds; this is not execution time. See the
[pinned stock reference](stock-reference.json). The controls do not prove
complete fixture coverage.

## Proposed warm cell

| Backend | Scenario | Protocol | Repetitions | Resources |
|---|---|---|---:|---|
| cpu / WASM | cached | default | 1 | Yes |
| cpu / WASM | warm | v2 | 3 | No |

The proposed cached cell would measure generation-window Chrome process-tree memory once.
Warm protocol v2 uses one excluded full article followed by three scored
articles and does not measure memory. These cells are not authorized as scoring
work while the full-fixture failure remains. Keep scenarios separate. Record
the exact source commit and fixture hash in any diagnostic receipt. Keep raw
runs and caches ignored; this plan authorizes no recording release.

From the clean scoring source after integration:

```sh
npm ci
npm run fixtures -- check --id nl-article-v1
npm run assets -- fetch --model tiny-voca-nl
npm run assets -- verify --model tiny-voca-nl
node tools/run-campaign.mjs --plan docs/campaigns/tiny-voca-nl/proposed-plan.json --dry-run
```

After a separately identified configuration or fixture resolves the known coverage blocker and the plan is pinned to its source commit, use the normal campaign command from `docs/CLI.md` with the actual machine label and reviewed license acknowledgement. Do not run a scored cell from an unpublished source commit.
