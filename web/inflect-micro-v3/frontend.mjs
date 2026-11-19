// Text preparation for the pinned Inflect Micro v3 native wrapper.
// The 220-character splitter and conservative numeric frontend are adapted
// from tools/inflect-micro-v3 source; phone mapping is deliberately strict.
import { normalizeMicroNumbers } from './numeric.mjs';

const MAX_TEXT_LENGTH = 20_000;
export const MAX_PHONEMES = 510;
export const INTERNAL_TEXT_LIMIT = 220;
export const INTERNAL_GAP_SAMPLES = 2_880;

const LATIN = /\p{Script=Latin}/u;

function allowedDegreePositions(text) {
  const positions = new Set();
  const pattern = /(?<![\p{L}\p{N}_.])[+\-]?[0-9]{1,12}(?:\.[0-9]{1,6})?[ \t]*(°)[ \t]*[CF](?![\p{L}\p{N}_])/giu;
  for (const match of text.matchAll(pattern)) positions.add(match.index + match[0].indexOf('°'));
  return positions;
}

export function validateMicroText(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    throw new Error('Micro text must be nonempty and at most 20000 UTF-16 code units.');
  }
  const degrees = allowedDegreePositions(text);
  for (let index = 0; index < text.length;) {
    const point = text.codePointAt(index);
    const character = String.fromCodePoint(point);
    const category = categoryOf(character);
    if (category === 'letter' && !LATIN.test(character)) throw new Error('Micro supports Latin-script text only.');
    if ((category === 'control' || category === 'mark') && !/^\s+$/u.test(character)) {
      throw new Error('Micro does not support control or combining characters.');
    }
    if (category === 'number' && !/^[0-9]$/u.test(character)) throw new Error('Micro supports ASCII digits only.');
    if (category === 'symbol' && !'$%+<=>'.includes(character) && !degrees.has(index)) {
      throw new Error(`Micro does not support symbol ${JSON.stringify(character)}.`);
    }
    index += character.length;
  }
  return text;
}

function categoryOf(character) {
  if (/\p{L}/u.test(character)) return 'letter';
  if (/\p{N}/u.test(character)) return 'number';
  if (/\p{M}/u.test(character)) return 'mark';
  if (/\p{C}/u.test(character)) return 'control';
  if (/\p{S}/u.test(character)) return 'symbol';
  return 'other';
}

export function splitMicroText(text, limit = INTERNAL_TEXT_LIMIT) {
  validateMicroText(text);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > INTERNAL_TEXT_LIMIT) {
    throw new Error(`Micro text limit must be an integer from 1 to ${INTERNAL_TEXT_LIMIT}.`);
  }
  const chunks = [];
  let start = 0;
  while (text.length - start > limit) {
    const end = start + limit;
    const boundary = /[\s.,!?;:]/gu;
    let last = -1;
    for (const match of text.slice(start, end).matchAll(boundary)) {
      const candidate = start + match.index + match[0].length;
      if (text.slice(start, candidate).trim()) last = candidate;
    }
    if (last < 0) throw new Error('Micro found no safe split point within the 220-character limit.');
    chunks.push(text.slice(start, last));
    start = last;
  }
  const tail = text.slice(start);
  if (!tail.trim()) {
    if (chunks.length && chunks.at(-1).length + tail.length <= limit) chunks[chunks.length - 1] += tail;
    else throw new Error('Micro trailing whitespace exceeds the chunk limit.');
  } else chunks.push(tail);
  if (chunks.join('') !== text || chunks.some(chunk => !chunk.trim() || chunk.length > limit)) {
    throw new Error('Micro text segmentation did not preserve the input exactly.');
  }
  return chunks;
}

export function microTokenIds(phonemes, vocab, maxPhonemes = MAX_PHONEMES) {
  if (typeof phonemes !== 'string' || !phonemes.length || phonemes.length > maxPhonemes) {
    throw new Error(`Micro phoneme text must contain 1..${maxPhonemes} characters; no truncation is allowed.`);
  }
  if (!vocab || typeof vocab !== 'object' || Array.isArray(vocab)) throw new Error('Micro vocabulary is unavailable.');
  const ids = [0];
  for (const symbol of phonemes) {
    if (!Object.hasOwn(vocab, symbol) || !Number.isInteger(vocab[symbol]) || vocab[symbol] <= 0 || vocab[symbol] >= 178) {
      throw new Error(`Micro frontend emitted unknown phoneme ${JSON.stringify(symbol)}.`);
    }
    ids.push(vocab[symbol]);
  }
  ids.push(0);
  if (ids.length > 512) throw new Error('Micro padded token sequence exceeds 512 positions.');
  return ids;
}

export async function prepareMicroText(text, { phonemize, vocab, normalize = normalizeMicroNumbers } = {}) {
  validateMicroText(text);
  if (typeof phonemize !== 'function' || typeof normalize !== 'function') {
    throw new Error('Micro requires an explicit local phonemizer and normalizer.');
  }
  const normalized = normalize(text);
  const spokenText = typeof normalized === 'string' ? normalized : normalized?.spokenText;
  const numericEdits = typeof normalized === 'string' ? [] : normalized?.edits;
  if (typeof spokenText !== 'string' || !Array.isArray(numericEdits)) throw new Error('Micro normalizer returned an invalid result.');
  validateMicroText(spokenText);
  const pieces = splitMicroText(spokenText);
  const utterances = [];
  for (let index = 0; index < pieces.length; index++) {
    const piece = pieces[index];
    const phones = await phonemize(piece);
    utterances.push({ text: piece, phones, ids: microTokenIds(phones, vocab), index });
  }
  if (pieces.join('') !== spokenText) throw new Error('Micro preprocessing changed or dropped source text.');
  return { originalText: text, spokenText, numericEdits, utterances };
}
