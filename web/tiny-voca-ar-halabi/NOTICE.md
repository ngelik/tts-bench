# Tiny Voca Arabic Halabi F2 notices

This profile pins the Tiny Voca Arabic Halabi F2 release kit at
`v0.1-ar-demo-kit` (commit
`4601b2bdb44bc52ebf73e87d5082b49fa138c6fb`). The repository and its model
code/weights declare Apache-2.0; the matching upstream `LICENSE` is retained
here. The archive's `ATTRIBUTION.md` is extracted and hash-verified as a local
model asset.

The model is derived from the Arabic Speech Corpus (Halabi 2016), licensed CC
BY 4.0. Preserve the required citation: Halabi, Nawar (2016). *Modern standard
Arabic phonetics for speech synthesis*. PhD thesis, University of Southampton.
Upstream documentation states that no separate written consent accompanies the
corpus and that it relies on the rights holder's published CC BY 4.0 terms. This
records the upstream statement, not an independent rights determination.

The benchmark loads the pinned pure-Python Arabic rules frontend in Pyodide
0.26.4 and ONNX Runtime Web 1.20.1. It does not bundle eSpeak NG. Pyodide uses
MPL-2.0 plus the CPython PSF terms. ONNX Runtime Web declares MIT. The exact
runtime license texts and file digests are retained by the asset lock.

The profile selects only the synthetic F2 voice. The model has a Damascene
accent and requires fully vocalized Arabic text. No blanket redistribution
rights for generated recordings are inferred from the code or model licenses.
