# Individual Kokopop Sano sizes: native M1 Pro

Clean scoring source: [`01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661`](https://github.com/ngelik/tts-bench/tree/01d9c9f51ed94c41b6dbf480a3a0b1304fc6d661). Each [frozen cell plan](plans/) has one excluded full 20,000-character article followed by five scored articles, across all 93 canonical spans, on Apple M1 Pro / 8 CPU cores / 16 GiB / headed Chrome 157.0.8103.40. Cells acquire the shared timing lock independently. The original plans proposed CPU then WebGPU per profile. A documented queue handoff preserved the active Amy CPU cell, then prioritized the five remaining WebGPU cells before four deferred converted CPU cells. Original plan and native note bytes are retained; [actual execution order](execution-order.json) records this scheduling change.

| Converted profile | Backend | Median (s) | Observed min–max (s) | First PCM (ms) | Rate |
|---|---|---:|---:|---:|---:|
| sano-heart-gguf | cpu/wasm (n=5) | 39.165365 | 39.083535–39.356755 | 439.800 | 24000 Hz |
| sano-heart-gguf | webgpu+wasm (n=5) | 6.059755 | 6.029800–6.125210 | 81.580 | 24000 Hz |
| sano-amy-gguf | cpu/wasm (n=5) | 1118.899645 | 1117.890620–1119.508320 | 12720.835 | 22050 Hz |
| sano-amy-gguf | webgpu+wasm (n=5) | 173.408350 | 173.041095–173.785775 | 2001.040 | 22050 Hz |

Observed ranges are not confidence intervals. No cached/RSS or cold-load measurements are inferred. WebGPU is a mixed neural-GPU/CPU-WASM path with actual separate hardware dispatch proof in each original receipt. CPU-readable PCM terminates generation timing; integrity scans and recording export are untimed.

- `sano-heart-gguf` CPU median / WebGPU median: **6.463193×** for this same converted profile and host.
- `sano-amy-gguf` CPU median / WebGPU median: **6.452398×** for this same converted profile and host.

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

Each recording is the fifth scored article; its clip is the exact first 30 seconds PCM16 prefix. The complete WAV was hashed and scanned through EOF after CLI timing under the same exclusive slot. The receipts establish finite, nonempty PCM from all 93 spans; all excluded/scored checkpoints are preserved in [evidence](evidence/). Integrity does not establish speech quality or complete reading; listen to the unmodified output.

- **sano-heart-gguf / cpu**: [native result](../../../results/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-11-20-724z-sano-heart-gguf-cpu-warm-34c4fdc0--sano-heart-gguf--cpu-full.wav); SHA256 `0103ce7493186870b92a04e0ae69fb61ad1e07717725b3fae7e0970e45ad1da6`.
- **sano-heart-gguf / webgpu**: [native result](../../../results/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-18-37-488z-sano-heart-gguf-webgpu-warm-52fc27d6--sano-heart-gguf--webgpu-full.wav); SHA256 `5ed6b504bd66953ac523e536197654e29e2ade8de55fcee9b11bf903cecf8966`.
- **sano-amy-gguf / cpu**: [native result](../../../results/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc/summary.md) · [30s clip](../../../audio/samples/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t07-24-52-683z-sano-amy-gguf-cpu-warm-aa4c26dc--sano-amy-gguf--cpu-full.wav); SHA256 `664f84c215b6b73169d6d0a45f8a065d4d664304bb812e5d66e217c04969cac2`.
- **sano-amy-gguf / webgpu**: [native result](../../../results/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665/summary.md) · [30s clip](../../../audio/samples/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu.wav) · [full WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-19t09-37-32-733z-sano-amy-gguf-webgpu-warm-fde5a665--sano-amy-gguf--webgpu-full.wav); SHA256 `67f3bece1e18a307d18650f4beef5675fba600a90409de192212372518f56d27`.

## Setup and reproduction

The first private admission stopped before model staging or synthesis because a top-level dependency symlink appeared as an untracked path. The retry used the same frozen source/assets/plans, with package links inside an ignored directory; all 12 plan dry runs and CLI imports passed before requeueing. [Preserved setup record](setup-attempt-001.json). No setup failure is counted as a native score. [Source/build and upstream terms](../../SANO_KOKOPOP_SIZES.md). Generated weights/runtime binaries are not redistributed.

## Reported operational context for Heart

The operator reported seconds of unrelated local receipt/Markdown metadata work sometime between 07:10:36 and 07:19:58 UTC on 19 November 2026. Exact overlap with either Heart cell is unknown. No other synthesis or WAV processing was reported for that interval. Original receipts and timings are preserved without adjustment; no quantitative effect is inferred. [Bounded provenance note and exact receipt hashes](heart-operational-provenance.json).
