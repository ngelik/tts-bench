import { TINY_VOCA_JA_TSUKUYOMI_CHAN as profile } from '../adapters/tiny-voca-ja-tsukuyomi-chan-profile.mjs';

const closing = `\"'”’)]»」』）】〉》`;
const spaceOrBom = /[\s\uFEFF]+/gu;

export function japaneseFinished(text) {
  if (typeof text !== 'string') throw new TypeError('Japanese source text must be a string.');
  const body = text.replace(/[\s\uFEFF]+$/gu, '');
  let end = body;
  while (end && closing.includes(end.at(-1))) end = end.slice(0, -1);
  if (!end || '。！？.!?…、，,;:；：'.includes(end.at(-1))) return text;
  return body + '。';
}

export function japaneseSentences(text) {
  const normalized = text.replace(spaceOrBom, ' ').trim();
  const parts = [];
  let start = 0;
  const expression = /[。！？!?]+[」』）】〉》”’"')\]]*/gu;
  for (const match of normalized.matchAll(expression)) {
    const end = match.index + match[0].length;
    parts.push(normalized.slice(start, end).trim());
    start = end;
  }
  parts.push(normalized.slice(start).trim());
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

export function japaneseShorter(text) {
  const parts = text.split(/(?<=[、，,;；：:])/u).map(part => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  if (Array.from(text).length < 2) return [];
  const chars = Array.from(text);
  const half = Math.ceil(chars.length / 2);
  return [chars.slice(0, half).join(''), chars.slice(half).join('')];
}

export async function visitJapanesePieces(text, phonemize, durationGuard, accept, {
  maxTokens = profile.maxTokens - 12,
  maxFrames = profile.maxFrames,
} = {}) {
  const phonesValue = await phonemize(text);
  if (phonesValue === null) return 0;
  if (!phonesValue || !Array.isArray(phonesValue.ids) || !phonesValue.ids.length ||
      phonesValue.ids.length !== phonesValue.accent?.length || phonesValue.ids.length !== phonesValue.phraseBoundary?.length) {
    throw new Error('Japanese frontend returned invalid token/accent/boundary arrays.');
  }
  if (phonesValue.ids.length <= maxTokens) {
    const durations = await durationGuard(phonesValue);
    if (!Array.isArray(durations) || durations.length !== phonesValue.ids.length ||
        durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Japanese duration graph returned invalid durations.');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (!Number.isSafeInteger(frames) || frames < 1) throw new Error('Japanese duration graph returned an empty prediction.');
    if (frames <= maxFrames) {
      await accept({ phones: phonesValue, durations, frames, text });
      return 1;
    }
  }
  const pieces = japaneseShorter(text);
  if (!pieces.length) throw new Error('One Japanese character exceeds the synthesis limit.');
  let accepted = 0;
  for (const piece of pieces) accepted += await visitJapanesePieces(piece, phonemize, durationGuard, accept, { maxTokens, maxFrames });
  return accepted;
}

export async function fitJapanesePiece(text, phonemize, durationGuard, limits) {
  const accepted = [];
  await visitJapanesePieces(text, phonemize, durationGuard, plan => accepted.push(plan), limits);
  return accepted;
}

export async function planJapaneseText(text, phonemize, durationGuard, limits) {
  const utterances = [];
  for (const sentence of japaneseSentences(japaneseFinished(text))) {
    utterances.push(...await fitJapanesePiece(sentence, phonemize, durationGuard, limits));
  }
  if (!utterances.length) throw new Error('Japanese text has no speakable utterances.');
  return utterances;
}
