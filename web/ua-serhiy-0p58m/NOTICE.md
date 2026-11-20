# Serhiy frontend attribution

`frontend.mjs` adapts the Ukrainian normalization and explicit-stress algorithm in
[`stress.py`](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/stress.py),
SHA-256 `fd5458b7c7c6f01e9da7d0cbc3a5c936b4d90fb30f4c0d6f41de246fe59ec047`.
The upstream Serhiy package declares GPL-3.0; this derived frontend and its upstream
sample-ID/config fixtures retain those terms, separately from the repository's
MIT wrapper. The pinned upstream license must accompany the registered assets.

The eSpeak clause bridge follows the public Piper browser frontend at
[`rhasspy/piper-samples@da672d1157136d07365790f51da3357a17cf9650`](https://github.com/rhasspy/piper-samples/tree/da672d1157136d07365790f51da3357a17cf9650).
Its full eSpeak NG module/data includes Ukrainian. eSpeak NG and its dictionaries
retain their GPL-3.0-or-later terms; the existing repository
[`ESPEAK-NG-COPYING.txt`](../licenses/ESPEAK-NG-COPYING.txt) supplies that license.

The published Serhiy sample IDs join nonempty phoneme sentences with a space and
then add one BOS/PAD … EOS sequence. The browser implementation follows this
published README/sample policy, rather than the separate `stress.py.to_ids`
helper that chains independently bounded sentences. Overlong source text is
split at sentence/word boundaries, then each piece is phonemized again inside
the generation call. Original text and all whitespace remain represented in
piece offsets; no IDs or source characters are truncated. Inputs containing an
unsplittable overlong word or an unknown phoneme fail explicitly.

Explicit U+0301 marks use the upstream alignment algorithm. Unmarked words retain
eSpeak stress. Unaligned or vowel-mismatched marked words retain dictionary stress
and increment the returned counters. Source normalization applies upstream's
leading punctuation removal and Ukrainian apostrophe replacement; retained source
coverage does not claim these transformations are absent.

The repeatable frontend-only browser audit is:

```sh
node tools/check-ua-serhiy-frontend.mjs \
  --espeak-dir .cache/public/runtimes/piper-samples/da672d1157136d07365790f51da3357a17cf9650 \
  --config PATH_TO_PINNED/piper-phoneme-config.json \
  --chrome "$CHROME_PATH" \
  --out .cache/ua-serhiy-frontend/audit.json
```

This checks the actual module-worker phonemizer against the two published sample
ID arrays and audits every registered Ukrainian source span with complete piece
IDs, counts, offsets and stress counters. It does not load neural weights or
produce a speech benchmark. Run it before scoring, with the same pinned frontend
assets; keep the generated proof with the campaign diagnostics.
