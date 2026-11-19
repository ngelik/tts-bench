# Inflect Atom v3 browser campaign

The four cells in the [source-pinned plan](plan.json) are scheduled on the designated eight-core Apple M1 Pro with 16 GiB RAM and headed Google Chrome 157.0.8103.40. The [live dashboard](https://ngelik.github.io/tts-bench/?models=inflect-atom-v3) shows published results. This plan is a reproducibility record, not a measurement or placeholder score.

Both providers use the same FP32 acoustic weights, Cassidy voice, rule-based English frontend and seeded local DSP. CPU uses one-thread WASM. WebGPU accelerates the convolutional decoder with WASM fallback while the GRU encoder, frontend and DSP remain on WASM; a real hardware-dispatch capability check is required. [Implementation, qualification, voice and license details](../../models/inflect-atom-v3.md).

The fixed article contains 20,000 English characters in 93 spans. The order is CPU cached, WebGPU cached, CPU warm, WebGPU warm. Each cached cell generates one complete article while recording Chrome memory every 500 ms. Each warm cell excludes one complete warm-up article, then scores five repetitions. CPU and WebGPU offline smoke checks precede these four full-article cells. The designated machine runs one phase at a time.

Model weights total 708,038 bytes (0.708038 decimal MB); runtime, frontend data and licenses add download bytes. Cached HTTP counters describe the warmed scenario, not the complete first installation or a measured 1 Mbps transfer. Every canonical span is below the 510-phone input limit. The implementation explicitly discloses line-whitespace normalization and its seeded MT19937/polar noise adaptation.

## Replay

Save the plan outside the checkout before switching to its exact source. Set `CHROME_PATH` to the actual headed Chrome executable and the machine label to the real hardware. Reference submissions require the repository's designated M1 Pro baseline. Record actual browser, power and background conditions in the local plan's `conditions` field. Read the model and runtime license notes before acknowledging them.

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
plan_dir=$(mktemp -d)
plan="$plan_dir/inflect-atom-v3.json"
git show origin/main:docs/campaigns/inflect-atom-v3/plan.json > "$plan"
revision=$(node -p 'require(process.argv[1]).sourceCommit' "$plan")
git checkout --detach "$revision"
npm ci
node bin/bench.mjs assets fetch --model inflect-atom-v3 --accept-license
node bin/bench.mjs assets verify --model inflect-atom-v3 --accept-license
node bin/bench.mjs run --model inflect-atom-v3 --backend cpu --scenario offline --smoke --accept-license
node bin/bench.mjs run --model inflect-atom-v3 --backend webgpu --scenario offline --smoke --accept-license
node tools/run-campaign.mjs --plan "$plan" --dry-run
node tools/run-campaign.mjs --plan "$plan" --machine "Your actual machine, processor and RAM" --accept-license
```

Inspect any failed smoke before scoring that backend. The campaign runner stops on an error for review. To continue the remaining cells, copy the plan to another file outside the checkout and remove only the completed cells; keep its source pin and surviving options unchanged. Do not rerun completed measurements merely to finish a later cell. Submit the original native receipts, the final scored WAV, derived listening clips and generated report through a pull request following the [repository skill](../../../skills/browser-tts-benchmark/SKILL.md). Hosted compatibility timings and smoke checks are not reference scores.

## Published measurements

[Native receipts, generated table and visualization](../../../reports/inflect-atom-v3/overview.md). Warm timings use five scored repetitions after an excluded full-article warmup. Cached memory uses one separate generation per backend. The main listening examples use each backend’s final scored warm trial; both cached observations remain individually retrievable.
