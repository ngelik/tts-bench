import assert from 'node:assert/strict';
import test from 'node:test';
import { TINY_VOCA_PTBR_KOKORO as profile } from '../web/adapters/tiny-voca-ptbr-kokoro-profile.mjs';
import { frontendFingerprint, phonemizeWithTrace, SYMBOLS, NothingToPronounce } from '../web/tiny-voca-ptbr-kokoro/frontend.mjs';
import { normalizePtbr } from '../web/tiny-voca-ptbr-kokoro/normalize.mjs';
import { finished, sentences, speakText } from '../web/tiny-voca-ptbr-kokoro/voice.mjs';

test('Haple checkpoint is pinned separately with pt-BR-only support', async () => {
  assert.equal(profile.modelRevision, '596401fc87f1635f73326872001e370d3aedab9b');
  assert.equal(profile.sourceRevision, '1e7ed993260ecdd91552762f7403c00632bf5dab');
  assert.equal(profile.parameterCount, 4535755);
  assert.deepEqual(profile.voices.map(({ id, index }) => [id, index]), [['F', 0], ['M', 1]]);
  assert.equal(profile.defaultVoice, 'F');
  assert.equal(profile.language, 'pt-BR');
  assert.equal(SYMBOLS.length, 68);
  assert.equal(await frontendFingerprint(), profile.frontendFingerprint);
});

test('Portuguese normalization preserves release case, Unicode boundaries, and large integers', () => {
  assert.equal(normalizePtbr('R$ 19,90'), 'dezenove reais e noventa centavos');
  assert.equal(normalizePtbr('14H30'), '14H30');
  assert.equal(normalizePtbr('4 X 5'), 'quatro X cinco');
  assert.equal(normalizePtbr('R$ 2 milhãoã'), 'dois reais milhãoã');
  assert.equal(normalizePtbr('O código é 12345678901234567.'),
    'O código é doze mil trezentos e quarenta e cinco trilhões seiscentos e setenta e oito bilhões novecentos e um milhões duzentos e trinta e quatro mil quinhentos e sessenta e sete.');
  assert.equal(normalizePtbr('Data ٠١/١٢/٢٠٢٦.'), 'Data primeiro de dezembro de dois mil e vinte e seis.');
  assert.equal(normalizePtbr('5\u001fhoras'), 'cinco horas');
});

test('voice text boundaries match Python Unicode and last-token punctuation rules', () => {
  assert.equal(finished('Olá !»'), 'Olá !»');
  assert.equal(finished('Olá »;'), 'Olá »;.');
  assert.equal(finished('Olá ,'), 'Olá ,');
  assert.equal(finished('Olá ,;'), 'Olá ,;.');
  assert.deepEqual(sentences('ÁDr. Agora.'), ['ÁDr.', 'Agora.']);
  assert.deepEqual(sentences('Olá. é. Uma coisa.'), ['Olá. é. Uma coisa.']);
});

test('eSpeak trace injection retains punctuation, stress and the token/stress ABI', async () => {
  const phones = await phonemizeWithTrace('oi.', { oi: 'ˈo_j' });
  assert.equal(phones.ids.length, phones.stress.length);
  assert.equal(phones.ids[0], 1);
  assert.equal(phones.ids.at(-1), 2);
  assert.ok(phones.ids.every(id => Number.isInteger(id) && id >= 0 && id < SYMBOLS.length));
  assert.ok(phones.stress.includes(1));
  await assert.rejects(() => phonemizeWithTrace('missing', {}), /missing raw IPA parity trace/);
  await assert.rejects(() => speakText('!? 🎉 …', {
    phonemizeText: async () => { throw new NothingToPronounce(); },
    runUtterance: async () => ({ audio: [], durations: [] }),
  }), NothingToPronounce);
});

test('whole-span peak cap and first CPU-readable PCM callback remain exact', async () => {
  let firstPcm = 0;
  const response = await speakText('a b', {
    peak: 0.99,
    phonemizeText: async text => ({ ids: text.split(' ').map((_, index) => index + 5), stress: text.split(' ').map(() => 0) }),
    runUtterance: async () => ({ audio: Float32Array.of(2, -1), durations: [1] }),
    onFirstPcm: () => firstPcm++,
  });
  assert.equal(firstPcm, 1);
  assert.ok(Math.abs(Math.max(...response.audio.map(Math.abs)) - 0.99) < 1e-7);
});
