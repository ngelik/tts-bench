# Tiny Voca French F1

This benchmark uses model `ymelka/tiny-voca-french` at revision
`502ebbc0b9d442d056da1ef60926646394a2dbc8`, source repository
`yoch/tiny-voca` at `9662a249d8ced6957d9f85665468f93df84fbea8`, and browser Space
`ymelka/tiny-voca-french` at `8ddb95dc20e47864cc9c5c3754aac331f2db1d6b`.
The fixture is `fr-article-v1` (SHA-256
`4383169bb50c860cac854434fde77b93b72bba73443a445d32764cc16688b196`).
It is an AI-translated French edition from `english-20k-v1`; the registry notes
AI editorial review, not independent human translation review.

The upstream model configuration contains five voice IDs: F1, M1, GF2, NM, and
SW. This adapter selects only F1 at index 0. The model card describes F1 as
synthetic; SW is the SIWIS voice with CC BY 4.0 attribution requirements and is
not selected or included in this profile. Model and voice provenance are
separate from the model's Apache-2.0 license. Rights to redistribute generated
recordings must be reviewed separately.

## Component licenses and provenance

| Component | Pinned material | License / notice |
| --- | --- | --- |
| Acoustic model and config | Model revision above; Space `assets/model.onnx` SHA-256 `7e02ecd2899c33c4e27d68c7977dfd10b3b3a3b667451e12f620493ba62afaf8` | Apache-2.0, per model card and pinned Space `LICENSES.md` |
| Python frontend | `yoch/tiny-voca` revision above; exact `frontend.zip` from the pinned Space | Apache-2.0, per pinned Space `LICENSES.md`; archive SHA-256 `936d0d2344b7dd611dcca8417a47e03e2a89a912b851218aa87d299987e2530c` |
| Browser Space worker and player | Exact Space revision above | Apache-2.0, per pinned Space `LICENSES.md` |
| eSpeak NG browser phonemizer | `espeak-tv.js` SHA-256 `6d89ac1392f02cb34ef974e2091339b6c3188ed8bc699732460271ddf23c96e7`; `espeak-tv.wasm` SHA-256 `98f800f5e4879fb5feb2bafa9fc3e24b29f22043ee85c8b0ea9b132037d4888e`; `espeak-tv.data` SHA-256 `ec4c2a525499354d33de586f45c01e4be48459890449fc9479ff11e3aaf231d9` | eSpeak NG 1.51, GPL-3.0; all three browser files are pinned from the exact Space revision, including the compiled WASM binary and data file. Preserve the upstream license and source offer obligations in `LICENSES.md`. |
| ONNX Runtime Web | 1.20.1, pinned runtime files in `assets.lock.json` | MIT; retain upstream notices |
| Pyodide runtime | 0.26.4, pinned runtime files in `assets.lock.json` | Pyodide MPL-2.0; bundled CPython retains PSF license terms |
| Adapter and benchmark integration | This repository | Repository license applies |

The immutable browser assets and hashes are recorded in `assets.lock.json`.
The pinned upstream Space `LICENSES.md` is also imported as a verified asset;
it is the controlling notice for the Space bundle. This summary does not replace
the full upstream license texts.

## Frontend reference and status

The independent stock-browser reference covers all 108 ordered fixture spans:
334 sentence utterances, maximum 176 tokens, and zero unknown phones. Its
token/stress oracle SHA-256 is
`7d44468cb35583bf3c3147e6dc09453faf3bf79e2617a61e216d9e10f71fcf30`; its plan
SHA-256 is `6e08bef514e698319f2927b75f783dc521867443a301fb039cf4812be3f05a3c`.
The frontend vocabulary fingerprint is
`31807ddbd16771299960e70d15addc80902ab70ae20738240178903e23c7f7a6` and its
rules fingerprint is
`dfd29983f7c255e96722a1640cf04f0d433be815fb92b1bd82039682d22f18ba` (rules
version 3). The adapter rechecks these fingerprints and the oracle in headed
Chrome.

The benchmark adapter reproduced the publisher’s token and stress sequence for all 108 source segments. Its first three segments produced the same sample counts as both independent publisher runs. The [qualification record](campaigns/tiny-voca-community/french-browser-qualification.json) gives the waveform differences for each segment. These checks cover model execution and audio consistency. Listener-rated pronunciation has not been measured.
