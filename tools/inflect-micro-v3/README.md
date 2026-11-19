# Inflect Micro v3 browser graph export

`export.py` accepts only `owensong/Inflect-Micro-v3` at revision
`c1a7db6ef44c931623fc2028cb0409659b83156c`. It verifies the pinned upstream
release manifest and every listed file, including the identified weights, then
exports three FP32 ONNX graphs and the fixed Cassidy style bank. The export
checks ONNX Runtime CPU outputs against the pinned PyTorch model at several
token lengths before writing its digest manifest. This hosted inference is an
export/parity check only, not benchmark evidence.

The generated files are build artifacts and are not source-controlled. The
benchmark worker will use only local staged copies.

On a Python 3.12 CPU environment, install the pinned packages from
`requirements-export.txt` plus the CPU PyTorch wheel, fetch the exact HF snapshot
with `huggingface_hub.snapshot_download(..., revision=SOURCE_REVISION)`, then run:

```sh
python tools/inflect-micro-v3/export.py --source /path/to/Inflect-Micro-v3 --output generated/inflect-micro-v3
```

See `manifest.json` in the generated artifact for source, precision, export
versions, parity error bounds, output sizes and SHA-256 digests.
