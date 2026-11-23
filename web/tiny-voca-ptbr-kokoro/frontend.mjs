// ES-module port of tiny_voca_ptbr/text.py from
// https://github.com/Haple/tiny-voca-ptbr-kokoro/tree/1e7ed993260ecdd91552762f7403c00632bf5dab.
// See adjacent LICENSE and NOTICE for Apache-2.0 attribution. eSpeak NG is a
// separate GPL-3.0-or-later component.

import { normalizePtbr } from './normalize.mjs';

export const FRONTEND = 'espeak';
export const FRONTEND_VERSION = 'ptbr-1';
export const ESPEAK_VOICE = 'pt-br';
export const SEPARATOR = '_';
export const [PAD, BOS, EOS, SP, UNK] = ['<pad>', '<bos>', '<eos>', '<sp>', '<unk>'];
export const SPECIALS = [PAD, BOS, EOS, SP, UNK];
export const PUNCTUATION = [',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…'];
const CONSONANTS_RAW = ['p','b','t','d','k','ɡ','f','v','s','z','ʃ','ʒ','x','m','n','ɲ','ŋ','l','ʎ','ɾ','r','j','w','tʃ','dʒ'];
const VOWELS_RAW = ['a','aː','e','ɛ','i','o','ɔ','u','ə','æ','y','ʊ','ɐ̃','ũ','õ','eɪ','aɪ','oɪ','aʊ','eʊ','iʊ','ɛʊ','uɪ','ɛɪ','ɔɪ','ɐ̃ʊ̃'];
export const CONSONANTS = CONSONANTS_RAW.map(s => s.normalize('NFD'));
export const VOWELS = VOWELS_RAW.map(s => s.normalize('NFD'));
export const PHONES = [...CONSONANTS, ...VOWELS];
export const SYMBOLS = [...SPECIALS, ...PUNCTUATION, ...PHONES];
export const SYMBOL_TO_ID = new Map(SYMBOLS.map((s, i) => [s, i]));
export const PHONE_SET = new Set(PHONES);
export const VOWEL_SET = new Set(VOWELS);
const STRESS_MARKS = [['ˈ', 1], ['ˌ', 2]];
const LANGUAGE_TAG = /\((?:_?[a-z0-9]_?){2,3}(?:-(?:_?[a-z0-9]_?)+)*\)/gi;

const FALLBACK_RAW = {
  'ɪ':['i'], 'iː':['i'], 'ts':['t','s'], 'dz':['d','z'], 'h':['x'], 'ɹ':['ɾ'], 'θ':['s'], 'ð':['d'],
  'c':['k'], 'ɔø':['ɔ'], 'ɜ':['ɛ'], 'ɜː':['ɛ'], 'ʌ':['a'], 'ɑ':['a'], 'ɑː':['a'], 'ɐ':['a'],
  'ɒ':['ɔ'], 'ɔː':['ɔ'], 'uː':['u'], 'ɛː':['ɛ'], 'eː':['e'], 'oː':['o'], 'ɚ':['e','r'],
  'oʊ':['o','w'], 'əʊ':['o','w'], 'ʔ':[], 'ç':['x'], 'χ':['x'], 'ʁ':['x'], 'ɣ':['ɡ'], 'β':['v'],
  'ɫ':['l'], 'ɬ':['l'], 'ɻ':['ɾ'], 'ʀ':['x'], 'ø':['e'], 'œ':['ɛ'], 'ɨ':['i'], 'ʉ':['u'],
  'ɑ̃':['ɐ̃'], 'ɔ̃':['õ'], 'ɛ̃':['e','ŋ'], 'ĩ':['i','ŋ'], 'ẽ':['e','ŋ'], 'ã':['ɐ̃'],
  'dʑ':['dʒ'], 'tɕ':['tʃ'], 'ɕ':['ʃ'], 'ʑ':['ʒ'], 'ʝ':['j'], 'ɟ':['dʒ'],
  'aɪə':['a','j','a'], 'aɪɚ':['a','j','e','r'], 'iə':['i','a'], 'ʊə':['u','a'], 'eə':['e','a'],
  'l̩':['u','w'], 'n̩':['e','n'], 'm̩':['e','m'], 'əl':['e','w'],
};
export const FALLBACK = new Map(Object.entries(FALLBACK_RAW).map(([k,v]) => [k.normalize('NFD'), v.map(s => s.normalize('NFD'))]));

const QUOTES = new Map(Object.entries({
  '‘':"'", '’':"'", '‚':"'", '‛':"'", '`':"'", '´':"'",
  '“':'"', '”':'"', '„':'"', '‟':'"', '«':'"', '»':'"',
  '–':'—', '―':'—', '[':'(', '{':'(', ']':')', '}':')',
}));
const PUNCTUATION_SET = new Set(PUNCTUATION);
const ABBREVIATIONS = new Set(['sr','sra','srta','dr','dra','prof','profa','av','etc','vs','jr','pág','tel']);

function pyJson(value) {
  // Python json.dumps(..., ensure_ascii=False, sort_keys=True) uses a space
  // after separators by default; that byte format is part of the stored ABI.
  if (Array.isArray(value)) return `[${value.map(pyJson).join(', ')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}: ${pyJson(value[k])}`).join(', ')}}`;
  return JSON.stringify(value);
}
export function frontendIdentity() {
  return {frontend_version: FRONTEND_VERSION, voice: ESPEAK_VOICE, separator: SEPARATOR,
    symbols: SYMBOLS, fallback: Object.fromEntries([...FALLBACK].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0))};
}
export function frontendIdentityJson() { return pyJson(frontendIdentity()); }
export async function frontendFingerprint(cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(frontendIdentityJson()));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAlphaNumeric(s) { return !!s && /[\p{L}\p{N}]/u.test(s); }
function isCombining(s) { return /\p{M}/u.test(s); }
const QUOTE_TRANSLATION = /[‘’‚‛`´“”„‟«»–―\[\]{}]/gu;
export function normalizeText(input) {
  let text = normalizePtbr(input).normalize('NFKC').replace(QUOTE_TRANSLATION, c => QUOTES.get(c));
  text = text.replace(/\.{3,}/gu, '…').replace(/-{2,}|\s-\s/gu, '—');
  return text.replace(/\s+/gu, ' ').trim();
}

export function* chunks(input) {
  const text = input;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!PUNCTUATION_SET.has(char)) continue;
    const previous = i ? text[i - 1] : '';
    const following = i + 1 < text.length ? text[i + 1] : '';
    if (char === "'" && isAlphaNumeric(previous) && isAlphaNumeric(following)) continue;
    if (',:.'.includes(char) && /[0-9]/.test(previous) && /[0-9]/.test(following)) continue;
    if (char === '.') {
      const word = /([A-Za-zÀ-ÿ]+)$/u.exec(text.slice(0, i));
      if (word && ABBREVIATIONS.has(word[1].toLowerCase())) continue;
      if (isAlphaNumeric(previous) && isAlphaNumeric(following)) continue;
    }
    const preceding = text.slice(start, i).trim();
    if (preceding) yield [false, preceding];
    yield [true, char];
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) yield [false, tail];
}

export function parseEspeak(rawIpa) {
  const words = [];
  for (const word of String(rawIpa).replace(LANGUAGE_TAG, '').trim().split(/\s+/u)) {
    if (!word) continue;
    const units = [];
    for (let unit0 of word.split(SEPARATOR)) {
      let stress = 0, unit = unit0;
      for (const [mark, level] of STRESS_MARKS) {
        if (unit.includes(mark)) stress ||= level;
        unit = unit.replaceAll(mark, '');
      }
      unit = [...unit].filter(c => !/\p{Cf}/u.test(c) && c !== '(' && c !== ')').join('').normalize('NFD');
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

export function canonical(phone) {
  if (PHONE_SET.has(phone)) return [phone];
  if (FALLBACK.has(phone)) return FALLBACK.get(phone);
  const stripped = phone.normalize('NFD').replace(/\p{M}/gu, '');
  for (const candidate of [stripped, stripped.replaceAll('ː', ''), `${stripped}ː`]) {
    if (candidate !== phone && PHONE_SET.has(candidate)) return [candidate];
    if (candidate !== phone && FALLBACK.has(candidate)) return FALLBACK.get(candidate);
  }
  return null;
}

export function tokenize(pieces) {
  const symbols = [BOS], stress = [0], unknown = [];
  for (const [punctuation, value] of pieces) {
    if (punctuation) {
      if (symbols.at(-1) !== value) { symbols.push(value); stress.push(0); }
      continue;
    }
    for (const word of value) {
      if (PHONE_SET.has(symbols.at(-1)) || symbols.at(-1) === UNK) { symbols.push(SP); stress.push(0); }
      for (const [phone, level] of word) {
        let mapped = canonical(phone);
        if (mapped === null) { unknown.push(phone); mapped = [UNK]; }
        if (!mapped.length) continue;
        const carrier = Math.max(0, mapped.findIndex(item => VOWEL_SET.has(item)));
        mapped.forEach((item, index) => { symbols.push(item); stress.push(index === carrier ? level : 0); });
      }
    }
  }
  symbols.push(EOS); stress.push(0);
  if (!symbols.some(s => PHONE_SET.has(s) || s === UNK)) throw new NothingToPronounce('the text has nothing to pronounce');
  return {symbols, ids: symbols.map(s => SYMBOL_TO_ID.get(s)), stress, unknown};
}

export class NothingToPronounce extends Error {
  constructor(message = 'the text has nothing to pronounce') { super(message); this.name = 'NothingToPronounce'; }
}

/** Raw eSpeak trace callback receives exact text plus required voice/separator. */
export async function phonemize(input, getRawIpa) {
  if (typeof input !== 'string' || !input.trim()) throw new TypeError('text must not be empty');
  if (typeof getRawIpa !== 'function') throw new TypeError('an eSpeak NG 1.51 raw-IPA provider is required');
  const pieces = [];
  for (const [punctuation, piece] of chunks(normalizeText(input))) {
    if (punctuation) pieces.push([true, piece]);
    else {
      // Upstream appends LF because eSpeak NG 1.51 drops the last character
      // of unterminated stdin. The injected runtime must preserve this behavior.
      const raw = await getRawIpa(`${piece.replace(/\n+$/u, '')}\n`, {voice: ESPEAK_VOICE, separator: SEPARATOR});
      pieces.push([false, parseEspeak(raw)]);
    }
  }
  return tokenize(pieces);
}

/** Deterministic entry point for parity tests: inject one raw IPA string per text piece. */
export async function phonemizeWithTrace(input, traceByTextPiece) {
  return phonemize(input, (withNewline) => {
    const key = withNewline.replace(/\n+$/u, '');
    if (!Object.hasOwn(traceByTextPiece, key)) throw new Error(`missing raw IPA parity trace for ${JSON.stringify(key)}`);
    return traceByTextPiece[key];
  });
}

export { normalizePtbr } from './normalize.mjs';
