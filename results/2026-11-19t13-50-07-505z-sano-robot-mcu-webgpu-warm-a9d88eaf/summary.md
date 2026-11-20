# 2026-11-19t13-50-07-505z-sano-robot-mcu-webgpu-warm-a9d88eaf

Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-robot-mcu | webgpu | unsupported | — | — | 0 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-robot-mcu | 1 | 1 | 1 (en) | SanoTTS Robot MCU (English, US) |

Pinned official mcu English checkpoint and CPU/WASM runtime. Official demo English preset; 120-character internal pieces preserve all canonical source characters. No WebGPU path in the selected runtime. Robot is the 567,008-parameter MCU model, not Kristin PiperLite. Sources: [1](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/web/index.html), [2](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/README.md).


![Generation chart](chart.svg)

- **sano-robot-mcu / webgpu**: The pinned official SanoTTS Robot/Trellis browser path is CPU WebAssembly; it does not implement WebGPU dispatch. The pinned official SanoTTS Robot/Trellis browser path is CPU WebAssembly; it does not implement WebGPU dispatch.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T13-50-06-913Z-f7278423d707; cell 1/1; source 7f9b7982e5336be8642f91404584114371582fcd; requested n=5; effective n=5; Serial native M1 Pro campaign, disposable headed Google Chrome 157.0.8103.40 from the explicitly preserved executable. Shared OS slot excludes other benchmark/diagnostic/publication work. Cached resource article precedes warm timing. Full-fixture frontend audited separately on this exact clean source; official 304 internal text pieces preserve all non-whitespace source characters. No cold check; no inferred GPU score. Power and hardware observed in companion preflight.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
