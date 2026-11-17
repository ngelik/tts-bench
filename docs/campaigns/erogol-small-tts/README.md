# Small TTS family comparison

Five of the families in Eren Golge’s comparison were missing from the Chrome benchmark on November 17, 2026. The table identifies the English checkpoints selected for our M1 Pro runs. [Source comparison](https://erogol.com/small_tts_bench/) · [Reference results at selection](https://github.com/ngelik/tts-bench/tree/f456cce4422663e3217a885a4c52e8ef4735dd6d#reference-results)

| Family | Selected checkpoint |
| --- | --- |
| Linnet | [VoxRT/linnet-en-35m](https://huggingface.co/VoxRT/linnet-en-35m) |
| SupraTTS | [SupraLabs/SupraTTS-1.0-Preview](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview) |
| Silencio | [BlueRoseLabs/Silencio-2](https://huggingface.co/BlueRoseLabs/Silencio-2) |
| Klein-TTS | [klein-ml/Klein-TTS-X1.5-Pro](https://huggingface.co/klein-ml/Klein-TTS-X1.5-Pro) |
| Sopro | [samuel-vitorino/sopro-v2-turbo](https://huggingface.co/samuel-vitorino/sopro-v2-turbo) |

Eight entries have existing family coverage: Phonon, Tiny Voca, Mach Boom, Paradee, Pocket TTS, Kokoro, Underdog Woof and Inflect. The source names nano-edge-tts as a Kokoro variant and lists both Silencio and Silencio-2. Selecting by family gives Kokoro its existing result and Silencio a single new entry. Phonon and Woof have historical measurements. Mach Boom has a CPU measurement and an unsupported GPU result.

## Measurements

Each supported backend runs the fixed 20,000-character English article in headed Google Chrome on the eight-core, 16 GiB Apple M1 Pro. One full warm-up precedes five timed articles. A separate cached article provides average Chrome process-tree memory during generation. The warm timing includes model output through the final CPU-readable audio samples. The configuration records the selected voice and precision, including any backend-specific differences. [Benchmark protocol](../../PROTOCOL.md) · [Memory measurement](../../MEMORY.md)

The source comparison used five shorter texts and a Linux AMD EPYC CPU. Its audio and timings belong to that experiment. For these browser runs, the reference table links each submitted receipt, and the dashboard displays its associated audio when available. [Browser comparison and recordings](https://ngelik.github.io/tts-bench/?models=linnet-en-35m,supratts-1.0-preview,silencio-2,klein-tts-x1.5-pro,sopro-v2-turbo)

## Replay a browser measurement

Each plan pins the source revision that implements its model. Keep the plan outside the checkout while switching revisions. The example runs Sopro on both CPU and WebGPU. Set the machine label to the hardware and RAM on which you run Chrome. Before execution, edit the local plan’s `conditions` field to record the actual browser version, power and background load. To match the reference, set `CHROME_PATH` to the headed Google Chrome 157.0.8103.40 executable on an eight-core M1 Pro with 16 GiB RAM. [Registered replay plans](plans/)

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
model=sopro-v2-turbo
plan_dir=$(mktemp -d)
plan="$plan_dir/$model.json"
git show "origin/main:docs/campaigns/erogol-small-tts/plans/$model.json" > "$plan"
revision=$(node -p 'require(process.argv[1]).sourceCommit' "$plan")
git checkout --detach "$revision"
npm ci
node bin/bench.mjs assets fetch --model "$model" --accept-license
node tools/run-campaign.mjs --plan "$plan" --dry-run
node tools/run-campaign.mjs --plan "$plan" --machine "Your actual machine, processor and RAM" --accept-license
```

The Linnet plan uses the official VoxRT WASM runtime for CPU. Its WebGPU configuration runs dense matrix operations on hardware and the remaining operations in WASM. The hosted CPU recording used the earlier CPU-only registration. [Linnet GPU runtime](../../../tools/linnet-webgpu-runtime/) · [Earlier CPU-only plan](https://github.com/ngelik/tts-bench/blob/b5b2a458b350e041f34aa788ea4985082b2e3f57/docs/campaigns/erogol-small-tts/plans/linnet-en-35m.json)

Warm and cached-memory receipts use different timing boundaries. Sopro’s CPU and WebGPU profiles also use different precision. The source receipt for each observation records its profile and effective backend. [How to submit results](../../../CONTRIBUTING.md)

## Full-article CPU checks in hosted Chrome

Each recording contains the same 20,000-character English article. The time covers one cached generation through the last audio sample. Each machine exposed four logical cores. Hardware and Chrome patch versions varied between jobs, so use the M1 Pro dashboard for like-for-like warm timings.

| Model | Linux runner CPU | Chrome 157 build | Generation | Speech duration | Article check |
| --- | --- | --- | ---: | ---: | --- |
| SupraTTS | AMD EPYC 9V74 | 8103.50 | 0:24 | 21:24 | [93/93 spans](https://github.com/ngelik/tts-bench/actions/runs/44107462780/job/134123604018) |
| Klein-TTS | Intel Xeon 6975P-C | 8103.78 | 3:28 | 20:59 | [93/93 spans](https://github.com/ngelik/tts-bench/actions/runs/44108678629/job/134127968330) |
| Linnet | AMD EPYC 7763 | 8103.50 | 4:44 | 17:32 | [93/93 spans](https://github.com/ngelik/tts-bench/actions/runs/44110232347) |
| Silencio | AMD EPYC 9V74 | 8103.50 | 16:51 | 20:05 | [93/93 spans](https://github.com/ngelik/tts-bench/actions/runs/44124788882/job/134185489479) |
| Sopro | AMD EPYC 7763 | 8103.50 | 23:20 | 20:24 | [93/93 spans](https://github.com/ngelik/tts-bench/actions/runs/44107462780/job/134123603712) |

Times are minutes:seconds. The jobs verified the full WAV against the browser receipt and cut the first 30 seconds from that recording. An offline recognizer also checked the opening and closing passages of all five articles. [Speech check](https://github.com/ngelik/tts-bench/actions/runs/44128647210)

[Listen to the five recordings in your browser](https://ngelik.github.io/tts-bench/diagnostics/erogol-small-tts/) or [download the listening comparison](https://github.com/ngelik/tts-bench/releases/download/small-tts-families-chrome-cpu-2026-11-17/listen-and-compare.zip) (5.4 MB). Extract the ZIP and open `index.html` for five 30-second examples, the duration chart and links to the full articles. [Full WAVs and credits](https://github.com/ngelik/tts-bench/releases/tag/small-tts-families-chrome-cpu-2026-11-17)
