import assert from 'node:assert/strict';
import test from 'node:test';
import { sentences, fit } from '../web/tiny-voca/frontend.mjs';

test('Tiny Voca keeps titles, decimal values and punctuation inside upstream sentence boundaries', () => {
  assert.deepEqual(sentences('Dr. Smith paid 3.50. Then he left!'), ['Dr. Smith paid 3.50.', 'Then he left!']);
});
test('over-budget sentences split in order without discarding an over-budget word', () => {
  const phonemize = text => ({text, ids: Array(text.length).fill(1), stress: Array(text.length).fill(0)});
  assert.deepEqual(fit('two words, next part', phonemize, 10).map(r => r.text), ['two words,', 'next part']);
  assert.throws(() => fit('unbreakable', phonemize, 3), /Single word/);
});
