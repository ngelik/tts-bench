# SanoTTS heart-nano source and change notice

The checkpoint and browser runtime are fetched from the immutable Hugging Face
and GitHub revisions recorded in `assets.lock.json`; they are not included in
this repository. The selected `snt_g2p`, Trellis frontend and `snt_nano`
WebAssembly files retain their upstream GPL-3.0-or-later terms. The pinned
model card and license text are listed in `docs/LICENSING.md`.

The benchmark worker is an integration around the public SanoTTS WASM ABI. It
keeps all inference assets local, validates checkpoint metadata and weight
hashes, performs strict frontend/output checks, preserves the canonical
source-span API and forwards the first completed speech piece to the page. The
text splitting helper reimplements the sentence/clause behavior of the pinned
official demo at
[`web/index.html`](https://github.com/Ampixa/sanoTTS/blob/c0584a51213721faba98135821faab71bae888f0/web/index.html).
That reimplementation is a derivative adaptation of upstream GPL-3.0-or-later
code and is offered under the same terms. No upstream runtime/model file is
copied or bundled in Git; the license terms and cache-only boundary are listed
in `docs/LICENSING.md`.
