# 2026-11-19t12-33-24-733z-sano-amy-1p8m-cpu-warm-f43efd39

Apple M1 Pro 8-core / 16 GiB baseline · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-amy-1p8m | cpu | measured | 760.40 s | 759.50–765.69 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-amy-1p8m | cpu | First completed source chunk | 8700.585 | ms | 5 |
| sano-amy-1p8m | cpu | First PCM block | 8700.540 | ms | 5 |
| sano-amy-1p8m | cpu | Generated audio | 1203.165 | s | 5 |
| sano-amy-1p8m | cpu | Generation / audio duration | 0.632 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-amy-1p8m | 1 | 1 | 1 (en) | Amy 1.8M (English, eSpeak en-us) |

One pinned English Amy 1.83M \(English\) voice checkpoint with the official piperlite WASM runtime. The source package is the pinned official Amy 1.8M FP16 piperlite package. A reproducible converter emits the matching FP32 browser front/decoder ABI; the pinned en-us phoneme config and voice slot 1 are retained. Output is 22,050 Hz. The bundled browser artifact is a reproducible benchmark conversion, not an upstream prebuilt browser voice package. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p8m/manifest.json).


![Generation chart](chart.svg)

- **sano-amy-1p8m / cpu**: Official Sano piperlite Emscripten WebAssembly in a headed Chrome classic worker; an untimed CPU utterance passed; no GPU execution.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T12-33-24-219Z-c74a3dbc8713; cell 1/1; source 8b929d8e68834b101dd1992981e9b04640222748; requested n=5; effective n=5; Official Sano sano-amy-1p8m English CPU/WASM profile; 22050 Hz. Source manifest SHA-256 df550f024216e8c8e206a9d8e72702dc4afdf845e05f907df855b4d12ceddd4a; assets.lock.json SHA-256 9083fb020ed8ee50a2c9ee646c3913b9707709db9ad03605ad6d59865724a99b. Headed Chrome 157.0.8103.40 on verified M1 Pro 8-core / 16 GiB baseline, AC power, disposable profile. One excluded full-article warm-up plus five scored 20,000-character articles; no RSS collection, no cache scenario. Preserve receipts and WAVs; no WebGPU fallback. Pre-cell condition snapshot UTC 2026-11-19T12:33:24.097173+00:00; power: Now drawing from 'AC Power'  -InternalBattery-0 (id=22216803)	78%; AC attached; not charging present: true; host load: 4:33  up 14 days, 18:14, 1 user, load averages: 3.71 3.57 3.46.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
