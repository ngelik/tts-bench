import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyUaStress, espeakUaText, stripUaStress, prepareUaSerhiyText, uaPhonemesToIds } from '../web/ua-serhiy-0p58m/frontend.mjs';
const evidence = JSON.parse(await readFile(new URL('./fixtures/ua-serhiy-frontend.json', import.meta.url)));

test('actual pinned browser eSpeak output reproduces both upstream stress/ID goldens', async () => {
  for (const example of evidence.examples) {
    const prepared = await prepareUaSerhiyText(example.text, {
      phonemize: (text, voice) => {
        assert.equal(voice, 'uk');
        assert.equal(text, stripUaStress(espeakUaText(example.text)));
        return example.raw;
      },
      phonemeIdMap: evidence.phonemeIdMap,
    });
    assert.deepEqual(prepared.tokenIds, example.expected);
    assert.equal(prepared.sentences.length, 1);
    assert.equal(prepared.sentences[0].text, example.text);
    assert.equal(prepared.stressStats.words_marked_applied, example.id === '01-greeting' ? 7 : 6);
    assert.equal(prepared.stressStats.words_marked_unaligned, 0);
  }
});

test('stress marks, й/ї and Ukrainian apostrophes follow upstream normalization', () => {
  assert.equal(stripUaStress('ї́й йо́го'), 'їй його');
  assert.equal(espeakUaText(" , - п'ять п’ять п`ять"), 'пʼять пʼять пʼять');
  assert.deepEqual(applyUaStress('За́мок замо́к', [Array.from('zamˈok zˈamok')]).sentences, [Array.from('zˈamok zamˈok')]);
});

test('unaligned or vowel-mismatched marked words retain dictionary stress and report fallback', () => {
  const raw = [Array.from('zˈamok')];
  const unaligned = applyUaStress('За́мок стоїть', raw);
  assert.deepEqual(unaligned.sentences, raw);
  assert.equal(unaligned.stats.words_marked_unaligned, 1);
  const mismatched = applyUaStress('За́мок', [Array.from('zˈam')]);
  assert.deepEqual(mismatched.sentences, [Array.from('zˈam')]);
  assert.equal(mismatched.stats.words_marked_vowel_mismatch, 1);
});

test('255-ID splitting preserves every source character and offset without truncation', async () => {
  const text = '  ' + 'а '.repeat(180) + '\nа!  ';
  const phonemize = input => [Array.from(input.trim())];
  const map = { '^': [1], '$': [2], '_': [0], а: [10], ' ': [3], '\n': [3], '!': [4] };
  const prepared = await prepareUaSerhiyText(text, { phonemize, phonemeIdMap: map });
  assert.ok(prepared.sentences.length > 1);
  assert.equal(prepared.sentences.map(piece => piece.text).join(''), text);
  let offset = 0;
  for (const piece of prepared.sentences) {
    assert.equal(piece.start, offset);
    assert.equal(piece.text, text.slice(piece.start, piece.end));
    assert.ok(piece.ids.length <= 255);
    assert.equal(piece.ids[0], 1);
    assert.equal(piece.ids.at(-1), 2);
    offset = piece.end;
  }
  assert.equal(offset, text.length);
});

test('unknown phones and overlong unsplittable words fail rather than disappearing', async () => {
  assert.throws(() => uaPhonemesToIds([['a', '☃']], { '^': [1], '_': [0], '$': [2], a: [14] }), /unknown or invalid phoneme/);
  await assert.rejects(prepareUaSerhiyText('а'.repeat(127), {
    phonemize: text => [Array.from(text)], phonemeIdMap: { '^': [1], '$': [2], '_': [0], а: [14] },
  }), /unsplittable word/);
  await assert.rejects(prepareUaSerhiyText('а\0б', { phonemize() {}, phonemeIdMap: {} }), /NUL-free/);
});
