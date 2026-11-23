// Benchmark-owned port of the model card's deterministic swahili-rule G2P.
// The publisher's custom frontend is not in the pinned release. This port is
// validated against the four released text/token/stress vectors, not asserted
// to be fully publisher-equivalent. Unsupported graphemes fail closed.
export const SWAHILI_SYMBOLS = Object.freeze([
  '<pad>', '<bos>', '<eos>', '<sp>', '<unk>', ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…',
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'ɹ', 'j', 'w', 'tʃ', 'dʒ', 'ɾ', 'ʔ', 'ə', 'ɐ', 'ɚ', 'ᵻ', 'ɪ', 'i', 'iː', 'ɛ', 'æ', 'ʌ', 'ɑː', 'ɔ', 'ɔː', 'ʊ', 'uː', 'ɜː', 'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː', 'ɑːɹ', 'ɔːɹ', 'oːɹ', 'ɪɹ', 'ɛɹ', 'ʊɹ', 'aɪɚ', 'aɪə', 'əl', 'n̩',
]);

const ids = new Map(SWAHILI_SYMBOLS.map((symbol, id) => [symbol, id]));
const vowels = new Set(['ɐ', 'ɛ', 'i', 'ɔ', 'uː']);
const singleLetters = Object.freeze({
  a: 'ɐ', e: 'ɛ', i: 'i', o: 'ɔ', u: 'uː',
  b: 'b', d: 'd', f: 'f', g: 'ɡ', h: 'h', j: 'dʒ', k: 'k',
  l: 'l', m: 'm', n: 'n', p: 'p', r: 'ɾ', s: 's', t: 't',
  v: 'v', w: 'w', y: 'j', z: 'z',
});
const digraphs = Object.freeze([
  ['ng\'', ['ŋ']], ['ch', ['tʃ']], ['sh', ['ʃ']], ['ny', ['n', 'j']],
  ['th', ['θ']], ['dh', ['ð']], ['ng', ['ŋ', 'ɡ']],
]);
const punctuation = new Map([
  [',', 5], ['.', 6], ['?', 7], ['!', 8], [';', 9], [':', 10],
  ['"', 11], ["'", 12], ['(', 13], [')', 14], ['—', 15], ['…', 16],
]);

function lex(text) {
  if (typeof text !== 'string') throw new TypeError('Kiswahili G2P input must be a string');
  const input = text.toLocaleLowerCase('sw').replace(/[“”„]/gu, '"').replace(/[‘’]/gu, "'");
  const pieces = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/u.test(char) || char === '-') {
      while (index < input.length && (/\s/u.test(input[index]) || input[index] === '-')) index++;
      pieces.push({ kind: 'space' });
      continue;
    }
    if (/[a-z]/u.test(char)) {
      // The fixture preserves the official place name “Bellwether City”.
      // Its spelling is not Swahili-phonemic; this narrow benchmark-owned
      // override approximates its English place-name pronunciation /siti/.
      if (input.startsWith('city', index) && (index === 0 || !/[a-z]/u.test(input[index - 1])) &&
          (index + 4 === input.length || !/[a-z]/u.test(input[index + 4]))) {
        pieces.push({ kind: 'phones', value: ['s', 'i', 't', 'i'] });
        index += 4;
        continue;
      }
      const match = digraphs.find(([spelling]) => input.startsWith(spelling, index));
      if (match) {
        pieces.push({ kind: 'phones', value: match[1] });
        index += match[0].length;
        continue;
      }
      const phone = singleLetters[char];
      if (!phone) throw new Error(`Unsupported Kiswahili grapheme ${JSON.stringify(char)}`);
      pieces.push({ kind: 'phone', value: phone });
      index++;
      continue;
    }
    const punctuationId = punctuation.get(char);
    if (punctuationId !== undefined) {
      pieces.push({ kind: 'punctuation', value: char });
      index++;
      continue;
    }
    throw new Error(`Unsupported Kiswahili grapheme ${JSON.stringify(char)}`);
  }
  return pieces;
}

export function phonemize(text, { maxTokens = 512 } = {}) {
  const pieces = lex(text);
  const tokens = [ids.get('<bos>')];
  const stress = [0];
  for (let index = 0; index < pieces.length;) {
    const piece = pieces[index];
    if (piece.kind === 'space') {
      while (index < pieces.length && pieces[index].kind === 'space') index++;
      const previous = tokens.at(-1);
      if (index < pieces.length && tokens.length > 1 && previous !== ids.get('<sp>') && previous !== ids.get(',')) {
        tokens.push(ids.get('<sp>'));
        stress.push(0);
      }
      continue;
    }
    if (piece.kind === 'punctuation') {
      tokens.push(ids.get(piece.value));
      stress.push(0);
      index++;
      continue;
    }
    const word = [];
    while (index < pieces.length && (pieces[index].kind === 'phone' || pieces[index].kind === 'phones')) {
      const current = pieces[index++];
      if (current.kind === 'phone') word.push(current.value);
      else word.push(...current.value);
    }
    if (word.length === 0) throw new Error('Kiswahili G2P encountered an empty word');
    const nuclei = [];
    for (let offset = 0; offset < word.length; offset++) if (vowels.has(word[offset])) nuclei.push(offset);
    const stressedIndex = nuclei.length ? nuclei[Math.max(0, nuclei.length - 2)] : -1;
    for (let offset = 0; offset < word.length; offset++) {
      const token = ids.get(word[offset]);
      if (token === undefined || token === ids.get('<unk>')) throw new Error(`Phone missing from pinned symbol inventory: ${word[offset]}`);
      tokens.push(token);
      stress.push(offset === stressedIndex ? 1 : 0);
    }
  }
  while (tokens.at(-1) === ids.get('<sp>')) { tokens.pop(); stress.pop(); }
  tokens.push(ids.get('<eos>'));
  stress.push(0);
  if (tokens.length > maxTokens) throw new Error(`Kiswahili span requires ${tokens.length} tokens; model limit is ${maxTokens}`);
  return { tokens, stress };
}

// Match the reference runner's sentence-at-a-time calls, preserving each
// terminal mark and closing quote. The adapter joins raw PCM with no gaps.
export function splitSentenceSpans(text) {
  if (typeof text !== 'string') throw new TypeError('Kiswahili sentence input must be a string');
  const pieces = [];
  const closingQuotes = new Set(['"', "'", ')', '”', '’']);
  let start = 0, index = 0;
  while (index < text.length) {
    if (!'.!?…'.includes(text[index])) { index++; continue; }
    let end = index + 1;
    while (end < text.length && closingQuotes.has(text[end])) end++;
    if (end < text.length && /\s/u.test(text[end])) {
      if (text.slice(start, end).trim()) pieces.push({ text: text.slice(start, end), start, end });
      let next = end;
      while (next < text.length && /\s/u.test(text[next])) next++;
      start = next;
      index = next;
    } else index = end;
  }
  let end = text.length;
  while (end > start && /\s/u.test(text[end - 1])) end--;
  if (text.slice(start, end).trim()) pieces.push({ text: text.slice(start, end), start, end });
  return pieces;
}

export function phonemizeText(text, options) {
  return splitSentenceSpans(text).map(span => ({ ...span, ...phonemize(span.text, options) }));
}

export function auditSpan(text, options) {
  const result = phonemize(text, options);
  return { tokens: result.tokens.length, tokenIds: result.tokens, stress: result.stress,
    unknownTokens: result.tokens.filter(id => id === ids.get('<unk>')).length };
}
