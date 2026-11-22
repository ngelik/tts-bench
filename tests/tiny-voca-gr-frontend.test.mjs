import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonical, greekSentences, normalizeText, parseEspeak, planText, tokenize } from '../web/tiny-voca-gr/frontend.mjs';

const oracle = JSON.parse(await readFile(new URL('./fixtures/tiny-voca-gr-native-controls.json', import.meta.url), 'utf8'));

test('Greek normalization and sentence boundaries match the released source rules', () => {
  assert.equal(normalizeText('Η Μα\u0301ρα; «Ναι» – είπε...'), 'Η Μάρα? "Ναι" — είπε…');
  assert.deepEqual(greekSentences('Ο κ. Μάνος ήρθε. Η Α. έφυγε.'), ['Ο κ. Μάνος ήρθε.', 'Η Α. έφυγε.']);
});

test('eSpeak stress parser and Greek inventory retain unmapped foreign phones', () => {
  assert.deepEqual(parseEspeak('(el) ˈa_ˌb\u2060_c'), [[['a', 1], ['b', 2], ['c', 0]]]);
  assert.deepEqual(canonical('g'), ['ɡ']);
  assert.deepEqual(canonical('ts'), ['t', 's']);
  assert.equal(canonical('oɪ'), null);
  const mapped = tokenize([{ punctuation: false, value: [[['oɪ', 1], ['ts', 2]]] }]);
  assert.deepEqual(mapped.unknown, ['oɪ']);
  assert.deepEqual(mapped.ids, [1, 4, 19, 27, 2]);
  assert.deepEqual(mapped.stress, [0, 1, 2, 0, 0]);
});

test('four pinned native controls match exact utterance ids, stress, and unknown phones', () => {
  for (const control of oracle.controls) {
    const plans = planText(control.text, phrase => {
      assert.ok(phrase.endsWith('\n'), 'eSpeak input must end with a newline');
      const key = phrase.slice(0, -1);
      assert.ok(Object.hasOwn(oracle.fragments, key), `missing pinned native eSpeak trace for ${key}`);
      return oracle.fragments[key];
    });
    assert.deepEqual(plans.map(({ utterance, ids, stress, unknown }) => ({ utterance, ids, stress, unknown })), control.plans, control.case);
  }
});
