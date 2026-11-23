// French text -> model tokens, the same way tiny_voca.text does with TINY_VOCA_LANGUAGE=fr.
// `espeak(piece)` must return what `espeak-ng -q --ipa --sep=_ -v fr-fr` prints for one text piece.

export const PAD = "<pad>", BOS = "<bos>", EOS = "<eos>", SP = "<sp>", UNK = "<unk>";
export const PUNCTUATION = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];
const CONSONANTS = ["p", "b", "t", "d", "k", "ɡ", "f", "v", "s", "z", "ʃ", "ʒ", "m", "n", "ɲ", "ŋ", "l", "ʁ", "j", "w"];
const VOWELS = ["i", "e", "ɛ", "a", "ɔ", "o", "u", "y", "ø", "œ", "ə", "ɑ̃", "ɔ̃", "ɛ̃", "œ̃"];
export const PHONES = [...CONSONANTS, ...VOWELS];
export const SYMBOLS = [PAD, BOS, EOS, SP, UNK, ...PUNCTUATION, ...PHONES];
const ID = new Map(SYMBOLS.map((symbol, index) => [symbol, index]));
const PHONE_SET = new Set(PHONES);
const VOWEL_SET = new Set(VOWELS);
const FALLBACK = {
  "aː": ["a"], "ɑː": ["a"], "ɑ": ["a"], "ɒ": ["ɔ"], "ɔː": ["ɔ"], "oː": ["o"], "iː": ["i"], "yː": ["y"],
  "uː": ["u"], "ɛː": ["ɛ"], "eː": ["e"], "øː": ["ø"], "ɪ": ["i"], "ɪː": ["i"], "ʊ": ["u"], "ʌ": ["œ"],
  "ɐ": ["a"], "ɜː": ["œ"], "ɜ": ["œ"], "æ": ["a"], "ɚ": ["œ", "ʁ"], "əl": ["ə", "l"], "ɥ": ["y"],
  "eɪ": ["e"], "aɪ": ["a", "j"], "aɪə": ["a", "j", "œ"], "ɔɪ": ["ɔ", "j"], "aʊ": ["a", "u"], "əʊ": ["o"],
  "oʊ": ["o"], "iə": ["i", "œ"], "eə": ["ɛ"], "ʊə": ["u", "œ"], "ɪə": ["i", "œ"],
  "θ": ["s"], "ð": ["z"], "ɹ": ["ʁ"], "r": ["ʁ"], "h": [], "ʔ": [], "x": ["ʁ"],
  "tʃ": ["t", "ʃ"], "dʒ": ["d", "ʒ"], "ts": ["t", "s"], "dz": ["d", "z"], "ɾ": ["t"], "ʎ": ["l", "j"],
  "n̩": ["ə", "n"], "l̩": ["ə", "l"], "m̩": ["ə", "m"],
};
const ABBREVIATIONS = new Set(["m", "mm", "mme", "mmes", "mlle", "mlles", "dr", "pr", "me", "st", "ste", "etc", "cf", "env", "av", "bd"]);
const STRESS = { "ˈ": 1, "ˌ": 2 };
const QUOTES = { "‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'", "“": '"', "”": '"', "„": '"', "‟": '"',
                 "«": '"', "»": '"', "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")" };
const TITLES = [[/\bMM\.(?=\s)/g, "Messieurs"], [/\bM\.(?=\s)/g, "Monsieur"], [/\bMmes\b\.?/g, "Mesdames"],
                [/\bMme\b\.?/g, "Madame"], [/\bMlles\b\.?/g, "Mesdemoiselles"], [/\bMlle\b\.?/g, "Mademoiselle"],
                [/\bDr\b\.?/g, "Docteur"], [/\bPr\b\.?(?=\s[A-ZÉ])/g, "Professeur"]];
const LANGUAGE_TAG = /\((?:_?[a-z0-9]_?){2,3}(?:-(?:_?[a-z0-9]_?)+)*\)/g;
const ALNUM = /[\p{L}\p{N}]/u, DIGIT = /\p{Nd}/u, ALPHA = /\p{L}/u;

export class NothingToPronounce extends Error {}

export function normalizeText(text) {
  text = text.normalize("NFKC").replace(/[‘’‚‛`´“”„‟«»–―\[\]{}]/g, (c) => QUOTES[c]);
  for (const [pattern, title] of TITLES) text = text.replace(pattern, title);
  text = text.replace(/\.{3,}/g, "…").replace(/-{2,}|\s-\s/g, "—");
  return text.replace(/\s+/g, " ").trim();
}

// [isPunctuation, piece] pairs; numbers, contractions and abbreviations stay inside text pieces.
export function chunks(text) {
  const out = [];
  const chars = [...text];
  let start = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!PUNCTUATION.includes(char)) continue;
    const previous = i ? chars[i - 1] : "", following = i + 1 < chars.length ? chars[i + 1] : "";
    if (char === "'" && ALNUM.test(previous) && ALNUM.test(following)) continue;
    if (".,:".includes(char) && DIGIT.test(previous) && DIGIT.test(following)) continue;
    if (char === ".") {
      const word = chars.slice(0, i).join("").match(/([\p{L}\p{M}]+)$/u);
      if (word && ABBREVIATIONS.has(word[1].toLowerCase())) continue;
      if (ALPHA.test(previous) && ALPHA.test(following)) continue;
    }
    const piece = chars.slice(start, i).join("").trim();
    if (piece) out.push([false, piece]);
    out.push([true, char]);
    start = i + 1;
  }
  const rest = chars.slice(start).join("").trim();
  if (rest) out.push([false, rest]);
  return out;
}

export function parseEspeak(output) {
  const words = [];
  for (const word of output.replace(LANGUAGE_TAG, "").split(/\s+/)) {
    if (!word) continue;
    const units = [];
    for (let unit of word.split("_")) {
      let stress = 0;
      for (const [mark, level] of Object.entries(STRESS)) {
        if (unit.includes(mark)) { stress = stress || level; unit = unit.split(mark).join(""); }
      }
      unit = [...unit].filter((c) => !/\p{Cf}/u.test(c) && c !== "(" && c !== ")" && c !== "-").join("");
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

function canonical(phone) {
  if (PHONE_SET.has(phone)) return [phone];
  if (phone in FALLBACK) return FALLBACK[phone];
  const stripped = phone.normalize("NFD").replace(/\p{M}/gu, "");
  for (const candidate of [stripped, stripped.replace(/ː/g, ""), stripped + "ː"]) {
    if (candidate !== phone && PHONE_SET.has(candidate)) return [candidate];
    if (candidate !== phone && candidate in FALLBACK) return FALLBACK[candidate];
  }
  return null;
}

export function tokenize(pieces) {
  const symbols = [BOS], stress = [0];
  for (const [punctuation, value] of pieces) {
    if (punctuation) {
      if (symbols[symbols.length - 1] !== value) { symbols.push(value); stress.push(0); }
      continue;
    }
    for (const word of value) {
      const last = symbols[symbols.length - 1];
      if (PHONE_SET.has(last) || last === UNK) { symbols.push(SP); stress.push(0); }
      for (const [phone, level] of word) {
        const mapped = canonical(phone) || [UNK];
        let carrier = mapped.findIndex((item) => VOWEL_SET.has(item));
        if (carrier < 0) carrier = 0;
        mapped.forEach((item, index) => { symbols.push(item); stress.push(index === carrier ? level : 0); });
      }
    }
  }
  symbols.push(EOS); stress.push(0);
  if (!symbols.some((s) => PHONE_SET.has(s) || s === UNK)) throw new NothingToPronounce("nothing to pronounce");
  return { symbols, ids: symbols.map((s) => ID.get(s)), stress };
}

export async function phonemize(text, espeak) {
  const pieces = [];
  for (const [punctuation, piece] of chunks(normalizeText(text))) {
    pieces.push(punctuation ? [true, piece] : [false, parseEspeak(await espeak(piece))]);
  }
  return tokenize(pieces);
}

// Sentences, French-aware: no break after titles and initials, a capital may carry an accent.
const NOT_AN_END = /(?:\b(?:m|mm|mme|mlle|dr|pr|st|ste|etc|cf|env|av|bd)|(?:^|\s)\p{Lu})\.$/iu;
export function sentences(text) {
  const parts = [];
  let current = "";
  for (const piece of normalizeText(text).split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[\p{Lu}0-9])/u)) {
    current = current ? current + " " + piece : piece;
    if (!NOT_AN_END.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts.filter((part) => /[\p{L}\p{N}]/u.test(part));
}
