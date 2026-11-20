# 2026-11-20t11-04-10-625z-sano-amy-small-cpu-cached-f79f98ef

Apple M1 Pro 8-core / 16 GiB baseline · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-amy-small | cpu | measured | 529.39 s | 529.39–529.39 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-amy-small | cpu | First completed source chunk | 12053.675 | ms | 1 |
| sano-amy-small | cpu | First PCM block | 12053.665 | ms | 1 |
| sano-amy-small | cpu | Generated audio | 1214.102 | s | 1 |
| sano-amy-small | cpu | Generation / audio duration | 0.436 | ratio | 1 |
| sano-amy-small | cpu | Model initialization | 41.999 | ms | 1 |
| sano-amy-small | cpu | Complete controller trial including setup/export | 533077.255 | ms | 1 |
| sano-amy-small | cpu | Transferred HTTP body data | 38404 | bytes | 1 |
| sano-amy-small | cpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| sano-amy-small | cpu | Whole-call Chrome process-tree peak RSS | 1159331840 | bytes | 1 |
| sano-amy-small | cpu | Per-trial mean generation Chrome process-tree RSS | 894074212 | bytes | 1 |
| sano-amy-small | cpu | In-window Chrome RSS observations | 1054.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-amy-small | 1 | 1 | 1 (en) | Amy-small (English, eSpeak en-us) |

One pinned English Amy-small 1.08M \(English\) voice checkpoint with the official piperlite WASM runtime. The source package is the pinned official Amy-small FP16 piperlite package. A reproducible converter emits the matching FP32 browser front/decoder ABI; the pinned en-us phoneme config and voice slot 1 are retained. Output is 22,050 Hz. The bundled browser artifact is a reproducible benchmark conversion, not an upstream prebuilt browser voice package. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p1m/manifest.json).


![Generation chart](chart.svg)

- **sano-amy-small / cpu**: Official Sano piperlite Emscripten WebAssembly in a headed Chrome classic worker; an untimed CPU utterance passed; no GPU execution.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T11-04-10-100Z-d4c6e27a47d8; cell 1/1; source 8b929d8e68834b101dd1992981e9b04640222748; requested n=1; effective n=1; Official pinned Sano browser WASM profile. Supplemental full-article cached resource diagnostic, one observation; generation-window 500ms Chrome process-tree RSS, separate from existing warm n5. No cold/network timing. No source, voice, precision or frontend changes. Headed Chrome157.0.8103.40, actual Apple M1 Pro 8-core /16GiB, sequential exclusive M1 slot with disposable browser profile. Actual pre-cell power: Now drawing from 'AC Power'  -InternalBattery-0 (id=22216803)	77%; AC attached; not charging present: true; background load snapshot: 3:04  up 15 days, 16:45, 1 user, load averages: 2.80 4.03 3.34; UTC 2026-11-20T11:04:09.801923+00:00

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
