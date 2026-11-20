# Third-Party Notices

Inflect v3 uses Kokoro-derived architecture and software and is trained with
Kokoro-based distillation. This beta does not contain the Kokoro teacher backbone.

- Kokoro, hexgrad: https://github.com/hexgrad/kokoro ; Apache License 2.0.
  A license copy is included in LICENSES/Apache-2.0.txt.
- StyleTTS2, Aaron (Yinghao) Li and contributors:
  https://github.com/yl4579/StyleTTS2 ; MIT License.
  The upstream license is included in LICENSES/StyleTTS2-MIT.txt.
- The runtime/code/kokoro files are adapted versions used by Inflect's frozen
  export, not a claim to have authored the upstream components. Inflect changes
  include compact model integration and qualified inference/source handling.
- Misaki, spaCy, Transformers, PyTorch, NumPy and SoundFile are separately
  installed dependencies subject to their own licenses. G2P assets are not
  included in Inflect's core parameter counts or bundled in this repository.
- The text CLI's unknown-word fallback uses separately installed
  espeakng-loader, eSpeak-ng and phonemizer-fork. Their upstream licenses apply
  independently; phonemizer-fork supplies GNU GPL v3 license text. This package
  does not bundle their engine binaries or English data files. No change to
  Inflect's weight-license status is implied by this frontend update.

Original upstream notices are retained. The included software license texts do
not establish a final model-weight license or clear voice/data rights. See
BETA_ACCESS.md. No endorsement by the upstream authors is implied.

Layout clarification: the included license texts and access notice are at the package root. The bundled spaCy wheel includes its own license files.
