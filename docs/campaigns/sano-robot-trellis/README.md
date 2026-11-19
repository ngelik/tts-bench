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
