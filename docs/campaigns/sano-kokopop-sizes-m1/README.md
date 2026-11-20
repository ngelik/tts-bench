# Individual Kokopop Sano sizes: native M1 Pro

Clean scoring source: [`01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661`](https://github.com/ngelik/tts-bench/tree/01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661). Each [frozen cell plan](plans/) has one excluded full 20,000-character article followed by five scored articles, across all 93 canonical spans, on Apple M1 Pro / 8 CPU cores / 16 GiB / headed Chrome 157.0.8103.40. Cells acquire the shared timing lock independently. The original plans proposed CPU then WebGPU per profile. A documented queue handoff preserved the active Amy CPU cell, then prioritized the five remaining WebGPU cells before four deferred converted CPU cells. Original plan and native note bytes are retained; [actual execution order](execution-order.json) records this scheduling change.

| Converted profile | Backend | Median (s) | Observed min–max (s) | First PCM (ms) | Rate |
|---|---|---:|---:|---:|---:|
| sano-heart-gguf | cpu/wasm (n=5) | 39.165365 | 39.083535–39.356755 | 439.800 | 24000 Hz |
| sano-heart-gguf | webgpu+wasm (n=5) | 6.059755 | 6.029800–6.125210 | 81.580 | 24000 Hz |
| sano-amy-gguf | cpu/wasm (n=5) | 1118.899645 | 1117.890620–1119.508320 | 12720.835 | 22050 Hz |
| sano-amy-gguf | webgpu+wasm (n=5) | 173.408350 | 173.041095–173.785775 | 2001.040 | 22050 Hz |
| sano-amy-small-gguf | webgpu+wasm (n=5) | 141.769730 | 141.588825–142.539510 | 1658.250 | 22050 Hz |
| sano-amy-1p8m-gguf | webgpu+wasm (n=5) | 170.542595 | 169.975580–174.361365 | 1980.175 | 22050 Hz |
| sano-hfc-gguf | webgpu+wasm (n=5) | 140.063610 | 139.122880–140.573305 | 1609.920 | 22050 Hz |
| sano-kristin-gguf | webgpu+wasm (n=5) | 157.796880 | 156.043915–159.405545 | 1891.100 | 22050 Hz |
| sano-amy-small-gguf | cpu/wasm (n=5) | 831.369655 | 831.318105–831.846190 | 9550.875 | 22050 Hz |
| sano-amy-1p8m-gguf | cpu/wasm (n=5) | 1122.997310 | 1122.689440–1123.165395 | 12795.995 | 22050 Hz |
| sano-hfc-gguf | cpu/wasm (n=5) | 901.169445 | 901.106700–901.319485 | 10173.815 | 22050 Hz |
| sano-kristin-gguf | cpu/wasm (n=5) | 1015.974380 | 1014.568645–1017.927170 | 12093.975 | 22050 Hz |

Observed ranges are not confidence intervals. No cached/RSS or cold-load measurements are inferred. WebGPU is a mixed neural-GPU/CPU-WASM path with actual separate hardware dispatch proof in each original receipt. CPU-readable PCM terminates generation timing; integrity scans and recording export are untimed.

- `sano-heart-gguf` CPU median / WebGPU median: **6.463193×** for this same converted profile and host.
- `sano-amy-gguf` CPU median / WebGPU median: **6.452398×** for this same converted profile and host.
- `sano-amy-small-gguf` CPU median / WebGPU median: **5.864225×** for this same converted profile and host.
- `sano-amy-1p8m-gguf` CPU median / WebGPU median: **6.584849×** for this same converted profile and host.
- `sano-hfc-gguf` CPU median / WebGPU median: **6.434001×** for this same converted profile and host.
- `sano-kristin-gguf` CPU median / WebGPU median: **6.438495×** for this same converted profile and host.

[Comparison chart/table](../../../comparisons/sano-kokopop-sizes-m1/summary.md) · [Campaign report](../../../reports/sano-kokopop-sizes-m1/overview.md) · [Exact source, environment, settings and capability evidence](verification.json).

## Unmodified frontend behavior

Kokopop LONG_FORM normalization, internal budget chunking, trimming/crossfade, pauses and internal seed derivation are retained. Individual profiles preserve their pinned voice, sample rate, F32 or F16/F32 tensors, speed 1 and base seed 42 + canonical span ID. These are distinct from official CPU/WASM registrations; no cross-runtime matched speedup is claimed.

The separate observation-only audit found zero skipped symbols across all 93 canonical inputs. Component vocabulary substitutions to schwa remain unmodified. [Full audit summary and immutable archive identity](frontend-audit.json).

| Model | Duration component substitutions | Acoustic component substitutions |
|---|---|---|
| sano-heart-gguf | 0 | 0 |
| sano-amy-gguf | 5 × U+0329 → U+0259 schwa; 52 × U+0022 → U+0259 schwa | 52 × U+0022 → U+0259 schwa |
| sano-amy-small-gguf | 5 × U+0329 → U+0259 schwa; 52 × U+0022 → U+0259 schwa | 52 × U+0022 → U+0259 schwa |
| sano-amy-1p8m-gguf | 5 × U+0329 → U+0259 schwa; 52 × U+0022 → U+0259 schwa | 52 × U+0022 → U+0259 schwa |
| sano-hfc-gguf | 5 × U+0329 → U+0259 schwa; 52 × U+0022 → U+0259 schwa | 52 × U+0022 → U+0259 schwa |
| sano-kristin-gguf | 176 × U+1D7B → U+0259 schwa; 5 × U+0329 → U+0259 schwa; 52 × U+0022 → U+0259 schwa | 52 × U+0022 → U+0259 schwa |

## Original scored recordings

Each recording is the fifth scored article; its clip is the exact first 30 seconds PCM16 prefix. The complete WAV was hashed and scanned through EOF after CLI timing under an exclusive slot, including the separately documented saved-WAV recovery below. The receipts establish finite, nonempty PCM from all 93 spans; all excluded/scored checkpoints are preserved in [evidence](evidence/). Integrity does not establish speech quality or complete reading; listen to the unmodified output.

- **sano-heart-gguf / cpu**: [native result](../../../results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu-full.wav); SHA256 `0103ce7493186870b92a04e0ae69fb61ad1e07717725b3fae7e0970e45ad1da6`.
- **sano-heart-gguf / webgpu**: [native result](../../../results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu-full.wav); SHA256 `5ed6b504bd66953ac523e536197654e29e2ade8de55fcee9b11bf903cecf8966`.
- **sano-amy-gguf / cpu**: [native result](../../../results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu-full.wav); SHA256 `664f84c215b6b73169d6d0a45f8a065d4d664304bb812e5d66e217c04969cac2`.
- **sano-amy-gguf / webgpu**: [native result](../../../results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) · [30s clip](../../../audio/samples/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu-full.wav); SHA256 `67f3bece1e18a307d18650f4beef5675fba600a90409de192212372518f56d27`.
- **sano-amy-small-gguf / webgpu**: [native result](../../../results/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce/summary.md) · [30s clip](../../../audio/samples/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce--sano-amy-small-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t11-19-23-941z-sano-amy-small-gguf-webgpu-warm-8ed449ce--sano-amy-small-gguf--webgpu-full.wav); SHA256 `d78cd8065212e190b1ad6410967a082df9a0a3e33dd7aa39a0156c3d461c6052`.
- **sano-amy-1p8m-gguf / webgpu**: [native result](../../../results/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0/summary.md) · [30s clip](../../../audio/samples/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0--sano-amy-1p8m-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t14-02-37-802z-sano-amy-1p8m-gguf-webgpu-warm-5aeea5f0--sano-amy-1p8m-gguf--webgpu-full.wav); SHA256 `8adaa450141dad7fb29c572aa72dbc0bc2adfbfc2e9220e842bd701d757e10ab`.
- **sano-hfc-gguf / webgpu**: [native result](../../../results/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f/summary.md) · [30s clip](../../../audio/samples/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f--sano-hfc-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t15-58-25-950z-sano-hfc-gguf-webgpu-warm-b6511d1f--sano-hfc-gguf--webgpu-full.wav); SHA256 `9bb51de84b1c87b7aff4070b6f14da45694f956a3beaf119d7691cd0f3dcbbf7`.
- **sano-kristin-gguf / webgpu**: [native result](../../../results/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b/summary.md) · [30s clip](../../../audio/samples/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b--sano-kristin-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t21-27-07-061z-sano-kristin-gguf-webgpu-warm-a89b3f8b--sano-kristin-gguf--webgpu-full.wav); SHA256 `9f14f85d3d2c220f182cae2c9fa20b2036d3ca0efe664c7cc11dc0d94f142ab2`.
- **sano-amy-small-gguf / cpu**: [native result](../../../results/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a/summary.md) · [30s clip](../../../audio/samples/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a--sano-amy-small-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t21-45-39-297z-sano-amy-small-gguf-cpu-warm-e28a866a--sano-amy-small-gguf--cpu-full.wav); SHA256 `c6d03ba7d29e6b77c451679c88b56bc82d5f3e6f21aa7ab330c58d335d4ed78a`.
- **sano-amy-1p8m-gguf / cpu**: [native result](../../../results/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb/summary.md) · [30s clip](../../../audio/samples/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb--sano-amy-1p8m-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t23-21-13-639z-sano-amy-1p8m-gguf-cpu-warm-a61a04eb--sano-amy-1p8m-gguf--cpu-full.wav); SHA256 `18ed76327289234fe8bacc1a1823f57bbbe475c5800c5be03e422fbd1e8c4efb`.
- **sano-hfc-gguf / cpu**: [native result](../../../results/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10/summary.md) · [30s clip](../../../audio/samples/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10--sano-hfc-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t05-11-12-260z-sano-hfc-gguf-cpu-warm-8c06ca10--sano-hfc-gguf--cpu-full.wav); SHA256 `caf55d8404bb3a1736d52522db6991f3f714b0a4ccecb0cf26c7d0a7c0344ab1`.
- **sano-kristin-gguf / cpu**: [native result](../../../results/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/summary.md) · [30s clip](../../../audio/samples/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20--sano-kristin-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20--sano-kristin-gguf--cpu-full.wav); SHA256 `8114c95d68c0ac6fdd635c754b10d6a3ee5a3058f321b27183d445ff006d1833`.

The `2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20` native measurement completed successfully, but its first untimed audit attempt could not load an expired temporary helper. The exact reviewed code was restored and the saved WAV audited later under a separate exclusive publication slot. The original terminal error and raw receipt were preserved; no synthesis was repeated or timing adjusted. [Hash-bound recovery record](evidence/2026-11-20t09-14-31-938z-sano-kristin-gguf-cpu-warm-59801e20/audit-recovery.json).

## Setup and reproduction

The first private admission stopped before model staging or synthesis because a top-level dependency symlink appeared as an untracked path. The retry used the same frozen source/assets/plans, with package links inside an ignored directory; all 12 plan dry runs and CLI imports passed before requeueing. [Preserved setup record](setup-attempt-001.json). No setup failure is counted as a native score. [Source/build and upstream terms](../../SANO_KOKOPOP_SIZES.md). Generated weights/runtime binaries are not redistributed.

## Reported operational context for Heart

The operator reported seconds of unrelated local receipt/Markdown metadata work sometime between 07:10:36 and 07:19:58 UTC on 19 November 2026. Exact overlap with either Heart cell is unknown. No other synthesis or WAV processing was reported for that interval. Original receipts and timings are preserved without adjustment; no quantitative effect is inferred. [Bounded provenance note and exact receipt hashes](heart-operational-provenance.json).
