import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhitespace, phonemizeEnglish, misakiEnglish } from '../web/inflect-atom/frontend.mjs';
test('Atom normalizes only line whitespace and preserves punctuation and lexical input', () => {
  const input = 'Hello,\n\nworld!\tAgain.\r\n';
  assert.equal(normalizeWhitespace(input), 'Hello,  world! Again.  ');
  const received = [];
  phonemizeEnglish(input, (text) => { received.push(text); return text; });
  assert.deepEqual(received, ['Hello', 'world', 'Again']);
});
test('Atom follows pinned US Misaki diphthong, stress, flap and syllabic conversion', () => {
  assert.equal(misakiEnglish('a^ɪ a^ʊ e^ɪ o^ʊ ɔ^ɪ ɚ ɜːɹ t^ʃ d^ʒ ɾ ʔ n\u0329'), 'I W A O Y əɹ ɜɹ ʧ ʤ T t ᵊn');
});
test('Atom rejects whitespace-only input before calling the phonemizer', () => {
  assert.throws(() => phonemizeEnglish('\n\t', () => { throw new Error('unexpected'); }), /nonempty/);
});
