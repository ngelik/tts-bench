// Greek normalization and sentence rules ported from tiny-voca-gr@927ea15cf4edcb8695b75328c9c90c5c53928554.
// IPA tokenization and fit rules derive from n4ze3m/tiny-voca@62e2adef158bc997042cc6234f541f1e0e4cd55d/src/tiny_voca/text.py and infer.py.
// See NOTICE.md; keep normalization, inventory, and unknown-phone reporting exact.
export const SYMBOLS = Object.freeze([
  '<pad>', '<bos>', '<eos>', '<sp>', '<unk>', ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…',
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'm', 'n', 'ŋ', 'l', 'r', 'ɾ', 'j', 'x', 'ɣ', 'ç', 'ʝ', 'ɲ', 'ʎ', 'c', 'ɟ',
  'a', 'e', 'i', 'o', 'u',
]);
const SYMBOL_TO_ID = new Map(SYMBOLS.map((symbol, id) => [symbol, id]));
const PHONES = new Set(SYMBOLS.slice(17));
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const PUNCTUATION = new Set(SYMBOLS.slice(5, 17));
const FALLBACK = new Map([['g', ['ɡ']], ['ts', ['t', 's']], ['dz', ['d', 'z']]]);
const LANGUAGE_TAG = /\((?:_?[a-z0-9]_?){2,3}(?:-(?:_?[a-z0-9]_?)+)*\)/giu;
const ABBREVIATIONS = new Set(['κ', 'κα', 'κος', 'κυρ', 'δρ', 'πχ', 'δηλ', 'αρ', 'σελ']);

export function normalizeText(value) {
  if (typeof value !== 'string') throw new TypeError('Greek frontend text must be a string');
  return value.normalize('NFC')
    .replace(/[;;··«»“”’–]/gu, char => ({ ';': '?', ';': '?', '·': ':', '·': ':', '«': '"', '»': '"', '“': '"', '”': '"', '’': "'", '–': '—' })[char])
    .replace(/\.{3,}/gu, '…')
    .trim().replace(/[\s\uFEFF]+/gu, ' ');
}

const hasAlnum = text => /[\p{L}\p{N}]/u.test(text);

export function greekSentences(value) {
  const text = normalizeText(value);
  const parts = text.split(/(?<=[.!?…])\s+|(?<=[.!?…]["\)])\s+/gu);
  const result = [];
  let pending = '';
  for (const part of parts) {
    pending = pending ? `${pending} ${part}` : part;
    const match = /([\p{L}\p{M}]+)\.$/u.exec(pending);
    if (match && (ABBREVIATIONS.has(match[1].toLowerCase()) || Array.from(match[1]).length === 1)) continue;
    if (hasAlnum(pending)) result.push(pending);
    pending = '';
  }
  if (pending && hasAlnum(pending)) result.push(pending);
  return result;
}

export function finished(text) {
  const body = text.replace(/[\s\uFEFF]+$/gu, '');
  if (!body) return text;
  const last = body.split(/[\s\uFEFF]+/u).at(-1);
  if (hasAlnum(last)) return /[.!?…,;:]["'”’)]*»*$/u.test(last) ? text : `${body}.`;
  return /[.!?…]/u.test(last) || /^[,;:]$/u.test(last) ? text : `${body}.`;
}


export function spokenSentences(value) {
  // tiny-voca-gr.run normalizes before tiny_voca.infer.speak_text; speak_text
  // calls sentences(finished(text)), and the Greek sentence function normalizes again.
  return greekSentences(finished(normalizeText(value)));
}

export function shorter(text) {
  const clauses = text.split(/(?<=[,;:—])\s+/u);
  if (clauses.length > 1) return clauses;
  const words = text.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

export function chunks(text) {
  const result = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!PUNCTUATION.has(char)) continue;
    const previous = i ? text[i - 1] : '';
    const following = i + 1 < text.length ? text[i + 1] : '';
    if (char === "'" && /[\p{L}\p{N}]/u.test(previous) && /[\p{L}\p{N}]/u.test(following)) continue;
    if (['.', ',', ':'].includes(char) && /\d/u.test(previous) && /\d/u.test(following)) continue;
    if (char === '.' && /\p{L}/u.test(previous) && /\p{L}/u.test(following)) continue;
    const body = text.slice(start, i).trim();
    if (body) result.push({ punctuation: false, value: body });
    result.push({ punctuation: true, value: char });
    start = i + 1;
  }
  const body = text.slice(start).trim();
  if (body) result.push({ punctuation: false, value: body });
  return result;
}

export function parseEspeak(output) {
  const words = [];
  for (const rawWord of String(output).replace(LANGUAGE_TAG, '').split(/\s+/u)) {
    const units = [];
    for (let unit of rawWord.split('_')) {
      let stress = 0;
      if (unit.includes('ˈ')) stress = 1;
      else if (unit.includes('ˌ')) stress = 2;
      unit = unit.replace(/[ˈˌ]/gu, '').replace(/[\p{Cf}()]/gu, '');
      if (unit) units.push([unit, stress]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

export function canonical(phone) {
  if (PHONES.has(phone)) return [phone];
  if (FALLBACK.has(phone)) return FALLBACK.get(phone);
  const stripped = phone.normalize('NFD').replace(/\p{M}/gu, '');
  for (const candidate of [stripped, stripped.replace(/ː/gu, ''), `${stripped}ː`]) {
    if (candidate !== phone) {
      if (PHONES.has(candidate)) return [candidate];
      if (FALLBACK.has(candidate)) return FALLBACK.get(candidate);
    }
  }
  return null;
}

export function tokenize(pieces) {
  const symbols = ['<bos>'];
  const stress = [0];
  const unknown = [];
  for (const { punctuation, value } of pieces) {
    if (punctuation) {
      if (symbols.at(-1) !== value) { symbols.push(value); stress.push(0); }
      continue;
    }
    for (const word of value) {
      if (PHONES.has(symbols.at(-1)) || symbols.at(-1) === '<unk>') { symbols.push('<sp>'); stress.push(0); }
      for (const [phone, level] of word) {
        let mapped = canonical(phone);
        if (mapped === null) { unknown.push(phone); mapped = ['<unk>']; }
        const carrier = Math.max(0, mapped.findIndex(item => VOWELS.has(item)));
        mapped.forEach((item, index) => { symbols.push(item); stress.push(index === carrier ? level : 0); });
      }
    }
  }
  symbols.push('<eos>'); stress.push(0);
  if (!symbols.some(symbol => PHONES.has(symbol) || symbol === '<unk>')) throw new Error('Greek frontend found nothing to pronounce');
  return { symbols, ids: symbols.map(symbol => SYMBOL_TO_ID.get(symbol)), stress, unknown };
}

export function phonemize(text, trace) {
  if (typeof text !== 'string' || !text.trim()) throw new TypeError('text must not be empty');
  if (typeof trace !== 'function') throw new TypeError('Greek eSpeak trace callback is required');
  const pieces = chunks(normalizeText(text)).map(piece => piece.punctuation
    ? piece
    : { ...piece, value: parseEspeak(trace(piece.value.endsWith('\n') ? piece.value : `${piece.value}\n`)) });
  return tokenize(pieces);
}

export function planText(text, trace, tokenLimit = 500) {
  const plans = [];
  const read = piece => {
    let phones;
    try { phones = phonemize(piece, trace); }
    catch (error) {
      if (error.message === 'Greek frontend found nothing to pronounce') return;
      throw error;
    }
    if (phones.ids.length <= tokenLimit) { plans.push({ utterance: piece, ...phones }); return; }
    const pieces = shorter(piece);
    if (!pieces.length) throw new Error(`one Greek word exceeds the token limit: ${piece.slice(0, 40)}`);
    for (const part of pieces) read(part);
  };
  for (const sentence of spokenSentences(text)) read(sentence);
  return plans;
}
