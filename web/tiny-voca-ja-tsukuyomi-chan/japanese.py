"""Versioned Japanese phones and parallel accent features from pyopenjtalk-plus."""

from dataclasses import dataclass
from functools import lru_cache
import hashlib
from importlib.metadata import version
from pathlib import Path
import re
import unicodedata


VERSION = 1
SPECIALS = ('<pad>', '<bos>', '<eos>', '<sp>', '<unk>')
PHONES = ('a', 'i', 'u', 'e', 'o', 'A', 'I', 'U', 'E', 'O', 'N', 'cl',
          'p', 'py', 'b', 'by', 'm', 'my', 't', 'ty', 'd', 'dy', 'n', 'ny',
          'k', 'ky', 'kw', 'g', 'gy', 'gw', 's', 'sh', 'z', 'j', 'ch', 'ts',
          'f', 'h', 'hy', 'v', 'r', 'ry', 'w', 'y')
SYMBOLS = SPECIALS + PHONES
SYMBOL_TO_ID = {s: i for i, s in enumerate(SYMBOLS)}
PHONE_IDS = frozenset(SYMBOL_TO_ID[p] for p in PHONES)
VOICED_VOWEL_IDS = frozenset(SYMBOL_TO_ID[v] for v in 'aiueo')
MISSING_ACCENT = (-50, 0, 0)
OPTIONS = dict(run_marine=False, use_tsqyomi=False, use_sudachi_kanji_yomi=True,
               predict_nani=False, normalize_mode='NFC')


@dataclass(frozen=True)
class JapanesePhonemized:
    symbols: tuple
    ids: tuple
    accent: tuple
    phrase_boundary: tuple
    unknown: tuple = ()

    def __len__(self):
        return len(self.ids)

    @property
    def stress(self):
        """Unused legacy channel; Japanese accents are never encoded as stress."""
        return (0,) * len(self)


def normalize(text, overrides=None):
    if not isinstance(text, str) or not text.strip():
        raise ValueError('Japanese text must not be empty')
    text = unicodedata.normalize('NFC', text).strip()
    if overrides:
        for source in sorted(overrides, key=lambda s: (-len(s), s)):
            if not source or not isinstance(overrides[source], str) or not overrides[source]:
                raise ValueError('reading overrides must have nonempty strings')
        pattern = '|'.join(re.escape(s) for s in sorted(overrides, key=lambda s: (-len(s), s)))
        text = re.sub(r'(?<![A-Za-z])(?:' + pattern + r')(?![A-Za-z])', lambda m: overrides[m[0]], text)
    return text


def from_labels(labels):
    parsed = []
    for lab in labels:
        match = re.search(r'-(.*?)\+.*?/A:([^/]+)', lab)
        if not match:
            raise ValueError('malformed full-context label')
        phone, raw = match.groups()
        if phone in ('sil', 'pau'):
            accent = MISSING_ACCENT
        else:
            if phone not in PHONES:
                raise ValueError(f'unsupported Japanese phone: {phone}')
            try:
                accent = tuple(int(v) for v in raw.split('+'))
            except ValueError as error:
                raise ValueError('missing Japanese accent fields') from error
            if len(accent) != 3 or not -49 <= accent[0] <= 49 or not all(1 <= v <= 49 for v in accent[1:]):
                raise ValueError('invalid Japanese accent fields')
        parsed.append((phone, accent))
    if len(parsed) < 3 or parsed[0][0] != 'sil' or parsed[-1][0] != 'sil':
        raise ValueError('Japanese labels need speech between utterance edges')
    if any(p == 'sil' for p, _ in parsed[1:-1]) or not any(p in PHONES for p, _ in parsed):
        raise ValueError('unexpected silence or no speech in Japanese labels')
    symbols, accents, boundaries = [], [], []
    for i, (phone, accent) in enumerate(parsed):
        symbol = '<bos>' if i == 0 else '<eos>' if i == len(parsed) - 1 else '<sp>' if phone == 'pau' else phone
        boundary = 0
        if phone in tuple('aiueoAIUEON') + ('cl',):
            following, next_accent = parsed[i + 1]
            boundary = int(following in ('sil', 'pau') or (accent[2] == 1 and next_accent[1] == 1))
        symbols.append(symbol)
        accents.append(accent)
        boundaries.append(boundary)
    return JapanesePhonemized(tuple(symbols), tuple(SYMBOL_TO_ID[s] for s in symbols), tuple(accents), tuple(boundaries))


def phonemize(text, overrides=None):
    import pyopenjtalk
    return from_labels(pyopenjtalk.extract_fullcontext(normalize(text, overrides), **OPTIONS))


@lru_cache(maxsize=1)
def _runtime_identity():
    import pyopenjtalk
    installed = version('pyopenjtalk-plus')
    if installed != '0.4.1.post10':
        raise RuntimeError('Japanese frontend requires the pinned pyopenjtalk-plus 0.4.1.post10')
    directory = pyopenjtalk.OPEN_JTALK_DICT_DIR
    directory = Path(directory.decode('utf-8') if isinstance(directory, bytes) else directory)
    dictionary = []
    # Path ordering differs on Windows and Linux. Preserve the preparation
    # order explicitly so identical file bytes yield the same identity.
    for path in sorted(directory.rglob('*'), key=lambda p: (p.relative_to(directory).as_posix().casefold(),
                                                            p.relative_to(directory).as_posix())):
        if path.is_file():
            h = hashlib.sha256()
            with path.open('rb') as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    h.update(block)
            dictionary.append(dict(name=path.relative_to(directory).as_posix(), sha256=h.hexdigest()))
    if not dictionary:
        raise RuntimeError('OpenJTalk dictionary is missing')
    return dict(phonemizer='pyopenjtalk-plus', version=installed,
                dictionary=dictionary,
                dependencies={name: version(name) for name in ('sudachipy', 'sudachidict-core')})


def frontend_identity(overrides=None):
    return dict(**_runtime_identity(), frontend_version=VERSION, language='ja', symbols=list(SYMBOLS),
                options=dict(OPTIONS), accent_schema='hts-a1-a2-a3-plus-boundary-v1',
                missing_accent=list(MISSING_ACCENT), reading_overrides=dict(sorted((overrides or {}).items())))


def frontend_fingerprint(overrides=None):
    import json
    return hashlib.sha256(json.dumps(frontend_identity(overrides), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def validate_annotation(row):
    """Reject missing/corrupt Japanese conditions before reading audio tensors."""
    tokens, accent, boundary = row['tokens'], row.get('accent'), row.get('phrase_boundary')
    if (not isinstance(accent, list) or not isinstance(boundary, list)
            or len(accent) != len(tokens) or len(boundary) != len(tokens)):
        raise ValueError('missing or mismatched Japanese annotation features')
    if any(type(s) is not int or s != 0 for s in row['stress']):
        raise ValueError('Japanese annotations cannot use English stress')
    for token, values, end in zip(tokens, accent, boundary):
        if type(token) is not int or token not in PHONE_IDS | {1, 2, 3}:
            raise ValueError('invalid Japanese annotation token')
        if not isinstance(values, list) or len(values) != 3 or any(type(v) is not int for v in values):
            raise ValueError('invalid Japanese accent shape or type')
        if type(end) is not int or end not in (0, 1):
            raise ValueError('invalid Japanese phrase boundary')
        if token in PHONE_IDS:
            if not -49 <= values[0] <= 49 or not all(1 <= v <= 49 for v in values[1:]):
                raise ValueError('invalid Japanese phone accent')
        elif tuple(values) != MISSING_ACCENT or end:
            raise ValueError('Japanese pauses require missing accent and no boundary')
