# Tiny Voca Hebrew browser profile notices

This profile pins `buzagloidan/tiny-voca-he` at
`fdc9b3080984c94768239989391fbaddcf9b5519`, with the male AH voice (index
0), 24 kHz mono, and the stock 140-token planner limit. The acoustic FP32
checkpoint contains 4,531,147 parameters and is 21,361,734 bytes. It is joined
with the separately pinned INT8 RenikudPlus G2P graph
`notmax123/RenikudPlus@679c56ca449d41873fb8ff7711ddf7563d28198f`, 311,605,741
bytes. Combined speech and G2P weight download is 332,967,475 bytes; the
parameter count describes only the acoustic model.

Tiny Voca source code is Apache-2.0. Its acoustic weights use CC BY 4.0.
Attribute shared audio to Tiny Voca Hebrew by Idan Buzaglo and to ivrit.ai,
whose crowd-recital dataset supplied the source recordings. The author asks
users to identify synthesized output honestly.
The RenikudPlus INT8 model uses Apache-2.0. Its 0.6.0 source and PyPI package
metadata declare MIT for the code. HebrewNum2Words 0.1.0 uses Apache-2.0.
[Acoustic weight terms](https://github.com/buzagloidan/tiny-voca-he/blob/fdc9b3080984c94768239989391fbaddcf9b5519/models/he-v3/LICENSE) · [RenikudPlus model](https://huggingface.co/notmax123/RenikudPlus/tree/679c56ca449d41873fb8ff7711ddf7563d28198f) · [RenikudPlus 0.6.0 source terms](https://github.com/maxmelichov/RenikudPlus/blob/93a82fad122207f9dc38105ceb5068e98d00f092/pyproject.toml)

The profile runs the published Tiny Voca Hebrew text frontend and exact stock
sentence/shorter planner. RenikudPlus uses its embedded ModelProto metadata
(field 14), released default MAP decoding, niqqud stripping, speaker=0 and
target=0. It has no custom lexicon or phrase cache. G2P inference always uses
CPU/WASM. The acoustic graph uses explicit CPU/WASM or WebGPU+WASM. Report the
provider receipts separately: WebGPU applies only to acoustic ONNX execution.

The browser loads Pyodide 0.26.4, NumPy 1.26.4, and ONNX Runtime Web 1.20.1.
Pyodide is MPL-2.0 and embeds CPython under PSF terms; NumPy uses BSD-3-Clause;
ONNX Runtime Web uses MIT. Retained license files and exact asset hashes are
listed in `assets.lock.json`.
