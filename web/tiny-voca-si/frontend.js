// Sinhala text -> tiny-voca phoneme ids and stress, in JavaScript.
//
// A line-by-line port of frontend.py + sinhala.py (and the parts of phonemizer-fork
// they rely on) from https://huggingface.co/eminduperera/tiny-voca-sinhala.
// The model only works with the tokens it was trained on, so this was checked
// against the Python front end on all 6,899 training sentences: identical ids and stress.

import { ALPHA, ALNUM, DIGIT, SPACE, COMBINING, FORMAT } from "./unicode-tables.js";

// ---- sinhala.py -------------------------------------------------------------------
export const PAD = "<pad>", BOS = "<bos>", EOS = "<eos>", SP = "<sp>", UNK = "<unk>";
const SPECIALS = [PAD, BOS, EOS, SP, UNK];
export const PUNCTUATION = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];
const CONSONANTS = ["p", "pʰ", "b", "bʰ", "t", "tʰ", "d", "dʰ", "ʈ", "ʈʰ", "ɖ", "ɖʰ", "k", "kʰ", "ɡ", "ɡʰ",
  "tʃ", "tʃʰ", "dʒ", "dʒʰ", "ᵐb", "ⁿd", "ⁿɖ", "ᵑɡ", "m", "n", "ɳ", "ɲ", "ŋ",
  "s", "ʃ", "ʂ", "h", "f", "v", "l", "ɭ", "ɹ", "r", "j", "w"];
const VOWELS = ["ɐ", "ə", "aː", "i", "iː", "u", "uː", "e", "eː", "o", "oː", "æ", "æː", "aɪ", "aʊ"];
const PHONES = [...CONSONANTS, ...VOWELS];
export const SYMBOLS = [...SPECIALS, ...PUNCTUATION, ...PHONES];
const SYMBOL_TO_ID = new Map(SYMBOLS.map((s, i) => [s, i]));
const PHONE_SET = new Set(PHONES);
const VOWEL_SET = new Set(VOWELS);
const STRESS_MARKS = [["ˈ", 1], ["ˌ", 2]];
const PRENASAL = new Map([["ᵐ|b", "ᵐb"], ["ⁿ|d", "ⁿd"], ["ⁿ|ɖ", "ⁿɖ"], ["ᵑ|ɡ", "ᵑɡ"]]);
const FALLBACK = new Map(Object.entries({
  "ᵐ": ["m"], "ⁿ": ["n"], "ᵑ": ["ŋ"], "a": ["ɐ"], "ɑ": ["aː"], "ɑː": ["aː"], "ɒ": ["o"], "ɔ": ["o"],
  "ɔː": ["oː"], "ʌ": ["ɐ"], "ɪ": ["i"], "ɛ": ["e"], "ɜː": ["ə"], "ɜ": ["ə"], "ɚ": ["ə"], "ᵻ": ["i"],
  "ʊ": ["u"], "oʊ": ["oː"], "əʊ": ["oː"], "eɪ": ["eː"], "ɔɪ": ["o", "i"], "iə": ["i", "ə"],
  "eə": ["e", "ə"], "ʊə": ["u", "ə"], "ɑːɹ": ["aː", "ɹ"], "ɔːɹ": ["oː", "ɹ"], "oːɹ": ["oː", "ɹ"],
  "ɪɹ": ["i", "ɹ"], "ɛɹ": ["e", "ɹ"], "ʊɹ": ["u", "ɹ"], "aɪɚ": ["aɪ", "ə"], "aɪə": ["aɪ", "ə"],
  "əl": ["ə", "l"], "n̩": ["ə", "n"], "l̩": ["ə", "l"], "θ": ["t"], "ð": ["d"], "z": ["s"],
  "ʒ": ["dʒ"], "ɾ": ["ɹ"], "ʔ": [], "x": ["k"], "ç": ["h"], "ɣ": ["ɡ"], "ʋ": ["w"],
}));

const JOINERS = /[‍‌­﻿]/g;
const LETTERS = { "ශ": "ෂ", "෴": "." };

function siNormalize(text) {
  return text.normalize("NFC").replace(JOINERS, "").replace(/[ශ෴]/g, (c) => LETTERS[c]);
}

function merge(units) {
  const merged = [];
  for (let i = 0; i < units.length; i++) {
    const [phone, stress] = units[i];
    if (i + 1 < units.length && PRENASAL.has(`${phone}|${units[i + 1][0]}`)) {
      merged.push([PRENASAL.get(`${phone}|${units[i + 1][0]}`), stress || units[i + 1][1]]);
      i++;
      continue;
    }
    merged.push([phone, stress]);
  }
  return merged;
}

function splitUnit(unit) {
  const pieces = [];
  let rest = [...unit];
  while (rest.length) {
    let found = false;
    for (let size = Math.min(4, rest.length); size > 0; size--) {
      const head = rest.slice(0, size).join("");
      if (PHONE_SET.has(head)) { pieces.push(head); rest = rest.slice(size); found = true; break; }
    }
    if (!found) return null;
  }
  return pieces.length ? pieces : null;   // Python: an empty tuple is falsy
}

export function canonical(phone) {
  if (PHONE_SET.has(phone)) return [phone];
  if (FALLBACK.has(phone)) return FALLBACK.get(phone);
  const stripped = [...phone.normalize("NFD")].filter((c) => !COMBINING.test(c)).join("");
  for (const candidate of [stripped, stripped.split("ː").join("")]) {
    if (PHONE_SET.has(candidate)) return [candidate];
    if (FALLBACK.has(candidate)) return FALLBACK.get(candidate);
  }
  return splitUnit(phone) || splitUnit(stripped);
}

function pySplit(text) {             // str.split() with no argument
  return text.split(new RegExp(SPACE.source + "+", "u")).filter((w) => w !== "");
}

function parse(output) {
  const words = [];
  for (const word of pySplit(output)) {
    const units = [];
    for (let unit of word.split("_")) {
      let stress = 0;
      for (const [mark, level] of STRESS_MARKS) {
        if (unit.includes(mark)) { stress = stress || level; unit = unit.split(mark).join(""); }
      }
      unit = unit.replace(/\([a-z-]+\)/g, "");
      unit = [...unit].filter((c) => !FORMAT.test(c)).join("");
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(merge(units));
  }
  return words;
}

// ---- the phonemizer-fork steps between the text and eSpeak --------------------------
const MARKS = ';:,.!?¡¿—…"«»“”(){}[]';
const MARKS_RE = new RegExp(`(${SPACE.source}*[${MARKS.replace(/[\\\]\[^-]/g, "\\$&")}]+${SPACE.source}*)+`, "gu");

function pyStrip(text) {
  const chars = [...text];
  let a = 0, b = chars.length;
  while (a < b && SPACE.test(chars[a])) a++;
  while (b > a && SPACE.test(chars[b - 1])) b--;
  return chars.slice(a, b).join("");
}

function phonemizerLine(espeak, piece) {
  const text = pyStrip(piece.replace(MARKS_RE, " "));             // Punctuation.remove
  let line = espeak.phonemes(text);                                // text_to_phonemes
  line = pyStrip(line).split("\n").join(" ").split("  ").join(" ");
  line = line.replace(/_+/g, "_").split("_ ").join(" ");
  if (/\(.+?\)/.test(line)) line = line.replace(/\(.+?\)/g, "");   // language_switch="remove-flags"
  if (!line) return "";
  const words = line.split(" ").map((w) => pyStrip(w));            // with_stress=True; strip=True
  return words.join(" ");
}

function espeakWords(espeak, pieces) {
  return pieces.map((piece) => parse(phonemizerLine(espeak, piece)));
}

// ---- frontend.py --------------------------------------------------------------------
const QUOTES = {
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"',
  "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")",
};
const QUOTES_RE = new RegExp(`[${Object.keys(QUOTES).join("").replace(/[\\\]\[^-]/g, "\\$&")}]`, "gu");
const PUNCTUATION_CHARS = new Set(PUNCTUATION);
const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "prof", "st", "jr", "sr", "vs", "etc"]);

const S = SPACE.source;
const SPACE_RUN = new RegExp(`[${S.slice(1, -1)}\\ufeff]+`, "gu");
const SENTENCE_END = new RegExp(`(?:(?<=[.!?…])|(?<=[.!?…]["')\\]]))${S}+(?=["'(\\[]?[A-Z0-9\\u0d80-\\u0dff])`, "u");
const NOT_AN_END = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
const CLAUSE_END = new RegExp(`(?<=[,;:—])${S}+`, "u");
const TEXT_END = new RegExp(`[${S.slice(1, -1)}\\ufeff]+$`, "u");
const CLOSING = "\"'”’)]»";

export class NothingToPronounce extends Error {}

const isAlnum = (c) => c !== "" && ALNUM.test(c);
const isAlpha = (c) => c !== "" && ALPHA.test(c);
const isDigit = (c) => c !== "" && DIGIT.test(c);

export function normalizeText(text) {
  text = siNormalize(text);
  text = text.normalize("NFKC").replace(QUOTES_RE, (c) => QUOTES[c]);
  text = text.replace(/\.{3,}/g, "…");
  text = text.replace(new RegExp(`-{2,}|${S}-${S}`, "gu"), "—");
  return pyStrip(text.replace(new RegExp(`${S}+`, "gu"), " "));
}

function* chunks(text) {
  const chars = [...text];
  let start = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!PUNCTUATION_CHARS.has(char)) continue;
    const previous = i ? chars[i - 1] : "";
    const following = i + 1 < chars.length ? chars[i + 1] : "";
    if (char === "'" && isAlnum(previous) && isAlnum(following)) continue;
    if (".,:".includes(char) && isDigit(previous) && isDigit(following)) continue;
    if (char === ".") {
      const word = /([A-Za-z]+)$/.exec(chars.slice(0, i).join(""));
      if (word && ABBREVIATIONS.has(word[1].toLowerCase())) continue;
      if (isAlpha(previous) && isAlpha(following)) continue;
    }
    const before = chars.slice(start, i).join("");
    if (pyStrip(before)) yield [false, pyStrip(before)];
    yield [true, char];
    start = i + 1;
  }
  const rest = chars.slice(start).join("");
  if (pyStrip(rest)) yield [false, pyStrip(rest)];
}

function tokenize(pieces) {
  const symbols = [BOS], stress = [0], unknown = [], groups = [];
  let pieceIndex = -1;
  for (const [punctuation, value] of pieces) {
    if (punctuation) {
      if (symbols[symbols.length - 1] !== value) { symbols.push(value); stress.push(0); }
      continue;
    }
    pieceIndex++;
    for (const [wordIndex, word] of value.entries()) {
      const last = symbols[symbols.length - 1];
      if (PHONE_SET.has(last) || last === UNK) { symbols.push(SP); stress.push(0); }
      const group = { piece: pieceIndex, word: wordIndex, start: symbols.length, end: symbols.length };
      groups.push(group);
      for (const [phone, level] of word) {
        let mapped = canonical(phone);
        if (mapped === null) { unknown.push(phone); mapped = [UNK]; }
        let carrier = mapped.findIndex((item) => VOWEL_SET.has(item));
        if (carrier < 0) carrier = 0;
        mapped.forEach((item, index) => { symbols.push(item); stress.push(index === carrier ? level : 0); });
      }
      group.end = symbols.length;
    }
  }
  symbols.push(EOS); stress.push(0);
  if (!symbols.some((s) => PHONE_SET.has(s) || s === UNK)) throw new NothingToPronounce("the text has nothing to pronounce");
  return { symbols, ids: symbols.map((s) => SYMBOL_TO_ID.get(s)), stress, unknown, groups };
}

/** One sentence of Sinhala text -> { ids, stress, symbols, unknown }. */
export function phonemize(espeak, text) {
  if (typeof text !== "string" || !pyStrip(text)) throw new Error("text must not be empty");
  const pieces = [...chunks(normalizeText(text))];
  const texts = pieces.filter(([p]) => !p).map(([, piece]) => piece);
  const wordLists = espeakWords(espeak, texts);
  const words = wordLists[Symbol.iterator]();
  const result = tokenize(pieces.map(([punctuation, piece]) => (punctuation ? [true, piece] : [false, words.next().value])));
  // For word highlighting: the text pieces eSpeak read and how many words it made of each.
  result.pieces = texts.map((text, i) => ({ text, spoken: wordLists[i].length }));
  return result;
}

/** Text pieces (without punctuation) of a text after normalisation, as phonemize() sees them. */
export function textPieces(text) {
  return [...chunks(normalizeText(text))].filter(([p]) => !p).map(([, piece]) => piece);
}

export function sentences(text) {
  const parts = [];
  let current = "";
  for (const piece of pyStrip(text.replace(SPACE_RUN, " ")).split(SENTENCE_END)) {
    current = current ? `${current} ${piece}` : piece;
    if (!NOT_AN_END.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts.filter((part) => [...part].some(isAlnum));
}

export function finished(text) {
  const body = text.replace(TEXT_END, "");
  if (!body) return text;
  const split = body.split(new RegExp(`[${S.slice(1, -1)}\\ufeff]+`, "u"));
  const last = split[split.length - 1];
  let marked;
  if ([...last].some(isAlnum)) {
    let trimmed = [...last];
    while (trimmed.length && CLOSING.includes(trimmed[trimmed.length - 1])) trimmed.pop();
    marked = trimmed.length > 0 && ".!?…,;:".includes(trimmed[trimmed.length - 1]);
  } else {
    marked = [...last].some((c) => ".!?…".includes(c)) || [",", ";", ":"].includes(last);
  }
  return marked ? text : body + ".";
}

export function shorter(text) {
  const pieces = text.split(CLAUSE_END);
  if (pieces.length > 1) return pieces;
  const words = text.split(" ");
  if (words.length < 2) return [];
  const half = Math.floor((words.length + 1) / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}
