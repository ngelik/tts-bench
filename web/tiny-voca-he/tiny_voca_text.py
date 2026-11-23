"""Hebrew front end: text -> phoneme tokens with a stress feature.

The same code runs during annotation, training and inference, so tokens can
never drift between them.

* Pronunciation comes from one of two phonemizers, both writing the same
  stressed IPA (for example ``רגע, אני בודק`` -> ``ʁeɡˈa, ʔanˈi bodˈek``):

  - ``renikud`` (default): RenikudPlus, an audio-supervised G2P model
    (``renikud-plus``, Apache-2.0 weights) with its own number reading.
    Its model is set with ``RENIKUD_MODEL`` or downloaded on first use.
  - ``hebrew``: phonikud, where ``phonikud-onnx`` adds niqqud and stress marks
    and ``phonikud.phonemize`` turns that into IPA. Checkpoints up to he-v2
    were trained on it; its identity is unchanged so they still load.
* Input that has no Hebrew letters is taken to be phonikud IPA already. The
  training manifests carry reviewed IPA, so training never re-runs the
  diacritizer.
* A token is one phone of the inventory below. ``ts``, ``tʃ`` and ``dʒ`` are
  single tokens (affricates); every other phone is one character. All of them
  are labels of the phoneme recogniser used for forced alignment.
* Stress is a parallel feature (0 none, 1 primary), not a token. phonikud puts
  ``ˈ`` before the stressed vowel; the vowel that follows carries it.
* Punctuation, word boundaries and the utterance edges are explicit tokens that
  may last zero frames. They carry pauses when the recording has them.
"""

from dataclasses import dataclass
import hashlib
import json
import os
import re
import unicodedata

# Version and phonemizer name of each front end; both enter the fingerprint.
_VERSIONS = {"renikud": ("hebrew-2", "renikud-plus"), "hebrew": ("hebrew-1", "phonikud")}
FRONTENDS = ("renikud", "hebrew")
FRONTEND_VARIABLE = "TINY_VOCA_FRONTEND"
DIACRITIZER_VARIABLE = "PHONIKUD_MODEL"
RENIKUD_VARIABLE = "RENIKUD_MODEL"
_frontend = os.environ.get(FRONTEND_VARIABLE, "renikud")
if _frontend not in FRONTENDS:
    raise ValueError(f"{FRONTEND_VARIABLE} must be one of {FRONTENDS}, not {_frontend!r}")

PAD, BOS, EOS, SP, UNK = "<pad>", "<bos>", "<eos>", "<sp>", "<unk>"
SPECIALS = (PAD, BOS, EOS, SP, UNK)
PUNCTUATION = (",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…")
CONSONANTS = ("p", "b", "t", "d", "k", "ɡ", "f", "v", "s", "z", "ʃ", "ʒ", "χ", "h", "ʁ",
              "m", "n", "l", "j", "w", "ʔ", "ts", "tʃ", "dʒ")
VOWELS = ("a", "e", "i", "o", "u")
PHONES = CONSONANTS + VOWELS
# Append-only: changing the order or removing a symbol invalidates checkpoints.
SYMBOLS = SPECIALS + PUNCTUATION + PHONES
SYMBOL_TO_ID = {symbol: index for index, symbol in enumerate(SYMBOLS)}
PHONE_SET = frozenset(PHONES)
PHONE_IDS = frozenset(SYMBOL_TO_ID[p] for p in PHONES) | {SYMBOL_TO_ID[UNK]}
VOICELESS = frozenset(("p", "t", "k", "f", "s", "ʃ", "χ", "h", "ts", "tʃ", "ʔ"))
VOWEL_SET = frozenset(VOWELS)
STRESS_MARKS = {"ˈ": 1, "ˌ": 2}
AFFRICATES = ("ts", "tʃ", "dʒ")

# Characters phonikud may emit outside the inventory map to the closest phones.
FALLBACK = {"x": ("χ",), "r": ("ʁ",), "g": ("ɡ",), "ʤ": ("dʒ",), "ʧ": ("tʃ",), "ʦ": ("ts",), "c": ("ts",)}

_QUOTES = str.maketrans({"‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'", "׳": "'",
                         "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"', "״": '"',
                         "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")"})
_PUNCTUATION_CHARS = frozenset(PUNCTUATION)
_HEBREW = re.compile(r"[א-ת]")


class NothingToPronounce(ValueError):
    """The text has no word, number or letter to say: only marks, emoji and the like."""


@dataclass(frozen=True)
class Phonemized:
    symbols: tuple
    ids: tuple
    stress: tuple
    unknown: tuple  # IPA characters that had no inventory mapping

    def __len__(self):
        return len(self.ids)


def frontend():
    return _frontend


def set_frontend(name):
    global _frontend
    if name not in FRONTENDS:
        raise ValueError(f"front end must be one of {FRONTENDS}, not {name!r}")
    _frontend = name


def _package_version(name):
    try:
        from importlib.metadata import version
        return version(name)
    except Exception:
        return None


def frontend_identity():
    version, phonemizer = _VERSIONS[_frontend]
    return {"frontend_version": version, "phonemizer": phonemizer, "symbols": list(SYMBOLS),
            "affricates": list(AFFRICATES), "fallback": {key: list(value) for key, value in sorted(FALLBACK.items())}}


def frontend_runtime():
    name = _VERSIONS[_frontend][1]
    return {name: _package_version(name)}


def frontend_fingerprint():
    return hashlib.sha256(json.dumps(frontend_identity(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def normalize_text(text):
    text = unicodedata.normalize("NFC", text).translate(_QUOTES)
    text = re.sub(r"\.{3,}", "…", text)
    text = re.sub(r"-{2,}|\s-\s", "—", text)
    return re.sub(r"\s+", " ", text).strip()


_diacritizer = None
_renikud = None
# A hyphen (or maqaf) joining a prefix letter to a number, as in ב-21 or ה-12.
# phonikud's number expander takes it for a minus sign ("be minus esrim..."),
# so it is dropped: ב21 is read "be esrim ve'achat". A hyphen after a space
# ("-5 מעלות") still reads as minus.
_PREFIX_HYPHEN = re.compile("(?<=[א-ת])[-‐־](?=\\d)")
# Number words that num2words writes but phonikud has no niqqud for. Without
# it they lose their vowels (12 came out "ʃtm ʔesʁe").
_NUMBER_NIQQUD = {"שתים": "שְׁתֵּ֫ים", "שנים": "שְׁנֵ֫ים"}


def _hebrew_to_ipa(text):
    """Plain (or vocalized) Hebrew -> phonikud stressed IPA."""
    global _diacritizer
    from phonikud import phonemize as phonikud_phonemize
    text = _PREFIX_HYPHEN.sub("", text)
    if _diacritizer is None:
        from phonikud.expander.number_names import NUMBER_NAMES
        for word, vocalized in _NUMBER_NIQQUD.items():
            NUMBER_NAMES.setdefault(word, vocalized)
        from phonikud_onnx import Phonikud
        path = os.environ.get(DIACRITIZER_VARIABLE)
        if not path or not os.path.isfile(path):
            raise RuntimeError(f"set {DIACRITIZER_VARIABLE} to the phonikud-onnx model file (phonikud-1.0.int8.onnx)")
        _diacritizer = Phonikud(path)
    return phonikud_phonemize(_diacritizer.add_diacritics(text))


def _renikud_to_ipa(text):
    """Plain Hebrew -> RenikudPlus stressed IPA (numbers are read by its own expander)."""
    global _renikud
    if _renikud is None:
        from renikud_onnx import G2P
        path = os.environ.get(RENIKUD_VARIABLE)
        _renikud = G2P(path) if path else G2P(filename="model_int8.onnx")
    return _renikud.phonemize(text)


def split_ipa_word(word):
    """One IPA word -> list of ``(phone, stress)``; unknown characters kept as-is."""
    units, pending, i = [], 0, 0
    while i < len(word):
        char = word[i]
        if char in STRESS_MARKS:
            pending = STRESS_MARKS[char]
            i += 1
            continue
        if unicodedata.category(char) in ("Mn", "Cf") or char in "ː-‐־":  # RenikudPlus keeps the maqaf (־)
            i += 1
            continue
        phone = next((a for a in AFFRICATES if word.startswith(a, i)), char)
        i += len(phone)
        mapped = (phone,) if phone in PHONE_SET else FALLBACK.get(phone)
        if mapped is None:
            units.append((phone, 0))
            continue
        for item in mapped:
            level = 0
            if item in VOWEL_SET and pending:
                level, pending = pending, 0
            units.append((item, level))
    return units


def ipa_pieces(ipa):
    """Stressed IPA -> ``(is_punctuation, value)`` pieces for :func:`tokenize`."""
    pieces, words = [], []
    for raw in normalize_text(ipa).split(" "):
        start = 0
        for i, char in enumerate(raw):
            if char in _PUNCTUATION_CHARS:
                if raw[start:i]:
                    words.append(split_ipa_word(raw[start:i]))
                if words:
                    pieces.append((False, words))
                    words = []
                pieces.append((True, char))
                start = i + 1
        if raw[start:]:
            words.append(split_ipa_word(raw[start:]))
    if words:
        pieces.append((False, words))
    return pieces


def tokenize(pieces):
    """Build the token sequence from ``(is_punctuation, value)`` pieces where a
    text piece's value is a list of words of ``(phone, stress)``."""
    symbols, stress, unknown = [BOS], [0], []
    for punctuation, value in pieces:
        if punctuation:
            if symbols[-1] != value:  # collapse repeats such as "!!"
                symbols.append(value)
                stress.append(0)
            continue
        for word in value:
            if not word:
                continue
            if symbols[-1] in PHONE_SET or symbols[-1] == UNK:
                symbols.append(SP)
                stress.append(0)
            for phone, level in word:
                if phone not in PHONE_SET:
                    unknown.append(phone)
                    phone = UNK
                symbols.append(phone)
                stress.append(level)
    symbols.append(EOS)
    stress.append(0)
    if not any(s in PHONE_SET or s == UNK for s in symbols):
        raise NothingToPronounce("the text has nothing to pronounce")
    return Phonemized(tuple(symbols), tuple(SYMBOL_TO_ID[s] for s in symbols), tuple(stress), tuple(unknown))


def to_ipa(text):
    text = normalize_text(text)
    if not _HEBREW.search(text):
        return text
    return _renikud_to_ipa(text) if _frontend == "renikud" else _hebrew_to_ipa(text)


def phonemize(text):
    """Hebrew text (or phonikud IPA) -> tokens."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must not be empty")
    return tokenize(ipa_pieces(to_ipa(text)))


def is_phone(token_ids):
    """Boolean list/tensor helper: tokens that must be realised as audio."""
    return [int(i) in PHONE_IDS for i in token_ids]
