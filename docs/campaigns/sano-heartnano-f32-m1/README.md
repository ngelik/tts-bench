# Heart-nano converted F32: native M1 Pro warm pair

These are native browser measurements on **Apple M1 Pro, 8 CPU cores, 16 GiB RAM, arm64, headed Google Chrome 157.0.8103.40** (Darwin 25.6.0). The clean scoring source is [`ca54c5ca1954406a72f4f0d705c6a37852ee7761`](https://github.com/ngelik/tts-bench/tree/ca54c5ca1954406a72f4f0d705c6a37852ee7761). The original [plan](plan.json) runs CPU then WebGPU sequentially: one excluded full-article warm-up plus five scored repetitions per backend, with the same 20,000-character English fixture and 93 canonical spans.

| Backend | Generation median | Observed min–max | First PCM median | Generated audio median | RTF |
|---|---:|---:|---:|---:|---:|
| cpu/wasm (n=5) | 11.574225 s | 11.563145–11.641550 s | 129.685 ms | 1303.389667 s | 0.008880 |
| webgpu+wasm (n=5) | 3.705700 s | 3.657035–3.757870 s | 55.815 ms | 1303.496333 s | 0.002843 |

CPU median / WebGPU median is **3.123357×** for this matched converted-F32 profile on this machine. Min–max is the observed range, not a confidence interval. [Comparison table and chart](../../../comparisons/sano-heartnano-f32-m1/summary.md) · [Campaign overview](../../../reports/sano-heartnano-f32-m1/overview.md) · [Exact receipts, settings and recording proof](verification.json).

## Profile and timing scope

Both backends use heartnano, 24 kHz mono PCM, speed 1 and base seed `42 + canonical span ID`. The pinned Kokopop LONG_FORM runtime normalizes text, chunks to its voice-adjusted model budget, derives internal chunk seeds, and may trim/crossfade chunks and insert pauses. Each canonical span enters as one offline request. The F32 GGUF expands the exact pinned upstream Q8 assets; it does not recover pre-quantization weights. This is separate from the official INT8 Sano browser profile.

The WebGPU capability probe selected **Apple Metal-3** and observed **426 actual dispatches**, with scheduler assignments `MUL_MAT=74`, `IM2COL=48`, `ADD=114`, `SILU=18`. Its effective backend is `webgpu+wasm`; remaining CPU/WASM work is disclosed. The probe is separate from timed articles and does not assert every operation ran on GPU. Timers end only after CPU-readable PCM; validation, hashing and WAV export are excluded.

CPU and GPU used the same profile, assets, settings and host in fixed CPU-then-GPU order under the shared compute lock. No quantitative thermal or background-load telemetry is claimed. No cached/RSS or cold-load measurement was requested for this pair; no memory value is inferred from timing or asset bytes.

## Original scored recordings

Each recording below is the fifth scored native article. Clips retain the first 30 seconds of its original PCM16, with only RIFF size fields adjusted. Full native files were independently hash-checked under the shared publication lock, including unchanged file stat, header, frame count and sample rate. Both canonical public full WAVs passed [anonymous complete-file SHA-256 readback](public-audio-verification.json). All twelve excluded/scored JSON checkpoints are preserved under [evidence](evidence/).

- **cpu**: [native receipt](../../../results/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa/summary.md) · [30-second clip](../../../audio/samples/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa--sano-heart-nano-gguf-f32--cpu.wav) · [full native WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t04-36-30-063z-sano-heart-nano-gguf-f32-cpu-warm-c56188aa--sano-heart-nano-gguf-f32--cpu-full.wav); SHA-256 `0d3c46d1e9b3bbce11f554f0b0f37643bb41f34da7059a1b554e1ce7b47115aa` (62,562,748 bytes).
- **webgpu**: [native receipt](../../../results/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57/summary.md) · [30-second clip](../../../audio/samples/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57--sano-heart-nano-gguf-f32--webgpu.wav) · [full native WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t04-37-47-792z-sano-heart-nano-gguf-f32-webgpu-warm-29da3d57--sano-heart-nano-gguf-f32--webgpu-full.wav); SHA-256 `5328089c1be1d51f49962ffa5e1959be23e573857b069a63451786a9f1467961` (62,567,868 bytes).

These native WAVs are byte-identical, per backend, to the recordings in the earlier [hosted macOS supplement](https://github.com/ngelik/tts-bench/releases/tag/sano-heart-nano-f32-hosted-macos-ca54c5ca1954-run-44431517354). They have their own native receipt attribution and canonical recording URLs. Hosted timings remain a separate cohort and are not used in this native comparison. CPU and WebGPU waveforms differ from each other by 2,560 frames (0.106667 seconds); all six outputs within each backend share that backend’s Float32 PCM hash.

Waveform integrity does not establish complete reading, pronunciation or speech quality. No listening or ASR rating is asserted. Source-span lengths in every scored run ranged from 262,528 to 428,520 samples (10.94–17.86 seconds at 24 kHz).

## Preserved setup failure and reproduction

[Attempt 001](setup-attempt-001.json) stopped at the asset-verification CLI because the private worker omitted `--accept-license`. No synthesis or score was created by that attempt. Attempt 002 retained the source, generated model/runtime and plan, supplied the already-authorized acknowledgement, and completed the native pair. It is not a replacement of an unfavorable acoustic result.

For reproduction, check out the exact scoring source, follow the pinned [build/import instructions](../../SANO_HEART_NANO.md), verify assets with the required acknowledgement, and run the source-bound plan on the recorded baseline. Generated model/runtime files remain outside Git and are not redistributed by this result PR. [Model and runtime terms](../../LICENSING.md) retain the upstream GPL caveat and Kokopop/GGML/eSpeak notices; the root code license does not relicense the voice or generated recordings.
