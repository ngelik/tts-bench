# 2026-11-19t11-12-09-964z-sano-trellis-cpu-cached-7b7a68cf

Apple MacBook Pro M1 Pro / 8 CPU cores / 16 GiB RAM / native arm64 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-trellis | cpu | measured | 133.14 s | 133.14–133.14 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-trellis | cpu | First completed source chunk | 1858.435 | ms | 1 |
| sano-trellis | cpu | First PCM block | 744.250 | ms | 1 |
| sano-trellis | cpu | Generated audio | 1328.544 | s | 1 |
| sano-trellis | cpu | Generation / audio duration | 0.100 | ratio | 1 |
| sano-trellis | cpu | Model initialization | 51.135 | ms | 1 |
| sano-trellis | cpu | Complete controller trial including setup/export | 137465.909 | ms | 1 |
| sano-trellis | cpu | Transferred HTTP body data | 38404 | bytes | 1 |
| sano-trellis | cpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| sano-trellis | cpu | Whole-call Chrome process-tree peak RSS | 1473445888 | bytes | 1 |
| sano-trellis | cpu | Per-trial mean generation Chrome process-tree RSS | 745524367 | bytes | 1 |
| sano-trellis | cpu | In-window Chrome RSS observations | 265.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-trellis | 1 | 1 | 1 (en) | SanoTTS Trellis experimental (English, US) |

Pinned official trellis English checkpoint and CPU/WASM runtime. Official demo English preset; 120-character internal pieces preserve all canonical source characters. No WebGPU path in the selected runtime. Experimental Trellis-RIFT full pipeline with 995,058 FP32 parameters. Sources: [1](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/web/index.html), [2](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/README.md).


![Generation chart](chart.svg)

- **sano-trellis / cpu**: Official CPU WASM completed an untimed speech piece.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T11-12-09-397Z-4bb992867d08; cell 1/1; source 7f9b7982e5336be8642f91404584114371582fcd; requested n=1; effective n=1; Serial native M1 Pro campaign, disposable headed Google Chrome 157.0.8103.40 from the explicitly preserved executable. Shared OS slot excludes other benchmark/diagnostic/publication work. Cached resource article precedes warm timing. Full-fixture frontend audited separately on this exact clean source; official 304 internal text pieces preserve all non-whitespace source characters. No cold check; no inferred GPU score. Power and hardware observed in companion preflight.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
