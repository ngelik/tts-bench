# 2026-11-24t19-44-02-537z-browser-voice-te-preview-int8-cpu-cached-07d62f5a

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 158.0.8127.37

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| browser-voice-te-preview-int8 | cpu | measured | 88.65 s | 88.65–88.65 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| browser-voice-te-preview-int8 | cpu | First completed source chunk | 1055.090 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | First PCM block | 1055.080 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Generated audio | 1429.963 | s | 1 |
| browser-voice-te-preview-int8 | cpu | Generation / audio duration | 0.062 | ratio | 1 |
| browser-voice-te-preview-int8 | cpu | Model initialization | 706.320 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Complete controller trial including setup/export | 93707.821 | ms | 1 |
| browser-voice-te-preview-int8 | cpu | Transferred HTTP body data | 1901663 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | Ideal body transfer at 1 Mbps | 15.213 | s | 1 |
| browser-voice-te-preview-int8 | cpu | Whole-call Chrome process-tree peak RSS | 1396801536 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | Per-trial mean generation Chrome process-tree RSS | 1141230220 | bytes | 1 |
| browser-voice-te-preview-int8 | cpu | In-window Chrome RSS observations | 176.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| browser-voice-te-preview-int8 | 1 | 1 | 1 (te) | Sreekar |

Sreekar in the native Telugu-script benchmark using the publisher-deployed preview-int8 acoustic checkpoint.. Native Telugu-script fixture only. Publisher worker uses one-thread WebAssembly for acoustic and G2P sessions. Preview checkpoint terms are unresolved and require acceptance. Sources: [1](https://tts.hansda.in/?lang=te), [2](https://tts.hansda.in/credits.html), [3](https://github.com/DarvinX/multilingual-browser-tts/tree/f2977727b8baccb989f80b492ea8da00124ecba3), [4](https://huggingface.co/datasets/Hansda/telugu-maya2-sreekar-20h/blob/63713495116f46b9a5b0a56ca06ec23059841034/README.md).


![Generation chart](chart.svg)

- **browser-voice-te-preview-int8 / cpu**: The released acoustic and G2P sessions use the one-thread WASM provider.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-24T19-37-59-778Z-0bea5362efd9; cell 2/2; source 4166ea62b50b3f7a0e4234ecb2a667f6b3a78edd; fixture te-article-v1 (te, 20486 JavaScript characters, 93 spans); requested n=1; effective n=1; Headed Google Chrome, Apple M1 Pro, AC power. Published browser-voice-te-preview-int8, Sreekar, INT8 preview packed weights expanded to FP32. Qualified backends: cpu. Sequential isolated profiles. Warm protocol v2 excludes the full article warmup.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
