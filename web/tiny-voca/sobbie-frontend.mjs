const ending = /[.!?…,;:]["'”’)\]»]*$/u;
const finalPunctuation = /[.!?…]/u;

// Match Sobbie's browser demo, which follows Tiny Voca's sentence boundaries.
export function finished(text) {
  const body = text.replace(/\s+$/u, '');
  if (!body) return text;
  const last = body.split(/\s+/u).at(-1);
  const marked = /[\p{L}\p{N}]/u.test(last) ? ending.test(last) : finalPunctuation.test(last) || /^[,;:]$/u.test(last);
  return marked ? text : body + '.';
}

// Kept byte-for-byte equivalent in behavior to web/tiny-voca/frontend.mjs.
const abbreviations = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
export function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/gu, ' ').trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/u)) {
    current = current ? current + ' ' + piece : piece;
    if (!abbreviations.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

// Preserve the publisher's stock max_tokens - 12 fit rule and split order.
export function fit(sentence, phonemize, maxTokens) {
  const result = phonemize(sentence);
  if (result == null) return [];
  if (!Array.isArray(result.ids) || !Array.isArray(result.stress) || result.ids.length !== result.stress.length) {
    throw new Error('Dizione returned invalid token/stress arrays');
  }
  if (result.ids.length <= maxTokens - 12) return [result];
  const clauses = sentence.split(/(?<=[,;:—])\s+/u);
  if (clauses.length > 1) return clauses.flatMap(clause => fit(clause, phonemize, maxTokens));
  const words = sentence.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' '), phonemize, maxTokens),
    ...fit(words.slice(half).join(' '), phonemize, maxTokens)];
}

export function planText(text, phonemize, maxTokens) {
  const source = finished(text);
  return sentences(source).flatMap(sentence => fit(sentence, phonemize, maxTokens));
}
