# ZONOS3-Mini benchmark configuration

Model ID: `zonos3-mini` · checkpoint revision:
[`2921b8821772b0bd10a04456863d21abf9d2f283`](https://huggingface.co/Zyphra/ZONOS3-Mini/tree/2921b8821772b0bd10a04456863d21abf9d2f283) · official browser source revision:
[`a50e14117d99181ba7f28047b451ba03ba1a09a9`](https://github.com/Zyphra/ZONOS3-Mini/tree/a50e14117d99181ba7f28047b451ba03ba1a09a9/servers/web).

The model card describes an 800M-parameter backbone with about 100M active per token. The registered synthesis closure also includes the ZAC `keep2_plain` codec. An independent manifest audit gives a conservative learned-matrix lower bound of **1,029,247,872** elements across backbone and codec. It excludes all codebook tables, biases, known fixed buffers and the 254-element mixer matrix. The all-logical-tensor total **1,070,816,040** is recorded only as an upper bound because it includes fixed windows and resampling buffers. The optional speaker encoder is outside the synthesis count. This is above the benchmark's one-billion threshold, so full warm policy is one excluded 20,000-character warm-up followed by one scored run per supported backend.

## Shared text and voice settings

Both backends use the pinned Imogen English/British female speaker embedding (`default_b78b28baf5c31a1d`), the canonical source span unchanged, and `seed = 42 + zero-based canonical chunk id`. Text normalization and additional sentence splitting are disabled. Both request `en_us`, 44.1 kHz mono output, temperature 0.75, top-k 80, top-p 0.69, min-p 0, repetition penalty 2.4/window 96/codebooks 6, speaker/guidance scale 1, three silence prefill frames, and the `keep2_plain` decoder. The official browser API explicitly disables short-text/LACI mode and streams a prefix after one codebook in the first chunk; audio.cpp does not implement the short-text/LACI filler-cut path and uses a 20,000-character internal chunk limit so fixture spans are not split again. Audio.cpp's selected GGUF fixes the KEEP-2 decoder and uses a 3 dB headroom soft limiter. The browser ZAC decoder's host output path applies its corresponding limiter and signal reconstruction.

The browser benchmark selects Imogen's reference codes and embedding and skips her preview clip, which is not used for TTS. The CPU/WASM counterpart uses the same 896-byte embedding and does not load the preview clip or codes. The checkpoint's official catalog has 27 voices (10 English), 43 languages and 44 server locale codes; only Imogen and English are staged and measured here.

## Per-backend asset closure

The lock includes both backend profiles so any accepted receipt can verify the full registration. The combined registered model-weight closure is **2,081,592,824 bytes**; this is not a per-run download size.

| Profile | Required neural weights | Additional selected voice/runtime inputs |
|---|---:|---|
| Official WebGPU | 920,731,032 B: 920,526,072 B of backbone + `keep2_plain` shards and 204,960 B `steer.gguf` | 629,592 B of five manifests, Imogen voice list/codes/embedding and 43 pinned LACI head JSON files; the bundled upstream browser runtime is served from the checkout. No speaker/ref encoder, edit, aligner or `full_mr` tensors load for TTS. |
| audio.cpp CPU/WASM | 1,160,861,792 B: 663,150,624 B backbone, 452,325,440 B `zac-keep2.gguf`, 45,385,728 B speaker encoder | 896 B Imogen embedding; 4,410,876 B of separately pinned `audio-cpp-zonos3-cpu-wasm-v2` JavaScript, WASM and third-party notices. No Imogen preview audio or reference codes are loaded by TTS. |

The WebGPU profile's fully fetched locked inputs total **921,360,624 B**, excluding the checked-in Vite runtime bundle. Its benchmark client skips the unused preview clip and decodes no voice audio in its DedicatedWorker. The CPU neural-weight total above excludes its **4,410,876-byte** separately pinned runtime release; including the 896-byte embedding and runtime files, its non-weight CPU closure is **4,411,772 B**. Its Emscripten pthread pool supports up to 12 threads (default 6). For both profiles, all inference files are same-origin local assets. The WebGPU runtime source/NOTICE and CPU runtime notices remain separate from the model license.

WebGPU generation dispatches the backbone and codec kernels on the actual adapter selected by the upstream inference worker. A one-utterance probe instruments that worker's compute-pass dispatch calls and removes the hook before scored generation. Benchmark requests require an EOS token; truncated-at-limit output and any post-streaming API, worker, codec or GPU errors fail the response instead of scoring partial audio. The codec host iSTFT, FIR mixing, resampling and CPU-readable PCM conversion remain CPU work. Software/fallback adapters are reported unsupported based on the adapter selected by that inference worker.

Rebuild the readable official browser bundles from the vendored source with:

```sh
npm run zonos3:runtime:build
```

The source copy and local voice-selection, worker-disposal and dispatch-probe changes are documented in [`web/zonos3/NOTICE.md`](../web/zonos3/NOTICE.md). The generated runtime manifest records each bundled file's SHA-256 and byte length. Model asset hashes and lengths are in [`assets.lock.json`](../assets.lock.json); the lower-bound parameter evidence is in [`lib/model-parameters.json`](../lib/model-parameters.json).

## Native M1 Pro WebGPU results

These two independent, headed-Chrome observations use source commit [`de9dded4722f160d185b4dcbbb720edec8ee595f`](https://github.com/ngelik/tts-bench/commit/de9dded4722f160d185b4dcbbb720edec8ee595f), the fixed 20,000-character / 93-span fixture, an Apple M1 Pro MacBook Pro with 16 GiB RAM, native arm64, Darwin 25.6.0, Chrome 157.0.8103.40 and the Apple Metal-3 adapter selected by the inference worker. Each run records 42,459 WebGPU compute dispatches. The selected voice is Imogen (English, British female), and precision is the pinned official Web export with formats declared per tensor. The backend reports `webgpu+cpu-codec-host`: GPU backbone/codec dispatch with host iSTFT, FIR mixing, resampling and PCM readback. It is not a CPU-versus-GPU speed comparison.

Both cells ran on AC power and were serialized through the shared M1 queue. The warm retry followed earlier Heart CPU and Robot/Trellis setup work; the independent cached cell followed already queued native jobs. An earlier warm receipt with an over-limit note was rejected and remains preserved outside the selected results; it is not substituted for either accepted observation.

| Scenario | Scored articles | Generation | First PCM | Output | Cached resource measurement | Selected payload | Receipt and audio |
|---|---:|---:|---:|---:|---|---:|---|
| Warm | n=1 after one excluded full-article warm-up | 153.410 s | 112.69 ms | 1,284.333 s / RTF 0.119447 | Not measured | 921,360,624 B of locked WebGPU inputs are fetched before the warm score | [Receipt](../results/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772/summary.md) · [30 s preview](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772--zonos3-mini--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772--zonos3-mini--webgpu-full.wav) |
| Cached resources | n=1 independent full article | 153.694 s | 139.40 ms | 1,284.333 s / RTF 0.119669 | Mean 1,126.22 MB; sampled max 1,212.48 MB across 306 in-window samples; separate whole-call peak 1,986.23 MB | 38,404 measured download bytes | [Receipt](../results/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76/summary.md) · [30 s preview](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76--zonos3-mini--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76--zonos3-mini--webgpu-full.wav) |

Both scored recordings are 44.1 kHz mono PCM16, 56,639,100 frames and 113,278,244 bytes. Their full-WAV SHA-256 is `13c61adf370cc66bf13cb94b1eec1f5fc6f05d18d83229f4f898e7290938ad0b`; independent review found the warm-up and scored PCM deterministic. Each recording has a 30-second preview clip in the listening room and a complete WAV on the repository release. Both retain the ZONOS3-Mini Apache-2.0 model attribution and the benchmark's non-commercial evaluation boundary; the code license does not grant broader model or voice rights. No subjective intelligibility or pronunciation claim is made here.
