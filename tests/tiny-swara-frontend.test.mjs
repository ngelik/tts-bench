import test from 'node:test';
import assert from 'node:assert/strict';
import inventory from '../web/tiny-swara/inventory.json' with { type: 'json' };
import lexicon from '../web/tiny-swara/lexicon.json' with { type: 'json' };
import { createFrontend, frontendFingerprint, normalizeText, splitSentences } from '../web/tiny-swara/frontend.mjs';

test('Tiny Swara frontend normalizes punctuation and sentence boundaries', () => {
  assert.equal(normalizeText('  “Cafe\u0301...”  '), '"Café…"');
  assert.deepEqual(splitSentences('আমি। তারপর!'), ['আমি।', 'তারপর!']);
  assert.deepEqual(splitSentences('একটি বাক্য'), ['একটি বাক্য.']);
});

test('Tiny Swara routes known Latin words to the Bengali lexicon voice', () => {
  const calls = [];
  const frontend = createFrontend({
    inventory,
    lexicon,
    rawEspeak(piece, voice) { calls.push([piece, voice]); return 'ˈa'; },
  });
  const result = frontend.phonemize('order');
  assert.deepEqual(calls, [[`${lexicon.order}\n`, 'bn']]);
  assert.deepEqual(result.symbols, ['<bos>', 'a', '<eos>']);
  assert.deepEqual(result.stress, [0, 1, 0]);
  assert.deepEqual(result.unknown, []);
});

test('Tiny Swara projects unknown English phones through its Bengali inventory', () => {
  const calls = [];
  const frontend = createFrontend({
    inventory,
    lexicon,
    rawEspeak(piece, voice) { calls.push([piece, voice]); return 'h_ˈɛ_l_oʊ'; },
  });
  const result = frontend.phonemize('mystery');
  assert.deepEqual(calls, [['mystery\n', 'en-us']]);
  assert.deepEqual(result.symbols, ['<bos>', 'h', 'e', 'l', 'o', 'u', '<eos>']);
  assert.deepEqual(result.stress, [0, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(result.unknown, []);
});

test('Tiny Swara reports unmapped phones rather than dropping them', () => {
  const frontend = createFrontend({ inventory, lexicon, rawEspeak: () => '🚀' });
  const result = frontend.phonemize('mystery');
  assert.deepEqual(result.symbols, ['<bos>', '<unk>', '<eos>']);
  assert.deepEqual(result.ids, [1, 4, 2]);
  assert.deepEqual(result.unknown, ['🚀']);
});

test('Tiny Swara released inventory fingerprint is recorded accurately', async () => {
  assert.equal(await frontendFingerprint(inventory), '9b2e2c1495ada4f44cb6a52c1fb7811fb7756beda6ae20185d9b66ef6195bada');
});
