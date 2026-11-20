# Ukrainian Serhiy 0.58M browser profile

This profile pins [`dmytro-m/ua-serhiy-0p58m`](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/tree/1abd585d725a787b405c28a59ce1cbdfd34780bb)
at revision `1abd585d725a787b405c28a59ce1cbdfd34780bb`. It selects the single
Ukrainian Serhiy synthetic voice, the registered `uk-article-v1` fixture,
22,050 Hz output and deterministic inference. The student checkpoint is
GPL-3.0. Its Apache-2.0 teacher and MIT training-corpus licenses do not grant
separate rights to the student checkpoint or its outputs; speaker-consent and
dataset-rights review are not independently established by the upstream notice.

## Browser conversion

The source checkpoint is a 1,151,776-byte raw FP16 bundle. It contains 575,888
stored scalar values across duration, acoustic and decoder inference tensors;
that is a stored-tensor count, not a trainable-only claim. The browser profile
converts those tensors to four dynamic FP32 ONNX graphs with ONNX 1.17.0, opset
17 and IR version 9. The four deployed graph assets total **2,339,985 bytes**;
the original FP16 source bundle is retained as build provenance, not counted a
second time as deployed model weights.

The graph sequence is duration prediction, token-context encoding, frame-level
code prediction and the decoder. JavaScript expands token contexts from the
predicted durations and performs the centered periodic-Hann inverse STFT. The
output is unnormalized mono FP32 PCM, with no clipping or fade. CPU uses
ONNX Runtime Web 1.23.2 WASM with one thread. WebGPU uses the same graphs and
runtime, requests a non-fallback hardware adapter, and allows explicit WASM
operator fallback; the untimed probe must observe real compute dispatches.

Text is phonemized in Chrome with the pinned Piper eSpeak NG Ukrainian data and
the upstream `stress.py` explicit U+0301 stress-restoration algorithm. It joins
the eSpeak sentence phonemes with spaces and applies one BOS/PAD/EOS group per
bounded unit, matching the upstream published sample-ID policy. Inputs above
255 IDs are re-phonemized recursively at sentence or word boundaries inside
the generation call; no text or phoneme IDs are truncated. Unknown symbols and
unsplittable overlong words fail. The timed path does not use precomputed
fixture IDs.

The upstream sample audit matched both official arrays exactly: 01-greeting
has 155 IDs and 02-stress-pair has 121 IDs. The registered 92-span fixture
audit covered 92/92 spans with 326 bounded pieces and 54,714 token IDs, with
maximum 255 IDs per piece and no unknown symbols. This is frontend coverage,
not proof of speech quality.

## Rebuild and stage

From a fresh clone, install the locked JavaScript dependencies and fetch the
asset-lock inputs with the model's GPL terms acknowledged:

```sh
npm ci
node bin/bench.mjs assets fetch --model ua-serhiy-0p58m --accept-license
```

The checkpoint inputs are fetched from the immutable Hugging Face revision
`1abd585d725a787b405c28a59ce1cbdfd34780bb` into
`.cache/public/models/ua-serhiy-0p58m/1abd585d725a787b405c28a59ce1cbdfd34780bb/`.
That directory includes `weights.fp16.bin`, `manifest.json`,
`piper-phoneme-config.json`, `README.md`, `NOTICE.md` and `provenance.json`.
The pinned Piper/eSpeak and ONNX Runtime files are staged under their exact
`target` paths in `.cache/public/runtimes/`; their immutable URLs, package
versions, byte counts and SHA-256 values are recorded in `assets.lock.json`.
The fetch command stops at the first generated graph, as expected; the build
wrapper below completes conversion and import.

The reproducible build checks the source manifest and raw weight SHA-256,
installs the pinned exporter requirements from
`tools/ua-serhiy-export-requirements.txt` when needed, and creates/imports the
four locked graphs:

```sh
node tools/build-ua-serhiy-browser.mjs --accept-license
```

The wrapper fetches and verifies the immutable runtime and source assets, builds
the graphs in `.cache/ua-serhiy-build/`, imports them through the normal
`assets import` implementation using an explicit asset-ID-to-file map, then
runs `assets verify` over the complete installed closure. For a separate
post-build verification, run:

```sh
node bin/bench.mjs assets verify --model ua-serhiy-0p58m --accept-license
```

All four graph sizes and digests are in `assets.lock.json`. The original
checkpoint and both upstream license files remain separately identified in
the lock. Review the terms before using `--accept-license`. The conversion
does not upload or redistribute model weights.

The exact source tensor count, graph byte counts and source lineage are in
`.cache/ua-serhiy-build/BUILD-MANIFEST.json` after export. The actual browser
runtime evidence must remain separately bound to its source commit, frontend
audit, output PCM and selected benchmark receipt.
