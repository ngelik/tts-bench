# Audio8 waveform integrity

**The original Audio8 WebGPU run returned 23 min 47.75 s of PCM. For 21 min 29.39 s, every sample in each of 93 intervals had exactly the same value.** The other 2 min 18.35 s contain varying samples. Their intelligibility has not been evaluated. The CPU recording has no constant interval lasting even 0.10 s.

| Cached recording | Duration | Constant intervals ≥1 s | Time in those intervals | Longest constant interval |
|---|---:|---:|---:|---:|
| [WebGPU](../../results/2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694/summary.md) | 1,427.749 s | 93 | 1,289.394 s (90.31%) | 18.528 s |
| [CPU](../../results/2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93/summary.md) | 1,429.049 s | 0 | 0 s (0%) | 0.041 s |

Every long WebGPU interval held the signed 16-bit value −281. The longest extends from 1,147.253 s to 1,165.781 s. The first begins at 1.49 s. The CPU maximum consists of 1,815 zero-valued samples at 336.462 s. These measurements describe the full released WAVs, including portions beyond their 30-second listening clips. Ordinary quiet passages and variable audio are not classified as intelligible speech by this test.

## Warm repetition and operator stop

The [original warm receipt](../../results/2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92/result.json) contains one excluded warm-up and one completed timed article. Both produced the same float32 PCM SHA-256 as the defective cached WebGPU output. The timed article took 8,413.724 s, with first PCM after 98.200 s. The operator stopped repetition 2 after confirming that the fault recurred. The native receipt records the browser closure as an error. The five-repetition warm benchmark has no median. The cached run's time and memory describe the actual execution with this defective output.

The [pinned export manifest](https://huggingface.co/stephvax/audio8-tts-realistic-0.6b-onnx-int4/blob/04313606782af6b9a1aa93724555bc7b64ba9197/runtime_manifest.json) specifies a CPU decoder. The [original adapter](https://github.com/ngelik/tts-bench/blob/ab5aec3e510420adbcac9971f35f92152b19959c/web/workers/audio8.mjs) requested WebGPU with WASM fallback for the decoder as well as both autoregressive graphs. The sample scan measures the effect observed in that configuration.

The dashboard keeps the original recording playable for inspection and identifies matching output by its float32 PCM or complete WAV digest. Other recordings, including future Audio8 configurations, are evaluated independently.

## Reproduce

Run from a clone with Python 3.11 or later. The script downloads the two public WAVs, checks each SHA-256, size, sample rate and sample count against the native receipt, then scans every mono PCM16 sample, retaining constant intervals across read boundaries.

```sh
python3 diagnostics/audio8-waveform/reproduce.py
```

The [machine-readable evidence](evidence.json) lists all 93 WebGPU intervals using zero-based sample offsets and exclusive ends. It includes both file digests, the raw float32 PCM digests and counts at 0.10 s and 1.00 s thresholds. The [original hosted scan](https://github.com/ngelik/tts-bench/actions/runs/43705986098/job/132787047455) ran on GitHub's Linux hardware.
