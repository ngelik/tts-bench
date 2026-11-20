# 2026-11-19t05-00-58-025z-sano-heart-nano-cpu-warm-0b78045e

Apple M1 Pro MacBook Pro, 8 CPU cores, 16 GiB RAM, macOS 26.6.2, Google Chrome 157.0.8103.40 · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-warm-v1**, scenario **warm**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| sano-heart-nano | cpu | measured | 19.59 s | 19.58–19.63 s | 5 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| sano-heart-nano | cpu | First completed source chunk | 218.995 | ms | 5 |
| sano-heart-nano | cpu | First PCM block | 57.945 | ms | 5 |
| sano-heart-nano | cpu | Generated audio | 1317.600 | s | 5 |
| sano-heart-nano | cpu | Generation / audio duration | 0.015 | ratio | 5 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| sano-heart-nano | 1 | 1 | 1 (en) | SanoTTS heart-nano (English, US) |

Pinned heart-nano int8 voice checkpoint, official en-us browser G2P and snt\_nano WASM runtime. One bundled heart-nano English \(US\) voice is exercised. The official demo splits canonical spans into sentence/clause pieces of at most 120 characters; each piece is tokenized and synthesized inside the timed span call, and non-whitespace dropped IPA or output/token caps fail closed. This registration is CPU/WASM only; other Sano voices and separate WebGPU conversions are not included. Sources: [1](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/README.md), [2](https://huggingface.co/ampixa/sanoTTS/blob/4a8194aa1dd958033ee449b3ad30c37e536b216e/web/voices/heartnano/meta.json), [3](https://github.com/Ampixa/sanoTTS/tree/c0584a51213721faba98135821faab71bae888f0/web).


![Generation chart](chart.svg)

- **sano-heart-nano / cpu**: Pinned official Sano heart-nano int8 WASM completed an untimed neural synthesis piece in a headed Chrome worker; no GPU execution.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T05-00-57-487Z-667f6d74fd94; cell 1/1; source b0f8c8887e9dfab5cef7b8fac9a15af865d722ef; requested n=5; effective n=5; SanoTTS heart-nano official INT8 CPU/WASM profile; 24 kHz; English-US heartnano voice. Exact source manifest SHA-256 169e80e92ff65871eac7fb0de708fb6b2da8c15d9ab96ed7110def2e3341f027 and assets.lock.json SHA-256 3f8c85f42e18f1d5d74662890103a553c87a0111c92d4b253e39ec968b50a2b5. Headed Google Chrome 157.0.8103.40 on the verified M1 Pro 8-core / 16 GiB baseline, AC power, disposable profile. Record per-cell background load and power; no thermal instrumentation. Preserve all source-span outputs and failed evidence.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
