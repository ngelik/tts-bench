# Liquid LFM3 in CPU WebAssembly

The CPU configurations use the community [Fusor browser implementation](https://github.com/fusor-rs/liquidai-lmf3-wasm/tree/d21345320af38a5f2246a6d2e608d7cf178d92ef). They are separate from the [official WebGPU GGUF configurations](LIQUID_LFM3.md): weights, precision, runtime, context capacity and speech sampling differ. Their results compare practical browser configurations, not an isolated CPU-versus-GPU speedup.

| Configuration | Immutable bundle revision | Underlying Liquid AI checkpoint |
|---|---|---|
| `lfm3-audio-2b-fusor-q7-cpu` | `e273326dda2bb26870549ed7b39324ae086e5fe7` | `9d49701c372d6011d900f6abb40c6b296fb706dd` |
| `lfm3-omni-2b-fusor-q7-cpu` | `09f4fc6ddbbb3cc6cd30f74b1e76cc894f4901f4` | `ce2458cbce4ad970f92032ed94e3d18d30b04f9c` |

The [Audio](https://huggingface.co/fusorlabs/lfm3-audio-2b-web/blob/e273326dda2bb26870549ed7b39324ae086e5fe7/manifest.json) and [Omni](https://huggingface.co/fusorlabs/lfm3-omni-2b-web/blob/09f4fc6ddbbb3cc6cd30f74b1e76cc894f4901f4/manifest.json) manifests name those base checkpoints. These are q7 bundles, with upstream exceptions such as FP32 subsampling weights; “q7” does not mean every value is seven-bit.

Prebuilt WASM and JavaScript are fetched from the [pinned browser Space](https://huggingface.co/spaces/fusorlabs/liquidai-lmf3-wasm/tree/572fc51e58808d3536bc8a8bea9d74a11b4b88bc). Its Fusor source submodule is pinned to `67bbe1ebeb140f11262f15996b79825bbe1cf461`. The CLI verifies SHA-256 and byte counts; the pinned neural runtime additionally verifies each model part's BLAKE3 digest through both loading paths. No model binaries or neural runtime are committed here.

## Loading policy and observed setup failures

Audio and Omni use the local MIT-attributed `web/liquid-cpu/part-loader.mjs`,
derived from the pinned Fusor loader, to stream model parts over same-origin HTTP
without OPFS persistence. This policy follows repeated initialization stalls on
the baseline; it does not establish that all upstream OPFS deployments fail.
The newer Audio observation remained in its untimed capability probe with 48
OPFS files present and one expected 47,256,576-byte part still empty. No scored
generation had begun, and the underlying unresolved await is undetermined. The
failed attempt remains preserved and is not an execution score. See [run notes
and retained evidence](LIQUID_LFM3_RUN_NOTES.md).

The local loader retains four lanes and approximately 4 MiB writes for both
variants. It checks HTTP status, declared and actual byte counts, and calls the pinned runtime's
`end_part` for BLAKE3 verification. Errors abort sibling requests; each part has
a 120-second initialization timeout with a filename-bearing error. There are no
implicit retries. Model bytes, runtime build, speech sampling and generation
code are unchanged. Initialization remains outside the generation timer.

Audio and Omni may reuse Chrome's HTTP cache, but large assets can be evicted and
fetched again from the local static server. A cached-profile scenario does not
promise zero transfer. These large configurations are evaluated with pre-staged
assets; this campaign does not perform a throttled 1 Mbps loading run. Do not
interpret the local loading timeout as a measured download-speed result.

The upstream demo chooses cores minus two, capped at eight. This eight-core M1 Pro case requests **six compute threads**, with the upstream relaxed-SIMD build selected when supported. The adapter records the effective build and rejects single-thread fallback. Threading requires cross-origin isolation and SharedArrayBuffer; the local benchmark server supplies the necessary headers. The page owns the compute workers and terminates them on failure or disposal. The small MIT-attributed host controller adds timeout and post-start worker-error handling; the neural WASM, loader and kernels remain unchanged.

The Audio profile accepts the registered `en`, `ar`, `da`, `de`, `el`, `fi`, `fr`, `he`, `it`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `es-ES`, `sv`, `tr` and `zh-Hans` fixtures. It resolves the exact fixture tag into the official prompt form `Perform TTS in <language> using a female voice.` English retains the original American English prompt. The model card lists Portuguese, Spanish and Chinese without regional or script-specific accent guarantees, so their prompts use those broader names. Omni remains on the original American English prompt. Every canonical source span is passed unchanged, with runtime state reset beforehand. Output is mono 24 kHz. Context capacity is 8,192 rows and the output cap is 4,096 rows; the adapter rejects reduced budgets and cap termination. Text/control tokens use upstream greedy defaults. Speech uses the variant's upstream sampling parameters, with **seed 0 per span** as a disclosed benchmark override to the demo's random seed:

| Variant | Temperature | Top-k | Repetition penalty | Recent-frame window |
|---|---:|---:|---:|---:|
| Audio | 1.0 | 128 | 1.1 | 4,096 |
| Omni | 0.4 | All codes | 1.2 | 64 |

Both checkpoints advertise 18 spoken languages. English US/UK locales are not separate languages. Female/male prompts do not establish fixed voice identity counts; the count remains unknown. The benchmark's Audio profile selects female prompts, while the separate Omni profile stays English-only.

## Reproduce

```sh
npm ci
npm run assets -- fetch --model lfm3-audio-2b-fusor-q7-cpu --accept-license
npm run bench -- run --model lfm3-audio-2b-fusor-q7-cpu --backend cpu --smoke --accept-license
npm run bench -- run --model lfm3-audio-2b-fusor-q7-cpu --backend cpu --scenario warm --accept-license --machine "MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64" --note "Record actual power and background conditions"
npm run bench -- run --model lfm3-audio-2b-fusor-q7-cpu --backend cpu --scenario cached --resources --repetitions 1 --accept-license --machine "MacBook Pro / Apple M1 Pro 8-core / 16 GiB / arm64"
```

Substitute `lfm3-omni-2b-fusor-q7-cpu` for Omni. Commit and publish the reviewed implementation before scoring from a clean checkout. A new warm score uses one excluded full warm-up and one scored 20,000-character article covering all 93 spans. Historical five-run measurements retain their original sample counts. Memory is a separate one-article diagnostic. Cold-load checks are excluded from this campaign.

A normal stop and finite PCM do not establish faithful reading. Inspect the output-length notes and receipt-bound recordings; preserve unusually short spans and all repetitions. Warmup audio is not archived, and the saved final scored repetition may differ from a trial with a short span.
