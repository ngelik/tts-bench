# Ming Q8_0 GGUF v3 single-repetition warm campaign

Each backend runs one excluded full warm-up followed by one timed 20,000-character English article in the same headed Chrome session. The 93 canonical spans use the built-in US_James voice. Each reported timing has n=1. The host is a MacBook Pro with an 8-core Apple M1 Pro, 16 GiB of RAM, AC power and Google Chrome 157.0.8103.40. CPU uses six Wasm threads. WebGPU must show real GPU dispatch.

The GGUF label names the 0.5B backbone. Logical tensor shapes establish a lower bound of 1,059,676,928 learned weights in four components of the deployed checkpoint. Additional components are excluded from that lower bound. The source pin is `3aaf2d5d54df00c1e7482e141f8e26387c6169e0`. [Checkpoint parameter evidence](https://github.com/ngelik/tts-bench/blob/3aaf2d5d54df00c1e7482e141f8e26387c6169e0/lib/model-parameters.json) · [Warm repetition policy](https://github.com/ngelik/tts-bench/pull/86)

The checkpoint, audio-cpp-browser-v3 runtime, voice and inference settings are shared with the two previously recorded v3 cached trials. Those trials measured generation-window Chrome memory for one article per backend. Each backend needs 1,748,707,862 payload bytes before inference, about 3 h 53 min 10 s at an ideal 1 Mbps. [Published cached CPU and WebGPU results](https://github.com/ngelik/tts-bench/blob/3bbb7ee92c069f885dd035faae6326ef9c177e8b/reports/nov14-ming-v3/overview.md) · [Earlier v3 plan](https://github.com/ngelik/tts-bench/blob/3bbb7ee92c069f885dd035faae6326ef9c177e8b/docs/campaigns/nov14-ming-v3/plan.json) · [Historical v1 WebGPU five-run receipt](https://github.com/ngelik/tts-bench/blob/246361725689177f6a29f0a8e16e901ba50ba2d2/results/2026-11-15t13-38-24-837z-ming-3.0-tts-0.5b-gguf-webgpu-warm-7e5f10e1/result.json)

## Reproduce

Save the published plan outside the source checkout, then use the exact scoring revision. Point `CHROME_PATH` at the pinned browser and run one campaign on the machine at a time.

```sh
git clone https://github.com/ngelik/tts-bench.git
cd tts-bench
plan_dir=$(mktemp -d)
git show origin/main:docs/campaigns/nov17-ming-v3-warm-single/plan.json > "$plan_dir/plan.json"
git checkout --detach 3aaf2d5d54df00c1e7482e141f8e26387c6169e0
npm ci
node bin/bench.mjs assets fetch --model ming-3.0-tts-0.5b-gguf --accept-license
node tools/run-campaign.mjs --plan "$plan_dir/plan.json" --machine "MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64" --accept-license
```

The final scored WAV is retained with its receipt. The listening room provides a 30-second clip and the full recording for each published backend. [Listening room](https://ngelik.github.io/tts-bench/)
