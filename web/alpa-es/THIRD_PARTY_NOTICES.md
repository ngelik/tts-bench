# Third-party notices

## Alpa

This folder is a Spanish port of **Alpa** by 77ethers (https://huggingface.co/77ethers/alpa),
licensed under the Apache License, Version 2.0. The code in `alpa/` is Alpa's code. It was changed for Spanish in these files:
`text.py` (rewritten: Spanish front end), `config.py` (vocabulary size), `transplant.py` (Spanish-to-English phoneme map),
`align.py`, `model.py`, `prepare.py` and `infer.py`. `openslr.py` is new.

## tiny-voca

The model derives from **tiny-voca** by Muhammed Nazeem
(https://github.com/n4ze3m/tiny-voca; weights at https://huggingface.co/n4ze3m/tiny-voca),
licensed under the Apache License, Version 2.0. A copy of that licence is in `LICENSES/Apache-2.0.txt`.

- **Weights.** `alpa-es.pt` was trained starting from tiny-voca's published weights. Before training, its phoneme
  table and its stress table were rewritten for Spanish by lookup. Every other layer started as a copy.
- **Code.** In `alpa/`, the files `model.py`, `config.py`, `infer.py`, `export.py`, `align.py`, `annotate.py`, `data.py`,
  `prepare.py`, `train.py`, `losses.py` and `journal.py` are adapted (through Alpa) from tiny-voca's files with the same names.

## OpenSLR 61

The model learned from **OpenSLR 61**, a crowd-sourced, high-quality Argentinian Spanish speech corpus by Google
(https://www.openslr.org/61/), licensed under CC-BY-SA-4.0. No recordings are included here.

Guevara-Rukoz, A. et al. (2020). Crowdsourcing Latin American Spanish for Low-Resource Text-to-Speech. LREC 2020.
