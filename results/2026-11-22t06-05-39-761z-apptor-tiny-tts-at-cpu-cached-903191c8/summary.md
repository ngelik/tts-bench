# 2026-11-22t06-05-39-761z-apptor-tiny-tts-at-cpu-cached-903191c8

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| apptor-tiny-tts-at | cpu | measured | 230.59 s | 230.59–230.59 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| apptor-tiny-tts-at | cpu | First completed source chunk | 2292.190 | ms | 1 |
| apptor-tiny-tts-at | cpu | First PCM block | 831.930 | ms | 1 |
| apptor-tiny-tts-at | cpu | Generated audio | 1453.080 | s | 1 |
| apptor-tiny-tts-at | cpu | Generation / audio duration | 0.159 | ratio | 1 |
| apptor-tiny-tts-at | cpu | Model initialization | 433.392 | ms | 1 |
| apptor-tiny-tts-at | cpu | Complete controller trial including setup/export | 235402.353 | ms | 1 |
| apptor-tiny-tts-at | cpu | Transferred HTTP body data | 50385 | bytes | 1 |
| apptor-tiny-tts-at | cpu | Ideal body transfer at 1 Mbps | 0.403 | s | 1 |
| apptor-tiny-tts-at | cpu | Whole-call Chrome process-tree peak RSS | 1716830208 | bytes | 1 |
| apptor-tiny-tts-at | cpu | Per-trial mean generation Chrome process-tree RSS | 1105299050 | bytes | 1 |
| apptor-tiny-tts-at | cpu | In-window Chrome RSS observations | 459.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| apptor-tiny-tts-at | 2 | 2 | 1 (de-AT) | M2 |

Pinned Austrian Standard German checkpoint, synthetic M2 speaker, Austrian phonetic rules and accent conditioning.. The model card/demo expose two synthetic speakers \(F2, M2\); internal label AT is the Austrian accent style, not a third public speaker. Benchmark settings use M2 at internal index 1, speed 1.0, pitch shift 0, pitch range 1.0, accent 1.0, 24 kHz and INT8 Vocos. Austrian pronunciation readings are enabled at accent &gt;= 0.5. The upstream card describes an early-preview mild/inconsistent Austrian Standard German accent, not a dialect; output rights are not inferred from the model license. Sources: [1](https://huggingface.co/apptor/apptor-tiny-tts-at/tree/e28eb444250b4d06162e6ba8e5090c4284345913), [2](https://huggingface.co/apptor/apptor-tiny-tts-at/blob/e28eb444250b4d06162e6ba8e5090c4284345913/README.md), [3](https://huggingface.co/apptor/apptor-tiny-tts-at/tree/e28eb444250b4d06162e6ba8e5090c4284345913/web), [4](https://github.com/gemelo-ai/vocos/tree/eb39abfc42c1dee4854d9b10d44dd7d4fd3b0e53).


![Generation chart](chart.svg)

- **apptor-tiny-tts-at / cpu**: Explicit single-thread WASM inference for Austrian G2P, TTS and Vocos.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T05-39-38-326Z-1faadfd5898a; cell 3/4; source e49d51e6aaa9ee77d700285ca17b02003dda5f00; fixture de-at-article-v1 (de-AT, 23898 JavaScript characters, 109 spans); requested n=1; effective n=1; Austrian German M2, accent 1.0, speed 1.0, 24 kHz, INT8 Vocos, one WASM thread. Full warm v2 scores precede separate cached RSS diagnostics. CPU and WebGPU are sequential.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
