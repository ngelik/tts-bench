# Reproduce the November English TTS campaign

The frozen [machine-readable original plan](plan.json) records the 14 full-article cells for Ming 3.0, Audio8 Realistic and Fun-CosyVoice3. It uses the 20,000-character English article in 93 spans. Seven cached cells collect generation-window Chrome process-tree RSS from one scored full article each. The original seven warm cells each planned one excluded full article followed by five timed articles. Each article has a 1,440-minute timeout. WebGPU runs precede CPU within each phase. The order in the plan is fixed. Ming Q8_0 GGUF and six-thread Fusor mixed-quantization CPU are distinct configurations. A fresh replay keeps this file as provenance, but new CosyVoice3 tests use one scored article for every scenario on either backend; warm runs also keep the excluded warm-up. The current CPU evidence is an operator-reviewed selection of two completed articles from five planned; the original receipt remains error. [Selection details and checkpoints](cosy-cpu-warm-selection.md) · [Published campaign table and receipts](../../../reports/nov14-multilingual-english/overview.md)

Compare the four configurations in the [table view](https://ngelik.github.io/tts-bench/?models=audio8-realistic-0.6b-int4,fun-cosyvoice3-0.5b-2512,ming-3.0-tts-0.5b-gguf,ming-3.0-tts-0.5b-fusor-mix-cpu#results) or [chart view](https://ngelik.github.io/tts-bench/?models=audio8-realistic-0.6b-int4,fun-cosyvoice3-0.5b-2512,ming-3.0-tts-0.5b-gguf,ming-3.0-tts-0.5b-fusor-mix-cpu&view=charts#results). Each value links to its own published receipt. The dashboard retains warnings on archived results and marks compatible CPU/GPU pairs. Each metric retains its own source and protocol.

The [November 15 interim report](https://github.com/ngelik/tts-bench/releases/tag/nov14-english-m1-report-2026-11-15) includes the English article, a CSV, charts, and six recordings. Extract [the ZIP](https://github.com/ngelik/tts-bench/releases/download/nov14-english-m1-report-2026-11-15/three-model-m1-pro.zip) and open `listen.html` for offline playback. The snapshot includes five-run WebGPU results for Fun-CosyVoice3 and the original Ming Q8_0 runtime. Follow the [Ming v3 retest](../nov14-ming-v3/README.md) and the [Audio8 retest](../audio8-codec-repair/README.md) for their revised configurations.

The reference machine is a MacBook Pro with an 8-core Apple M1 Pro, 16 GiB RAM, arm64, Darwin 25.6.0 and headed Google Chrome 157.0.8103.40. Use AC power and a hardware WebGPU adapter, with one dedicated benchmark tab and no parallel model runs. Other machines can run the plan with their actual machine label. The controller records the installed environment alongside the measurements. [Protocol](../../PROTOCOL.md)

## Reproduce the original source cohort

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

The core weights are the model files used by each configuration. The complete bundle counts every asset in its pinned receipt once, including frontend, voice, runtime and license files where present. Both CPU and WebGPU receipts for Audio8 and Fun-CosyVoice3 list the same bundle. This is the full staged inventory, not a backend-specific transfer measurement. Browser cache reuse, compression and backend-specific requests can change actual transfer; this campaign skipped cold-load timing.

| Configuration | Core weights (MB) | 1 Mbps, weights | Complete bundle (MB) | 1 Mbps, bundle | Source |
|---|---:|---:|---:|---:|---|
| Audio8 Realistic 0.6B INT4 | 587.71 | 1:18:22 | 644.95 | 1:26:00 | [Receipt](../../../results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/result.json) |
| Fun-CosyVoice3 0.5B Q8/Q4 | 905.67 | 2:00:45 | 961.04 | 2:08:08 | [Receipt](../../../results/2026-11-14t15-12-11-363z-fun-cosyvoice3-0.5b-2512-webgpu-cached-168c91d4/result.json) |
| Ming 3.0 Fusor mixed quantization | 838.60 | 1:51:49 | 853.24 | 1:53:46 | [Receipt](../../../results/2026-11-14t19-30-24-576z-ming-3.0-tts-0.5b-fusor-mix-cpu-cpu-cached-40143301/result.json) |
| Ming 3.0 Q8_0 GGUF | 1,742.28 | 3:52:18 | 1,748.77 | 3:53:10 | [Receipt](../../../results/2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63/result.json) |

Times are ideal estimates in hours:minutes:seconds at 1,000,000 bits/s. Divide the exact file bytes by 125,000 bytes/s and round to the nearest second. MB uses decimal units. The bundle excludes the benchmark application, npm installation and protocol overhead.

To reproduce the complete byte count from any linked receipt, run `jq '[.assets[].bytes] | add' result.json`. For the weights column, sum only receipt entries whose IDs have kind `model-weights` in the [campaign asset lock](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/assets.lock.json).

### Backend-selected model and runtime payload

These are ideal estimates from the original campaign source commit, not observed downloads or cold-load timings. “Model data” includes weights and the tokenizer, voice, config or manifest files that the selected worker loads. “Runtime” includes the locked backend-specific runtime files. Each distinct URL is counted once; divide the total file bytes by 125,000 bytes/second and round to the nearest second.

| Configuration | Backend | Model data (bytes) | Selected runtime (bytes) | Total (bytes) | Ideal at 1 Mbps |
|---|---|---:|---:|---:|---:|
| Audio8 Realistic 0.6B INT4, archived registration | CPU | 599,932,322 | 15,776,766 | 615,709,088 | 1:22:06 |
| Audio8 Realistic 0.6B INT4, archived registration | WebGPU | 599,932,322 | 29,721,388 | 629,653,710 | 1:23:57 |
| Fun-CosyVoice3 0.5B Q8/Q4 | CPU | 916,881,956 | 14,927,315 | 931,809,271 | 2:04:14 |
| Fun-CosyVoice3 0.5B Q8/Q4 | WebGPU | 916,881,956 | 28,871,937 | 945,753,893 | 2:06:06 |
| Ming 3.0 Q8_0 GGUF | CPU | 1,742,280,896 | 6,427,366 | 1,748,708,262 | 3:53:10 |
| Ming 3.0 Q8_0 GGUF | WebGPU | 1,742,280,896 | 6,427,366 | 1,748,708,262 | 3:53:10 |
| Ming 3.0 Fusor mixed quantization | CPU | 850,115,730 | 3,058,023 | 853,173,753 | 1:53:45 |

The selectors are the initialization paths in the pinned [Audio8 worker](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/workers/audio8.mjs), [CosyVoice3 worker](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/cosyvoice3/worker.mjs), [Ming GGUF adapter](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/adapters/audio-cpp-gguf.mjs) and [worker](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/audio-cpp-gguf/worker.js), and [Ming Fusor worker](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/ming/worker.mjs), using the [asset lock at the same commit](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/assets.lock.json).

For Audio8, the model-data selector is all `model-weights` entries plus `audio8-realistic-tokenizer-tokenizer-json`. For CosyVoice3, it is all `model-weights` entries plus `cosyvoice3-tokenizer-json`, `cosyvoice3-voice-default-json` and `cosyvoice3-flow-noise-f16-bin`. For Ming GGUF, it is `ming-gguf-weights`. For Ming Fusor, it is `ming-fusor-000-bin` through `ming-fusor-014-bin`, `ming-fusor-tokenizer-json` and `ming-fusor-manifest-json`; the worker loads every part in the [pinned model manifest](https://huggingface.co/fusorlabs/ming-3.0-tts-0.5b-web/blob/62588575d91dceb33822fe1e3925e748393c6b3e/manifest.json). Audio8 and CosyVoice3 select `ort.wasm.min.mjs` with `ort-wasm-simd-threaded.mjs` and `.wasm` on CPU, or `ort.webgpu.min.mjs` with `ort-wasm-simd-threaded.asyncify.mjs` and `.wasm` on WebGPU. Audio8 also loads `transformers.min.js`. Ming GGUF uses the same `bench_browser.js` and `bench_browser.wasm` files on either backend. Ming Fusor selects `engine/dist/host/loader.js`, `engine/dist/web-threaded-relaxed/ming_runtime.js`, `ming_runtime_bg.wasm` and its `workerHelpers.no-bundler.js` module. The exact pinned [Fusor host loader](https://huggingface.co/spaces/fusorlabs/ming-wasm/blob/bdf46b41e966340f398fdd82d3ca64f4058ad892/engine/dist/host/loader.js) imports the selected glue, which imports the thread helper. The staged Fusor `engine/worker.js` entry is not imported by this benchmark worker and is excluded.

These totals exclude licenses and metadata not fetched by initialization, alternate backend runtime files, tts-bench adapter/worker modules, the benchmark page and browser shell, compression, HTTP framing and connection overhead. First-party module and shell transfer was not measured, so the figures are only the selected locked-file estimates, not customer transfer observations or cold-load results. The original Audio8 rows describe the archived source registration; the corrected Audio8 estimates are in the [codec-routing repair addendum](../audio8-codec-repair/README.md).

## Run all 14 cells

For a new run with the current CosyVoice3 policy, use a clean checkout of the
current committed source. The detached `ab5aec3` worktree above is only for
reproducing the original five-repetition setup. In the current checkout, install
dependencies and stage its currently registered assets before running the plan.

```sh
cd "$(git -C "$campaign_docs" rev-parse --show-toplevel)"
npm ci
for model in fun-cosyvoice3-0.5b-2512 ming-3.0-tts-0.5b-gguf \
             audio8-realistic-0.6b-int4 ming-3.0-tts-0.5b-fusor-mix-cpu
do
  npm run assets -- fetch --model "$model" --accept-license || exit 1
  npm run assets -- verify --model "$model" --accept-license || exit 1
done
machine='MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64'
node "$campaign_docs/replay-plan.mjs" > runs/nov14-replay-plan.json && \
  node tools/run-campaign.mjs --plan runs/nov14-replay-plan.json --dry-run && \
  node tools/run-campaign.mjs --plan runs/nov14-replay-plan.json \
    --machine "$machine" --accept-license
```

The replay helper pins the current clean source and records the frozen plan commit and SHA-256. Its output already contains the current effective count for CosyVoice3. The dry-run prints requested and effective counts and reports whether the input source pin matches the current commit; it is informational and never starts a run. Passing a copied legacy plan directly shows its old request alongside the one-trial effective count. Other plan cells retain their requested counts. The runner saves both the literal input plan and effective plan, status, attempts ledger and final status in `runs/campaign-*/`. Per-run receipts and scored WAVs are under `runs/<run-id>/`. Cached resource trials and warm timing trials have separate protocol IDs. The standard runner adds its own campaign ID and cell-index note to each receipt. Results are eligible for submission only after validation. [Publication workflow](../../../CONTRIBUTING.md)

## Audio8 CPU warm follow-up

The original Audio8 CPU warm cell was superseded before any native run started. Its remaining measurement belongs to the corrected routing-policy campaign at source `9c7d880199e87a15a3959ae94b632f9d9cdd40da`, using one excluded full article and five scored articles. The original plan and recorded results remain the historical schedule and evidence. [Machine-readable disposition](audio8-cpu-warm-supersession.json) · [Corrected schedule and replay commands](../audio8-codec-repair/README.md)

The original and corrected CPU cached runs produced identical PCM with SHA-256 `a92e055ab76dddff5e6f899aa8f97e8cbf6fb42ec4de159dab4d37296ee703eb`. Both CPU implementations place all neural stages on WASM. The corrected campaign also pins the codec-routing policy and records waveform validation, providing the source-compatible CPU counterpart to its corrected WebGPU result. Repeating the historical CPU warm cell would add an archived configuration. [Original CPU cached receipt](../../../results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/result.json) · [Corrected CPU cached receipt](../../../results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/result.json)

## Why the Ming Q8_0 CPU run stopped

The six-thread CPU run with `audio-cpp-browser-v1` stopped during generation and produced no full-article timing or memory score. A follow-up with the same model, runtime, Chrome version and first two article spans reproduced the failure in a single CPU session. Span 1 (233 characters) produced 582,120 finite samples at 44.1 kHz. During span 2 (223 characters), Emscripten reported that its 12-worker pthread pool was exhausted. ggml then aborted while creating a thread. The original receipt points to the same assertion in the pinned Wasm binary. [Original CPU receipt](../../../results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/result.json) · [Upstream thread creation and assertion](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/external/ggml/src/ggml-cpu/ggml-cpu.c#L3471-L3472)

Ming's separately registered Fusor CPU configuration completed the full article. Its timing, recording and memory result belong to that runtime and quantization. [Campaign results](../../../reports/nov14-multilingual-english/overview.md)

## Resume after an interruption

The standard runner stops for review if a cell fails or its RAM coverage is insufficient. Inspect the failed run and its source before retrying. Preserve every attempt. To continue, pass the saved replay plan and every `attempts.jsonl` from **this reproduction** to the helper below. The helper verifies successful receipts and their source, keeps unsupported outcomes, and writes the still-pending cells in their original order. A partially generated article has no accepted receipt and restarts at that cell. A source change starts a new comparison cohort.

```sh
# Replace this path with the campaign directory printed by your run.
campaign=runs/campaign-YOUR-RUN
ledger="$campaign/attempts.jsonl"
node "$campaign_docs/remaining.mjs" "$campaign/plan.json" "$ledger" > runs/nov14-remaining.json && \
  if test -s runs/nov14-remaining.json; then
    node tools/run-campaign.mjs --plan runs/nov14-remaining.json \
      --machine "$machine" --accept-license
  fi
```

On a second interruption, list the previous and new ledger paths together after the original plan argument. If a host interruption happened after the run wrote its receipt but before the controller recorded the ledger entry, manually validate that receipt and reconcile the ledger before resuming.
