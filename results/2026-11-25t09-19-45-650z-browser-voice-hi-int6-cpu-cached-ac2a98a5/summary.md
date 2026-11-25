# 2026-11-25t09-19-45-650z-browser-voice-hi-int6-cpu-cached-ac2a98a5

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| browser-voice-hi-int6 | cpu | measured | 89.09 s | 89.09–89.09 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| browser-voice-hi-int6 | cpu | First completed source chunk | 1139.700 | ms | 1 |
| browser-voice-hi-int6 | cpu | First PCM block | 1139.680 | ms | 1 |
| browser-voice-hi-int6 | cpu | Generated audio | 1433.099 | s | 1 |
| browser-voice-hi-int6 | cpu | Generation / audio duration | 0.062 | ratio | 1 |
| browser-voice-hi-int6 | cpu | Model initialization | 678.653 | ms | 1 |
| browser-voice-hi-int6 | cpu | Complete controller trial including setup/export | 94055.555 | ms | 1 |
| browser-voice-hi-int6 | cpu | Transferred HTTP body data | 2549280 | bytes | 1 |
| browser-voice-hi-int6 | cpu | Ideal body transfer at 1 Mbps | 20.394 | s | 1 |
| browser-voice-hi-int6 | cpu | Whole-call Chrome process-tree peak RSS | 1380270080 | bytes | 1 |
| browser-voice-hi-int6 | cpu | Per-trial mean generation Chrome process-tree RSS | 1139481004 | bytes | 1 |
| browser-voice-hi-int6 | cpu | In-window Chrome RSS observations | 177.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| browser-voice-hi-int6 | 1 | 1 | 1 (hi) | Ishwari |

Ishwari speaks Hindi from Devanagari or Roman input using the published INT6 checkpoint.. Devanagari and Roman Hindi have separate registered articles. The stock Roman frontend uses the Dakshina-derived dictionary. Stock pace scale is 0.9719864176570459 at UI speed 1. The publisher worker uses one-thread WebAssembly for acoustic and G2P sessions. Sources: [1](https://huggingface.co/Hansda/hindi-voice-compact/tree/04e39413827f3d45af54ceb480cb77e732983c1b), [2](https://tts.hansda.in/?lang=hi), [3](https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html), [4](https://huggingface.co/datasets/Hansda/hindi-maya2-ishwari-20h/blob/c835a1a2c3892f5cd47507824bf33df19deec955/README.md), [5](https://github.com/google-research-datasets/dakshina).


![Generation chart](chart.svg)

- **browser-voice-hi-int6 / cpu**: The released acoustic and G2P sessions use the one-thread WASM provider.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-25T09-13-41-711Z-46e002eab6a3; cell 2/2; source f10e2b58e6564c90d59631b375e8bcea0751d398; fixture hi-latn-article-v1 (hi-Latn, 23420 JavaScript characters, 107 spans); requested n=1; effective n=1; Headed Google Chrome, Apple M1 Pro, AC power. Published browser-voice-hi-int6, Ishwari, INT6 packed weights expanded to FP32. Qualified backends: cpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
