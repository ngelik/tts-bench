# 2026-11-25t13-16-47-193z-browser-voice-hi-int7-cpu-warm-2d2ffbe1

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-warm-v2**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| browser-voice-hi-int7 | cpu | measured | 88.65 s | 88.58–88.81 s | 3 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| browser-voice-hi-int7 | cpu | First completed source chunk | 969.845 | ms | 3 |
| browser-voice-hi-int7 | cpu | First PCM block | 969.830 | ms | 3 |
| browser-voice-hi-int7 | cpu | Generated audio | 1432.320 | s | 3 |
| browser-voice-hi-int7 | cpu | Generation / audio duration | 0.062 | ratio | 3 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| browser-voice-hi-int7 | 1 | 1 | 1 (hi) | Ishwari |

Ishwari speaks Hindi from Devanagari or Roman input using the published INT7 checkpoint.. Devanagari and Roman Hindi have separate registered articles. The stock Roman frontend uses the Dakshina-derived dictionary. Stock pace scale is 0.9333333333333333 at UI speed 1. The publisher worker uses one-thread WebAssembly for acoustic and G2P sessions. Sources: [1](https://huggingface.co/Hansda/hindi-voice-compact/tree/04e39413827f3d45af54ceb480cb77e732983c1b), [2](https://tts.hansda.in/?lang=hi), [3](https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html), [4](https://huggingface.co/datasets/Hansda/hindi-maya2-ishwari-20h/tree/c835a1a2c3892f5cd47507824bf33df19deec955), [5](https://github.com/google-research-datasets/dakshina).


![Generation chart](chart.svg)

- **browser-voice-hi-int7 / cpu**: The released acoustic and G2P sessions use the one-thread WASM provider.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-25T13-16-46-575Z-bb12f0d6ecf7; cell 1/2; source e3ad67be16d0c62700c2b1fe38c70b3443492335; fixture hi-latn-article-v1 (hi-Latn, 23420 JavaScript characters, 107 spans); requested n=3; effective n=3; Headed Google Chrome, Apple M1 Pro, AC power. Published browser-voice-hi-int7, Ishwari, INT7 packed weights expanded to FP32. Qualified backends: cpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
