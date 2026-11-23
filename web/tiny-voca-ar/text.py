"""Arabic front end: diacritized text -> phoneme tokens with a stress feature.

The same code runs during annotation, training-set preparation and inference,
so tokens can never drift between them.

* Input is Modern Standard Arabic WITH tashkeel. Arabic spelling leaves out the
  short vowels, doubling and case endings; this module reads what is written
  and does not guess what is missing. Text without tashkeel must go through a
  diacritizer first (``needs_tashkeel`` tells).
* Pronunciation comes from rules only: no dictionary, no model, no eSpeak.
* A token is one phoneme. A doubled consonant (shadda) is its own token, the
  consonant followed by ``ː``, so it is one stretch of audio and never two
  equal neighbours for the aligner.
* Stress is a parallel feature (0 none, 1 primary), set from syllable weight.
* Punctuation, word boundaries and the utterance edges are explicit tokens that
  may last zero frames. They carry pauses when the recording has them.
* Before a pause a word is read in its pausal form: a final short vowel and
  -un/-in are dropped, -an becomes a long a, and ta marbuta is silent.
* Numbers become words first: quantities, clock times, money, and the three
  structured kinds — phone numbers (digit by digit in groups), dates and
  order ids. A form the rules cannot decide is read as plain numbers.
* Hamzat al-wasl is spoken only at the start of a breath group. Elsewhere it
  is silent and shortens a long vowel that ends the word before it.
"""

from dataclasses import dataclass
import hashlib
import json
import re
import unicodedata

FRONTEND_VERSION = 2
FRONTENDS = ("arabic",)
FRONTEND_VARIABLE = "TINY_VOCA_FRONTEND"
_frontend = "arabic"

PAD, BOS, EOS, SP, UNK = "<pad>", "<bos>", "<eos>", "<sp>", "<unk>"
SPECIALS = (PAD, BOS, EOS, SP, UNK)
PUNCTUATION = (",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…")
# A word before one of these is read in its pausal form.
PAUSES = frozenset((",", ".", "?", "!", ";", ":", "—", "…"))
SINGLES = ("ʔ", "b", "t", "θ", "dʒ", "ħ", "x", "d", "ð", "r", "z", "s", "ʃ", "sˤ", "dˤ", "tˤ", "ðˤ",
           "ʕ", "ɣ", "f", "q", "k", "l", "m", "n", "h", "w", "j")
LONG = "ː"
GEMINATES = tuple(c + LONG for c in SINGLES)
CONSONANTS = SINGLES + GEMINATES
VOWELS = ("a", "i", "u", "aː", "iː", "uː")
PHONES = CONSONANTS + VOWELS
# Append-only: changing the order or removing a symbol invalidates checkpoints.
SYMBOLS = SPECIALS + PUNCTUATION + PHONES
SYMBOL_TO_ID = {symbol: index for index, symbol in enumerate(SYMBOLS)}
PHONE_SET = frozenset(PHONES)
PHONE_IDS = frozenset(SYMBOL_TO_ID[p] for p in PHONES) | {SYMBOL_TO_ID[UNK]}
VOWEL_SET = frozenset(VOWELS)
_VOICELESS = ("ʔ", "t", "θ", "ħ", "x", "s", "ʃ", "sˤ", "tˤ", "f", "q", "k", "h")
VOICELESS = frozenset(_VOICELESS) | frozenset(c + LONG for c in _VOICELESS)

FATHA, DAMMA, KASRA = "َ", "ُ", "ِ"
FATHATAN, DAMMATAN, KASRATAN = "ً", "ٌ", "ٍ"
SHADDA, SUKUN, DAGGER = "ّ", "ْ", "ٰ"
ALIF, WASLA, MADDA, MAQSURA, MARBUTA, WAW, YA, LAM = "ا", "ٱ", "آ", "ى", "ة", "و", "ي", "ل"
_SHORT = {FATHA: "a", DAMMA: "u", KASRA: "i"}
_NUNATION = {FATHATAN: "a", DAMMATAN: "u", KASRATAN: "i"}
_VOWEL_MARKS = frozenset(_SHORT) | frozenset(_NUNATION)
MARKS = _VOWEL_MARKS | {SHADDA, SUKUN, DAGGER}
_LENGTHEN = {"a": "aː", "i": "iː", "u": "uː"}
_SHORTEN = {long: short for short, long in _LENGTHEN.items()}
LETTERS = {
    "ء": "ʔ", "أ": "ʔ", "إ": "ʔ", "ؤ": "ʔ", "ئ": "ʔ", "ب": "b", "ت": "t", "ث": "θ", "ج": "dʒ", "ح": "ħ", "خ": "x",
    "د": "d", "ذ": "ð", "ر": "r", "ز": "z", "س": "s", "ش": "ʃ", "ص": "sˤ", "ض": "dˤ", "ط": "tˤ", "ظ": "ðˤ",
    "ع": "ʕ", "غ": "ɣ", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "j",
}
_SUN = frozenset("تثدذرزسشصضطظلن")
_PROCLITICS = frozenset("وفبلك")
# Letters of other alphabets written with the Arabic script, and marks with no
# sound of their own. Sounds outside the inventory go to the nearest one.
_FOREIGN = str.maketrans({"ک": "ك", "ی": "ي", "ھ": "ه", "ہ": "ه", "ە": "ه", "پ": "ب", "ڤ": "ف", "ڨ": "ق", "گ": "ك",
                          "چ": "ش", "ژ": "ز", "ـ": None})
_MARKS_TO_ASCII = str.maketrans({"،": ",", "؛": ";", "؟": "?", "٪": "%", "٫": ".", "٬": ",", "۔": ".",
                                 "‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'",
                                 "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"',
                                 "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")"})
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_ARABIC = "ء-يٱ"
_MARK_CLASS = "ً-ْٰ"
_TOKEN = re.compile(f"(?P<word>[{_ARABIC}][{_ARABIC}{_MARK_CLASS}]*)|(?P<mark>[,.?!;:\"'()—…])|(?P<other>[^\\W\\d_]+)")
_NUMBER = re.compile(r"\d+(?:,\d{3})*(?:\.\d+)?")

# Words spelled without the long a they are said with. Value: the letter after
# which it is spoken. Looked up without tashkeel, with or without proclitics.
_HIDDEN_LONG_A = {"هذا": 0, "هذه": 0, "هذان": 0, "هذين": 0, "هؤلاء": 0, "هكذا": 0, "ههنا": 0, "ذلك": 0, "ذلكم": 0,
                  "ذلكما": 0, "الله": 2, "لله": 1, "اللهم": 2, "الرحمن": 4, "رحمن": 2, "إله": 1, "الإله": 3,
                  "إلهي": 1, "إلهنا": 1, "إلهك": 1, "إلهه": 1, "إلهكم": 1, "إلههم": 1, "أولئك": 2}
# Words with a written letter that is not spoken: its position.
_SILENT_LETTER = {"أولئك": 1, "أولو": 1, "أولي": 1, "أولات": 1, "عمرو": 3}


class NothingToPronounce(ValueError):
    """The text has no Arabic word or number to say: only marks, emoji, other scripts."""


@dataclass(frozen=True)
class Phonemized:
    symbols: tuple
    ids: tuple
    stress: tuple
    unknown: tuple  # words that could not be read (other scripts)

    def __len__(self):
        return len(self.ids)


def frontend():
    """Name of the front end. There is one; the name is kept for checkpoints."""
    return _frontend


def set_frontend(name):
    if name not in FRONTENDS:
        raise ValueError(f"front end must be one of {FRONTENDS}, not {name!r}")


def frontend_identity():
    return {"frontend_version": FRONTEND_VERSION, "language": "ar", "phonemizer": "rules", "symbols": list(SYMBOLS),
            "pauses": sorted(PAUSES)}


def frontend_runtime():
    """What an annotation run records about the program behind its tokens."""
    return {"phonemizer": frontend_fingerprint()}


def frontend_fingerprint():
    return hashlib.sha256(json.dumps(frontend_identity(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def strip_tashkeel(text):
    return "".join(char for char in text if char not in MARKS)


def needs_tashkeel(text, least=0.3):
    """True when the Arabic in ``text`` carries too few marks to be read as
    written: fewer than ``least`` marks per letter. Fully diacritized text has
    about 0.7, text with only the occasional shadda or tanwin under 0.1."""
    letters = sum(1 for char in text if "ء" <= char <= "ي")
    marks = sum(1 for char in text if char in MARKS)
    return letters > 0 and marks < least * letters


# ---------------------------------------------------------------- numbers

_ONES = ("صِفْر", "وَاحِد", "اِثْنَان", "ثَلَاثَة", "أَرْبَعَة", "خَمْسَة", "سِتَّة", "سَبْعَة", "ثَمَانِيَة", "تِسْعَة", "عَشَرَة")
_TEENS = ("أَحَدَ عَشَر", "اِثْنَا عَشَر", "ثَلَاثَةَ عَشَر", "أَرْبَعَةَ عَشَر", "خَمْسَةَ عَشَر", "سِتَّةَ عَشَر", "سَبْعَةَ عَشَر",
          "ثَمَانِيَةَ عَشَر", "تِسْعَةَ عَشَر")
_TENS = (None, None, "عِشْرُون", "ثَلَاثُون", "أَرْبَعُون", "خَمْسُون", "سِتُّون", "سَبْعُون", "ثَمَانُون", "تِسْعُون")
_HUNDREDS = (None, "مِئَة", "مِئَتَان", "ثَلَاثُمِئَة", "أَرْبَعُمِئَة", "خَمْسُمِئَة", "سِتُّمِئَة", "سَبْعُمِئَة", "ثَمَانِمِئَة", "تِسْعُمِئَة")
# (value, one, two, plural after 3..10); after 11 and above the singular again.
_SCALES = ((10 ** 9, "مِلْيَار", "مِلْيَارَان", "مِلْيَارَات"), (10 ** 6, "مِلْيُون", "مِلْيُونَان", "مَلَايِين"),
           (10 ** 3, "أَلْف", "أَلْفَان", "آلَاف"))
_AND = " وَ"


def _below_thousand(n):
    parts = []
    if n >= 100:
        parts.append(_HUNDREDS[n // 100])
        n %= 100
    if 11 <= n <= 19:
        parts.append(_TEENS[n - 11])
    elif n:
        if n % 10 or n == 10:
            parts.append(_ONES[n if n <= 10 else n % 10])
        if n >= 20:
            parts.append(_TENS[n // 10])
    return _AND.join(parts)


def number_words(n):
    """A whole number below a trillion in diacritized words, in the counting
    form (masculine counted noun, no case endings): 125 -> مِئَة وَخَمْسَة وَعِشْرُون."""
    n = int(n)
    if not 0 <= n < 10 ** 12:
        raise ValueError("number out of range")
    if n == 0:
        return _ONES[0]
    parts = []
    for value, one, two, plural in _SCALES:
        count, n = divmod(n, value)
        if count == 1:
            parts.append(one)
        elif count == 2:
            parts.append(two)
        elif 3 <= count <= 10:
            parts.append(_ONES[count] + DAMMA + " " + plural)   # construct state: the ta marbuta is spoken
        elif count:
            parts.append(_below_thousand(count) + " " + one)
    if n:
        parts.append(_below_thousand(n))
    return _AND.join(parts)


def _spell_number(match):
    whole, _, fraction = match[0].replace(",", "").partition(".")
    if len(whole) > 12:                                   # a telephone or account number: digit by digit
        return " " + " ".join(_ONES[int(d)] for d in whole + fraction) + " "
    words = number_words(whole)
    if fraction:
        said = number_words(fraction) if len(fraction) <= 3 and fraction[0] != "0" else " ".join(_ONES[int(d)] for d in fraction)
        words += " فَاصِلَة " + said
    return " " + words + " "


_HOURS = (None, "الْوَاحِدَة", "الثَّانِيَة", "الثَّالِثَة", "الرَّابِعَة", "الْخَامِسَة", "السَّادِسَة", "السَّابِعَة", "الثَّامِنَة", "التَّاسِعَة",
          "الْعَاشِرَة", "الْحَادِيَةَ عَشْرَة", "الثَّانِيَةَ عَشْرَة")
_TIME = re.compile(r"(?<![\d.,:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])")
_MONEY = re.compile(r"([$€£])\s?(\d+(?:,\d{3})*)(?:\.(\d{1,2}))?(?!\d)")
# (one, two, plural after 3..10, hundredth, two hundredths, hundredths after 3..10)
_CURRENCY = {"$": ("دُولَار", "دُولَارَان", "دُولَارَات", "سِنْت", "سِنْتَان", "سِنْتَات"),
             "€": ("يُورُو", None, "يُورُو", "سِنْت", "سِنْتَان", "سِنْتَات"),
             "£": ("جُنَيْه", "جُنَيْهَان", "جُنَيْهَات", "قِرْش", "قِرْشَان", "قُرُوش")}
# Counting a feminine noun (minutes): the unit loses its ta marbuta, the ten gains one.
_FEMININE_UNITS = (None, "إِحْدَى", "اِثْنَتَان", "ثَلَاث", "أَرْبَع", "خَمْس", "سِتّ", "سَبْع", "ثَمَانِي", "تِسْع", "عَشْر")
_FEMININE_TEENS = ("إِحْدَى عَشْرَة", "اِثْنَتَا عَشْرَة", "ثَلَاثَ عَشْرَة", "أَرْبَعَ عَشْرَة", "خَمْسَ عَشْرَة", "سِتَّ عَشْرَة", "سَبْعَ عَشْرَة",
                   "ثَمَانِيَ عَشْرَة", "تِسْعَ عَشْرَة")


def _counted(n, one, two, plural):
    """``n`` of a masculine noun, with the noun in the number it takes: one and
    two have their own forms, 3 to 10 take the plural, the rest the singular."""
    if n == 1:
        return one + " وَاحِد"
    if n == 2 and two:
        return two
    if 3 <= n <= 10:
        return _ONES[n] + DAMMA + " " + plural
    return number_words(n) + " " + (plural if 3 <= n % 100 <= 10 else one)


def _minutes(n):
    if n == 1:
        return "دَقِيقَة وَاحِدَة"
    if n == 2:
        return "دَقِيقَتَان"
    if n <= 10:
        return _FEMININE_UNITS[n] + " دَقَائِق"
    if n <= 19:
        return _FEMININE_TEENS[n - 11] + " دَقِيقَة"
    unit = "ثَمَانٍ" if n % 10 == 8 else _FEMININE_UNITS[n % 10]          # ثَمَانِي only before its noun
    words = _TENS[n // 10] if n % 10 == 0 else unit + _AND + _TENS[n // 10]
    return words + " دَقِيقَة"


def _spell_time(match):
    """A clock time on the twelve-hour dial: 3:45 -> الثَّالِثَة وَخَمْس وَأَرْبَعُون دَقِيقَة."""
    hour, minute = int(match[1]) % 12 or 12, int(match[2])
    tail = {0: "", 15: _AND + "الرُّبْع", 30: _AND + "النِّصْف"}.get(minute)
    if tail is None:
        tail = _AND + _minutes(minute)
    return " " + _HOURS[hour] + tail + " "


def _spell_money(match):
    """An amount with its currency sign: $1,280.50 -> ... دُولَار وَخَمْسُون سِنْت."""
    one, two, plural, part, two_parts, parts = _CURRENCY[match[1]]
    whole, hundredths = int(match[2].replace(",", "")), int((match[3] or "0").ljust(2, "0"))
    words = _counted(whole, one, two, plural) if whole or not hundredths else ""
    if hundredths:
        words += (_AND if words else "") + _counted(hundredths, part, two_parts, parts)
    return " " + words + " "


# ------------------------------------------------------ phone numbers, dates, order ids
# Three kinds of "number" that Arabic speakers never read as a quantity. Each
# has its own rules; a form the rules cannot decide (3/4: a fraction or a day)
# is read as plain numbers, never guessed into a date.

def _letters_with_marks(word):
    """A regex that matches ``word`` with any tashkeel between its letters (and
    after the last one, where the case ending sits)."""
    between = f"[{_MARK_CLASS}]*"
    return between.join(re.escape(letter) for letter in word) + between


def _clitic_word(word, tail=""):
    """A regex that matches ``word`` (with any tashkeel), optionally behind
    proclitics and the article (والعام, بالرقم) and optionally followed by one
    pronoun letter of ``tail`` (رقمي, رقمه), never inside a longer word."""
    letters = _letters_with_marks(word) + (f"(?:[{tail}][{_MARK_CLASS}]*)?" if tail else "")
    proclitics = "".join(sorted(_PROCLITICS))
    return (rf"(?<![{_ARABIC}])(?:[{proclitics}][{_MARK_CLASS}]*)?(?:ا[{_MARK_CLASS}]*ل[{_MARK_CLASS}]*)?{letters}"
            rf"(?![{_ARABIC}])")


# Months, Gregorian transliterated (يناير family), in the genitive: a month in
# a date follows مِنْ and holds عَامِ. Which month names to use is a regional
# choice; this set matches the eval set's مَارِس.
_MONTHS = ("يَنَايِرَ", "فِبْرَايِرَ", "مَارِسَ", "أَبْرِيلَ", "مَايُو", "يُونْيُو", "يُولْيُو", "أُغُسْطُسَ",
           "سِبْتَمْبِرَ", "أُكْتُوبَرَ", "نُوفَمْبِرَ", "دِيسَمْبِرَ")
_MONTH_BY_SKELETON = {strip_tashkeel(month): index + 1 for index, month in enumerate(_MONTHS)}
_MONTH_ALT = "|".join(_letters_with_marks(strip_tashkeel(month)) for month in _MONTHS)

# The day of the month as an ordinal, genitive: dates follow a preposition (في، من) or يوم as مضاف إليه.
# The first part carries the case; the ten of a compound ordinal is fixed on fatha (السابعِ عَشَرَ).
# "Where Arabic speakers say one": the first of the month is الأول, never واحد.
_ORDINAL_ONES = (None, "الْأَوَّلِ", "الثَّانِي", "الثَّالِثِ", "الرَّابِعِ", "الْخَامِسِ", "السَّادِسِ", "السَّابِعِ",
                  "الثَّامِنِ", "التَّاسِعِ", "الْعَاشِرِ")
_ORDINAL_TEENS = (None, "الْحَادِي عَشَرَ", "الثَّانِي عَشَرَ", "الثَّالِثِ عَشَرَ", "الرَّابِعِ عَشَرَ", "الْخَامِسِ عَشَرَ",
                  "السَّادِسِ عَشَرَ", "السَّابِعِ عَشَرَ", "الثَّامِنِ عَشَرَ", "التَّاسِعِ عَشَرَ")
_ORDINAL_COMPOUND = (None, "الْحَادِي", "الثَّانِي", "الثَّالِثِ", "الرَّابِعِ", "الْخَامِسِ", "السَّادِسِ", "السَّابِعِ",
                     "الثَّامِنِ", "التَّاسِعِ")
_ORDINAL_TENS = {2: "الْعِشْرِينَ", 3: "الثَّلَاثِينَ"}


def _day_ordinal(day):
    if day <= 10:
        return _ORDINAL_ONES[day]
    if day <= 19:
        return _ORDINAL_TEENS[day - 10]
    tens, ones = divmod(day, 10)
    return (_ORDINAL_COMPOUND[ones] + _AND + _ORDINAL_TENS[tens]) if ones else _ORDINAL_TENS[tens]


# A year in the genitive: it follows عام (مضاف إليه) or a month name. Duals and
# teens keep their oblique forms; the case mark travels on the units.
_GENITIVE_ONES = (None, "وَاحِدٍ", "اِثْنَيْنِ", "ثَلَاثَةٍ", "أَرْبَعَةٍ", "خَمْسَةٍ", "سِتَّةٍ", "سَبْعَةٍ", "ثَمَانِيَةٍ",
                  "تِسْعَةٍ", "عَشَرَةٍ")
_GENITIVE_TEENS = (None, "أَحَدَ عَشَرَ", "اِثْنَيْ عَشَرَ", "ثَلَاثَةَ عَشَرَ", "أَرْبَعَةَ عَشَرَ", "خَمْسَةَ عَشَرَ",
                   "سِتَّةَ عَشَرَ", "سَبْعَةَ عَشَرَ", "ثَمَانِيَةَ عَشَرَ", "تِسْعَةَ عَشَرَ")
_GENITIVE_TENS = (None, None, "عِشْرِينَ", "ثَلَاثِينَ", "أَرْبَعِينَ", "خَمْسِينَ", "سِتِّينَ", "سَبْعِينَ", "ثَمَانِينَ",
                  "تِسْعِينَ")
_GENITIVE_HUNDREDS = (None, "مِئَةٍ", "مِئَتَيْنِ", "ثَلَاثِمِئَةٍ", "أَرْبَعِمِئَةٍ", "خَمْسِمِئَةٍ", "سِتِّمِئَةٍ",
                      "سَبْعِمِئَةٍ", "ثَمَانِمِئَةٍ", "تِسْعِمِئَةٍ")


def _under_hundred_genitive(n):
    if 11 <= n <= 19:
        return _GENITIVE_TEENS[n - 10]
    if n <= 10:
        return _GENITIVE_ONES[n]
    tens, ones = divmod(n, 10)
    return (_GENITIVE_ONES[ones] + _AND + _GENITIVE_TENS[tens]) if ones else _GENITIVE_TENS[tens]


def _year_words(year):
    """A year in the genitive: 2026 -> أَلْفَيْنِ وَسِتَّةٍ وَعِشْرِينَ (عامِ ألفين وستة وعشرين)."""
    parts = []
    if year >= 1000:
        parts.append("أَلْفَيْنِ" if year // 1000 == 2 else "أَلْفٍ")
        year %= 1000
    if year >= 100:
        parts.append(_GENITIVE_HUNDREDS[year // 100])
        year %= 100
    if year:
        parts.append(_under_hundred_genitive(year))
    return _AND.join(parts)


def _days_in_month(month, year):
    if month == 2:
        return 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28
    return (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[month - 1]


def _valid_date(day, month, year):
    return 1 <= month <= 12 and 1 <= day <= _days_in_month(month, year) and 1000 <= year <= 3000


def _date_words(day, month, year=None, hijri=False, marker=False):
    months = _HIJRI_MONTHS if hijri else _MONTHS
    words = _day_ordinal(day) + " مِنْ " + months[month - 1]
    if year:
        words += " عَامِ " + _year_words(year) + (" هِجْرِيًّا" if marker else "")
    return words


# Hijri month names are not a regional choice (they are the same across Arabic); the
# Gregorian names are. The genitive form is used, as the month follows مِنْ. ذو declines,
# so the pattern accepts both ذو and the genitive ذي the names are stored in.
_HIJRI_MONTHS = ("مُحَرَّمَ", "صَفَرَ", "رَبِيعِ الْأَوَّلِ", "رَبِيعِ الثَّانِي", "جُمَادَى الْأُولَى", "جُمَادَى الْآخِرَةِ",
                 "رَجَبَ", "شَعْبَانَ", "رَمَضَانَ", "شَوَّالَ", "ذِي الْقَعْدَةِ", "ذِي الْحِجَّةِ")
_HIJRI_BASE = ("مُحَرَّم", "صَفَر", "رَبِيع الْأَوَّل", "رَبِيع الثَّانِي", "جُمَادَى الْأُولَى", "جُمَادَى الْآخِرَة",
               "رَجَب", "شَعْبَان", "رَمَضَان", "شَوَّال", "ذو الْقَعْدَة", "ذو الْحِجَّة")
def _hijri_pattern(base):
    '''The pattern of one Hijri month; the two ذو months also accept the genitive ذي.
    '''
    letters = _letters_with_marks(strip_tashkeel(base))
    if base.startswith("ذو"):
        letters = "(?:" + letters + "|" + _letters_with_marks(strip_tashkeel(base).replace("ذو", "ذي")) + ")"
    return letters


_HIJRI_ALT = "|".join(_hijri_pattern(base) for base in _HIJRI_BASE)
_HIJRI_BY_SKELETON = {strip_tashkeel(base): index + 1 for index, base in enumerate(_HIJRI_BASE)}
_ALL_MONTH_ALT = _MONTH_ALT + "|" + _HIJRI_ALT


def _month_index(text):
    """``(index, hijri)`` of a matched month name, or ``(None, False)`` if it is not one."""
    skeleton = strip_tashkeel(text)
    if skeleton in _MONTH_BY_SKELETON:
        return _MONTH_BY_SKELETON[skeleton], False
    return _HIJRI_BY_SKELETON.get(skeleton.replace("ذي", "ذو"), None), True


def _valid_day(day, month, year, hijri):
    """A Hijri month is 29 or 30 days; the exact month length per year needs the
    astronomical calendar, so 30 is accepted and only 31 is read as plain digits."""
    if hijri:
        return 1 <= month <= 12 and 1 <= day <= 30 and 1000 <= year <= 3000
    return _valid_date(day, month, year)


def _date_words(day, month, year=None, hijri=False, marker=False):
    months = _HIJRI_MONTHS if hijri else _MONTHS
    words = _day_ordinal(day) + " مِنْ " + months[month - 1]
    if year:
        words += " عَامِ " + _year_words(year) + (" هِجْرِيًّا" if marker else "")
    return words


_YEAR_RE = re.compile(rf"({_clitic_word('عام')}|{_clitic_word('سنة')})\s+(\d{{3,4}})(ه?)(?!\d)")
_YEAR_RANGE = re.compile(rf"({_clitic_word('عام')}|{_clitic_word('سنة')})\s+(\d{{3,4}})\s*[-—]\s*(\d{{3,4}})(?!\d)")
_DAY_RANGE = re.compile(rf"""
    (?:{_letters_with_marks('من')}\s+)? (?<![\d.]) (\d{{1,2}}) \s*(?:[-—]|{_letters_with_marks('إلى')})\s* (\d{{1,2}}) \s+
    ({_ALL_MONTH_ALT}) (?:\s+(\d{{4}})(ه?))?
""", re.X)
_DAY_MONTH = re.compile(rf"(?<![\d.])(\d{{1,2}})\s+({_ALL_MONTH_ALT})(?:\s+(\d{{4}})(ه?))?(?!\d)")
_MONTH_YEAR = re.compile(rf"(?<![{_ARABIC}{_MARK_CLASS}])({_ALL_MONTH_ALT})\s+(\d{{4}})(ه?)(?!\d)")
_MONTH_YEAR_DIGITS = re.compile(r"(?<![\d/.])(\d{1,2})\s*/\s*(\d{4})(?![\d/])")
_DMY = re.compile(r"(?<![\d/.])(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})(?![\d/])")
# A day-month without a year is only a date when the first number cannot be a month (17/11, never 3/4).
_DM = re.compile(r"(?<![\d/.])(\d{1,2})\s*/\s*(\d{1,2})(?![\d/])")
_ISO = re.compile(r"(?<![\d/.])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d/-])")


def _spell_iso(match):
    year, month, day = int(match[1]), int(match[2]), int(match[3])
    return " " + _date_words(day, month, year) + " " if _valid_date(day, month, year) else match[0]


def _spell_dmy(match):
    day, month, year = int(match[1]), int(match[2]), int(match[3])
    return " " + _date_words(day, month, year) + " " if _valid_date(day, month, year) else match[0]


def _spell_dm(match):
    day, month = int(match[1]), int(match[2])
    if day <= 12 or not 1 <= month <= 12 or day > _days_in_month(month, 2024):
        return match[0]
    return " " + _date_words(day, month) + " "


def _spell_day_month(match):
    day = int(match[1])
    month, hijri = _month_index(match[2])
    year = int(match[3] or 0)
    if month is None or not _valid_day(day, month, year or 2024, hijri):
        return match[0]
    return " " + _date_words(day, month, year or None, hijri=hijri, marker=bool(match[4])) + " "


def _spell_month_year(match):
    month, hijri = _month_index(match[1])
    year = int(match[2])
    if month is None or not 1000 <= year <= 3000:
        return match[0]
    months = _HIJRI_MONTHS if hijri else _MONTHS
    return f" {months[month - 1]} عَامِ {_year_words(year)}" + (" هِجْرِيًّا " if match[3] else " ")


def _spell_month_year_digits(match):
    month, year = int(match[1]), int(match[2])
    if not (1 <= month <= 12 and 1000 <= year <= 3000):
        return match[0]
    return f" {_MONTHS[month - 1]} عَامِ {_year_words(year)} "


def _spell_year(match):
    year = int(match[2])
    if not 100 <= year <= 3000:
        return match[0]
    return f" {match[1]} {_year_words(year)}" + (" هِجْرِيًّا " if match[3] else " ")   # the sentence's عام keeps its marks


def _spell_year_range(match):
    first, second = int(match[2]), int(match[3])
    if not 100 <= first < second <= 3000:
        return match[0]
    return f" {match[1]} مِنْ {_year_words(first)} إِلَى {_year_words(second)} "


def _spell_day_range(match):
    first, second = int(match[1]), int(match[2])
    month, hijri = _month_index(match[3])
    year = int(match[4] or 0)
    limit = _days_in_month(month, year or 2024) if not hijri else 30
    if month is None or not first < second <= limit:
        return match[0]
    months = _HIJRI_MONTHS if hijri else _MONTHS
    words = f" مِنَ {_day_ordinal(first)} إِلَى {_day_ordinal(second)} مِنْ {months[month - 1]}"
    if year:
        words += f" عَامِ {_year_words(year)}" + (" هِجْرِيًّا" if match[5] else "")
    return words + " "


# Phone numbers: digit by digit, never a quantity. Groups as written when there
# are separators, else 3-3-4 for a ten-digit local number and country code
# first for the rest. The comma between groups is a pause, part of the reading.
_PHONE = re.compile(rf"""
    (?<![\d.])
    (?: (?: \+ ? \d{{1,3}} | \( ? 0 \d{{1,3}} \)? | 0 \d{{1,3}} )
        (?: [ ()\-] \d{{2,7}} ) {{1,5}}
        | 00 \d{{9,13}} | \+ \d{{10,14}} | 0 \d{{9,10}}
    )
    (?!\d)
""", re.X)
_SHORT_CODE = re.compile(r"(?<![\d.])911(?!\d)")          # the unified emergency number, always digit by digit


def _phone_groups(digits):
    if len(digits) == 10:
        return [digits[:3], digits[3:6], digits[6:]]
    if len(digits) == 11:
        return [digits[:4], digits[4:7], digits[7:]]
    head = 2 if digits.startswith("00") else 3             # 00 international prefix, else a country code
    groups, rest = [digits[:head]], digits[head:]
    while len(rest) > 4:
        groups.append(rest[:3])
        rest = rest[3:]
    if rest:
        groups.append(rest)
    return groups


def _spell_phone(match):
    groups = re.findall(r"\d+", match[0].replace("+", " "))
    digits = "".join(groups)
    if len(digits) < 7:                                     # written like a phone but too short: not one
        return match[0]
    if len(groups) == 1:
        groups = _phone_groups(digits)
    words = ["بِلَس"] if match[0].startswith("+") else []   # Arabic speakers say the plus sign بلس
    words += [" ".join(_ONES[int(digit)] for digit in group) for group in groups]
    return " " + ", ".join(words) + " "


# Order and reference ids: no character is skipped. Letters are named the way
# Arabic speakers name Latin letters (English names in Arabic sounds); digits
# are read one by one; a pause between hyphen groups. # and "No." are said رَقْم.
_LETTER_NAMES = {"A": "أَيْ", "B": "بِي", "C": "سِي", "D": "دِي", "E": "إِي", "F": "إِف", "G": "جِي", "H": "إِيتْش",
                 "I": "آي", "J": "جِيه", "K": "كِيه", "L": "إِل", "M": "إِمْ", "N": "إِنْ", "O": "أَوْ", "P": "بِي",
                 "Q": "كِيُو", "R": "أَرْ", "S": "إِس", "T": "تِي", "U": "يُو", "V": "فِي", "W": "دَبْلْيُو",
                 "X": "إِكْس", "Y": "وَايْ", "Z": "زِد"}
_ORDER_ID = re.compile(r"""
    (?<![A-Za-z0-9])
    (?: No\.? \s+ | [#] \s* ) [A-Z0-9]{1,8} (?: - [A-Z0-9]{1,8} )*
    | [A-Z]{1,6} - \d{3,6} (?: - [A-Z0-9]{1,8} )*
    | \d{3,6} - [A-Z]{1,6} (?: - [A-Z0-9]{1,8} )*
    (?![A-Za-z0-9])
""", re.X)                                                # three or more digits: COVID-19 is not an order id
# A bare number is only an id in a context that says so: رقم (with proclitics,
# the article and a pronoun: رقمي, رقمه, رقمك), then at most two words, then four or more digits.
_ORDER_CONTEXT = re.compile(rf"({_clitic_word('رقم', 'يهك')})([\s:,]+(?:[{_ARABIC}{_MARK_CLASS}]+[\s:,]+){{0,2}})(\d{{4,}})(?!\d)")


def _spell_order_id(match):
    body, said = match[0], []
    prefix = ""
    if body.startswith("#") or body[:2] == "No":
        prefix = "رَقْم "
        body = body[1:].lstrip() if body.startswith("#") else body[2:].lstrip(". ")
    for part in body.split("-"):
        words = [_ONES[int(char)] if char.isdigit() else _LETTER_NAMES.get(char, "") for char in part]
        if "" in words or not words:
            return match[0]                                # a character the rules do not know: not an id
        said.append(" ".join(words))
    return " " + prefix + ", ".join(said) + " "


def _spell_order_digits(match):
    return f" {match[1]}{match[2]}" + " ".join(_ONES[int(digit)] for digit in match[3]) + " "


# ------------------------------------------------------ hijri dates, ibans, counted nouns
# IBANs: two country letters, two check digits, then the account. The letters are
# named, the digits read in groups of four as written (or from the left when the
# IBAN is one run). Only 15 to 34 alphanumeric characters count as an IBAN.
_IBAN = re.compile(r"(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{1,4}){4,8}(?![A-Za-z0-9])")


def _spell_iban(match):
    digits = re.sub(r"\s", "", match[0])[2:]
    if not 15 <= len(digits) + 2 <= 34:
        return match[0]
    groups = [digits[:2]] + [digits[index:index + 4] for index in range(2, len(digits), 4)]
    words = [" ".join(_LETTER_NAMES[letter] for letter in match[0][:2])]
    words += [" ".join(_ONES[int(digit)] for digit in group) for group in groups if group]
    return " " + ", ".join(words) + " "


# The gender of counted nouns, for number agreement: with a feminine noun the
# number takes the masculine form in 3..10 and the feminine-noun forms in 11..99.
# Skeleton keys, tashkeel stripped, ة folded to ه. A noun that is not here is read
# with today's counting form (masculine), which is also the safe default.
_SCORING = str.maketrans({"آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


_FEMININE_COUNTED = frozenset(skeleton.translate(_SCORING) for skeleton in (
    "ساعة", "ساعات", "دقيقة", "دقائق", "سنة", "سنوات", "صفحة", "صفحات", "مرة", "مرات",
    "غرفة", "غرف", "معاملة", "معاملات", "نسخة", "كلمة", "كلمات", "رسالة", "رسائل",
    "ملاحظة", "مهمة", "مهام", "حصة", "قطعة", "قطع", "بطاقة", "شركة", "شركات", "تذكرة",
    "طلبية", "صورة", "صور", "جلسة", "جلسات"))
_COUNTED_NOUN = re.compile(rf"(?<![\d.])(\d{{1,2}})\s+([{_ARABIC}][{_ARABIC}{_MARK_CLASS}]+)")


def _fem_under_hundred(n):
    """The number as it counts a feminine noun: 3..10 in the masculine forms, 11..19
    with the counted-noun fatha, 21..99 with the unit flipped and the ten oblique."""
    if n <= 10:
        return _FEMININE_UNITS[n]
    if n <= 19:
        return _FEMININE_TEENS[n - 11] + FATHA
    tens, ones = divmod(n, 10)
    if ones == 0:
        return _GENITIVE_TENS[tens]
    if ones == 1:
        return "وَاحِدَة" + _AND + _GENITIVE_TENS[tens]
    if ones == 2:
        return "اِثْنَتَان" + _AND + _GENITIVE_TENS[tens]
    return _FEMININE_UNITS[ones] + _AND + _GENITIVE_TENS[tens]


def _spell_counted(match):
    """A number written before its counted noun reads with the noun's gender; 1
    follows its noun (رِسَالَةً وَاحِدَة); 2 is left to the text, which dualizes the noun."""
    number, noun = int(match[1]), match[2]
    skeleton = strip_tashkeel(noun).translate(_SCORING)
    feminine = skeleton in _FEMININE_COUNTED
    if number == 1:
        return " " + noun + " " + ("وَاحِدَة" if feminine else "وَاحِد") + " "
    if number == 2 or not feminine or number > 99:
        return match[0]
    return " " + _fem_under_hundred(number) + " " + noun + " "


# Words in Latin letters that Arabic speakers say inside Arabic sentences, as they say them. The model has only
# Arabic sounds: p becomes b, v becomes f, a hard g becomes gh. A word that is not here is skipped and reported
# (``Phonemized.unknown``). Add a client's product and brand names with ``LEXICON.update({...})``, keys in lower case.
LEXICON = {
    "whatsapp": "وَاتْسَاب", "google": "غُوغِل", "facebook": "فِيسْبُوك", "youtube": "يُوتْيُوب", "twitter": "تُوِيتَر",
    "instagram": "إِنْسْتَغْرَام", "email": "إِيمِيل", "internet": "إِنْتَرْنِت", "online": "أُونْلَايْن", "wifi": "وَايْ فَايْ",
    "ok": "أُوكِي", "laptop": "لَابْتُوب", "mobile": "مُوبَايِل", "iphone": "آيْفُون", "android": "أَنْدْرُويْد",
    "microsoft": "مَايْكْرُوسُوفْت", "zoom": "زُوم", "link": "لِينْك", "bluetooth": "بُلُوتُوث", "pdf": "بِي دِي إِف",
    "api": "آيْ بِي آيْ", "otp": "أُو تِي بِي", "vip": "فِي آيْ بِي", "atm": "إِي تِي إِمْ", "id": "آيْ دِيْ",
}
_LATIN_WORD = re.compile(r"[A-Za-z]+")


def normalize_text(text):
    text = unicodedata.normalize("NFKC", text).translate(_MARKS_TO_ASCII).translate(_FOREIGN).translate(_DIGITS)
    text = _LATIN_WORD.sub(lambda match: LEXICON.get(match[0].lower(), match[0]), text)
    text = _MONEY.sub(_spell_money, text)
    text = _TIME.sub(_spell_time, text)
    text = _ISO.sub(_spell_iso, text)                      # dates before phones: 2026-11-17 is not a number run
    text = _YEAR_RANGE.sub(_spell_year_range, text)
    text = _DAY_RANGE.sub(_spell_day_range, text)
    text = _DAY_MONTH.sub(_spell_day_month, text)
    text = _MONTH_YEAR.sub(_spell_month_year, text)
    text = _YEAR_RE.sub(_spell_year, text)
    text = _MONTH_YEAR_DIGITS.sub(_spell_month_year_digits, text)
    text = _DMY.sub(_spell_dmy, text)
    text = _DM.sub(_spell_dm, text)
    text = _IBAN.sub(_spell_iban, text)                   # before phones: the digit groups are not a phone
    text = _PHONE.sub(_spell_phone, text)
    text = _SHORT_CODE.sub(" تِسْعَة وَاحِد وَاحِد ", text)
    text = _ORDER_ID.sub(_spell_order_id, text)
    text = _ORDER_CONTEXT.sub(_spell_order_digits, text)   # after phones and ids: رقم الهاتف 050... stays grouped
    text = _COUNTED_NOUN.sub(_spell_counted, text)         # a digit before a counted noun agrees with it
    text = _NUMBER.sub(_spell_number, text)
    text = text.replace("%", " بِالْمِئَة ")
    text = re.sub(r"\.{3,}", "…", text)
    text = re.sub(r"-{2,}|\s-\s", "—", text)
    return re.sub(r"\s+", " ", text).strip()


def scoring_text(text):
    """``text`` as it is compared with a speech recogniser's transcript: no
    tashkeel, no punctuation, numbers in words, one spelling for the letters
    that writers and recognisers mix up (hamza seats, alif maqsura, ta
    marbuta). Reference and transcript both go through it. This follows the
    recipe of the Open Universal Arabic ASR Leaderboard, which is looser than
    spelling rules on purpose: it must not count a spelling habit as a
    misread word."""
    # Two spellings of one word each, both in use: مائة and مئة; اثنا and اثني (case) and اثنى.
    text = strip_tashkeel(normalize_text(text)).replace("مائ", "مئ").translate(_SCORING).replace("اثني", "اثنا")
    text = " ".join(re.findall(f"[{_ARABIC}]+|[A-Za-z]+", text)).lower()
    return re.sub(r"(?<!\S)و (?=\S)", "و", text)             # "و 12" and "واثنا عشر": the conjunction joins its word


# ---------------------------------------------------------------- one word

def _units(word):
    """``[[letter, marks], ...]``: every letter with the set of marks on it."""
    units = []
    for char in word:
        if char in MARKS:
            if units:
                units[-1][1].add(char)
        else:
            units.append([char, set()])
    return units


def _bare(marks):
    """No vowel, no sukun, no shadda: the writer left the letter unmarked."""
    return not (marks & _VOWEL_MARKS) and SUKUN not in marks and SHADDA not in marks


def _repair(units):
    """Spelling conventions that hide or add a sound, undone in place."""
    # مائة is said مئة: the alif is a spelling relic.
    for i in range(len(units) - 2):
        if units[i][0] == "م" and units[i + 1][0] == ALIF and units[i + 2][0] == "ئ":
            del units[i + 1]
            break
    # Tanwin written on a final alif belongs to the letter before it.
    if len(units) > 1 and units[-1][0] == ALIF and FATHATAN in units[-1][1] and not units[-2][1] & (_VOWEL_MARKS - {FATHA}):
        units[-1][1].discard(FATHATAN)
        units[-2][1].discard(FATHA)
        units[-2][1].add(FATHATAN)
    # A fatha put on a final alif maqsura belongs to the letter before it: عَلىَ.
    if len(units) > 1 and units[-1][0] == MAQSURA and units[-1][1] == {FATHA} and _bare(units[-2][1]):
        units[-1][1].clear()
        units[-2][1].add(FATHA)
    skeleton = "".join(letter for letter, _ in units)
    for start in range(3):
        if start and (len(skeleton) <= start or skeleton[start - 1] not in _PROCLITICS):
            break
        rest = skeleton[start:]
        if rest in _HIDDEN_LONG_A:
            at = start + _HIDDEN_LONG_A[rest]
            following = units[at + 1][0] if at + 1 < len(units) else ""
            if following not in (ALIF, MAQSURA) and not units[at][1] & {DAMMA, KASRA}:
                units[at][1].add(DAGGER)
        if rest in _SILENT_LETTER:
            del units[start + _SILENT_LETTER[rest]]
        if rest in _HIDDEN_LONG_A or rest in _SILENT_LETTER:
            return
    # لكن and what is built on it (لكنه, ولكنهم): la:kin.
    for start in range(3):
        if skeleton[start:start + 3] == "لكن" and all(c in _PROCLITICS for c in skeleton[:start]):
            lam, kaf = units[start][1], units[start + 1][1]
            if (KASRA in kaf or _bare(kaf)) and not lam & {DAMMA, KASRA} and SUKUN not in lam:
                lam.add(DAGGER)
            return


def _wasl_after_proclitic(units, i):
    """The alif at ``i`` is a silent hamzat al-wasl behind one or two
    proclitics (وَالْبَيْت, بِاسْمِ, فَاسْتَمَعَ), not a long a (وَاحِد)."""
    if i not in (1, 2) or i + 1 >= len(units) or not _bare(units[i][1]):
        return False
    for letter, marks in units[:i]:
        if letter not in _PROCLITICS or SHADDA in marks or SUKUN in marks:
            return False
    letter, marks = units[i + 1]
    if letter in (WAW, YA) and FATHA in units[i - 1][1]:
        return False                           # a long a before a glide, as in borrowed words: وَايْ فَايْ
    return SUKUN in marks or KASRA in units[i - 1][1] or (letter == LAM and _bare(marks) and i + 2 < len(units))


def word_phones(word, initial=True, pausal=True):
    """One diacritized word -> ``(phones, elided, article)``.

    ``initial``: the word starts a breath group, so a hamzat al-wasl is spoken.
    ``pausal``: a pause follows. ``elided`` is true when the word starts with a
    silent hamzat al-wasl; ``article`` when its first syllable is the spoken
    definite article, which never takes the stress.
    """
    units = _units(word)
    _repair(units)
    count = len(units)
    out, elided, article, double_next = [], False, False, False

    def close(letter, marks, i):
        """The vowel after the consonant at ``i``, in context or pausal form."""
        short = next((v for m, v in _SHORT.items() if m in marks), None)
        nunation = next((v for m, v in _NUNATION.items() if m in marks), None)
        last = i == count - 1 or (FATHATAN in marks and i == count - 2 and units[-1][0] in (ALIF, MAQSURA) and _bare(units[-1][1]))
        if pausal and last:
            if nunation == "a":
                out.append("aː")
            elif short and len(out) == 3 and out[1] in ("a", "i", "u"):
                out.append(short)              # هُوَ، لَكَ، بِهِ keep their vowel
        elif short or nunation:
            out.append(short or nunation)
            if nunation:
                out.append("n")
        if DAGGER in marks:
            if out[-1] == "a":
                out[-1] = "aː"
            elif out[-1] not in VOWEL_SET:
                out.append("aː")

    for i, (letter, marks) in enumerate(units):
        following = units[i + 1] if i + 1 < count else None
        previous = units[i - 1] if i else None
        before = out[-1] if out else None
        doubled = SHADDA in marks or double_next
        double_next = False
        if letter in (ALIF, WASLA) and (i == 0 or letter == WASLA or _wasl_after_proclitic(units, i)):
            if i or not initial:
                elided = elided or i == 0
                if i and before not in VOWEL_SET:
                    out.append("i" if previous[0] in "بل" else "a")     # the proclitic was left unmarked: والبيت
                continue
            if count == 1:
                out.extend(("ʔ", "a"))
                continue
            vowel = next((v for m, v in _SHORT.items() if m in marks), None)
            if vowel is None:
                if following[0] == LAM and not following[1] & _VOWEL_MARKS - {FATHA} and (
                        FATHA not in following[1] or SHADDA in following[1]):
                    vowel, article = "a", True                         # the article, also in الَّذِي
                else:
                    vowel = "u" if count > 2 and DAMMA in units[2][1] else "i"
            out.extend(("ʔ", vowel))
        elif letter == ALIF:
            if previous and FATHATAN in previous[1]:
                continue
            if i == count - 1 and count > 2 and previous[0] == WAW and before in ("uː", "w"):
                continue                       # the alif after the plural waw: كَتَبُوا
            if before == "a":
                out[-1] = "aː"
            elif before not in VOWEL_SET:
                out.append("aː")
        elif letter == MADDA:
            out.extend(("ʔ", "aː"))
        elif letter == MAQSURA and _bare(marks):
            if previous and FATHATAN in previous[1]:
                continue
            if before in ("a", "i"):
                out[-1] = _LENGTHEN[before]
            elif before is not None and before not in VOWEL_SET and _bare(previous[1]):
                out.append("aː")
        elif letter == MARBUTA:
            if before is not None and before not in VOWEL_SET:
                out.append("a")
            if not _bare(marks) and not (pausal and i == count - 1):
                out.append("t")
                close(letter, marks, i)
        elif letter in (WAW, YA, MAQSURA) and _bare(marks) and DAGGER not in marks:
            glide, short = ("w", "u") if letter == WAW else ("j", "i")
            if before == short:
                out[-1] = _LENGTHEN[short]
            elif i == 0 or before in VOWEL_SET:
                out.append(glide)
                if count == 1 or (i == 0 and letter == WAW and following[0] in LETTERS and following[0] not in (WAW, YA)):
                    out.append("a")            # the conjunction, left unmarked: وكتب
            elif following and following[0] in (ALIF, MAQSURA, MADDA) and not (letter == WAW and i + 1 == count - 1):
                out.append(glide)
            elif not previous[1] & _VOWEL_MARKS and SUKUN not in previous[1]:
                out.append(_LENGTHEN[short])   # the short vowel before it was left out: مصريّين
            else:
                out.append(glide)
        elif letter in (WAW, YA) and SUKUN in marks and SHADDA not in marks and before == ("u" if letter == WAW else "i"):
            out[-1] = _LENGTHEN[before]
        elif (letter == LAM and not marks & _VOWEL_MARKS and SHADDA not in marks and DAGGER not in marks and following
              and SHADDA in following[1]):
            continue                           # the article before a doubled letter, with or without a sukun on it
        elif (letter == LAM and i == 1 and _bare(marks) and units[0][0] in (ALIF, WASLA) and count > 3
              and following[0] in _SUN and _bare(following[1])):
            double_next = True                 # the same, written without marks
        else:
            sound = LETTERS.get(letter if letter != MAQSURA else YA)
            if sound is None:
                continue
            out.append(sound + LONG if doubled else sound)
            close(letter, marks, i)
    return out, elided, article


def stress_levels(phones, article=False):
    """Stress per phone (1 on the vowel of the stressed syllable). A last
    syllable that is superheavy takes it; else a heavy syllable before the
    last; else the third from the end. One-syllable words have none unless
    superheavy, which leaves the particles unstressed."""
    levels = [0] * len(phones)
    nuclei = [i for i, p in enumerate(phones) if p in VOWEL_SET]
    if not nuclei:
        return levels
    weights = []
    for k, at in enumerate(nuclei):
        end = nuclei[k + 1] if k + 1 < len(nuclei) else len(phones)
        slots = sum(2 if p.endswith(LONG) else 1 for p in phones[at + 1:end])
        coda = slots - 1 if k + 1 < len(nuclei) else slots
        long = phones[at].endswith(LONG)
        weights.append(int(long) + max(coda, 0))        # 0 light, 1 heavy, 2 and more superheavy
    last = len(nuclei) - 1
    if weights[last] >= 2:
        chosen = last
    elif last == 0:
        return levels
    elif weights[last - 1] >= 1 or last == 1:
        chosen = last - 1
    else:
        chosen = last - 2
    if article and chosen == 0 and last > 0:
        chosen = 1
    levels[nuclei[chosen]] = 1
    return levels


# ---------------------------------------------------------------- utterance

def pieces(text, pausal=True):
    """``[(is_punctuation, value), ...]`` and the words that could not be read.
    A text piece's value is a list of words, each a list of ``(phone, stress)``."""
    items = [(m.lastgroup, m[0]) for m in _TOKEN.finditer(normalize_text(text))]
    result, unknown, run, initial = [], [], [], True

    def flush():
        if run:
            result.append((False, [list(zip(phones, stress_levels(phones, article))) for phones, article in run]))
            run.clear()

    for index, (kind, value) in enumerate(items):
        if kind == "other":
            unknown.append(value)
        elif kind == "mark":
            flush()
            result.append((True, value))
            initial = initial or value in PAUSES
        else:
            after = next((v for k, v in items[index + 1:] if k != "other"), None)
            before_pause = after is None or after in PAUSES or (after in PUNCTUATION and all(
                v in PUNCTUATION for k, v in items[index + 1:] if k != "other") )
            phones, elided, article = word_phones(value, initial, pausal and before_pause)
            if not phones:
                continue
            if elided and run and run[-1][0][-1] in _SHORTEN:
                run[-1][0][-1] = _SHORTEN[run[-1][0][-1]]       # فِي الْبَيْت: fi lbayt
            run.append((phones, article))
            initial = False
    flush()
    return result, unknown


def tokenize(pieces, unknown=()):
    """Build the token sequence from ``(is_punctuation, value)`` pieces."""
    symbols, stress = [BOS], [0]
    for punctuation, value in pieces:
        if punctuation:
            if symbols[-1] != value:  # collapse repeats such as "!!"
                symbols.append(value)
                stress.append(0)
            continue
        for word in value:
            if symbols[-1] in PHONE_SET:
                symbols.append(SP)
                stress.append(0)
            for phone, level in word:
                symbols.append(phone)
                stress.append(level)
    symbols.append(EOS)
    stress.append(0)
    if not any(s in PHONE_SET for s in symbols):
        raise NothingToPronounce("the text has nothing to pronounce")
    return Phonemized(tuple(symbols), tuple(SYMBOL_TO_ID[s] for s in symbols), tuple(stress), tuple(unknown))


def phonemize(text, pausal=True):
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must not be empty")
    return tokenize(*pieces(text, pausal))


def is_phone(token_ids):
    """Boolean list/tensor helper: tokens that must be realised as audio."""
    return [int(i) in PHONE_IDS for i in token_ids]
