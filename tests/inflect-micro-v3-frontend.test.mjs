import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMicroNumbers } from '../web/inflect-micro-v3/numeric.mjs';
import { INTERNAL_GAP_SAMPLES, INTERNAL_TEXT_LIMIT, microTokenIds, prepareMicroText, splitMicroText, validateMicroText } from '../web/inflect-micro-v3/frontend.mjs';

test('Micro text validation preserves allowed English text and rejects unsupported scripts, symbols, and combining marks', () => {
  assert.equal(validateMicroText('A 20°C test, with +, %, and punctuation!'), 'A 20°C test, with +, %, and punctuation!');
  assert.throws(() => validateMicroText('nai\u0308ve'), /combining characters/);
  assert.throws(() => validateMicroText('English 日本語'), /Latin-script/);
  assert.throws(() => validateMicroText('Snowman ☃'), /symbol/);
  assert.throws(() => validateMicroText('x'.repeat(20_001)), /20000/);
});

test('Micro 220-character segmentation retains every original separator and enforces source boundaries', () => {
  const text = ('First sentence, then another sentence; and a final clause. ').repeat(8);
  const pieces = splitMicroText(text);
  assert.ok(pieces.length > 1);
  assert.ok(pieces.every(piece => piece.length <= INTERNAL_TEXT_LIMIT && piece.trim()));
  assert.equal(pieces.join(''), text);
  assert.throws(() => splitMicroText('x'.repeat(250)), /safe split point/);
  assert.equal(INTERNAL_GAP_SAMPLES, 2_880);
});

test('Micro conservative numeric frontend matches explicit ranges and math while protecting identifiers', () => {
  const result = normalizeMicroNumbers('Temperatures are 10–20 °C; subtract 21-8; version 1-2 stays literal.');
  assert.equal(result.spokenText, 'Temperatures are ten to twenty degrees Celsius; subtract twenty one minus eight; version 1-2 stays literal.');
  assert.deepEqual(result.edits.map(edit => edit.kind), ['quantity_range', 'subtraction_instruction']);
});

test('Micro strict tokenization inserts model boundaries and fails instead of dropping unknown symbols', () => {
  const vocab = Object.assign(Object.create(null), { a: 1, ' ': 2, b: 3 });
  assert.deepEqual(microTokenIds('a b', vocab), [0, 1, 2, 3, 0]);
  assert.throws(() => microTokenIds('a☃', vocab), /unknown phoneme/);
  assert.throws(() => microTokenIds('a'.repeat(511), { a: 1 }), /1\.\.510/);
});

test('Micro preparation normalizes the complete input before splitting and preserves exact utterance text', async () => {
  const calls = [];
  const text = 'A range is 10-20 kg. ' + 'More ordinary text, '.repeat(14);
  const vocab = Object.assign(Object.create(null), { a: 1, ' ': 2, b: 3 });
  const result = await prepareMicroText(text, {
    vocab,
    phonemize: async chunk => { calls.push(chunk); return 'a b'; },
  });
  assert.equal(result.spokenText, 'A range is ten to twenty kilograms. ' + 'More ordinary text, '.repeat(14));
  assert.deepEqual(result.utterances.map(item => item.text).join(''), result.spokenText);
  assert.deepEqual(calls, result.utterances.map(item => item.text));
  assert.ok(result.utterances.length > 1);
  assert.deepEqual(result.utterances[0].ids, [0, 1, 2, 3, 0]);
});
