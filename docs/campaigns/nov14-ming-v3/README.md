# Reproduce Ming Q8_0 with the v3 browser runtime

The [four-cell plan](plan.json) uses Ming 3.0 TTS 0.5B Q8_0 GGUF with the built-in English US_James voice. Both backends use the same checkpoint, seed, six-thread setting and 20,000-character English article. The v3 runtime reuses a session-owned GGML thread pool and limits the separate FFT worker reservation to six. The earlier v2 candidate exhausted the available workers during its native capability diagnostic. The original v1 campaign ran from commit `ab5aec3e510420adbcac9971f35f92152b19959c`. Its guide reproduces the original source, runtime and 14-cell plan. The results report retains that cohort’s CPU and WebGPU attempts. [Original v1 reproduction guide](https://github.com/ngelik/tts-bench/blob/ed9111f64c78be11b4747c03a97b0166e1e7ac41/docs/campaigns/nov14-english/README.md) · [Original v1 campaign results](../../../reports/nov14-multilingual-english/overview.md)

The reference machine is an 8-core Apple M1 Pro MacBook Pro with 16 GiB of memory, running arm64 Darwin 25.6.0 and headed Google Chrome 157.0.8103.40 on AC power. Run one benchmark at a time. Each backend generates one cached article with Chrome memory sampling, then one excluded warm-up and five timed articles in the warm session. The speed comparison uses those five timings. The tool checks WebGPU dispatch before accepting a GPU result. [Protocol](../../PROTOCOL.md)

The original v1 WebGPU warm run had a median of 5,238.509 seconds across five scored articles after one excluded warm-up. [Original v1 five-run WebGPU receipt](https://github.com/ngelik/tts-bench/blob/246361725689177f6a29f0a8e16e901ba50ba2d2/results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/result.json)

## Download size at 1 Mbps

Both v3 backends load the same registered GGUF weights (1,742,280,896 bytes), JavaScript (176,974 bytes) and Wasm (6,249,992 bytes). The complete registered bundle adds the model card, model license and runtime notices. The following estimates divide uncompressed asset bytes by 125,000 bytes per second and round to the nearest second. Actual transfer depends on the cache, compression and HTTP overhead. This campaign skipped cold-load timing. [Pinned v3 asset lock](https://github.com/ngelik/tts-bench/blob/d77c64289955a57526291d39b22caceffae40413/assets.lock.json)

| Backend | Weights + runtime (bytes) | Ideal transfer | Complete bundle (bytes) | Ideal transfer |
|---|---:|---:|---:|---:|
| CPU (Wasm) | 1,748,707,862 | 3 h 53 min 10 s | 1,748,776,344 | 3 h 53 min 10 s |
| WebGPU | 1,748,707,862 | 3 h 53 min 10 s | 1,748,776,344 | 3 h 53 min 10 s |

## Run the campaign

Use Google Chrome and Node.js 22 or later. Read the [model and software terms](../../LICENSING.md) before accepting them. Keep the current documentation checkout and run the experiment from the tagged source.

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
plan="$PWD/docs/campaigns/nov14-ming-v3/plan.json"
git worktree add --detach ../tts-bench-ming-v3 audio-cpp-browser-v3
cd ../tts-bench-ming-v3
test "$(git rev-parse HEAD)" = d77c64289955a57526291d39b22caceffae40413 || exit 1
npm ci
model=ming-3.0-tts-0.5b-gguf
npm run assets -- fetch --model "$model" --accept-license
npm run assets -- verify --model "$model" --accept-license
machine='MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64'
node tools/run-campaign.mjs --plan "$plan" --machine "$machine" --accept-license
```

Use your actual hardware label when reproducing on another machine. The runner saves the campaign ledger under `runs/campaign-*/` and each recording and result under `runs/<run-id>/`. Submit baseline results with their recordings through the [pull request workflow](../../../CONTRIBUTING.md).

## Subsequent warm protocol

The CPU and WebGPU cached results from this plan remain published. Before either v3 warm cell started, the benchmark adopted one scored article after one excluded warm-up for checkpoints over one billion parameters. The newer frozen plan records the scoring revision and single-repetition protocol. [Single-repetition warm campaign](../nov17-ming-v3-warm-single/README.md) · [Verified cached results](https://github.com/ngelik/tts-bench/blob/3bbb7ee92c069f885dd035faae6326ef9c177e8b/reports/nov14-ming-v3/overview.md)
