# Tiny Broca browser adapter notices

The browser profile uses `brenorb/tiny-broca` checkpoint revision
`0ea879d8f532ad0c6e7308017b45105a74f81a95` and source commit
`56d68b9fd3375c52030b3de053a26bfcc6e823c2`. The checkpoint, upstream source,
and weights are declared Apache-2.0 by the pinned model card and repository.
The repository license is retained in `LICENSE` and the checkpoint license
copy is pinned in the asset lock.

The upstream Python `text.py` frontend is loaded unchanged in Pyodide 0.26.4.
It performs Brazilian Portuguese normalization and grapheme tokenization with
lexical stress. The benchmark worker adapts upstream worker protocol to local,
size and SHA-256-verified same-origin assets, explicit WASM/WebGPU providers,
complete fixture audits, finite raw PCM checks, and resource cleanup. It keeps
the upstream sentence splitting and 500-token fit behavior.

The model card describes training on synthetic speech generated with Qwen3-TTS
1.7B Base and CC0 Common Voice prompts. The public excerpts come from approved
benchmark runs and include model and corpus attribution. Complete WAVs stay local.

ONNX Runtime Web 1.20.1 uses MIT, Pyodide 0.26.4 uses MPL-2.0, and CPython 3.12.1
uses the PSF terms. The asset lock pins the release files and retained license
texts. The ORT npm distribution supplies its MIT declaration in `package.json`.
