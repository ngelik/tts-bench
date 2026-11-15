# Tiny Voca English campaign

The [pinned plan](plan.json) runs the 20,000-character English fixture in 93 spans with the F2 preset at 24 kHz. Both backends use the same FP32 weights, phonemizer and one WASM thread. The WebGPU measurement requires verified hardware dispatch and completed PCM readback. [Adapter and model settings](https://github.com/ngelik/tts-bench/pull/51)

| Order | Backend | Scenario | Excluded articles | Scored articles | Memory |
|---:|---|---|---:|---:|---|
| 1 | CPU | Cached | 0 | 1 | Generation-window Chrome process-tree RSS |
| 2 | WebGPU | Cached | 0 | 1 | Generation-window Chrome process-tree RSS |
| 3 | CPU | Warm | 1 | 5 | Timing only |
| 4 | WebGPU | Warm | 1 | 5 | Timing only |

## Download size at 1 Mbps

The ONNX file contains both American English voices. Chrome also needs the English phonemizer, its Python and NumPy dependencies, and the ONNX Runtime files selected for the backend. The following estimates use the pinned file sizes before HTTP compression.

| Files counted | Bytes | Decimal MB | Ideal time at 1 Mbps |
|---|---:|---:|---:|
| ONNX weights alone | 21,386,372 | 21.39 | 2m 51s |
| CPU inference assets, including weights | 64,596,531 | 64.60 | 8m 37s |
| WebGPU inference assets, including weights | 78,238,377 | 78.24 | 10m 26s |
| Complete staged bundle for both backends, including notices | 90,606,287 | 90.61 | 12m 05s |

Each inference row counts 14 shared files once and three backend-specific ONNX Runtime files. WebGPU selects the larger Asyncify build. The complete bundle counts all 28 distinct pinned files once. These figures exclude the benchmark application and npm installation. Actual browser transfer depends on compression and cache reuse. Connection setup and runtime initialization add time. This campaign skips cold-load measurements. [Pinned assets](https://github.com/ngelik/tts-bench/blob/6ad6b9f4f062c77514e1fc8da4254327b2cf2e59/assets.lock.json) · [Backend file selection](https://github.com/ngelik/tts-bench/blob/6ad6b9f4f062c77514e1fc8da4254327b2cf2e59/web/workers/tiny-voca.mjs) · [Phonemizer file selection](https://github.com/ngelik/tts-bench/blob/6ad6b9f4f062c77514e1fc8da4254327b2cf2e59/web/tiny-voca/dizione.mjs)

To reproduce the byte counts in the scoring checkout, run the command below. Divide each result by 125,000 for ideal seconds at 1,000,000 bits/s.

```sh
jq '
  .models["tiny-voca"] |
  ([.assets[] | select(.kind == "model-weights")] | map(.bytes) | add) as $weights |
  ([.assets[] | select(.kind == "model-weights" or .kind == "model-support" or .kind == "runtime")]
    | map(.bytes) | add) as $shared |
  [.runtime.files[] | select(.path | startswith("dist/"))] as $ort |
  def gpu: .path | test("webgpu|asyncify");
  {
    weights: $weights,
    cpu: ($shared + ([$ort[] | select(gpu | not) | .bytes] | add)),
    webgpu: ($shared + ([$ort[] | select(gpu) | .bytes] | add)),
    staged: ([.assets[], .runtime.files[]] | map(.bytes) | add)
  }
' assets.lock.json
```

<!-- tiny-voca-outcomes:start -->
## Published native outcomes

This table updates as each completed full cell is independently submitted. Pending cells have not produced a public result. A no-score status is preserved as recorded and is never treated as a timing value. Cached RSS and warm timing remain separate.

| Backend | Scenario | Current outcome | Evidence |
|---|---|---|---|
| cpu | cached | Measured | [Native receipt](../../../results/2026-11-15t22-52-41-928z-tiny-voca-cpu-cached-1379ab10/summary.md) |
| webgpu | cached | Measured | [Native receipt](../../../results/2026-11-15t22-55-04-428z-tiny-voca-webgpu-cached-4a50b4ec/summary.md) |
| cpu | warm | Pending | Not submitted |
| webgpu | warm | Pending | Not submitted |

No CPU/WebGPU warm speed comparison is published until both warm cells are measured and validated.

<!-- tiny-voca-outcomes:end -->

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
