# Audio8 codec-routing repair retest

This four-cell schedule retests Audio8 Realistic with the corrected decoder routing in source [`9c7d8801`](https://github.com/ngelik/tts-bench/commit/9c7d880199e87a15a3959ae94b632f9d9cdd40da). It is an addendum to the archived November campaign, not a replacement of its receipts. The exact pinned schedule is [plan.json](plan.json).

## What changed

The original WebGPU configuration routed the FP16 codec decoder through WebGPU, where the output contained long constant PCM16 runs. The repaired configuration keeps both autoregressive transformers on the requested CPU/WASM or WebGPU/WASM path, but runs the codec decoder on WASM for both. The pinned `pcm16-constant-run-v1` gate rejects a whole-span constant output or a constant run of at least one second and at least half a span. Its per-span evidence is retained after synthesis and checked again when validating receipts.

Before the repair source was approved, the native M1 A/B replay processed the same 358 codec frames (733,184 expected samples) through both decoder routes. It reproduced the old GPU decoder's 667,577-sample constant run at amplitude −281; the WASM decoder produced the same-sized output with a maximum constant run of 433 samples. The autoregressive GPU path recorded 1,624,576 dispatches. The A/B evidence is available as [diagnostic JSON](https://github.com/ngelik/tts-bench/releases/download/first-span-2026-11/audio8-same-code-e15e9386.json) and [corrected 233-character WAV](https://github.com/ngelik/tts-bench/releases/download/first-span-2026-11/audio8-same-code-e15e9386.wav). This first-span codec replay is a diagnostic, not a speed score or a transcript-accuracy review.

## Scheduled cells

| Order | Backend | Scenario | Articles | Purpose |
|---:|---|---|---:|---|
| 1 | WebGPU | Cached | 1 | Generation-window Chrome process-tree RSS |
| 2 | WebGPU | Warm | 1 excluded + 5 scored | Repeated generation timing |
| 3 | CPU | Cached | 1 | Generation-window Chrome process-tree RSS |
| 4 | CPU | Warm | 1 excluded + 5 scored | Repeated generation timing |

The fixture is the complete 20,000-character English article in 93 source spans. Settings remain temperature 0.7, top-p 0.9, top-k 50, seed 42 and six WASM threads. The codec providers are `wasm` on both backends; autoregressive providers are `wasm` for CPU and `webgpu, wasm` for WebGPU. GPU dispatch is still required for WebGPU, and CPU/WASM fallback work is disclosed. Cached RAM results are separate diagnostics and do not replace warm timing results. RSS includes the isolated Chrome process tree, browser baseline and inference workers; it is not model-only RAM or GPU memory.

## Backend-selected payload estimate

The corrected source loads one shared model-data set, then selects the ONNX Runtime entry points and threaded WASM sidecars for the requested backend. These are ideal estimates from the exact corrected [source commit](https://github.com/ngelik/tts-bench/tree/9c7d880199e87a15a3959ae94b632f9d9cdd40da), [Audio8 worker](https://github.com/ngelik/tts-bench/blob/9c7d880199e87a15a3959ae94b632f9d9cdd40da/web/workers/audio8.mjs) and [asset lock](https://github.com/ngelik/tts-bench/blob/9c7d880199e87a15a3959ae94b632f9d9cdd40da/assets.lock.json). The full staged inventory for the earlier registration remains in the [November campaign table](../nov14-english/README.md#download-size-at-1-mbps). These are not observed transfers; no cold-load check was run.

| Backend | Model data (bytes) | Selected runtime (bytes) | Total (bytes) | Ideal at 1 Mbps |
|---|---:|---:|---:|---:|
| CPU | 599,932,433 | 15,776,766 | 615,709,199 | 1:22:06 |
| WebGPU | 599,932,433 | 29,721,388 | 629,653,821 | 1:23:57 |

The model-data sum is the three ONNX graph/external-data pairs (`kind: model-weights`), `audio8-realistic-tokenizer-tokenizer-json`, and the loaded 111-byte `audio8-realistic-provider-policy-v2`. The CPU runtime selects `ort.wasm.min.mjs`, `ort-wasm-simd-threaded.mjs` and `.wasm`; WebGPU selects `ort.webgpu.min.mjs`, `ort-wasm-simd-threaded.asyncify.mjs` and `.wasm`. Both select `transformers.min.js`. Sum those entries' pinned `bytes` in the lock; divide by 125,000 bytes/second and round to the nearest second.

The estimate excludes the unrequested alternate runtime files, licenses and metadata such as `runtime_manifest.json`, plus project-owned modules such as `web/adapters/audio8.mjs`, `web/workers/audio8.mjs`, `web/audio8/generation.mjs`, `web/audio8/signal.mjs` and `web/cache-model-asset.mjs`, the benchmark page and browser shell. Compression, HTTP framing, connection overhead and application-module transfers are outside this file-byte sum; it is not an observed customer download.

<!-- audio8-outcomes:start -->
## Published native outcomes

This table updates as each completed full cell is independently submitted. Pending cells have not produced a public result. A no-score status is preserved as recorded and is never treated as a timing value. Cached RSS and warm timing remain separate.

| Backend | Scenario | Current outcome | Evidence |
|---|---|---|---|
| webgpu | cached | Measured | [Native receipt](../../../results/2026-11-16t15-01-49-165z-audio8-realistic-0.6b-int4-webgpu-cached-d5ca5718/summary.md) |
| webgpu | warm | Measured | [Native receipt](../../../results/2026-11-16t21-11-13-259z-audio8-realistic-0.6b-int4-webgpu-warm-ad53a67c/summary.md) |
| cpu | cached | Measured | [Native receipt](../../../results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md) |
| cpu | warm | Pending | Not submitted |

No CPU/WebGPU warm speed comparison is published until both warm cells are measured and validated.

<!-- audio8-outcomes:end -->

### Relationship to the archived results

Earlier Audio8 receipts remain linked in [Reference results](../../../README.md#reference-results). They describe the prior asset registration and are not results for this schedule. In particular, the archived WebGPU cached/warm evidence retains the decoder fault and is not treated as a valid repaired speech score. The older CPU cached receipt is also archived relative to this registration; no CPU warm score is inferred from it. The dashboard preserves the older receipts and their status while showing each new cell as it is submitted. New receipts must cite the pinned source and match the current assets before they can satisfy this schedule.

The cell order is fixed and sequential. An error or unsupported backend remains in the record; do not retry an unchanged cell or substitute its warm timing with cached timing. A failed acoustic gate is not a score, but its native receipt and saved failure waveform remain diagnostic evidence. A score is publishable only when all five scored warm trials and the excluded warm-up pass the gate and the final WAV matches the recorded trial.

## Reproduce

Use a clean checkout and headed Google Chrome on the M1 Pro reference machine. The source and assets may be staged before the slot; synthesis must remain sequential in Chrome. The model and conversion use Apache-2.0 terms; see the [license inventory](../../LICENSING.md) and [Audio8 configuration](../../AUDIO8_REALISTIC.md).

```sh
git worktree add --detach ../tts-bench-audio8-repair 9c7d880199e87a15a3959ae94b632f9d9cdd40da
cd ../tts-bench-audio8-repair
npm ci --cache .cache/npm
npm run assets -- verify --model audio8-realistic-0.6b-int4 --accept-license
export CHROME_PATH="/path/to/Google Chrome"
machine='MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64'
npm run bench -- run --model audio8-realistic-0.6b-int4 --backend webgpu --scenario cached --smoke --machine "$machine" --accept-license
npm run bench -- run --model audio8-realistic-0.6b-int4 --backend cpu --scenario cached --smoke --machine "$machine" --accept-license
node tools/run-campaign.mjs --plan "$PWD/docs/campaigns/audio8-codec-repair/plan.json" \
  --machine "$machine" --accept-license
```

The smoke checks are installation/capability diagnostics, not scores. The full plan runs one untimed capability synthesis before each measured cell. If native campaign orchestration stops on an error for review, preserve that attempt and resume only the remaining eligible cells with the same source pin; never edit a receipt. Validate every result and waveform with the repository's native publication checks before submitting it.
