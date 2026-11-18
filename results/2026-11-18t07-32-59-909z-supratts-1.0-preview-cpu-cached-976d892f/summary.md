# 2026-11-18t07-32-59-909z-supratts-1.0-preview-cpu-cached-976d892f

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| supratts-1.0-preview | cpu | measured | 22.58 s | 22.58–22.58 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| supratts-1.0-preview | cpu | First completed source chunk | 778.835 | ms | 1 |
| supratts-1.0-preview | cpu | First PCM block | 589.740 | ms | 1 |
| supratts-1.0-preview | cpu | Generated audio | 1284.148 | s | 1 |
| supratts-1.0-preview | cpu | Generation / audio duration | 0.018 | ratio | 1 |
| supratts-1.0-preview | cpu | Model initialization | 1858.377 | ms | 1 |
| supratts-1.0-preview | cpu | Complete controller trial including setup/export | 28353.546 | ms | 1 |
| supratts-1.0-preview | cpu | Transferred HTTP body data | 38404 | bytes | 1 |
| supratts-1.0-preview | cpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| supratts-1.0-preview | cpu | Whole-call Chrome process-tree peak RSS | 1600946176 | bytes | 1 |
| supratts-1.0-preview | cpu | Per-trial mean generation Chrome process-tree RSS | 1234286033 | bytes | 1 |
| supratts-1.0-preview | cpu | In-window Chrome RSS observations | 44.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| supratts-1.0-preview | 1 | 1 | 1 (en) | fixed single voice |

Pinned English preview checkpoint; one fixed voice. English-only, fixed single voice; upstream ships no streaming API. The browser port runs the pinned official dictionary-first G2P and NumPy OOV fallback in Pyodide, plus four FP32 ONNX graphs exported from the official MIT checkpoint. Zero noise, 24 kHz mono, shipped 100-band mel tilt and centered Hann iSTFT/DC filter match the official synthesis path. CPU uses one-thread ONNX Runtime Web WASM. WebGPU runs neural operators on an explicitly requested hardware adapter with WASM fallback; frontend and waveform reconstruction remain on CPU. The separate GPU capability probe requires observed compute dispatches before the backend is measured. Sources: [1](https://erogol.com/small_tts_bench/), [2](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/README.md), [3](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/config.json), [4](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview/blob/80a6b0bd13c92e30e88b0c22183be9c2bdc7061c/microtts/synthesize.py), [5](https://github.com/ngelik/tts-bench/tree/829ebd388cdc976afd43bec7cff6b9b38f5fc9f6/tools/export-supratts-onnx.py), [6](https://github.com/ngelik/tts-bench/releases/tag/supratts-onnx-v1).


![Generation chart](chart.svg)

- **supratts-1.0-preview / cpu**: Explicit one-thread ONNX Runtime Web WASM; the official Python/NumPy G2P and signal reconstruction run in the same Chrome worker.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-18T07-30-36-110Z-2ba5316cff6e; cell 2/4; source 60565a58e6c3240c14a21b462c5f8fd9435ba924; requested n=1; effective n=1; Clean merged source; full english-20k-v1 fixture; one excluded warm-up plus five scored trials for warm cells; one cached full-article generation with 500 ms Chrome process-tree RSS sampling for resource cells; CPU uses one-thread WASM; WebGPU requires hardware adapter and observed dispatch; no cold runs.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
