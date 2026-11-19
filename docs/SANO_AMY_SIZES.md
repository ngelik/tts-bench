# Sano Amy size variants: conversion provenance

The `sano-amy-small` and `sano-amy-1p8m` browser profiles are built from the
official FP16 piperlite packages at Hugging Face revision
`25410576d005d7f08d186990fd91f6a2651243de`. The browser runtime consumes the
official FP32 piperlite ABI. The packer validates the manifest and every FP16
tensor hash, converts the package tensors to FP32 in the ABI's fixed slot
order, and writes the metadata and offsets expected by `sanotts-web@0.3.0`.
The model tensor values and parameter counts are preserved; the runtime
expansion from FP16 to FP32 is disclosed in each result's precision/settings.

The pinned input packages and output files are described in
[`provenance.json`](sano-amy-sizes/provenance.json). A 1.46M positive control
was packed and compared with the official browser bundle: all 108 tensor slots,
headers and offsets matched after rounding the official FP32 weights to FP16
and expanding them back to FP32.

The sources and browser runtime are GPL-3.0 / GPL-3.0-or-later. Read
[`LICENSING.md`](LICENSING.md) before fetching. The packer scripts are readable
Python under `tools/`; no model weights are committed.

To stage either profile, the script fetches the three pinned source package
files, verifies their byte lengths and hashes, packs the selected voice, checks
the outputs against `assets.lock.json`, and atomically writes the locked model
files under `.cache/public`:

```sh
python3 tools/stage-sano-amy.py --model sano-amy-small
node bin/bench.mjs assets verify --model sano-amy-small --accept-license

python3 tools/stage-sano-amy.py --model sano-amy-1p8m
node bin/bench.mjs assets verify --model sano-amy-1p8m --accept-license
```

The ordinary `assets fetch` command stages the shared official WebAssembly
runtime after the conversion command has populated the generated model files.
