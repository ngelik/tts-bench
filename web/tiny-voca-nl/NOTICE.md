# Tiny Voca Dutch provenance and notices

## Source and assets

- Dutch model and browser source project: [`tetsuo/tiny-voca-nl` at
  `63566400b13c184d10d6da1a563c4f6c7f3ccac5`](https://github.com/tetsuo/tiny-voca-nl/tree/63566400b13c184d10d6da1a563c4f6c7f3ccac5).
- Released model: [`xxy998/tiny-voca-nl` at
  `ba761f35b72b76d473af2f1daea079944601c69f`](https://huggingface.co/xxy998/tiny-voca-nl/tree/ba761f35b72b76d473af2f1daea079944601c69f).
- Publisher browser Space: [`xxy998/tiny-voca-nl` at
  `cccbdddce753130c2d449225438c82b45af1d3da`](https://huggingface.co/spaces/xxy998/tiny-voca-nl/tree/cccbdddce753130c2d449225438c82b45af1d3da).
- Training voice source: [`nl_NL-alex-medium` Piper voice at
  `e929968c3761f1c281875787685a745863db838d`](https://huggingface.co/rhasspy/piper-voices/tree/e929968c3761f1c281875787685a745863db838d/nl/nl_NL/alex/medium).
- eSpeak NG source: [`4870adfa25b1a32b4361592f1be8a40337c58d6c`](https://github.com/espeak-ng/espeak-ng/tree/4870adfa25b1a32b4361592f1be8a40337c58d6c).
- ONNX Runtime Web: 1.20.1, copied from the pinned publisher Space.

The model card declares Apache-2.0 for model and code. The Piper Alex source
voice card identifies its source audio as CC0/OHF Voice. Those statements refer
to different parts of the lineage. The dataset card does not provide a license
declaration verified for this integration; do not claim that Apache-2.0 covers
unlisted dataset rights or generated recordings.

## Runtime licenses

- `LICENSE-MODEL`: Apache-2.0 model/source license from the publisher Space.
- `LICENSE-ESPEAK-NG`: GPL-3.0-or-later eSpeak NG license.
- `LICENSE-ONNXRUNTIME-WEB-1.20.1.txt`: ONNX Runtime MIT license. The complete
  `ThirdPartyNotices.txt` file is fetched from the pinned Space revision and
  retained in the ignored asset cache under `assets.lock.json`.
- `LICENSE-BSD-2-CLAUSE.txt` and `LICENSE-UCD.txt`: additional upstream Space
  notices retained with the pinned eSpeak distribution.

The binary assets and complete runtime third-party notices remain in the
ignored asset cache and are checked against `assets.lock.json`; this directory
holds the remaining license texts and source attribution only.
