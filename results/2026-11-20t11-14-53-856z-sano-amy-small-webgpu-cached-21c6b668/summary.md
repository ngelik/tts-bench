# 2026-11-20t11-14-53-856z-sano-amy-small-webgpu-cached-21c6b668

Apple M1 Pro 8-core / 16 GiB baseline · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-amy-small | webgpu | unsupported | — | — | 0 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-amy-small | 1 | 1 | 1 (en) | Amy-small (English, eSpeak en-us) |

One pinned English Amy-small 1.08M \(English\) voice checkpoint with the official piperlite WASM runtime. The source package is the pinned official Amy-small FP16 piperlite package. A reproducible converter emits the matching FP32 browser front/decoder ABI; the pinned en-us phoneme config and voice slot 1 are retained. Output is 22,050 Hz. The bundled browser artifact is a reproducible benchmark conversion, not an upstream prebuilt browser voice package. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/25410576d005d7f08d186990fd91f6a2651243de/amy-en-1p1m/manifest.json).


![Generation chart](chart.svg)

- **sano-amy-small / webgpu**: Official Sano piperlite inference is CPU WebAssembly; no WebGPU execution provider is available. Official Sano piperlite inference is CPU WebAssembly; no WebGPU execution provider is available.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-20T11-14-53-346Z-4e1c4d9009cf; cell 1/1; source 8b929d8e68834b101dd1992981e9b04640222748; requested n=1; effective n=1; Official pinned Sano browser WASM profile. Explicit no-score WebGPU capability attempt on the full canonical fixture; require unsupported with zero scored trials and no CPU fallback. Not a warm performance measurement. Headed Chrome157.0.8103.40, actual Apple M1 Pro 8-core /16GiB, sequential exclusive M1 slot with disposable browser profile. Actual pre-cell power: Now drawing from 'AC Power'  -InternalBattery-0 (id=22216803)	77%; AC attached; not charging present: true; background load snapshot: 3:14  up 15 days, 16:56, 1 user, load averages: 3.92 3.25 3.23; UTC 2026-11-20T11:14:53.073309+00:00

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
