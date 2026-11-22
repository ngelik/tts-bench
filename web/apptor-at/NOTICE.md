# Apptor Tiny TTS Austrian German source and changes

The acoustic and G2P graphs, model configuration, Austrian reading overrides,
German frontend tables, and the adapted browser frontend are pinned from
[`apptor/apptor-tiny-tts-at`](https://huggingface.co/apptor/apptor-tiny-tts-at/tree/e28eb444250b4d06162e6ba8e5090c4284345913)
at revision `e28eb444250b4d06162e6ba8e5090c4284345913`.

`frontend.mjs` derives from the author's Apache-2.0 `web/apptor-tts.js` at that
revision. The benchmark adaptation changes the sentence splitter to fail closed
on frontend errors and adds a strict `speakParts` method which validates token,
stress, duration, tensor disposal, and acoustic output behavior. Model
integration, browser worker, cache routing, and diagnostics are original
benchmark code. `LICENSE` contains the upstream Apache-2.0 license.

The checkpoint declares three internal voice labels (`F2`, `M2`, `AT`), while
the model card/demo expose two synthetic voices, F2 and M2. This benchmark uses
M2 at internal index 1. `AT` is the accent conditioning style, not a third
public speaker. `accent=1.0` enables Austrian text readings and conditions the
acoustic model. The frontend switches Austrian word readings at accent `>=0.5`.

The upstream card describes an early-preview, mild/inconsistent Austrian
Standard German accent, not dialect. Training uses synthetic F2/M2 speakers;
the Austrian accent was fine-tuned from Common Voice German recordings. This
notice does not make claims about output rights beyond the upstream terms.
