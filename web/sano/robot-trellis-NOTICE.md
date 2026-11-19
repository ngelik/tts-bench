# Official Sano Robot / MCU and Trellis browser integration

Pinned upstream: [Ampixa/sanoTTS c0584a51213721faba98135821faab71bae888f0](https://github.com/Ampixa/sanoTTS/tree/c0584a51213721faba98135821faab71bae888f0).

`robot-trellis-text.js` derives the demo's 120-character sentence/clause splitter;
`robot-phoneme-codepoints.js` contains its generated Kristin slot-0 codepoint
set. These two upstream-derived files are GPL-3.0-or-later, with the license in
`robot-trellis-LICENSE`. The benchmark adapter/worker wrapper is repository MIT.
Fetched upstream runtime/frontend/weight files stay in the ignored cache.

The official `LICENSE.MIT` exhaustively covers the Robot `snt_tts.c` core,
reference kernels and `snt_port_wasm.c` shim. It does **not** list the Trellis
core/shim or G2P/frontend: those follow the repository GPL-3.0-or-later terms.
The pinned browser weight files have no separate adjacent license grant; this
registration conservatively records the containing repository's GPL terms,
rather than assigning the teacher's license to distilled weights. Both full
upstream license files and README are pinned assets. License acknowledgment is
required before fetching.

No upstream runtime binary is modified. Integration selects same-origin assets,
restores the benchmark worker handler after Emscripten initialization, validates
inputs and output bounds, emits the first completed speech piece, and frees native
allocations. The complete-fixture untimed Robot frontend audit additionally verifies raw IPA against the exact upstream slot-0
symbol set to reject silent unknown-phone loss. The raw IPA API inserts a tie mark
U+0361 absent from the ID API; only that marker and parenthesized language tags are
ignored. This duplicate G2P validation is excluded from timed synthesis; each timed Robot piece calls the official ID frontend once, with cheap capacity/BOS/EOS guards. The complete-fixture audit must pass at the exact scoring source before benchmarking. Trellis uses
its official Misaki frontend and rejects dropped non-whitespace symbols.

The official splitter emits isolated closing double-quote pieces in the fixture.
The raw IPA audit may return zero phones for exactly `"`; it records each such
piece and the official native IDs, and still submits the unchanged piece through
the ID frontend and model. Empty IPA for words or other input fails. No source
punctuation or canonical span is skipped to make the audit pass.
