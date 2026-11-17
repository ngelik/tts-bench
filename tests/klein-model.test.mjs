import test from 'node:test';
import assert from 'node:assert/strict';
import { fitPhoneChunks, gaussian, splitText, tokenizeStrict } from '../web/klein/model.mjs';

test('Klein sentence splitting follows the upstream 250-character boundary', () => {
  assert.deepEqual(splitText('First sentence. Second sentence! Third.', 25), [
    'First sentence.',
    'Second sentence! Third.',
  ]);
  assert.deepEqual(splitText('  Alpha   beta.  '), ['Alpha beta.']);
});

test('Klein strict tokenization preserves vocabulary symbols and rejects unknown IPA', () => {
  const vocab = Object.assign(Object.create(null), { a: 7, b: 8 });
  assert.deepEqual(tokenizeStrict('ab ba', vocab), [7, 8, 8, 7]);
  assert.throws(() => tokenizeStrict('a☃', vocab), /outside model\.json vocab/);
  assert.equal(tokenizeStrict('a'.repeat(511), vocab), null);
});

test('Klein over-limit phonemes split at a source word boundary without dropping either side', async () => {
  const vocab = Object.assign(Object.create(null), { a: 1, b: 2 });
  const text = 'a'.repeat(300) + ' ' + 'b'.repeat(300);
  const parts = await fitPhoneChunks(text, async value => value, vocab);
  assert.deepEqual(parts.map(part => part.text), ['a'.repeat(300), 'b'.repeat(300)]);
  assert.deepEqual(parts.flatMap(part => part.ids).length, 600);
});

test('Klein noise is deterministic for a fixed seed and finite', () => {
  const first = gaussian(17, 42);
  const second = gaussian(17, 42);
  assert.deepEqual(first, second);
  assert.equal(first.length, 17);
  assert.ok(first.every(Number.isFinite));
});
