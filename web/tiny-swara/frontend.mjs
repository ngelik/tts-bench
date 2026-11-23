// Browser port of Xeven7/tiny-swara's tiny_voca/text.py Bengali eSpeak path.
// Keep the released symbol order and front-end decisions fixed: these IDs are
// part of the pinned checkpoint ABI.

const SPECIALS = ['<pad>', '<bos>', '<eos>', '<sp>', '<unk>'];
const PUNCTUATION = [',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…'];
const STRESS_MARKS = new Map([['ˈ', 1], ['ˌ', 2]]);
const LANGUAGE_TAG = /\((?:_?[a-z0-9]_?){2,3}(?:-(?:_?[a-z0-9]_?)+)*\)/giu;
const LATIN_RUN = /[A-Za-z][A-Za-z']*/g;
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'vs', 'etc']);
const PUNCTUATION_CHARS = new Set(PUNCTUATION);
const QUOTES = new Map([
  ['‘', "'"], ['’', "'"], ['‚', "'"], ['‛', "'"], ['`', "'"], ['´', "'"],
  ['“', '"'], ['”', '"'], ['„', '"'], ['‟', '"'], ['«', '"'], ['»', '"'],
  ['–', '—'], ['―', '—'], ['।', '.'], ['॥', '.'], ['[', '('], ['{', '('], [']', ')'], ['}', ')'],
]);

export class NothingToPronounce extends Error {
  constructor(message = 'the text has nothing to pronounce') { super(message); this.name = 'NothingToPronounce'; }
}

export async function frontendFingerprint(inventory) {
  const phones = [...inventory.consonants, ...inventory.vowels];
  const fallback = Object.fromEntries(Object.entries(inventory.fallback).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const symbols = [...SPECIALS, ...PUNCTUATION, ...phones];
  const pythonJson = value => {
    if (Array.isArray(value)) return `[${value.map(pythonJson).join(', ')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}: ${pythonJson(value[key])}`).join(', ')}}`;
    return JSON.stringify(value);
  };
  // Python json.dumps(sort_keys=True, ensure_ascii=False) uses spaces after
  // separators. Preserve that byte representation for the source fingerprint.
  const payload = pythonJson({ fallback, frontend_version: 3, separator: '_', symbols, voice: inventory.voice });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeText(value) {
  let text = String(value).normalize('NFKC');
  text = [...text].map(char => QUOTES.get(char) ?? char).join('');
  text = text.replace(/\.{3,}/g, '…').replace(/-{2,}|\s-\s/g, '—');
  return text.replace(/\s+/gu, ' ').trim();
}

export function* chunks(text) {
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!PUNCTUATION_CHARS.has(char)) continue;
    const previous = i ? text[i - 1] : '';
    const following = i + 1 < text.length ? text[i + 1] : '';
    if (char === "'" && /[\p{L}\p{N}]/u.test(previous) && /[\p{L}\p{N}]/u.test(following)) continue;
    if (',.:'.includes(char) && /^\p{N}$/u.test(previous) && /^\p{N}$/u.test(following)) continue;
    if (char === '.') {
      const word = /([A-Za-z]+)$/.exec(text.slice(0, i));
      if (word && ABBREVIATIONS.has(word[1].toLowerCase())) continue;
      if (/^\p{L}$/u.test(previous) && /^\p{L}$/u.test(following)) continue;
    }
    const piece = text.slice(start, i).trim();
    if (piece) yield [false, piece];
    yield [true, char];
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) yield [false, tail];
}

export function parseEspeak(output) {
  const words = [];
  for (const word of String(output).replace(LANGUAGE_TAG, '').split(/\s+/u)) {
    if (!word) continue;
    const units = [];
    for (let unit of word.split('_')) {
      let stress = 0;
      for (const [mark, level] of STRESS_MARKS) {
        if (unit.includes(mark)) stress ||= level;
        unit = unit.split(mark).join('');
      }
      unit = [...unit].filter(char => !/[\p{Cf}()]/u.test(char)).join('');
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

export function createFrontend({ inventory, lexicon, rawEspeak }) {
  if (!inventory || !lexicon || typeof rawEspeak !== 'function') throw new TypeError('Tiny Swara frontend needs inventory, lexicon and rawEspeak');
  const phones = [...inventory.consonants, ...inventory.vowels];
  const phoneSet = new Set(phones);
  const vowelSet = new Set(inventory.vowels);
  const symbols = [...SPECIALS, ...PUNCTUATION, ...phones];
  const symbolToId = new Map(symbols.map((symbol, index) => [symbol, index]));
  const canonical = phone => {
    if (phoneSet.has(phone)) return [phone];
    if (Object.hasOwn(inventory.fallback, phone)) return inventory.fallback[phone];
    const stripped = phone.normalize('NFD').replace(/\p{M}/gu, '');
    for (const candidate of [stripped, stripped.replaceAll('ː', ''), stripped + 'ː']) {
      if (candidate !== phone && phoneSet.has(candidate)) return [candidate];
      if (candidate !== phone && Object.hasOwn(inventory.fallback, candidate)) return inventory.fallback[candidate];
    }
    return null;
  };

  function tokenize(pieces) {
    const tokens = ['<bos>'];
    const stress = [0];
    const unknown = [];
    for (const [punctuation, value] of pieces) {
      if (punctuation) {
        if (tokens.at(-1) !== value) { tokens.push(value); stress.push(0); }
        continue;
      }
      for (const word of value) {
        if (phoneSet.has(tokens.at(-1)) || tokens.at(-1) === '<unk>') { tokens.push('<sp>'); stress.push(0); }
        for (const [phone, level] of word) {
          let mapped = canonical(phone);
          if (!mapped) { unknown.push(phone); mapped = ['<unk>']; }
          const carrier = Math.max(0, mapped.findIndex(item => vowelSet.has(item)));
          mapped.forEach((item, index) => { tokens.push(item); stress.push(index === carrier ? level : 0); });
        }
      }
    }
    tokens.push('<eos>'); stress.push(0);
    if (!tokens.some(token => phoneSet.has(token) || token === '<unk>')) throw new NothingToPronounce();
    return { symbols: tokens, ids: tokens.map(token => symbolToId.get(token)), stress, unknown };
  }

  function espeakWords(piece, voice = inventory.voice) {
    return parseEspeak(rawEspeak(piece.replace(/\n+$/u, '') + '\n', voice));
  }

  function espeakMixed(piece) {
    const words = [];
    let position = 0;
    LATIN_RUN.lastIndex = 0;
    for (const match of piece.matchAll(LATIN_RUN)) {
      const prefix = piece.slice(position, match.index);
      if (prefix.trim()) words.push(...espeakWords(prefix));
      const latinWord = match[0];
      const spelling = lexicon[latinWord.toLowerCase()];
      words.push(...(spelling ? espeakWords(spelling) : espeakWords(latinWord, 'en-us')));
      position = match.index + latinWord.length;
    }
    const suffix = piece.slice(position);
    if (suffix.trim()) words.push(...espeakWords(suffix));
    return words;
  }

  function phonemize(text) {
    if (typeof text !== 'string' || !text.trim()) throw new TypeError('text must not be empty');
    const pieces = [];
    for (const [punctuation, piece] of chunks(normalizeText(text))) {
      pieces.push(punctuation ? [true, piece] : [false, espeakMixed(piece)]);
    }
    return tokenize(pieces);
  }

  return Object.freeze({ symbols, phonemize, tokenize, espeakWords, espeakMixed });
}

export function splitSentences(text) {
  if (!text) return [];
  const parts = text.split(/(?<=[.!?।…])\s+/u);
  return parts.map(part => part.trim()).filter(Boolean).map(part => /[.!?।…]["'’”)]*\]*$/u.test(part) ? part : part + '.');
}
