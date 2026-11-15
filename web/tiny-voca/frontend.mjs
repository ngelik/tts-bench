// Adapted from n4ze3m/tiny-voca's Apache-2.0 browser demo. See NOTICE.md.
const abbreviations = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;

export function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/)) {
    current = current ? current + ' ' + piece : piece;
    if (!abbreviations.test(current)) {
      parts.push(current);
      current = '';
    }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

export function fit(text, phonemize, limit) {
  const result = phonemize(text);
  if (!result.ids.length || result.ids.length !== result.stress.length) throw new Error('Dizione returned invalid token/stress arrays');
  if (result.ids.length <= limit) return [result];
  const clauses = text.split(/(?<=[,;:—])\s+/);
  if (clauses.length > 1) return clauses.flatMap(clause => fit(clause, phonemize, limit));
  const words = text.split(' ');
  if (words.length < 2) throw new Error('Single word exceeds Tiny Voca token limit');
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' '), phonemize, limit), ...fit(words.slice(half).join(' '), phonemize, limit)];
}
