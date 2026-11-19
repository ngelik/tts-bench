// English conversion follows Misaki 0.9.4 (Apache-2.0) and phonemizer-fork
// 3.3.2 (GPL-3.0-or-later). Punctuation handling below is a scoped port of
// phonemizer, Copyright 2015-2021 Mathieu Bernard; GPL-3.0-or-later.
export const normalizeWhitespace = (text) => text.replace(/[\r\n\t]/g, ' ');
const marks = /(?:\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+/gu;
const replacements = [
  ['ʔˌn\u0329', 'ʔn'], ['ʔn\u0329', 'ʔn'], ['a^ɪ', 'I'], ['a^ʊ', 'W'],
  ['d^ʒ', 'ʤ'], ['e^ɪ', 'A'], ['e', 'A'], ['t^ʃ', 'ʧ'], ['ɔ^ɪ', 'Y'],
  ['ə^l', 'ᵊl'], ['ʲo', 'jo'], ['ʲə', 'jə'], ['ʲ', ''], ['ɚ', 'əɹ'],
  ['r', 'ɹ'], ['x', 'k'], ['ç', 'k'], ['ɐ', 'ə'], ['ɬ', 'l'], ['\u0303', ''],
].sort((a, b) => b[0].length - a[0].length);

export function misakiEnglish(phones) {
  let output = phones.trim();
  for (const [from, to] of replacements) output = output.replaceAll(from, to);
  return output.replace(/(\S)\u0329/gu, 'ᵊ$1').replaceAll('\u0329', '')
    .replaceAll('o^ʊ', 'O').replaceAll('ɜːɹ', 'ɜɹ').replaceAll('ɜː', 'ɜɹ')
    .replaceAll('ɪə', 'iə').replaceAll('ː', '').replaceAll('o', 'ɔ')
    .replaceAll('ɾ', 'T').replaceAll('ʔ', 't').replaceAll('^', '');
}

function postprocess(raw) {
  const line = raw.trim().replaceAll('\n', ' ').replaceAll('  ', ' ')
    .replace(/_+/g, '_').replaceAll('_ ', ' ');
  return line.split(' ').map((word) => word.trim().replaceAll('͡', '^') + ' ').join('');
}

export function phonemizeEnglish(text, rawPhonemizer) {
  text = normalizeWhitespace(text);
  if (!text.trim()) throw new Error('Atom frontend requires nonempty text');
  let output = '';
  let position = 0;
  for (const match of text.matchAll(marks)) {
    const before = text.slice(position, match.index);
    if (before) output += postprocess(rawPhonemizer(before));
    if (output.endsWith(' ')) output = output.slice(0, -1);
    output += match[0];
    position = match.index + match[0].length;
  }
  const remainder = text.slice(position);
  if (remainder) output += postprocess(rawPhonemizer(remainder));
  return misakiEnglish(output);
}
