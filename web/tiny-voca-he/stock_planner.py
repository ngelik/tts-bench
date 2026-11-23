import re

_SPACE = re.compile("[\\s" + chr(0xFEFF) + "]+")

_SENTENCE_END = re.compile(r"""(?:(?<=[.!?…])|(?<=[.!?…]["')\]]))\s+(?=["'(\[]?[A-Z0-9\u05D0-\u05EA])""")

SPOKEN_TOKENS = 140

_NOT_AN_END = re.compile(r"(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$",
                         re.IGNORECASE | re.ASCII)

_CLAUSE_END = re.compile(r"(?<=[,;:—])\s+")

_TEXT_END = re.compile("[\\s" + chr(0xFEFF) + "]+$")

_CLOSING = "\"'”’)]»"

def sentences(text):
    """The sentences of ``text``, without a break after a title or an initial
    or inside a number. The browser demo splits the same way
    (``web/public/worker.js``); keep the two alike."""
    parts, current = [], ""
    for piece in _SENTENCE_END.split(_SPACE.sub(" ", text).strip()):
        current = f"{current} {piece}" if current else piece
        if not _NOT_AN_END.search(current):
            parts.append(current)
            current = ""
    if current:
        parts.append(current)
    return [part for part in parts if any(char.isalnum() for char in part)]

def finished(text):
    """``text`` with a full stop added when it ends without a mark. Before a
    final mark the voice lengthens the last syllable and lets the sound fall;
    without one the audio breaks off. A face or another sign after the last
    word is no mark ("see you :)"), a comma or a colon is one. The browser
    demo does the same (``web/public/worker.js``); keep the two alike."""
    body = _TEXT_END.sub("", text)
    if not body:
        return text
    last = _SPACE.split(body)[-1]
    if any(char.isalnum() for char in last):
        marked = last.rstrip(_CLOSING)[-1:] in tuple(".!?…,;:")
    else:
        marked = any(char in ".!?…" for char in last) or last in (",", ";", ":")
    return text if marked else body + "."

def shorter(text):
    """``text`` in smaller pieces: cut after commas and the like if it has
    any, else in two between words. ``[]`` for a single word."""
    pieces = _CLAUSE_END.split(text)
    if len(pieces) > 1:
        return pieces
    words = text.split(" ")
    if len(words) < 2:
        return []
    half = (len(words) + 1) // 2
    return [" ".join(words[:half]), " ".join(words[half:])]
