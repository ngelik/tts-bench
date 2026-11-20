# 2026-11-20t06-41-40-071z-sano-kristin-cpu-cached-7cfb4ab7

Apple M1 Pro 8-core / 16 GiB baseline · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-kristin | cpu | measured | 674.05 s | 674.05–674.05 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-kristin | cpu | First completed source chunk | 15654.730 | ms | 1 |
| sano-kristin | cpu | First PCM block | 15654.720 | ms | 1 |
| sano-kristin | cpu | Generated audio | 1076.419 | s | 1 |
| sano-kristin | cpu | Generation / audio duration | 0.626 | ratio | 1 |
| sano-kristin | cpu | Model initialization | 44.258 | ms | 1 |
| sano-kristin | cpu | Complete controller trial including setup/export | 677314.718 | ms | 1 |
| sano-kristin | cpu | Transferred HTTP body data | 38404 | bytes | 1 |
| sano-kristin | cpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| sano-kristin | cpu | Whole-call Chrome process-tree peak RSS | 1104920576 | bytes | 1 |
| sano-kristin | cpu | Per-trial mean generation Chrome process-tree RSS | 850106096 | bytes | 1 |
| sano-kristin | cpu | In-window Chrome RSS observations | 1342.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-kristin | 1 | 1 | 1 (en) | Kristin (English, eSpeak en) |

One pinned English Kristin 1.40M \(English\) voice checkpoint with the official piperlite WASM runtime. The official Kristin piperlite voice uses its pinned FP32 front/decoder package, eSpeak voice en, G2P voice slot 0, length scale 1.08 and 22,050 Hz output. Synthesis runs in the official sanotts-web 0.3.0 WebAssembly runtime; no WebGPU provider is available. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/bc04c49fd137607b60294b3894441bbfbe5c6659/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/bc04c49fd137607b60294b3894441bbfbe5c6659/web/voices/kristin/meta.json).


![Generation chart](chart.svg)

- **sano-kristin / cpu**: Official Sano piperlite Emscripten WebAssembly in a headed Chrome classic worker; an untimed CPU utterance passed; no GPU execution.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T06-41-39-566Z-0f61b88c0366; cell 1/1; source 8b929d8e68834b101dd1992981e9b04640222748; requested n=1; effective n=1; Official pinned Sano browser WASM profile. Supplemental full-article cached resource diagnostic, one observation; generation-window 500ms Chrome process-tree RSS, separate from existing warm n5. No cold/network timing. No source, voice, precision or frontend changes. Headed Chrome157.0.8103.40, actual Apple M1 Pro 8-core /16GiB, sequential exclusive M1 slot with disposable browser profile. Actual pre-cell power: Now drawing from 'AC Power'  -InternalBattery-0 (id=22216803)	77%; AC attached; not charging present: true; background load snapshot: 22:41  up 15 days, 12:23, 1 user, load averages: 1.89 1.90 1.93; UTC 2026-11-20T06:41:39.282826+00:00

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
