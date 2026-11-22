// Draft JavaScript port of FranciscoCarlosErra/alpa-es/alpa/text.py.
// Source snapshot: HF revision de2bf894bdd9eb768ae03fc6b385176a0ff505d1
// alpa/text.py SHA-256: 16957f0ba5e2b8ed9fcbc364b2d8b0d85f5df554ea52cb0cc9467488a84fdc95

export const FRONTEND_VERSION = 1;
export const PAD = '<pad>', BOS = '<bos>', EOS = '<eos>', SP = '<sp>', UNK = '<unk>';
export const SPECIALS = Object.freeze([PAD, BOS, EOS, SP, UNK]);
export const PUNCTUATION = Object.freeze([',', '?', '!', '.']);
export const VOWELS = Object.freeze(['a', 'e', 'i', 'o', 'u']);
export const CONSONANTS = Object.freeze(['p', 'b', 't', 'd', 'k', 'g', 'f', 's', 'x', 'S', 'C', 'm', 'n', 'N', 'l', 'r', 'R', 'j', 'w']);
export const PHONES = Object.freeze([...VOWELS, ...CONSONANTS]);
export const SYMBOLS = Object.freeze([...SPECIALS, ...PUNCTUATION, ...PHONES]);
export const SYMBOL_TO_ID = new Map(SYMBOLS.map((symbol, index) => [symbol, index]));

const PHONE_SET = new Set(PHONES);
const VOWEL_SET = new Set(VOWELS);
const WEIGHT_NONE = 0, UNSTRESSED = 1, STRESSED = 2;
const ACCENTED = new Map(Array.from('áéíóú', (char, index) => [char, 'aeiou'[index]]));
const LETTERS = new Set(Array.from('abcdefghijklmnñopqrstuvwxyzáéíóúü'));
const STRONG = new Set(Array.from('aeo'));
const UNSTRESSED_WORDS = new Set(`a al de del el la las lo los un una unos unas y e o u ni que en con por
    sin se me te le les nos os mi mis tu tus su sus si como cuando donde mas pero para`.split(/\s+/).filter(Boolean));
const MARKS_TO_TOKEN = new Map([
  [',', ','], [';', ','], [':', ','], ['…', ','], ['–', ','], ['—', ','], ['(', ','], [')', ','],
  ['.', '.'], ['?', '?'], ['!', '!'],
]);
const DROP = new Set(Array.from('¿¡\'"`´‘’“”«»-'));
const PYTHON_WHITESPACE_EXTRA = new Set([0x001c, 0x001d, 0x001e, 0x001f, 0x0085]);

function pythonIsWhitespace(char) {
  const cp = char.codePointAt(0);
  return (cp >= 0x0009 && cp <= 0x000d) || PYTHON_WHITESPACE_EXTRA.has(cp) || cp === 0x0020 || cp === 0x00a0 ||
    cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x2028 || cp === 0x2029 || cp === 0x202f ||
    cp === 0x205f || cp === 0x3000;
}

function pythonWhitespaceCollapse(value) {
  let result = '', pendingSpace = false;
  for (const char of value) {
    if (pythonIsWhitespace(char)) {
      if (result) pendingSpace = true;
    } else {
      if (pendingSpace) result += ' ';
      result += char;
      pendingSpace = false;
    }
  }
  return result;
}

export function normalizeText(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  let value = text.normalize('NFC').toLowerCase();
  value = Array.from(value).filter(char => !DROP.has(char)).join('');
  return pythonWhitespaceCollapse(value);
}

function lettersToPhones(word) {
  const chars = Array.from(word);
  const out = [], accents = [];
  const n = chars.length;
  const next = index => index < n ? chars[index] : '';
  const push = (phone, accented = null) => { out.push(phone); accents.push(accented); };
  for (let i = 0; i < n; i++) {
    const ch = chars[i], c2 = next(i + 1);
    if ('aeiou'.includes(ch)) push(ch, false);
    else if (ACCENTED.has(ch)) push(ACCENTED.get(ch), true);
    else if (ch === 'ü') push('w');
    else if (ch === 'c') {
      if (c2 === 'h') { push('C'); i++; }
      else push('eéií'.includes(c2) ? 's' : 'k'); // Python's '' in this string is true, matching terminal-c behavior.
    } else if (ch === 'q') {
      push('k');
      if (c2 === 'u') i++;
    } else if (ch === 'g') {
      if (c2 === 'u' && ['e', 'é', 'i', 'í'].includes(next(i + 2))) { push('g'); i++; }
      else push('eéií'.includes(c2) ? 'x' : 'g'); // Preserve Python's empty-substring containment at a word edge.
    } else if (ch === 'l' && c2 === 'l') { push('S'); i++; }
    else if (ch === 'r') {
      if (c2 === 'r') { push('R'); i++; }
      else if (i === 0 || 'nls'.includes(chars[i - 1])) push('R');
      else push('r');
    } else if (ch === 'y') push(i === n - 1 ? 'i' : 'S', i === n - 1 ? false : null);
    else if (ch === 'h') { /* silent */ }
    else if (ch === 'x') { push('k'); push('s'); }
    else push(({ j: 'x', v: 'b', z: 's', ñ: 'N', w: 'w' })[ch] ?? ch);
  }
  return { phones: out, accented: accents };
}

function wordToPhones(word) {
  const { phones, accented } = lettersToPhones(word);
  const vowelAt = [];
  for (let i = 0; i < phones.length; i++) if (VOWEL_SET.has(phones[i])) vowelAt.push(i);
  // Match the source loop: vowel indices are captured before glide changes.
  for (const i of vowelAt) {
    if (!'iu'.includes(phones[i]) || accented[i]) continue;
    const prevVowel = i > 0 && VOWEL_SET.has(phones[i - 1]);
    const nextVowel = i + 1 < phones.length && VOWEL_SET.has(phones[i + 1]);
    if ((nextVowel && (STRONG.has(phones[i + 1]) || accented[i + 1] ||
          ('iu'.includes(phones[i + 1]) && phones[i + 1] !== phones[i]))) ||
        (prevVowel && STRONG.has(phones[i - 1]))) {
      phones[i] = phones[i] === 'i' ? 'j' : 'w';
    }
  }
  const nuclei = [];
  for (let i = 0; i < phones.length; i++) if (VOWEL_SET.has(phones[i])) nuclei.push(i);
  const weights = Array(phones.length).fill(WEIGHT_NONE);
  if (!nuclei.length) return { phones, weights };

  let stressed = nuclei.find(index => accented[index] === true);
  if (stressed === undefined && !(nuclei.length === 1 && UNSTRESSED_WORDS.has(word))) {
    const last = Array.from(word).at(-1);
    const plain = 'aeiouns'.includes(last);
    stressed = plain && nuclei.length > 1 ? nuclei.at(-2) : nuclei.at(-1);
  }
  for (const index of nuclei) weights[index] = index === stressed ? STRESSED : UNSTRESSED;
  return { phones, weights };
}

export function phonemize(text) {
  if (typeof text !== 'string' || Array.from(text).every(pythonIsWhitespace)) {
    throw new TypeError('text must not be empty');
  }
  const normalized = normalizeText(text);
  const pieces = [];
  let word = '';
  for (const char of normalized) {
    if (char === ' ') {
      if (word) pieces.push(word);
      word = '';
    } else if (MARKS_TO_TOKEN.has(char)) {
      if (word) pieces.push(word);
      word = '';
      pieces.push({ punctuation: char });
    } else word += char;
  }
  if (word) pieces.push(word);

  const symbols = [BOS], weight = [WEIGHT_NONE], unknown = [];
  for (const piece of pieces) {
    if (typeof piece === 'object') {
      const token = MARKS_TO_TOKEN.get(piece.punctuation);
      if (symbols.at(-1) !== token) { symbols.push(token); weight.push(WEIGHT_NONE); }
      continue;
    }
    const chars = Array.from(piece);
    const odd = chars.filter(char => !LETTERS.has(char)).join('');
    if (odd) unknown.push(odd);
    const letters = chars.filter(char => LETTERS.has(char)).join('');
    const { phones, weights } = letters ? wordToPhones(letters) : { phones: [UNK], weights: [WEIGHT_NONE] };
    if (!phones.length) continue;
    if (PHONE_SET.has(symbols.at(-1)) || symbols.at(-1) === UNK) {
      symbols.push(SP);
      weight.push(WEIGHT_NONE);
    }
    symbols.push(...phones);
    weight.push(...weights);
  }
  symbols.push(EOS);
  weight.push(WEIGHT_NONE);
  if (!symbols.some(symbol => PHONE_SET.has(symbol) || symbol === UNK)) {
    throw new Error('the text has nothing to pronounce');
  }
  return { symbols, ids: symbols.map(symbol => SYMBOL_TO_ID.get(symbol)), weight, unknown };
}

export function frontendIdentity() {
  return { frontend: 'alpa-es', frontend_version: FRONTEND_VERSION, symbols: [...SYMBOLS] };
}

// Python json.dumps(..., sort_keys=True, ensure_ascii=False) defaults to spaces after separators.
function pythonJsonDumps(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pythonJsonDumps).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}: ${pythonJsonDumps(value[key])}`).join(', ')}}`;
  }
  return JSON.stringify(value);
}

export async function frontendFingerprint() {
  const bytes = new TextEncoder().encode(pythonJsonDumps(frontendIdentity()));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
