// Spanish text -> phoneme tokens with a stress feature.
//
// A port of src/mini_voz/text.py and of the sentence handling in
// src/mini_voz/infer.py. The model was trained on the tokens the Python code
// makes, so the two must agree: scripts/check_site_frontend.mjs compares them.
// Keep them alike.

export const SEPARATOR = "_";
const PUNCTUATION = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…", "¿", "¡"];
const VOWELS = ["a", "e", "i", "o", "u", "ɛ", "aɪ", "eɪ", "oɪ", "aʊ", "eʊ"];
const STRESS_MARKS = [["ˈ", 1], ["ˌ", 2]];
const BOS = "<bos>", EOS = "<eos>", SP = "<sp>", UNK = "<unk>";

// eSpeak phonemes outside the inventory map to the closest inventory phone(s).
const FALLBACK = {
  "z": ["s"], "v": ["b"], "h": ["x"], "ç": ["x"], "ɹ": ["ɾ"], "ɻ": ["ɾ"], "ʁ": ["r"], "ʀ": ["r"],
  "dʒ": ["ʝ"], "ʒ": ["ʝ"], "ɟ": ["ʝ"], "ʑ": ["ʝ"], "ɕ": ["ʃ"], "ts": ["t", "s"], "dz": ["d", "s"],
  "ɫ": ["l"], "ɬ": ["l"], "c": ["k"], "q": ["k"], "ɱ": ["m"],
  "ə": ["e"], "ɜ": ["e"], "ø": ["e"], "œ": ["e"], "æ": ["a"], "ɐ": ["a"], "ʌ": ["a"], "ɑ": ["a"], "ɒ": ["o"],
  "ɔ": ["o"], "ɪ": ["i"], "y": ["i"], "ʊ": ["u"], "ɚ": ["e", "ɾ"], "ɔɪ": ["oɪ"], "oʊ": ["o", "u"], "əʊ": ["o", "u"],
  "ɑ̃": ["a", "n"], "ɔ̃": ["o", "n"], "ɛ̃": ["e", "n"],
};

const QUOTES = {
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"',
  "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")",
};
const ABBREVIATIONS = new Set(["sr", "sra", "srta", "sres", "dr", "dra", "d", "dña", "ud", "uds", "vd", "vds", "prof", "etc",
  "pág", "núm", "av", "avda", "tel", "art", "cap", "vol", "ej"]);
const EXPANSIONS = [["EE. UU.", "Estados Unidos"], ["EE.UU.", "Estados Unidos"], ["EE UU", "Estados Unidos"],
  ["p. ej.", "por ejemplo"], ["a. m.", "de la mañana"], ["p. m.", "de la tarde"]];
const LANGUAGE_TAG = /\((?:_?[a-z0-9]_?){2,3}(?:-(?:_?[a-z0-9]_?)+)*\)/g;

const isAlnum = (char) => /[\p{L}\p{N}]/u.test(char);
const isDigit = (char) => /\p{Nd}/u.test(char);

export class NothingToPronounce extends Error {}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
  "noviembre", "diciembre"];
const ORDINALS = ["primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo"];
// Names that take a feminine ordinal ("Isabel II" -> "Isabel segunda").
const FEMININE_NAMES = new Set(["isabel", "juana", "maría", "catalina", "victoria", "leonor", "urraca", "cristina", "margarita",
  "beatriz", "berenguela", "blanca", "ana", "sofía"]);
// Currency signs eSpeak reads in the singular or not at all: [sign, one, many, one cent, many cents].
const CURRENCIES = [["€", "euro", "euros", "céntimo", "céntimos"], ["$", "dólar", "dólares", "centavo", "centavos"]];
const LETTER = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const DATE = /(?<![\d/-])(\d{1,2})([/-])(\d{1,2})\2(\d{4}|\d{2})(?![\d/-])/g;
const AMOUNT = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?`;
const ROMAN = new RegExp(`(?<![${LETTER}])([A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+) ([IVX]{1,6})(?![${LETTER}])`, "gu");
const ROMAN_VALID = /^(X{0,3})(IX|IV|V?I{0,3})$/;
const ROMAN_VALUES = { I: 1, V: 5, X: 10 };

function money(whole, cents, [one, many, cent, centsName]) {
  const unit = whole === "1" ? `un ${one}` : `${whole} ${many}`;
  const value = cents ? Number(cents.padEnd(2, "0")) : 0;
  if (!value) return unit;
  return `${unit} con ` + (value === 1 ? `un ${cent}` : `${value} ${centsName}`);
}

// Write out what eSpeak would read wrongly: dates with slashes or dashes, amounts
// with a currency sign, and Roman numerals after a name. Same as spell_out in text.py.
export function spellOut(text) {
  text = text.replace(DATE, (all, d, sep, m, y) => {
    const day = Number(d), month = Number(m);
    if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return all;
    const year = y.length === 2 ? (Number(y) < 50 ? "20" : "19") + y : y;
    return `${day} de ${MONTHS[month - 1]} de ${Number(year)}`;
  });
  for (const [sign, ...names] of CURRENCIES) {
    const escaped = sign.replace(/[$]/g, String.raw`\$`);
    text = text.replace(new RegExp(AMOUNT + String.raw`\s?` + escaped, "g"), (all, whole, cents) => money(whole, cents, names));
    text = text.replace(new RegExp(escaped + String.raw`\s?` + AMOUNT, "g"), (all, whole, cents) => money(whole, cents, names));
  }
  return text.replace(ROMAN, (all, name, numeral) => {
    if (!ROMAN_VALID.test(numeral)) return all;
    const values = [...numeral].map((c) => ROMAN_VALUES[c]);
    const value = values.reduce((sum, v, i) => sum + (i + 1 < values.length && v < values[i + 1] ? -v : v), 0);
    if (value > 10) return `${name} ${value}`;
    let word = ORDINALS[value - 1];
    if (FEMININE_NAMES.has(name.toLowerCase())) word = word.slice(0, -1) + "a";
    return `${name} ${word}`;
  });
}

export function normalizeText(text) {
  text = text.normalize("NFKC").replace(/[‘’‚‛`´“”„‟«»–―[\]{}]/g, (char) => QUOTES[char]);
  for (const [written, spoken] of EXPANSIONS) text = text.split(written).join(spoken);
  text = spellOut(text);
  text = text.replace(/\.{3,}/g, "…").replace(/-{2,}|\s-\s/g, "—");
  return text.replace(/\s+/g, " ").trim();
}

// [isPunctuation, piece] pairs. Decimals, clock times, digit groups, apostrophes
// inside a word and title abbreviations stay inside the text piece for eSpeak.
export function chunks(text) {
  const chars = Array.from(text);
  const result = [];
  const slice = (from, to) => chars.slice(from, to).join("");
  let start = 0;
  chars.forEach((char, i) => {
    if (!PUNCTUATION.includes(char)) return;
    const previous = i ? chars[i - 1] : "";
    const following = i + 1 < chars.length ? chars[i + 1] : "";
    if (char === "'" && previous && following && isAlnum(previous) && isAlnum(following)) return;
    if (".,:".includes(char) && previous && following && isDigit(previous) && isDigit(following)) return;
    if (char === ".") {
      const word = slice(0, i).match(/(\p{L}+)$/u);
      if (word && ABBREVIATIONS.has(word[1].toLowerCase())) return;
    }
    const before = slice(start, i).trim();
    if (before) result.push([false, before]);
    result.push([true, char]);
    start = i + 1;
  });
  const rest = slice(start).trim();
  if (rest) result.push([false, rest]);
  return result;
}

// eSpeak's output for one piece -> words as lists of [phone, stress].
export function parseEspeak(output) {
  const words = [];
  for (const word of output.replace(LANGUAGE_TAG, "").split(/\s+/)) {
    const units = [];
    for (let unit of word.split(SEPARATOR)) {
      let stress = 0;
      for (const [mark, level] of STRESS_MARKS) {
        if (unit.includes(mark)) {
          stress = stress || level;
          unit = unit.split(mark).join("");
        }
      }
      unit = unit.replace(/[\p{Cf}()]/gu, "");
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

function canonical(phone, phones) {
  if (phones.has(phone)) return [phone];
  if (FALLBACK[phone]) return FALLBACK[phone];
  const stripped = phone.normalize("NFD").replace(/\p{M}/gu, "");
  for (const candidate of [stripped, stripped.split("ː").join(""), stripped + "ː"]) {
    if (candidate !== phone && phones.has(candidate)) return [candidate];
    if (candidate !== phone && FALLBACK[candidate]) return FALLBACK[candidate];
  }
  return null;
}

// symbols: the model's symbol list (mini-voz.json). espeak(piece) -> eSpeak's
// IPA output with "_" between phonemes.
export function makeFrontend(symbols, espeak) {
  const ids = new Map(symbols.map((symbol, index) => [symbol, index]));
  const phones = new Set(symbols.slice(5 + PUNCTUATION.length));
  const voiced = (symbol) => phones.has(symbol) || symbol === UNK;

  function phonemize(text) {
    const out = [BOS], stress = [0], unknown = [];
    for (const [punctuation, piece] of chunks(normalizeText(text))) {
      if (punctuation) {
        if (out[out.length - 1] !== piece) { out.push(piece); stress.push(0); }   // collapse repeats such as "!!"
        continue;
      }
      for (const word of parseEspeak(espeak(piece))) {
        if (voiced(out[out.length - 1])) { out.push(SP); stress.push(0); }
        for (const [phone, level] of word) {
          let mapped = canonical(phone, phones);
          if (mapped === null) { unknown.push(phone); mapped = [UNK]; }
          // A fallback may expand to several phones: stress goes to its first vowel.
          const carrier = Math.max(0, mapped.findIndex((item) => VOWELS.includes(item)));
          mapped.forEach((item, index) => { out.push(item); stress.push(index === carrier ? level : 0); });
        }
      }
    }
    out.push(EOS);
    stress.push(0);
    if (!out.some(voiced)) throw new NothingToPronounce("the text has nothing to pronounce");
    return { symbols: out, ids: out.map((symbol) => ids.get(symbol)), stress, unknown };
  }

  return { phonemize };
}

const NOT_AN_END = /(?:(?<![\p{L}\p{N}_])(?:sr|sra|srta|sres|dr|dra|d|dña|ud|uds|vd|vds|prof|pág|núm|av|avda|tel|art|cap|vol|ej)|(?<![\p{L}\p{N}_])[A-ZÁÉÍÓÚÜÑ])\.$/iu;

// The sentences of a text, without a break after a title or an initial or inside a number.
export function sentences(text) {
  const parts = [];
  let current = "";
  for (const piece of text.replace(/\s+/g, " ").trim().split(/(?:(?<=[.!?…])|(?<=[.!?…]["')\]]))\s+(?=["'(\[¿¡]*[A-ZÁÉÍÓÚÜÑ0-9])/)) {
    current = current ? `${current} ${piece}` : piece;
    if (!NOT_AN_END.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts.filter((part) => /[\p{L}\p{N}]/u.test(part));
}

// The text with a full stop added when it ends without a mark: before a final
// mark the voice lets the sound fall, without one the audio breaks off.
export function finished(text) {
  const body = text.replace(/\s+$/, "");
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last)
    ? /[.!?…,;:]$/.test(last.replace(/["'”’)\]»]+$/, ""))
    : /[.!?…]/.test(last) || [",", ";", ":"].includes(last);
  return marked ? text : body + ".";
}

// Smaller pieces of a text that is too long for one call of the model.
export function shorter(text) {
  const pieces = text.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces;
  const words = text.split(" ");
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}
