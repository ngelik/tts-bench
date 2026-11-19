# Official Sano Robot and Trellis: native M1 Pro cohort

This campaign uses the original upstream CPU/WASM browser runtimes for **Robot/MCU (567,008 parameters)** and **experimental Trellis (995,058 parameters)**. Each pinned English checkpoint has one voice. These are distinct from the converted Kokopop GPU profiles.

Scoring source: `7f9b7982e5336be8642f91404584114371582fcd` ([source PR129](https://github.com/ngelik/tts-bench/pull/129)). The six files in `plans/` preserve the actual private executor's single-cell plans byte-for-byte. This is a registered procedure, not a result or an expected speed.

| Order | Model | Requested backend | Scenario | Scored articles | Resource samples |
|---|---|---|---|---:|---|
| 1 | Robot/MCU | CPU/WASM | cached | 1 | yes |
| 2 | Trellis | CPU/WASM | cached | 1 | yes |
| 3 | Robot/MCU | WebGPU | warm capability check | 5 requested | no |
| 4 | Trellis | WebGPU | warm capability check | 5 requested | no |
| 5 | Robot/MCU | CPU/WASM | warm | 5 after one excluded article | no |
| 6 | Trellis | CPU/WASM | warm | 5 after one excluded article | no |

The official adapters have no GPU implementation. Their WebGPU requests must retain the native capability outcome; CPU fallback timings are never presented as GPU scores. An unsupported result has no scored article, irrespective of the requested repetition count.

## Replay

Use the repository [benchmark skill](../../../skills/browser-tts-benchmark/SKILL.md). A baseline submission requires the actual M1 Pro machine and recorded hardware/browser; other machines produce separately identified observations. The designated cohort uses native arm64, eight M1 Pro CPU cores, 16 GiB RAM, mains power, and headed Google Chrome **157.0.8103.40**. Select the exact executable explicitly because the system Chrome installation can auto-update.

Copy these plan files outside the checkout before selecting the frozen source. Install that source's dependencies and accept the documented model/runtime terms before fetching assets:

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
plan_dir=$(mktemp -d)
cp docs/campaigns/sano-robot-trellis/plans/*.json "$plan_dir/"
git checkout 7f9b7982e5336be8642f91404584114371582fcd
npm ci
export CHROME_PATH="/absolute/path/to/the/preserved/Google Chrome executable"
"$CHROME_PATH" --version
node bin/bench.mjs assets fetch --model sano-robot-mcu --accept-license
node bin/bench.mjs assets fetch --model sano-trellis --accept-license
node bin/bench.mjs assets verify --model sano-robot-mcu --accept-license
node bin/bench.mjs assets verify --model sano-trellis --accept-license
node tools/check-sano-robot-trellis-frontend.mjs sano-robot-mcu
node tools/check-sano-robot-trellis-frontend.mjs sano-trellis
```

Confirm the browser reports `Google Chrome 157.0.8103.40` and `git status --porcelain` is empty. Run one cell at a time on an otherwise idle benchmark machine; do not overlap synthesis, model conversion, builds or large audio checks. Set `BENCH_MACHINE` to an accurate hardware description. The source's campaign runner verifies its immutable plan and native protocol; every actual receipt must also record the intended Chrome version.

```sh
export BENCH_MACHINE="Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64"
for cell in robot-cached trellis-cached robot-gpu-capability trellis-gpu-capability robot-warm trellis-warm; do
  node tools/run-campaign.mjs --plan "$plan_dir/$cell.json" --machine "$BENCH_MACHINE" --accept-license || break
done
```

The two frontend checks cover the exact 20,000-character, 93-span fixture and its 304 internal pieces without discarding non-whitespace source text. Robot preserves five punctuation-only quote pieces and passes their native IDs to synthesis. Trellis records its native frontend's separator handling. G2P remains inside each measured synthesis call; the separate frontend audit is untimed.

Cached memory is sampled during its own full article in a one-tab Chrome session, includes the owned browser/process baseline, and is not model-only RAM or VRAM. Warm timings exclude model loading and one complete warm-up article. No cold-load check is part of this campaign.

Keep every raw outcome and its source/checkpoints. If a process stops or a private validation fails, reconcile its existing receipt before retrying; do not synthesize a completed cell again merely to repair publication. Submit actual native result bundles, final scored recordings, checked listening clips, resource observations and the generated Reference/report through a pull request. Scan/hash full WAVs only after timing has ended and before another timed cell starts, or on separate hosted compute.

## Browser-version deviation

The earlier Robot cached run `2026-11-19t07-15-32-523z-sano-robot-mcu-cpu-cached-ebe4f4af` actually used auto-updated Chrome `157.0.8103.79`. Its raw receipt and WAV are retained as diagnostics; it is excluded from this `.40` cohort. The blocked subsequent Trellis waiter was stopped before acquiring the benchmark lock or starting Chrome. The private executor now sets the explicit executable, verifies its version before setup and each cell, and rejects a receipt with a different actual Chrome version. The six published plans describe the corrected `.40` cohort. No timings are adjusted or pooled across those versions.

## Native results and recordings

The [Robot table and chart](../../../reports/sano-robot-mcu-m1/overview.md) and [Trellis table and chart](../../../reports/sano-trellis-m1/overview.md) are generated from the original native receipts. Both also appear in the repository's [Reference results](../../../README.md#reference-results) and the [live dashboard](https://ngelik.github.io/tts-bench/?models=sano-robot-mcu,sano-trellis).

Each CPU warm result contains one excluded full article followed by five scored full articles. The primary player uses that result's fifth scored article, with its own full WAV and verified 30-second excerpt. The cached resource article is a separate observation; its timing is not a warm score. Mean memory covers the sampled owned Chrome process tree, including workers and browser baseline, during generation. It is not model-only RAM, an isolated tab allocation, or GPU VRAM.

The selected official Robot and Trellis runtimes implement CPU WebAssembly only. Their genuine requested-WebGPU capability receipts report `unsupported`, effective backend `none`, and no synthesis trials. No CPU fallback timing is presented as a GPU result.

### Source and audio interpretation

The frozen producer is `7f9b7982e5336be8642f91404584114371582fcd`, with its original pinned official runtime and weights. Both selected checkpoints have one English voice. The 20,000-character fixture retains all 93 canonical source spans; official internal splitting produces 304 pieces without removing non-whitespace source characters. Robot retains the five punctuation-only quote pieces and observes the real native behavior. Its vocabulary audit is outside the timer; each timed piece still performs the official G2P call once.

First PCM is the first complete synthesized piece transferred to the harness, before subsequent pieces are generated. It is not an internal neural-streaming callback. Validation, hashing and WAV encoding occur outside the generation timer.

The retained whole-WAV audits bind the original scored audio digest, frame count and sample rate. Exact-constant-run observations are diagnostic: the Robot recording has no run of at least 0.1 seconds, while the Trellis recording contains zero-valued pauses shorter than one second. These checks do not establish transcript accuracy, pronunciation, or subjective speech quality. The unmodified full recordings remain available for independent listening. This publication does not claim a listening or ASR evaluation.

### Execution conditions and preserved diagnostic

The baseline cells use native Apple M1 Pro hardware, headed Google Chrome `157.0.8103.40`, AC power, and disposable profiles. A shared OS lock serializes benchmark, diagnostic, and audio-publication workloads. Lightweight coordinator metadata work may still occur; this is not a claim that every unrelated operating-system process was idle. The source, model settings and six plans remain unchanged.

The initial Robot cached attempt used Chrome `157.0.8103.79` after the installed browser updated. Its [unaltered diagnostic receipt](diagnostics/chrome-157.0.8103.79/result.json) is preserved outside the baseline Reference results. The accepted resource measurement was rerun using the explicitly pinned `.40` executable. No timing or RAM from the `.79` attempt is pooled into the baseline.

The observed serialized order is retained in `execution-provenance.json`. Two unique CPU warm waiters were registered before the final Trellis capability probe, preventing capability-only queueing from repeatedly delaying full warm measurements. The original controller then skipped those completed cells. No article was duplicated to obtain a better timing or recording.

There was no cold-download test. Registered model/runtime sizes and ideal transfer estimates at 1 Mbps remain distinct from the cached HTTP-byte counters recorded by these resource runs.
