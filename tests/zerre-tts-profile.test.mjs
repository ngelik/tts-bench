import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assetDigests, browserSourceRevision, defaultVoice, defaultVoiceIndex, fixtureOracle, modelRevision, sampleRate, validateZerreMetadata } from '../web/zerre-tts/profile.mjs';

const text = async path => readFile(new URL(path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await text(path));

test('Zerre fixture, source and asset registrations are self-contained and pinned', async () => {
  const registry = await json('../fixtures/registry.json');
  const lock = await json('../assets.lock.json');
  const fixture = registry.fixtures.find(item => item.id === fixtureOracle.fixtureId);
  const model = lock.models['zerre-tts'];
  const article = await text('../fixtures/tr-article-v1.txt');
  assert.ok(fixture);
  assert.equal(createHash('sha256').update(article).digest('hex'), fixtureOracle.sourceSha256);
  assert.equal(fixture.chunks, fixtureOracle.spans);
  assert.equal(fixture.language, 'tr');
  assert.equal(registry.modelDefaults['zerre-tts'], fixtureOracle.fixtureId);
  assert.equal(registry.modelRequiredFixtures['zerre-tts'], fixtureOracle.fixtureId);
  assert.deepEqual(registry.modelFrontendLanguages['zerre-tts'], ['tr']);
  assert.equal(model.modelRevision, modelRevision);
  assert.equal(model.browserSourceRevision, browserSourceRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['tr']);
  assert.equal(model.support.voiceCount, 2);
  assert.equal(defaultVoice, 'SES-A');
  assert.equal(defaultVoiceIndex, 0);
  assert.equal(model.assets.find(asset => asset.id === 'zerre-tts-int8-onnx').sha256, assetDigests['model.onnx'][1]);
  assert.equal(model.assets.find(asset => asset.id === 'zerre-tts-turkish-lexicon').sha256, assetDigests['lexicon-tr.json'][1]);
  assert.equal(model.assets.find(asset => asset.id === 'zerre-tts-turkish-phonemizer').sha256, assetDigests['phonemize-tr.js'][1]);
  const code = await readFile(new URL('../web/zerre-tts/phonemize-tr.js', import.meta.url));
  assert.equal(code.length, assetDigests['phonemize-tr.js'][0]);
  assert.equal(createHash('sha256').update(code).digest('hex'), assetDigests['phonemize-tr.js'][1]);
});

test('metadata profile validates outputs, symbols and bounded runtime settings', async () => {
  const metadata = {
    sample_rate: 24000, hop: 256, voices: ['MK', 'NK'], max_tokens: 512, max_frames: 3000,
    step: 65000, frontend: 'espeak',
    frontend_fingerprint: '9c85175f6d2d1d6317bf822b3d959de993df257e2b515c971d439fdab343cd3a',
    inputs: ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'],
    outputs: ['audio', 'durations'], symbols: Array.from({ length: 62 }, (_, index) => `s${index}`),
  };
  const lexicon = { symbols: metadata.symbols, words: Object.fromEntries(Array.from({ length: 25344 }, (_, i) => [`w${i}`, ['', '']])) };
  assert.equal(validateZerreMetadata(metadata, lexicon), metadata);
  assert.equal(metadata.sample_rate, sampleRate);
  assert.throws(() => validateZerreMetadata({ ...metadata, outputs: ['audio'] }, lexicon), /inconsistent/);
});

test('pinned Turkish browser phonemizer retains its digit and apostrophe behavior', async () => {
  globalThis.zerre = undefined;
  await import('../web/zerre-tts/phonemize-tr.js');
  const symbols = ['<pad>', '<bos>', '<eos>', '<sp>', '<unk>', '.', 'a', 'd', 'i', 'k', 'n', 'ɯ', 'ɾ'];
  const lexicon = { symbols, words: {} };
  const digits = globalThis.zerre.phonemize('2046.', lexicon, symbols);
  assert.deepEqual(digits.symbols, ['<bos>', '.', '<eos>']);
  const possessive = globalThis.zerre.phonemize("Ankara'da.", lexicon, symbols);
  assert.ok(possessive.symbols.includes('<sp>'));
  const casePlan = globalThis.zerre.phonemize('İ I ı i.', lexicon, symbols);
  assert.deepEqual(casePlan.symbols.filter(symbol => ['i', 'ɯ'].includes(symbol)), ['i', 'ɯ', 'ɯ', 'i']);
});
