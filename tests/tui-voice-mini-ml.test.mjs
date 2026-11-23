import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { TUI_VOICE_MINI_ML as profile } from '../web/adapters/tui-voice-mini-ml-profile.mjs';
import {
  createFrontend, frontendFingerprint, FRONTEND_FINGERPRINT, normalizeText,
  splitPauseCues, validateMalayalamText,
} from '../web/tui-voice-mini-ml/frontend.mjs';

function tinyPlan() {
  const new_symbols = [
    '<pad>', '<bos>', '<eos>', '<sp>', '<unk>', ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…',
    'm', 'a', 'n', ...Array.from({ length: 56 }, (_, index) => `p${index}`),
  ];
  const vocab = Object.fromEntries(new_symbols.map((symbol, id) => [symbol, id]));
  return {
    config: { vocab, max_tokens: 512 },
    plan: { new_symbols, mapping: { m: 17, a: 18, n: 19 }, merged: [], unresolved: [] },
  };
}

test('Tui Voice Malayalam profile pins the single qualified voice and both identities', async () => {
  assert.equal(profile.modelRevision, '9c2fee75373d81bbd62fbe2d683b1bad3c4415ea');
  assert.equal(profile.sourceRevision, '478761a10399c357e9ccc5380145906167e4d655');
  assert.equal(profile.parameterCount, 4537291);
  assert.deepEqual(profile.voices.map(({ id, index }) => [id, index]), [['F2', 0]]);
  assert.equal(profile.defaultVoice, 'F2');
  assert.equal(profile.language, 'ml');
  assert.equal(profile.frontendFingerprint, FRONTEND_FINGERPRINT);
  assert.equal(await frontendFingerprint(), profile.frontendFingerprint);
  assert.equal(profile.configFrontendName, 'dizione');
  assert.equal(profile.espeakCompatibilityVersion, '1.51');
});

test('WebGPU measured initialization is separate from its untimed dispatch probe', () => {
  const worker = readFileSync(new URL('../web/workers/tui-voice-mini-ml.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(worker, /options\.backend === 'webgpu' && !options\.probe/);
  assert.match(worker, /const providers = requestedBackend === 'webgpu' \? \['webgpu', 'wasm'\] : \['wasm'\]/);
  assert.match(worker, /if \(options\.probe\) \{/);
  assert.match(worker, /gpuDispatchVerified: requestedBackend === 'webgpu' \? \(options\.probe \? probeDispatches > 0 : null\) : null/);
  assert.match(worker, /runGraph\(result\.ids, result\.stress, false\)/);
});

test('Malayalam NFC normalization and punctuation retain the publisher boundaries', () => {
  assert.equal(normalizeText(' “മലയാളം”—audio…  പരിശോധന। '), 'മലയാളം audio. പരിശോധന.');
  assert.deepEqual(splitPauseCues('അവൻ, അവൾ; പാൽ: മണ്ണ്? തേൻ!'), [
    ['അവൻ', ','], ['അവൾ', ';'], ['പാൽ', ':'], ['മണ്ണ്', '?'], ['തേൻ', '!'],
  ]);
  assert.deepEqual(splitPauseCues('മലയാളം,, ശബ്ദം.'), [['മലയാളം', ','], ['ശബ്ദം', '.']]);
  assert.throws(() => validateMalayalamText('മലയാളം audio', 4), /Latin/);
  assert.throws(() => validateMalayalamText('വൈകിട്ട് 5:40', 5), /numeral/);
  assert.doesNotThrow(() => validateMalayalamText('മലയാളം ശബ്ദ പരിശോധന'));
});

test('Malayalam phone encoding is strict, preserves word/pause IDs and sends zero stress', async () => {
  const { config, plan } = tinyPlan();
  const frontend = createFrontend(config, plan);
  const requests = [];
  const result = await frontend.phonemize('മലയാളം.', async (text, options) => {
    requests.push({ text, options });
    return 'm_a n_m';
  }, 0);
  assert.deepEqual(requests, [{ text: 'മലയാളം\n', options: { voice: 'ml', separator: '_' } }]);
  assert.deepEqual(result.ids, [1, 17, 18, 3, 19, 17, 6, 2]);
  assert.deepEqual(result.stress, Array(result.ids.length).fill(0));
  await assert.rejects(() => frontend.phonemize('മലയാളം', async () => 'z_a', 1), /Unmapped Malayalam eSpeak phone/);
});
