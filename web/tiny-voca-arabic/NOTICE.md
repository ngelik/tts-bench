# Tiny Voca Arabic browser profile notices

This adapter targets `oddadmix/tiny-voca-arabic` at model revision
`e529f716965142f51835adc9e5661f224c3fa103` and its separate browser Space
revision `64e3e2ae08f7553c38f280a58f05b955a0c296f4`. The selected checkpoint is
FP32, 4,531,723 parameters, one synthetic MSA voice `a000` (index 0), 24 kHz
mono. The pinned model and frontend are Apache-2.0. The model card reports its
training data as `oddadmix/msa-duplex-assistant-tts` and asks users to identify
generated speech as synthetic. No blanket generated-recording or voice-rights
grant is inferred.

The Space uses number expansion, its Arabic sentence/clause fitting policy, and
the same Tiny Voca Python phonemizer. The benchmark runs that phonemizer in
Pyodide 0.26.4 with NumPy 1.26.4. Each uncached phrase is re-diacritized in the
same local Chrome worker by the two CATT v2 ED ONNX graphs, using ONNX Runtime
Web 1.20.1 CPU/WASM in both benchmark backends. The exact CATT tokenizer,
Buckwalter conversion and preprocessing are retained. A minimal package shim
keeps inference and asset handling inside the browser. A guard requires every
phrase cache entry to come from the local browser CATT runner.

The graph bytes come from Abjad AI's v2 `ed_model_onnx.zip`, release asset
274002223 (85,926,550 bytes, SHA-256
`75d2a6360725c7e0bbb238b5a950f621fb8e30b21ad7c65e91e0f36759bcb3ce`). They
are extracted by `tools/tiny-voca-arabic/extract-catt.py` and independently
size/hash checked before staging: encoder 40,049,261 bytes, SHA-256
`988a91ec817bc50a7857a9851a5edd80d6a4c2f594b7ba6fea615b4ebe336590`; decoder
52,699,358 bytes, SHA-256
`9ab419f6e48b25f81e08e64479fc1caa6921a88dbba9932a901fc64ce8cf1240`. The
original v2 release tag points to `de4bdb51cc43e5c9ddb6570686b44a4b9aef61a0`.
That tag carried CC BY-NC-SA wording. Abjad AI's later official commit
`8d5330499feb85f6625e6af632141ed2ed6065fd` explicitly relicensed the same v2
checkpoints under Apache-2.0 and removed the earlier noncommercial restriction.
The current Apache license is retained here. The historical tag and
relicensing commit are recorded to preserve the asset's license history.

The source frontend appends a final full stop where needed, expands
Western and Arabic-Indic numbers, and fits overlong plans first at clause
boundaries and then between words. It inserts 120 ms of silence between
utterances and applies a 0.99 peak cap to the joined output for each source
span. The original CATT preprocessing removes Latin-script text.

NumPy uses BSD-3-Clause. Pyodide 0.26.4 uses MPL-2.0 and embeds CPython 3.12
under the PSF terms. ONNX Runtime Web 1.20.1 uses MIT. The original CATT
`utils.py` is fetched from the pinned Space and preserves its upstream BSD
notice. See the adjacent license texts and asset lock for exact pins.
