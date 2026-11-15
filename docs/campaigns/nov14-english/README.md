# Reproduce the November English TTS campaign

The [machine-readable plan](plan.json) reproduces the 14 full-article cells for Ming 3.0, Audio8 Realistic and Fun-CosyVoice3. It uses the 20,000-character English article in 93 spans. Seven cached cells collect generation-window Chrome process-tree RSS from one scored full article each. Seven warm cells each run one excluded full article followed by five timed articles. Each article has a 1,440-minute timeout. WebGPU runs precede CPU within each phase. The order in the plan is fixed. Ming Q8_0 GGUF and six-thread Fusor mixed-quantization CPU are distinct configurations. [Published campaign table and receipts](../../../reports/nov14-multilingual-english/overview.md)

For the latest dashboard evidence, filter to these four exact configurations: [table view](https://ngelik.github.io/tts-bench/?models=audio8-realistic-0.6b-int4,fun-cosyvoice3-0.5b-2512,ming-3.0-tts-0.5b-gguf,ming-3.0-tts-0.5b-fusor-mix-cpu#results) · [chart view](https://ngelik.github.io/tts-bench/?models=audio8-realistic-0.6b-int4,fun-cosyvoice3-0.5b-2512,ming-3.0-tts-0.5b-gguf,ming-3.0-tts-0.5b-fusor-mix-cpu&view=charts#results). The dashboard shows each configuration's own latest published evidence and archived warnings. The links select configurations; they do not make the source, protocol or receipts matched across models.

The reference machine is a MacBook Pro with an 8-core Apple M1 Pro, 16 GiB RAM, arm64, Darwin 25.6.0 and headed Google Chrome 157.0.8103.40. Use AC power and a hardware WebGPU adapter, with one dedicated benchmark tab and no parallel model runs. Other machines can run the plan with their actual machine label. The controller records the installed environment alongside the measurements. [Protocol](../../PROTOCOL.md)

## Stage the pinned runtime

Keep the current documentation in one checkout and run the benchmark from the clean source commit used by the receipts. The plan was added after that commit.

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
campaign_docs="$PWD/docs/campaigns/nov14-english"
source_commit=ab5aec3e510420adbcac9971f35f92152b19959c
git worktree add --detach ../tts-bench-nov14 "$source_commit"
cd ../tts-bench-nov14
npm ci
npm ls --depth=0
```

Node 22+ is required. The reference host used Node 22.22.3 and npm 10.9.8. The lockfile supplies Playwright Core 1.65.0, Transformers.js 3.5.1, ONNX Runtime Web 1.23.2 and the separate `onnxruntime-web-pocket` alias at 1.31.1. Read the registered terms before using the acceptance flag. The asset commands fetch and hash-check the four configurations, including voice assets, tokenizers and runtimes. The Ming GGUF entry downloads its pinned 1,742,280,896-byte model and the matching `bench_browser.js`, `bench_browser.wasm` and `THIRD-PARTY-NOTICES.txt` from the benchmark's `audio-cpp-browser-v1` release. [Pinned asset lock](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/assets.lock.json) · [License details](../../LICENSING.md)

```sh
for model in fun-cosyvoice3-0.5b-2512 ming-3.0-tts-0.5b-gguf \
             audio8-realistic-0.6b-int4 ming-3.0-tts-0.5b-fusor-mix-cpu
do
  npm run assets -- fetch --model "$model" --accept-license || exit 1
  npm run assets -- verify --model "$model" --accept-license || exit 1
done
```

## Download size at 1 Mbps

The core weights are the model files used by each configuration. The complete bundle counts every asset in its pinned receipt once, including frontend, voice, runtime and license files where present. Both CPU and WebGPU receipts for Audio8 and Fun-CosyVoice3 list the same bundle. Browser cache reuse, compression and backend-specific requests can change the actual transfer. This campaign skipped cold-load timing.

| Configuration | Core weights (MB) | 1 Mbps, weights | Complete bundle (MB) | 1 Mbps, bundle | Source |
|---|---:|---:|---:|---:|---|
| Audio8 Realistic 0.6B INT4 | 587.71 | 1:18:22 | 644.95 | 1:26:00 | [Receipt](../../../results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/result.json) |
| Fun-CosyVoice3 0.5B Q8/Q4 | 905.67 | 2:00:45 | 961.04 | 2:08:08 | [Receipt](../../../results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/result.json) |
| Ming 3.0 Fusor mixed quantization | 838.60 | 1:51:49 | 853.24 | 1:53:46 | [Receipt](../../../results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/result.json) |
| Ming 3.0 Q8_0 GGUF | 1,742.28 | 3:52:18 | 1,748.77 | 3:53:10 | [Receipt](../../../results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/result.json) |

Times are ideal estimates in hours:minutes:seconds at 1,000,000 bits/s. Divide the exact file bytes by 125,000 bytes/s and round to the nearest second. MB uses decimal units. The bundle excludes the benchmark application, npm installation and protocol overhead.

To reproduce the complete byte count from any linked receipt, run `jq '[.assets[].bytes] | add' result.json`. For the weights column, sum only receipt entries whose IDs have kind `model-weights` in the [campaign asset lock](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/assets.lock.json).

## Run all 14 cells

```sh
machine='MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64'
test "$(git rev-parse HEAD)" = "$source_commit" && \
  node tools/run-campaign.mjs --plan "$campaign_docs/plan.json" \
    --machine "$machine" --accept-license
```

The runner saves the plan, status, attempts ledger and final status in `runs/campaign-*/`. Per-run receipts and scored WAVs are under `runs/<run-id>/`. Cached resource trials and warm timing trials have separate protocol IDs. The standard runner adds its own campaign ID and cell-index note to each receipt. Results are eligible for submission only after validation. [Publication workflow](../../../CONTRIBUTING.md)

## Why the Ming Q8_0 CPU run stopped

The six-thread CPU run with `audio-cpp-browser-v1` stopped during generation and produced no full-article timing or memory score. A follow-up with the same model, runtime, Chrome version and first two article spans reproduced the failure in a single CPU session. Span 1 (233 characters) produced 582,120 finite samples at 44.1 kHz. During span 2 (223 characters), Emscripten reported that its 12-worker pthread pool was exhausted. ggml then aborted while creating a thread. The original receipt points to the same assertion in the pinned Wasm binary. [Original CPU receipt](../../../results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/result.json) · [Upstream thread creation and assertion](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/external/ggml/src/ggml-cpu/ggml-cpu.c#L3471-L3472)

Ming's separately registered Fusor CPU configuration completed the full article. Its timing, recording and memory result belong to that runtime and quantization. [Campaign results](../../../reports/nov14-multilingual-english/overview.md)

## Resume after an interruption

The standard runner stops for review if a cell fails or its RAM coverage is insufficient. Inspect the failed run and its source before retrying. Preserve every attempt. To continue, pass the original plan and every `attempts.jsonl` from **this reproduction** to the helper below. The helper verifies successful receipts and their source, keeps unsupported outcomes, and writes the still-pending cells in their original order. A partially generated article has no accepted receipt and restarts at that cell. A source change starts a new comparison cohort.

```sh
# Replace this path with the campaign directory printed by your run.
ledger=runs/campaign-YOUR-RUN/attempts.jsonl
node "$campaign_docs/remaining.mjs" "$campaign_docs/plan.json" "$ledger" > runs/nov14-remaining.json && \
  if test -s runs/nov14-remaining.json; then
    node tools/run-campaign.mjs --plan runs/nov14-remaining.json \
      --machine "$machine" --accept-license
  fi
```

On a second interruption, list the previous and new ledger paths together after the original plan argument. If a host interruption happened after the run wrote its receipt but before the controller recorded the ledger entry, manually validate that receipt and reconcile the ledger before resuming.
