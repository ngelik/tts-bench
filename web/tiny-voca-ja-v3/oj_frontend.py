"""pyopenjtalk-plus front end for tiny-voca-ja (experiment).

Replaces the stock front end (pykakasi reading + eSpeak NG ja phonemes)
with pyopenjtalk-plus (OpenJTalk dictionary + accent), mapping its
phonemes onto the checkpoint's eSpeak-style token inventory so the
trained model can consume them unchanged.

Mapping notes (OpenJTalk -> inventory symbol):
  vowels  a->æ  i->i  u->ɯᵝ  e->eɪ  o->oʊ   (devoiced I/U map the same)
  sh->ɕ  ch->tɕ  j->dʑ  ts->(t,s)  f->ɸ  N->ɴ  r->ɽ  y->j
  ky->kʲ  gy->(ɡ,j)  ny->(n,j)  hy->(h,j)  by->(b,j)  py->(p,j)
  my->(m,j)  ry->(ɽ,j)  dy->(d,j)  ty->(t,j)  fy->(ɸ,j)  kw->(k,w)  gw->(ɡ,w)
  cl (sokuon) -> geminate: repeat the next consonant (t before tɕ, d before dʑ)
Prosody: '#' (accent-phrase boundary) -> <sp>; stress=1 on the first
vowel of each accent phrase (analogue of the eSpeak word stress).
Punctuation: text is split on 。、？！ first; each clause is phonemized
separately and the delimiter becomes its inventory token.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

import pyopenjtalk as oj  # pyopenjtalk-plus

from tiny_voca.text import Phonemized, SYMBOL_TO_ID, PHONE_SET, UNK, BOS, EOS, SP

VOWELS = {"æ", "i", "ɯᵝ", "eɪ", "oʊ"}

PHONE_MAP = {
    "a": ("æ",), "i": ("i",), "u": ("ɯᵝ",), "e": ("eɪ",), "o": ("oʊ",),
    "I": ("i",), "U": ("ɯᵝ",),
    "k": ("k",), "g": ("ɡ",), "s": ("s",), "z": ("z",), "t": ("t",), "d": ("d",),
    "n": ("n",), "h": ("h",), "b": ("b",), "p": ("p",), "m": ("m",),
    "y": ("j",), "r": ("ɽ",), "w": ("w",), "v": ("v",),
    "sh": ("ɕ",), "ch": ("tɕ",), "j": ("dʑ",), "ts": ("t", "s"), "f": ("ɸ",),
    "N": ("ɴ",),
    "ky": ("kʲ",), "gy": ("ɡ", "j"), "ny": ("n", "j"), "hy": ("h", "j"),
    "by": ("b", "j"), "py": ("p", "j"), "my": ("m", "j"), "ry": ("ɽ", "j"),
    "dy": ("d", "j"), "ty": ("t", "j"), "fy": ("ɸ", "j"),
    "kw": ("k", "w"), "gw": ("ɡ", "w"),
}

PUNCT = {"。": ".", "、": ",", "？": "?", "！": "!"}
_SPLIT = re.compile(r"([^。、？！]*)([。、？！])")


def _geminate(next_phone):
    """Symbols for a sokuon 'cl' given the following OpenJTalk phoneme."""
    if next_phone == "ch":
        return ("t",)
    if next_phone == "j":
        return ("d",)
    mapped = PHONE_MAP.get(next_phone)
    if mapped:
        return (mapped[0],)
    return ()


def phonemize_oj(text):
    """text -> Phonemized in the checkpoint inventory, via pyopenjtalk-plus."""
    symbols, stress, unknown = [BOS], [0], []

    def emit(sym, stressed=False):
        symbols.append(sym)
        stress.append(1 if stressed else 0)

    clauses = []
    pos = 0
    for m in _SPLIT.finditer(text):
        clauses.append((m.group(1), PUNCT[m.group(2)]))
        pos = m.end()
    if pos < len(text):
        clauses.append((text[pos:], None))
    clauses = [(c, p) for c, p in clauses if c.strip() or p]

    for clause, punct in clauses:
        if clause.strip():
            phones = [p for p in oj.g2p_prosody(clause) if p not in ("^", "$", "_")]
            # '#' marks accent-phrase boundaries; '[' ']' are pitch marks.
            segments = [[]]
            for p in phones:
                if p == "#":
                    segments.append([])
                elif p in ("[", "]", "{", "}"):
                    continue
                else:
                    segments[-1].append(p)
            for seg_i, seg in enumerate(segments):
                if not seg:
                    continue
                if (seg_i > 0 or len(symbols) > 1) and symbols[-1] not in PUNCT.values():
                    emit(SP)
                i = 0
                stressed_done = False
                while i < len(seg):
                    phone = seg[i]
                    if phone == "cl":
                        nxt = seg[i + 1] if i + 1 < len(seg) else None
                        for sym in _geminate(nxt):
                            emit(sym)
                        i += 1
                        continue
                    mapped = PHONE_MAP.get(phone)
                    if mapped is None:
                        unknown.append(phone)
                        mapped = (UNK,)
                    for sym in mapped:
                        is_vowel = sym in VOWELS
                        emit(sym, stressed=is_vowel and not stressed_done)
                        if is_vowel:
                            stressed_done = True
                    i += 1
        if punct:
            if symbols[-1] != punct:
                emit(punct)
    emit(EOS)
    ids = tuple(SYMBOL_TO_ID[s] for s in symbols)
    return Phonemized(tuple(symbols), ids, tuple(stress), tuple(unknown))


if __name__ == "__main__":
    for text in sys.argv[1:]:
        ph = phonemize_oj(text)
        print(text)
        print(" ", " ".join(ph.symbols))
        if ph.unknown:
            print("  unknown:", ph.unknown)
