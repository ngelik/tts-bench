import { lug } from '../tiny-voca-lg/lug.js';

export const LUGANDA_SYMBOLS = Object.freeze([...lug.SYMBOLS]);
const id = new Map(LUGANDA_SYMBOLS.map((symbol, index) => [symbol, index]));
const maxTokensDefault = 512;
const allowedPunctuation = new Set([',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…', '‘', '’', '“', '”', '„', '‟', '«', '»', '–', '―', '[', ']', '{', '}']);
const ABBREVIATIONS = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;

function assertInput(text) {
  if (typeof text !== 'string') throw new TypeError('Luganda input must be a string');
  if (/\p{N}/u.test(text)) throw new Error('Luganda frontend drops digits; write every number in words');
  const cleaned = lug.clean(text);
  for (const char of cleaned) {
    if (/\s/u.test(char) || /[a-zŋ]/u.test(char) || allowedPunctuation.has(char)) continue;
    throw new Error(`Unsupported Luganda character ${JSON.stringify(char)}`);
  }
  if (!text.trim()) throw new Error('Luganda input must not be empty');
}

export function phonemize(text, { maxTokens = maxTokensDefault } = {}) {
  assertInput(text);
  const result = lug.phonemize(text);
  if (!result) return null;
  const tokens = result.ids;
  const stress = result.stress;
  if (tokens.length !== stress.length || tokens.some(token => !Number.isInteger(token) || token < 0 || token >= LUGANDA_SYMBOLS.length)) {
    throw new Error('Luganda frontend returned an invalid token/stress sequence');
  }
  if (tokens.length > maxTokens) throw new Error(`Luganda utterance requires ${tokens.length} tokens; model limit is ${maxTokens}`);
  return { tokens, stress };
}

// Mirrors web/public/worker.js at the pinned source revision.
export function finished(text) {
  const body = text.replace(/\s+$/, '');
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last) ? /[.!?…,;:]["'”’)\]»]*$/.test(last) : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : body + '.';
}

// Mirrors tiny_voca.infer.sentences and web/public/worker.js, including
// abbreviation suppression and the uppercase/number lookahead after endings.
export function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/)) {
    current = current ? current + ' ' + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

// Mirrors the stock worker's comma-first, then word-halving fit at max_tokens - 12.
function fit(sentence, limit, depth = 0) {
  if (depth > 32) throw new Error('Tiny Voca Luganda sentence fitting exceeded safe recursion depth');
  const result = phonemize(sentence, { maxTokens: Number.MAX_SAFE_INTEGER });
  if (!result) return [];
  if (result.tokens.length <= limit) return [{ text: sentence, ...result }];
  const pieces = sentence.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces.flatMap(piece => fit(piece, limit, depth + 1));
  const words = sentence.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' '), limit, depth + 1), ...fit(words.slice(half).join(' '), limit, depth + 1)];
}

export function phonemizeText(text, { maxTokens = maxTokensDefault } = {}) {
  if (!Number.isInteger(maxTokens) || maxTokens <= 12) throw new Error('Luganda fitting requires maxTokens greater than the 12-token stock margin');
  const completed = finished(text);
  return sentences(completed).flatMap(sentence => fit(sentence, maxTokens - 12));
}

export function auditSpan(text, options) {
  const output = phonemize(text, options);
  return output ? { tokens: output.tokens.length, tokenIds: output.tokens, stress: output.stress,
    unknownTokens: output.tokens.filter(token => token === id.get('<unk>')).length } : { tokens: 0, tokenIds: [], stress: [], unknownTokens: 0 };
}

export function limitSpanPeak(samples, peak = 0.99) {
  if (!(samples instanceof Float32Array) || !Number.isFinite(peak) || peak <= 0 || peak > 1) {
    throw new TypeError('Luganda span limiter requires Float32 PCM and a peak in (0, 1]');
  }
  let rawPeak = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) throw new Error('Luganda model returned non-finite PCM');
    rawPeak = Math.max(rawPeak, Math.abs(sample));
  }
  if (!samples.length || rawPeak === 0) throw new Error('Luganda model returned empty or silent PCM');
  if (rawPeak > peak) {
    const gain = peak / rawPeak;
    for (let index = 0; index < samples.length; index++) samples[index] *= gain;
  }
  return { rawPeak, cappedPeak: Math.min(rawPeak, peak) };
}
