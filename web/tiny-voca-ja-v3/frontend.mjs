let japaneseBoundaryPromise;
export function loadJapaneseBoundaries() {
  japaneseBoundaryPromise ??= import('../tiny-voca-ja-tsukuyomi-chan/frontend.mjs');
  return japaneseBoundaryPromise;
}

const space = /[\s\uFEFF]+/gu;
const sentenceEnd = /(?:[.!?…]|[.!?…]["')\]])$/u;
const notSentenceEnd = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
const clauseEnd = /(?<=[,;:—])\s+/u;
const closingMarks = `\"'”’)]»`;

export function englishFinished(text) {
  const body = text.replace(/[\s\uFEFF]+$/gu, '');
  if (!body) return text;
  const last = body.split(space).at(-1);
  const word = /[\p{L}\p{N}]/u.test(last);
  let end = last;
  while (end && closingMarks.includes(end.at(-1))) end = end.slice(0, -1);
  const marked = word ? /[.!?…;,:]$/u.test(end) : /[.!?…]/u.test(last) || [',', ';', ':'].includes(last);
  return marked ? text : body + '.';
}

export function englishSentences(text) {
  const parts = [];
  let current = '';
  const normalized = text.replace(space, ' ').trim();
  let start = 0;
  for (let index = 0; index < normalized.length; index++) {
    if (normalized[index] !== ' ') continue;
    const piece = normalized.slice(start, index).trim();
    const next = normalized.slice(index + 1);
    if (!sentenceEnd.test(piece) || !/^["'(\[]?[A-Z0-9]/u.test(next) || notSentenceEnd.test(piece)) continue;
    current = current ? `${current} ${piece}` : piece;
    parts.push(current);
    current = '';
    start = index + 1;
  }
  const tail = normalized.slice(start).trim();
  if (tail) {
    current = current ? `${current} ${tail}` : tail;
    if (current) {
      parts.push(current);
      current = '';
    }
  }
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

export function englishShorter(text) {
  const pieces = text.split(clauseEnd);
  if (pieces.length > 1) return pieces;
  const words = text.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

export async function visitJapanesePieces(text, phonemize, accept, { maxTokens = 500 } = {}) {
  const phones = await phonemize(text);
  if (phones === null) return 0;
  if (!phones || !Array.isArray(phones.ids) || !Array.isArray(phones.stress) ||
      phones.ids.length !== phones.stress.length || !phones.ids.length) {
    throw new Error('Tiny Voca v3 frontend returned invalid token/stress arrays.');
  }
  if (phones.ids.length <= 2) return 0;
  if (phones.ids.length <= maxTokens) {
    await accept({ phones, text });
    return 1;
  }
  const { japaneseShorter } = await loadJapaneseBoundaries();
  const pieces = japaneseShorter(text);
  if (!pieces.length) throw new Error('One Japanese character exceeds the Tiny Voca v3 synthesis limit.');
  let accepted = 0;
  for (const piece of pieces) accepted += await visitJapanesePieces(piece, phonemize, accept, { maxTokens });
  return accepted;
}

export async function fitEnglishPiece(text, phonemize, accept, { maxTokens = 500 } = {}) {
  const phones = await phonemize(text);
  if (phones === null) return 0;
  if (!phones || !Array.isArray(phones.ids) || !Array.isArray(phones.stress) ||
      phones.ids.length !== phones.stress.length) throw new Error('Tiny Voca v3 frontend returned invalid English token/stress arrays.');
  if (phones.ids.length <= 2) return 0;
  if (phones.ids.length <= maxTokens) {
    await accept({ phones, text });
    return 1;
  }
  const pieces = englishShorter(text);
  if (!pieces.length) throw new Error('One English word exceeds the Tiny Voca v3 synthesis limit.');
  let accepted = 0;
  for (const piece of pieces) accepted += await fitEnglishPiece(piece, phonemize, accept, { maxTokens });
  return accepted;
}

export async function fitJapanesePiece(text, phonemize, limits) {
  const accepted = [];
  await visitJapanesePieces(text, phonemize, plan => accepted.push(plan), limits);
  return accepted;
}

export async function planJapaneseText(text, phonemize, limits) {
  const { japaneseFinished, japaneseSentences } = await loadJapaneseBoundaries();
  const plans = [];
  for (const sentence of japaneseSentences(japaneseFinished(text))) {
    plans.push(...await fitJapanesePiece(sentence, phonemize, limits));
  }
  if (!plans.length) throw new Error('Tiny Voca v3 text has no speakable Japanese utterances.');
  return plans;
}

export async function planEnglishText(text, phonemize, limits) {
  const plans = [];
  for (const sentence of englishSentences(englishFinished(text))) {
    await fitEnglishPiece(sentence, phonemize, plan => plans.push(plan), limits);
  }
  if (!plans.length) throw new Error('Tiny Voca v3 text has no speakable English utterances.');
  return plans;
}
