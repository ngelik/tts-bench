// Ukrainian stress handling adapted from the pinned Serhiy stress.py (GPL-3.0).
// See NOTICE.md. The browser eSpeak bridge follows the pinned Piper clause API.
const TEXT_VOWELS = new Set(Array.from('аеєиіїоуюяАЕЄИІЇОУЮЯ'));
const IPA_VOWELS = new Set(Array.from('aɑɐæeɛəiɪɨoɔuʊyʏœøɤʌɒ'));
const PUNCT = new Set(Array.from('.,;:!?—–-«»"()…'));
const PRIMARY = 'ˈ', SECONDARY = 'ˌ', STRESS = '\u0301';
const WORD = /[^\P{L}\d_](?:[\p{L}\p{N}_\u0301'ʼ’\-]*[^\P{L}\d_\u0301]|)\u0301?/gu;

export function stripUaStress(text) {
  return text.normalize('NFD').replaceAll(STRESS, '').normalize('NFC');
}

export function espeakUaText(text) {
  return text.replace(/(?<=[\p{L}\p{N}_])['’`](?=[\p{L}\p{N}_])/gu, 'ʼ')
    .replace(/^[\s,.;:!?…\-]+/u, '');
}

function vowelPositions(symbols) {
  return symbols.flatMap((symbol, index) => IPA_VOWELS.has(symbol) ? [index] : []);
}

// Preserve upstream's fallback: unaligned explicitly marked words keep dictionary
// stress, with counters. Never silently claim stress application in those cases.
export function applyUaStress(text, sentences) {
  const stats = { words_marked_applied: 0, words_marked_unaligned: 0, words_marked_vowel_mismatch: 0 };
  const words = Array.from(text.matchAll(WORD), match => match[0]);
  const split = sentences.map(sentence => {
    const out = [[]];
    for (const symbol of sentence) symbol === ' ' ? out.push([]) : out.at(-1).push(symbol);
    return out;
  });
  const ipaWords = [];
  split.forEach((sentence, s) => sentence.forEach((word, w) => {
    if (word.some(symbol => IPA_VOWELS.has(symbol) || /^\p{L}+$/u.test(symbol))) ipaWords.push([s, w]);
  }));
  if (ipaWords.length !== words.length) {
    stats.words_marked_unaligned = words.filter(word => word.normalize('NFD').includes(STRESS)).length;
    return { sentences, stats };
  }
  words.forEach((word, index) => {
    let count = 0;
    const marked = new Set();
    for (const char of word.normalize('NFC')) {
      if (char === STRESS && count) marked.add(count - 1);
      else if (TEXT_VOWELS.has(char)) count++;
    }
    if (!marked.size) return;
    const [s, w] = ipaWords[index], symbols = split[s][w];
    const letters = symbols.flatMap((symbol, i) => PUNCT.has(symbol) ? [] : [i]);
    const core = letters.map(i => symbols[i]);
    const plain = core.filter(symbol => symbol !== PRIMARY && symbol !== SECONDARY);
    const starts = vowelPositions(plain);
    if (starts.length !== count) { stats.words_marked_vowel_mismatch++; return; }
    for (const vowel of [...marked].sort((a, b) => b - a)) plain.splice(starts[vowel], 0, PRIMARY);
    split[s][w] = [...symbols.slice(0, letters[0]), ...plain, ...symbols.slice(letters.at(-1) + 1)];
    stats.words_marked_applied++;
  });
  return { sentences: split.map(sentence => sentence.flatMap((word, i) => i ? [' ', ...word] : word)), stats };
}

export function uaPhonemesToIds(sentences, phonemeIdMap) {
  const get = symbol => {
    const ids = Object.hasOwn(phonemeIdMap, symbol) ? phonemeIdMap[symbol] : null;
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isInteger(id) || id < 0 || id > 255)) {
      throw new Error(`Serhiy unknown or invalid phoneme ${JSON.stringify(symbol)}; no symbols may be dropped`);
    }
    return ids;
  };
  const nonempty = sentences.filter(sentence => sentence.length);
  if (!nonempty.length || !nonempty.some(sentence => sentence.some(symbol => /\p{L}/u.test(symbol)))) {
    throw new Error('Serhiy frontend returned no speech phonemes');
  }
  // This is the published sample/README policy (including 01-greeting): join
  // phoneme sentences with one space, then one Piper BOS/PAD ... EOS sequence.
  const symbols = nonempty.flatMap((sentence, i) => i ? [' ', ...sentence] : sentence);
  const ids = [...get('^'), ...get('_')];
  for (const symbol of symbols) ids.push(...get(symbol), ...get('_'));
  ids.push(...get('$'));
  return ids;
}

function splitBoundary(text) {
  const candidates = Array.from(text.matchAll(/\s+/gu), match => match.index + match[0].length)
    .filter(at => /\S/u.test(text.slice(0, at)) && /\S/u.test(text.slice(at)));
  const sentences = candidates.filter(at => /[.!?…]["»”')\]]?\s+$/u.test(text.slice(0, at)));
  const pool = sentences.length ? sentences : candidates;
  return pool.sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0];
}

export async function prepareUaSerhiyText(sourceText, { phonemize, phonemeIdMap, maxIds = 255 }) {
  if (typeof sourceText !== 'string' || !sourceText.trim() || sourceText.includes('\0')) throw new Error('Serhiy requires nonempty NUL-free source text');
  if (typeof phonemize !== 'function' || !phonemeIdMap || maxIds !== 255) throw new Error('Serhiy requires its pinned phonemizer, ID map and 255-ID limit');
  const sentences = [], stressStats = { words_marked_applied: 0, words_marked_unaligned: 0, words_marked_vowel_mismatch: 0 };
  async function fit(text, start) {
    const normalized = espeakUaText(text);
    const raw = await phonemize(stripUaStress(normalized), 'uk');
    if (!Array.isArray(raw) || raw.some(sentence => !Array.isArray(sentence) || sentence.some(symbol => typeof symbol !== 'string' || Array.from(symbol).length !== 1))) {
      throw new Error('Serhiy phonemizer must return Unicode-symbol sentence arrays');
    }
    const stressed = applyUaStress(normalized, raw), ids = uaPhonemesToIds(stressed.sentences, phonemeIdMap);
    if (ids.length > maxIds) {
      const at = splitBoundary(text);
      if (!at) throw new Error(`Serhiy unsplittable word exceeds ${maxIds} IDs (${ids.length}); no truncation`);
      await fit(text.slice(0, at), start);
      await fit(text.slice(at), start + at);
      return;
    }
    for (const key of Object.keys(stressStats)) stressStats[key] += stressed.stats[key];
    sentences.push({ text, start, end: start + text.length, ids });
  }
  await fit(sourceText, 0);
  if (sentences.map(sentence => sentence.text).join('') !== sourceText) throw new Error('Serhiy frontend source coverage mismatch');
  return { sourceText, sentences, tokenIds: sentences.flatMap(sentence => sentence.ids), stressStats };
}

export async function createUaSerhiyPhonemizer({ createEspeak, wasmBinary, data }) {
  // The pinned full Piper eSpeak build includes Ukrainian dictionaries. Do not
  // substitute an English-only npm phonemizer bundle.
  const originalHandler = globalThis.onmessage;
  let module;
  try { module = await createEspeak({ wasmBinary, getPreloadedPackage: () => data }); }
  finally { globalThis.onmessage = originalHandler; }
  if (module._espeak_Initialize(2, 0, 0, 0) <= 0) throw new Error('Serhiy eSpeak initialization failed');
  const allocString = text => {
    const size = module.lengthBytesUTF8(text) + 1, ptr = module._malloc(size);
    if (!ptr) throw new Error('Serhiy eSpeak allocation failed');
    module.stringToUTF8(text, ptr, size);
    return ptr;
  };
  let disposed = false;
  const phonemize = (text, voice = 'uk') => {
    if (disposed || voice !== 'uk' || typeof text !== 'string' || text.includes('\0')) throw new Error('Invalid Serhiy eSpeak request');
    const pointers = [];
    const own = ptr => { if (!ptr) throw new Error('Serhiy eSpeak allocation failed'); pointers.push(ptr); return ptr; };
    try {
      const voicePtr = own(allocString(voice));
      if (module._espeak_SetVoiceByName(voicePtr) !== 0) throw new Error('Pinned eSpeak runtime does not support Ukrainian');
      const textPtr = own(allocString(text)), textPtrPtr = own(module._malloc(4)), termPtr = own(module._malloc(4));
      module.setValue(textPtrPtr, textPtr, '*');
      const sentences = [];
      let current = '', previous = textPtr;
      while (true) {
        const ptr = module._espeak_TextToPhonemesWithTerminator(textPtrPtr, 0, 2, termPtr);
        if (ptr) current += module.UTF8ToString(ptr);
        const term = module.getValue(termPtr, 'i32'), punct = term & 0x000fffff;
        const punctuation = { [40 | 0x80000]: '.', [40 | 0x2000 | 0x80000]: '?', [45 | 0x3000 | 0x80000]: '!', [20 | 0x1000 | 0x40000]: ', ', [30 | 0x40000]: ': ', [30 | 0x1000 | 0x40000]: '; ' };
        current += punctuation[punct] ?? '';
        if (term & 0x80000) { if (current) sentences.push(Array.from(current.normalize('NFD'))); current = ''; }
        const next = module.getValue(textPtrPtr, '*');
        if (!next) break;
        if (next <= previous) throw new Error('Serhiy eSpeak did not advance through source text');
        previous = next;
      }
      if (current) sentences.push(Array.from(current.normalize('NFD')));
      return sentences;
    } finally { for (const ptr of pointers.reverse()) module._free(ptr); }
  };
  phonemize.dispose = () => { if (!disposed) module._espeak_Terminate?.(); disposed = true; module = null; };
  return phonemize;
}
