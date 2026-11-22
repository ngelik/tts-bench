# 2026-11-22t07-23-37-629z-tiny-voca-de-en-cpu-cached-13c87a78

MacBook Pro 18,3 / Apple M1 Pro 8-core / 16 GB / arm64 · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-de-en | cpu | measured | 52.66 s | 52.66–52.66 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-de-en | cpu | First completed source chunk | 693.715 | ms | 1 |
| tiny-voca-de-en | cpu | First PCM block | 213.655 | ms | 1 |
| tiny-voca-de-en | cpu | Generated audio | 1134.635 | s | 1 |
| tiny-voca-de-en | cpu | Generation / audio duration | 0.046 | ratio | 1 |
| tiny-voca-de-en | cpu | Model initialization | 825.453 | ms | 1 |
| tiny-voca-de-en | cpu | Complete controller trial including setup/export | 57063.036 | ms | 1 |
| tiny-voca-de-en | cpu | Transferred HTTP body data | 42626 | bytes | 1 |
| tiny-voca-de-en | cpu | Ideal body transfer at 1 Mbps | 0.341 | s | 1 |
| tiny-voca-de-en | cpu | Whole-call Chrome process-tree peak RSS | 1571618816 | bytes | 1 |
| tiny-voca-de-en | cpu | Per-trial mean generation Chrome process-tree RSS | 1199995195 | bytes | 1 |
| tiny-voca-de-en | cpu | In-window Chrome RSS observations | 104.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-de-en | 64 | 64 | 2 (de, en) | fresh-en-f00 |

Pinned Voca64 checkpoint with 32 synthetic German and 32 synthetic English voices; benchmark fixes fresh-de-f00 and fresh-en-f00.. The official pinned browser bundle uses local Phony/nrmlz frontends and ONNX Runtime WebAssembly CPU inference; this benchmark profile also runs the same pinned graphs through ONNX Runtime WebGPU with WASM fallback and verified hardware dispatch. The Space frontend NOTICE says English production phonemization is not enabled, while the pinned worker and English frontend do expose it; English is gated by official full-fixture token/stress parity and headed browser smoke diagnostics. The Apache model license does not establish standalone output rights. Sources: [1](https://huggingface.co/Fraunhofer-IEM/tiny-voca-de-en/tree/57fe34dfc061e6cc58e27d186bf7ba16d82d2def), [2](https://huggingface.co/Fraunhofer-IEM/tiny-voca-de-en/blob/57fe34dfc061e6cc58e27d186bf7ba16d82d2def/README.md), [3](https://huggingface.co/spaces/Fraunhofer-IEM/designed-voices-tts/tree/a8ee94178a6f9b703e89e113a3354549d1bdc38d), [4](https://huggingface.co/spaces/Fraunhofer-IEM/designed-voices-tts/blob/a8ee94178a6f9b703e89e113a3354549d1bdc38d/THIRD_PARTY_NOTICES.md).


![Generation chart](chart.svg)

- **tiny-voca-de-en / cpu**: Pinned official Voca64 plan and wave graphs run with ONNX Runtime Web 1.23.2, explicit single-thread WASM SIMD.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-22T07-18-38-587Z-6c4e2db495aa; cell 3/4; source 144f1e4a2e9913f921b3ad559517c0cc9970067d; fixture english-20k-v1 (en, 20000 JavaScript characters, 93 spans); requested n=1; effective n=1; Headed Google Chrome in disposable profiles, one at a time. AC, browser build, background load and thermal status to be recorded locally at start and finish. Resource sampling is a separate cached diagnostic.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
