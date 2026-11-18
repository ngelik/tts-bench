# ZONOS3-Mini benchmark configuration

Model ID: `zonos3-mini` · checkpoint revision:
[`2921b8821772b0bd10a04456863d21abf9d2f283`](https://huggingface.co/Zyphra/ZONOS3-Mini/tree/2921b8821772b0bd10a04456863d21abf9d2f283) · official browser source revision:
[`a50e14117d99181ba7f28047b451ba03ba1a09a9`](https://github.com/Zyphra/ZONOS3-Mini/tree/a50e14117d99181ba7f28047b451ba03ba1a09a9/servers/web).

The model card describes an 800M-parameter backbone with about 100M active per token. The registered synthesis closure also includes the ZAC `keep2_plain` codec. An independent manifest audit gives a conservative learned-matrix lower bound of **1,029,247,872** elements across backbone and codec. It excludes all codebook tables, biases, known fixed buffers and the 254-element mixer matrix. The all-logical-tensor total **1,070,816,040** is recorded only as an upper bound because it includes fixed windows and resampling buffers. The optional speaker encoder is outside the synthesis count. This is above the benchmark's one-billion threshold, so full warm policy is one excluded 20,000-character warm-up followed by one scored run per supported backend.

## Shared text and voice settings

Both backends use the pinned Imogen English/British female speaker embedding (`default_b78b28baf5c31a1d`), the canonical source span unchanged, and `seed = 42 + zero-based canonical chunk id`. Text normalization and additional sentence splitting are disabled. Both request `en_us`, 44.1 kHz mono output, temperature 0.75, top-k 80, top-p 0.69, min-p 0, repetition penalty 2.4/window 96/codebooks 6, speaker/guidance scale 1, three silence prefill frames, and the `keep2_plain` decoder. The official browser API explicitly disables short-text/LACI mode and streams a prefix after one codebook in the first chunk; audio.cpp does not implement the short-text/LACI filler-cut path and uses a 20,000-character internal chunk limit so fixture spans are not split again. Audio.cpp's selected GGUF fixes the KEEP-2 decoder and uses a 3 dB headroom soft limiter. The browser ZAC decoder's host output path applies its corresponding limiter and signal reconstruction.

The WebGPU client loads Imogen's preview audio, reference codes and embedding. Its CPU/WASM counterpart uses the same 896-byte embedding, and does not load the preview audio or codes. The checkpoint's official catalog has 27 voices (10 English) and 43 server language codes, but only Imogen and English are staged and measured here.

## Per-backend asset closure

The lock includes both backend profiles so any accepted receipt can verify the full registration. The combined registered model-weight closure is **2,081,592,824 bytes**; this is not a per-run download size.

| Profile | Required neural weights | Additional selected voice/runtime inputs |
|---|---:|---|
| Official WebGPU | 920,731,032 B: 920,526,072 B of backbone + `keep2_plain` shards and 204,960 B `steer.gguf` | 1,746,836 B of five manifests, Imogen voice list/audio/codes/embedding and 43 pinned LACI head JSON files; the bundled upstream browser runtime is served from the checkout. No speaker/ref encoder, edit, aligner or `full_mr` tensors load for TTS. |
| audio.cpp CPU/WASM | 1,160,861,792 B: 663,150,624 B backbone, 452,325,440 B `zac-keep2.gguf`, 45,385,728 B speaker encoder | 896 B Imogen embedding; 4,409,261 B of separately pinned `audio-cpp-zonos3-cpu-wasm-v1` JavaScript, WASM and third-party notices. No Imogen preview audio or reference codes are loaded by TTS. |

The WebGPU profile's fully fetched locked inputs total **922,477,868 B**, excluding the checked-in Vite runtime bundle. The CPU neural-weight total above excludes its **4,409,261-byte** separately pinned runtime release. For both profiles, all inference files are same-origin local assets. The WebGPU runtime source/NOTICE and CPU runtime notices remain separate from the model license.

WebGPU generation dispatches the backbone and codec kernels on the actual adapter selected by the upstream inference worker. A one-utterance probe instruments that worker's compute-pass dispatch calls and removes the hook before scored generation. The codec host iSTFT, FIR mixing, resampling and CPU-readable PCM conversion remain CPU work. Software/fallback adapters are reported unsupported based on the adapter selected by that inference worker.

Rebuild the readable official browser bundles from the vendored source with:

```sh
npm run zonos3:runtime:build
```

The source copy and local voice-selection, worker-disposal and dispatch-probe changes are documented in [`web/zonos3/NOTICE.md`](../web/zonos3/NOTICE.md). The generated runtime manifest records each bundled file's SHA-256 and byte length. Model asset hashes and lengths are in [`assets.lock.json`](../assets.lock.json); the lower-bound parameter evidence is in [`lib/model-parameters.json`](../lib/model-parameters.json).
