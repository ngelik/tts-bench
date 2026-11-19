# 2026-11-19t09-31-21-509z-zonos3-mini-webgpu-cached-b311ae76

Apple MacBook Pro M1 Pro / 16 GB · Apple M1 Pro · Google Chrome 157.0.8103.40

Protocol: **browser-tts-cached-v1-resources**, scenario **cached**. Native harness run.

First source-chunk request through final CPU-readable PCM; excludes initialization, validation, hashing, WAV encoding and save. Optional articleCallPeakRssBytes spans the entire browser call including post-timer validation/export. Generation RSS uses timestamped samples inside browser generation start/end boundaries; it includes the owned Chrome process tree and browser baseline.

| Model | Requested backend | Status | Median | Min–max | Runs |
|---|---|---|---:|---:|---:|
| zonos3-mini | webgpu | measured | 153.69 s | 153.69–153.69 s | 1 |

Additional metrics (median of available observations; scopes are distinct):

| Model | Backend | Metric | Median | Unit | n |
|---|---|---|---:|---|---:|
| zonos3-mini | webgpu | First completed source chunk | 1826.215 | ms | 1 |
| zonos3-mini | webgpu | First PCM block | 139.400 | ms | 1 |
| zonos3-mini | webgpu | Generated audio | 1284.333 | s | 1 |
| zonos3-mini | webgpu | Generation / audio duration | 0.120 | ratio | 1 |
| zonos3-mini | webgpu | Model initialization | 1802.956 | ms | 1 |
| zonos3-mini | webgpu | Complete controller trial including setup/export | 162685.833 | ms | 1 |
| zonos3-mini | webgpu | Transferred HTTP body data | 38404 | bytes | 1 |
| zonos3-mini | webgpu | Ideal body transfer at 1 Mbps | 0.307 | s | 1 |
| zonos3-mini | webgpu | Whole-call Chrome process-tree peak RSS | 2082717696 | bytes | 1 |
| zonos3-mini | webgpu | Per-trial mean generation Chrome process-tree RSS | 1126218330 | bytes | 1 |
| zonos3-mini | webgpu | In-window Chrome RSS observations | 306.000 | samples | 1 |

Model support (catalog capability, not coverage of this run):

| Model | Supported voices | Bundled voices | Languages | Tested voice |
|---|---:|---:|---|---|
| zonos3-mini | 27 | 1 | 43 | Imogen (English, British female) |

Pinned ZONOS3-Mini checkpoint and official 27-preset voice catalog; one English preset is staged and benchmarked.. The checkpoint advertises 43 languages across 44 server locale codes and the pinned voice manifest lists 27 presets, including 10 English voices. Only Imogen \(English, British female\) is staged and measured. The WebGPU profile loads its reference codes and speaker embedding; the CPU/WASM profile loads the speaker embedding only. The benchmark skips unused preview audio. No other preset or language is exercised. Sources: [1](https://huggingface.co/Zyphra/ZONOS3-Mini/blob/2921b8821772b0bd10a04456863d21abf9d2f283/README.md), [2](https://huggingface.co/Zyphra/ZONOS3-Mini/blob/2921b8821772b0bd10a04456863d21abf9d2f283/web/voices/voices.json), [3](https://github.com/Zyphra/ZONOS3-Mini/blob/a50e14117d99181ba7f28047b451ba03ba1a09a9/servers/web/README.md), [4](https://github.com/Zyphra/ZONOS3-Mini/blob/a50e14117d99181ba7f28047b451ba03ba1a09a9/model/src/zonos3/registries/languages.json).


![Generation chart](chart.svg)

- **zonos3-mini / webgpu**: Selected hardware adapter apple / metal-3; observed 42459 compute dispatches during separate untimed generation. The neural backbone and decoder use WebGPU; codec host iSTFT/FIR/resampling and PCM readback use CPU.

Capability checks run separately before timing. GPU dispatch does not imply GPU-exclusive execution.

Raw WAV is saved locally; opt-in audio publication is separate from timing and automatic result submission.

Campaign 2026-11-19T09-31-17-548Z-5fbdbdd88af5; cell 1/1; source de9dded4722f160d185b4dcbbb720edec8ee595f; requested n=1; effective n=1; ZONOS3-Mini webgpu profile; Official Zyphra browser runtime pinned at a50e14117d99181ba7f28047b451ba03ba1a09a9. Require a real selected hardware adapter and a separate untimed inference-worker compute-dispatch probe; scored inference requires EOS. Backbone and KEEP-2 neural kernels dispatch on WebGPU; host iSTFT/FIR mixing/resampling and float32 PCM readback use CPU. Short-text/LACI is off; canonical spans pass unchanged. Actual voice: Imogen (English, British female); pinned Imogen codes and embedding; preview audio disabled.. Precision: Pinned official Web export; tensor formats are declared per-tensor in its manifests.. Source: de9dded4722f160d185b4dcbbb720edec8ee595f. Power: AC Power. Background activity: At 2026-11-19T07:29:53Z, the separate one-cell ZONOS3-Mini WebGPU cached n=1 resource cell is queued through the shared serial M1 lock after already queued shorter native jobs. One prior clean-source WebGPU warm-up and one scored full article passed strict receipt and full WAV review; this cell measures an independent cached article and generation-window RSS.. Record AC power, background activity, and run order separately; do not infer a matched CPU/GPU speedup across distinct runtime/precision profiles.

RSS is sampled every 500 ms across the owned Chrome process tree, including the Chrome baseline and inference workers. Whole-call peak spans post-timer validation/export; generation mean uses only in-window samples from browser generation start through final CPU-readable PCM.

Different protocols, fixtures, settings or machines must not be pooled into a speedup ranking. This report does not rate speech quality.
