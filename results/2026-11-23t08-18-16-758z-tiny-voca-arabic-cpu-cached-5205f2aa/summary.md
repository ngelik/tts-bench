# 2026-11-23t08-18-16-758z-tiny-voca-arabic-cpu-cached-5205f2aa

MacBook Pro (Apple M1 Pro, 16 GB) · Apple M1 Pro · Google Chrome 157.0.8103.79

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| tiny-voca-arabic | cpu | measured | 530.88 s | 530.88–530.88 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| tiny-voca-arabic | cpu | First completed source chunk | 5648.765 | ms | 1 |
| tiny-voca-arabic | cpu | First PCM block | 5643.400 | ms | 1 |
| tiny-voca-arabic | cpu | Generated audio | 1728.475 | s | 1 |
| tiny-voca-arabic | cpu | Generation / audio duration | 0.307 | ratio | 1 |
| tiny-voca-arabic | cpu | Model initialization | 2438.056 | ms | 1 |
| tiny-voca-arabic | cpu | Complete controller trial including setup/export | 538557.139 | ms | 1 |
| tiny-voca-arabic | cpu | Transferred HTTP body data | 97102 | bytes | 1 |
| tiny-voca-arabic | cpu | Ideal body transfer at 1 Mbps | 0.777 | s | 1 |
| tiny-voca-arabic | cpu | Whole-call Chrome process-tree peak RSS | 2099527680 | bytes | 1 |
| tiny-voca-arabic | cpu | Per-trial mean generation Chrome process-tree RSS | 1241116129 | bytes | 1 |
| tiny-voca-arabic | cpu | In-window Chrome RSS observations | 1056.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| tiny-voca-arabic | 1 | 1 | 1 (ar) | a000 |

Experimental MSA profile with one synthetic a000 voice, 24 kHz mono, CATT v2 browser diacritization, and ar-article-v1. Latin-script text is stripped; no standalone English support.. Frontend audit: 129 spans, 339 utterances, max 194 tokens, zero unknown tokens/words; token/stress SHA-256 1f5bce0f95699c495b17ec67838ba5f3269bbd2fb631499ab40b26eebe8b3194. CATT runs CPU/WASM on both adapters; WebGPU capability applies only to the acoustic ONNX graph. Sources: [1](https://huggingface.co/oddadmix/tiny-voca-arabic/tree/e529f716965142f51835adc9e5661f224c3fa103), [2](https://huggingface.co/oddadmix/tiny-voca-arabic/blob/e529f716965142f51835adc9e5661f224c3fa103/README.md), [3](https://huggingface.co/spaces/oddadmix/tiny-voca-arabic/tree/64e3e2ae08f7553c38f280a58f05b955a0c296f4), [4](https://huggingface.co/datasets/oddadmix/msa-duplex-assistant-tts/tree/ace6ef2243b47f5152fa95c5c5a6b1db56a05ca2), [5](https://github.com/abjadai/catt/releases/tag/v2), [6](https://github.com/abjadai/catt/commit/8d5330499feb85f6625e6af632141ed2ed6065fd).


![Generation chart](chart.svg)

- **tiny-voca-arabic / cpu**: Acoustic and CATT inference use explicit single-thread CPU/WASM.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-23T07-52-37-125Z-d70f7068be34; cell 3/4; source 16bdd280e2fa8296f6e9ecfcfd062bf0ec66a765; fixture ar-article-v1 (ar, 28275 JavaScript characters, 129 spans); requested n=1; effective n=1; Headed Google Chrome on Apple M1 Pro, disposable sequential profiles. Oddadmix’s released Arabic FP32 graph at step 104000, a000 voice index zero, neutral controls, stock sentence/fit, 120 ms inter-utterance gaps and per-span peak normalization. The original CATT v2 ED executes through single-thread CPU/WASM in both acoustic modes, with exact Python tokenizer and Arabic rules in Pyodide 0.26.4. ORT Web 1.20.1 supports acoustic CPU/WASM or Apple hardware WebGPU+WASM. The excluded warm-up populates the worker phrase cache. Cached resource observations begin with a fresh phrase cache.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
