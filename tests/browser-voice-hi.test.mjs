import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { defaultFixtureForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';
import { createBrowserVoiceAdapter } from '../web/adapters/browser-voice.mjs';
import profile from '../web/adapters/browser-voice-hi-profile.mjs';

test('Hindi profile pins its HF checkpoint, complete browser/runtime closure, and immutable credits', () => {
  const model = getAssetLock().models[profile.id];
  const assets = model.assets;
  const paths = assets.map(asset => asset.target);
  const root = profile.workerUrl.slice(1, -'worker.js'.length);
  for (const name of ['worker.js', 'frontend.js', 'weight-shuffle.js', 'converter.mjs', 'weights.js',
    'runtime/ort.wasm.min.mjs', 'runtime/ort-wasm-simd-threaded.mjs', 'runtime/ort-wasm-simd-threaded.wasm.gz',
    profile.choice.weights.slice(2), profile.choice.graph.slice(2), ...['frontend.json.gz', 'g2p-encode.onnx.gz',
      'g2p-decode.onnx.gz'].map(name => profile.choice.frontend.slice(2) + '/' + name)]) {
    assert.ok(paths.includes(root + name), name);
  }
  assert.equal(assets.find(asset => '/' + asset.target === profile.workerUrl).sha256,
    'c620a0af032424a74570012281610c32c94a02598391da06d4a81fcf45f618a7');
  assert.equal(assets.filter(asset => asset.kind === 'model-weights').length, 4);
  const modelWeights = assets.filter(asset => asset.url.includes('/hindi-voice-compact/resolve/') && asset.url.includes('/int6/browser/'));
  assert.equal(modelWeights.length, 5);
  assert.ok(assets.some(asset => asset.url === 'https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html' && asset.sha256 === 'f061cffaf43c8bf1200be7265abc936a8587f76cdfe138d69dd7c656408623da'));
  assert.equal(model.license.model, 'Apache-2.0');
  assert.match(model.license.trainingData, /dataset card/i);
  assert.ok(model.support.sources.some(url => url === 'https://huggingface.co/datasets/Hansda/hindi-maya2-ishwari-20h/blob/c835a1a2c3892f5cd47507824bf33df19deec955/README.md'));
  assert.equal(profile.choice.paceScale, 0.9719864176570459);
});

test('Hindi route binds the unchanged fixture and rejects GPU or checksum mismatch', async () => {
  assert.equal(defaultFixtureForModel(profile.id), 'hi-article-v1');
  assert.equal(requiredFixtureForModel(profile.id), null);
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'hi-article-v1', language: 'hi', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, backend: 'webgpu' })).status, 'unsupported');
  assert.equal((await adapter.initialize({ ...options, language: 'te' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});

test('recording attribution is catalog-bound and keeps dataset terms separate', () => {
  const model = getAssetLock().models[profile.id];
  assert.doesNotThrow(() => verifyAudioAttribution({
    model: profile.id, modelTerms: model.license.model,
    attribution: 'AI-generated Hindi benchmark narration using Tamal Hansda’s Browser Voice Ishwari INT6. Publisher credits Tiny Voca by Muhammed Nazeem (Apache-2.0), Maya 2 Native (Apache-2.0) and Kyutai Mimi (CC BY 4.0), and the Hansda Hindi Maya 2 Native Ishwari 20h dataset. The synthetic training recordings and annotations are CC BY 4.0. Prompt sources include Common Voice (CC0) and AI4Bharat Rasa transcripts (CC BY 4.0).',
    sourceUrls: model.support.sources,
  }));
});

test('Roman Hindi uses the same spoken language and the published dictionary', async () => {
  const model = getAssetLock().models[profile.id];
  const layout = profile.fixtures['hi-latn-article-v1'];
  assert.equal(layout.sha256, 'acce9de48b72daf86d6fc4126497f55977c64dafa3e7a3d84809051df1298d9e');
  assert.equal(layout.spans, 107);
  assert.equal(layout.language, 'hi-Latn');
  assert.equal(profile.spokenLanguage, 'hi');
  assert.deepEqual(model.support.languages, ['hi']);
  const dictionary = model.assets.find(asset => asset.id === profile.id + '-roman-dictionary');
  assert.equal(dictionary.sha256, '18584a4e1f0f79034fc7c54224ec31f7ebe4a6692afc034f23613ff391d598f2');
  assert.equal('/' + dictionary.target, profile.workerUrl.replace(/worker\.js$/, 'assets/converter/hi.json.gz'));
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'hi-latn-article-v1', language: 'hi-Latn', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, language: 'hi' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});
