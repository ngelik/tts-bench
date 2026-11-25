# 2026-11-25t18-08-12-521z-browser-voice-te-preview-int8-cpu-cached-91e47a8f

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| browser-voice-te-preview-int8 | cpu | measured | 87.29 s | 87.29–87.29 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| browser-voice-te-preview-int8 | cpu | First completed source chunk | 972.730 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | First PCM block | 972.715 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Generated audio | 1426.901 | s | 1 |
| browser-voice-te-preview-int8 | cpu | Generation / audio duration | 0.061 | ratio | 1 |
| browser-voice-te-preview-int8 | cpu | Model initialization | 700.006 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Complete controller trial including setup/export | 92344.178 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Transferred HTTP body data | 2694497 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | Ideal body transfer at 1 Mbps | 21.556 | s | 1 |
| browser-voice-te-preview-int8 | cpu | Whole-call Chrome process-tree peak RSS | 1781874688 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | Per-trial mean generation Chrome process-tree RSS | 1231749309 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | In-window Chrome RSS observations | 173.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| browser-voice-te-preview-int8 | 1 | 1 | 1 (te) | Sreekar |

Sreekar speaks Telugu from Telugu script or Roman input using the published PREVIEW-INT8 checkpoint.. Telugu script and Roman Telugu have separate registered articles. The stock Roman frontend uses the Dakshina-derived dictionary. Publisher worker uses one-thread WebAssembly for acoustic and G2P sessions. Preview checkpoint terms are unresolved and require acceptance. Sources: [1](https://tts.hansda.in/?lang=te), [2](https://tts.hansda.in/credits.html), [3](https://github.com/DarvinX/multilingual-browser-tts/tree/f2977727b8baccb989f80b492ea8da00124ecba3), [4](https://huggingface.co/datasets/Hansda/telugu-maya2-sreekar-20h/blob/63713495116f46b9a5b0a56ca06ec23059841034/README.md), [5](https://github.com/google-research-datasets/dakshina).


![Generation chart](chart.svg)

- **browser-voice-te-preview-int8 / cpu**: The released acoustic and G2P sessions use the one-thread WASM provider.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-25T18-02-15-299Z-c054b9040872; cell 2/2; source 8ee165d13083d9f6fa75bcf731421c2fb6dac98f; fixture te-latn-article-v1 (te-Latn, 24747 JavaScript characters, 113 spans); requested n=1; effective n=1; Headed Google Chrome, Apple M1 Pro, AC power. Published browser-voice-te-preview-int8, Sreekar, INT8 preview packed weights expanded to FP32. Qualified backends: cpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
