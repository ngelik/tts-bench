# Tiny Voca English campaign

The [pinned plan](plan.json) runs the 20,000-character English fixture in 93 spans with the F2 preset at 24 kHz. Both backends use the same FP32 weights, phonemizer and one WASM thread. The WebGPU measurement requires verified hardware dispatch and completed PCM readback. [Adapter and model settings](https://github.com/ngelik/tts-bench/pull/51)

| Order | Backend | Scenario | Excluded articles | Scored articles | Memory |
|---:|---|---|---:|---:|---|
| 1 | CPU | Cached | 0 | 1 | Generation-window Chrome process-tree RSS |
| 2 | WebGPU | Cached | 0 | 1 | Generation-window Chrome process-tree RSS |
| 3 | CPU | Warm | 1 | 5 | Timing only |
| 4 | WebGPU | Warm | 1 | 5 | Timing only |

## Reproduce

Start in a clone of this repository and use Node 22+ with a desktop session. The reference machine is an 8-core Apple M1 Pro MacBook Pro with 16 GiB RAM running headed Google Chrome 157.0.8103.40 on AC power. Set `CHROME_PATH` to the actual Chrome executable. Use your own hardware label for another machine. Keep the scoring checkout clean and run one backend at a time. Review the [license inventory](../../LICENSING.md) before running the following commands.

```sh
plan="$PWD/docs/campaigns/tiny-voca-english/plan.json"
git worktree add --detach ../tts-bench-tiny-voca 6ad6b9f4f062c77514e1fc8da4254327b2cf2e59
cd ../tts-bench-tiny-voca
npm ci
npm run assets -- fetch --model tiny-voca
npm run assets -- verify --model tiny-voca

export CHROME_PATH="/path/to/Google Chrome"
machine='MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64'
for backend in cpu webgpu; do
  npm run bench -- run --model tiny-voca --backend "$backend" --scenario cached --smoke --machine "$machine" || exit 1
done
node tools/run-campaign.mjs --plan "$plan" --machine "$machine" --accept-license
```

Record actual power and background load before each cell. Each article has a 1,440-minute timeout. The standard runner stops when an attempt needs review. Inspect the receipt and continue any independent eligible cells using a copy of the plan that keeps its source pin and only the remaining cells. Submit the full receipts and recordings through the [result PR workflow](../../../CONTRIBUTING.md).

The dashboard discovers checked-in schedules at `docs/campaigns/<name>/plan.json`. A scheduled cell with matching registered assets appears as awaiting a result until a relevant receipt is published. Cached cells must request `resources: true` to schedule a memory measurement.
