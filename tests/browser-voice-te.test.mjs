import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { createBrowserVoiceAdapter } from '../web/adapters/browser-voice.mjs';
import profile from '../web/adapters/browser-voice-te-profile.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';
import { defaultFixtureForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';

test('Telugu profile pins the deployed worker, acoustic assets, both G2P graphs, runtimes, and notices', () => {
  const model = getAssetLock().models[profile.id];
  const entries = model.assets;
  const files = entries.map(asset => asset.target);
  const root = profile.workerUrl.slice(1, -'worker.js'.length);
  for (const name of ['worker.js', 'frontend.js', 'weight-shuffle.js', 'converter.mjs', 'weights.js',
    'runtime/ort.wasm.min.mjs', 'runtime/ort-wasm-simd-threaded.mjs', 'runtime/ort-wasm-simd-threaded.wasm.gz',
    profile.choice.weights.slice(2), profile.choice.graph.slice(2), ...['frontend.json.gz', 'g2p-encode.onnx.gz',
      'g2p-decode.onnx.gz'].map(name => profile.choice.frontend.slice(2) + '/' + name)]) {
    assert.ok(files.includes(root + name), name);
  }
  assert.equal(entries.find(entry => '/' + entry.target === profile.workerUrl).sha256,
    'c620a0af032424a74570012281610c32c94a02598391da06d4a81fcf45f618a7');
  assert.equal(entries.filter(entry => entry.kind === 'model-weights').length, 4);
  assert.equal(model.license.requiresAcceptance, true);
  assert.match(model.license.model, /Unspecified/);
  assert.ok(entries.some(entry => entry.url === 'https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html'));
});

test('Telugu adapter rejects GPU and any nonmatching fixture checksum', async () => {
  assert.equal(defaultFixtureForModel(profile.id), 'te-article-v1');
  assert.equal(requiredFixtureForModel(profile.id), null);
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'te-article-v1', language: 'te', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, backend: 'webgpu' })).status, 'unsupported');
  assert.equal((await adapter.initialize({ ...options, language: 'hi' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});

test('audio attribution remains bound to the catalog terms and publisher sources', () => {
  const model = getAssetLock().models[profile.id];
  assert.doesNotThrow(() => verifyAudioAttribution({
    model: profile.id,
    modelTerms: model.license.model,
    attribution: 'AI-generated Telugu benchmark narration using Tamal Hansda’s Browser Voice Sreekar preview. Publisher credits Tiny Voca by Muhammed Nazeem (Apache-2.0), Maya 2 Native (Apache-2.0) and Kyutai Mimi (CC BY 4.0). Hansda’s Telugu Maya 2 Native Sreekar 20h synthetic recordings and original release annotations are CC BY-SA 4.0. The dataset credits AI4Bharat Rasa, OpenSLR and Dakshina contributors for source prompts. Preview checkpoint terms are unspecified; this does not grant generated-audio reuse rights.',
    sourceUrls: model.support.sources,
  }));
});

test('Roman Telugu uses the same spoken language and the published dictionary', async () => {
  const model = getAssetLock().models[profile.id];
  const layout = profile.fixtures['te-latn-article-v1'];
  assert.equal(layout.sha256, 'bb308136b764b649d53d38948bdb707e39b7e952531a80ed73a8a53c5d336eea');
  assert.equal(layout.spans, 113);
  assert.equal(layout.language, 'te-Latn');
  assert.equal(profile.spokenLanguage, 'te');
  assert.deepEqual(model.support.languages, ['te']);
  const dictionary = model.assets.find(asset => asset.id === profile.id + '-roman-dictionary');
  assert.equal(dictionary.sha256, '01710af6f2eb107113fb1465eb82ecdfce5cc52aaa89fffad06d0c89c834e240');
  assert.equal('/' + dictionary.target, profile.workerUrl.replace(/worker\.js$/, 'assets/converter/te.json.gz'));
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'te-latn-article-v1', language: 'te-Latn', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, language: 'te' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});
