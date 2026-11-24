import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { defaultFixtureForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';
import { createBrowserVoiceAdapter } from '../web/adapters/browser-voice.mjs';
import profile from '../web/adapters/browser-voice-hi-int7-profile.mjs';

test('Hindi INT7 profile pins its checkpoint, asset closure, and immutable credits', () => {
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
  const files = assets.filter(asset => asset.url.includes('/hindi-voice-compact/resolve/') && asset.url.includes('/int7/browser/'));
  assert.equal(files.length, 5);
  assert.deepEqual(Object.fromEntries(files.map(asset => [asset.url.split('/').at(-1), [asset.sha256, asset.bytes]])), {
    'model.weights.gz': ['7df3ebdcb97631e49e873ed7de65fecd3eabe54d748da2d8fdc0783cd8cec6c5', 882200],
    'voice.onnx.gz': ['a36544e006e67304f2b5f70343729833cc7c0652af265626b21430df176a3e50', 29302],
    'frontend.json.gz': ['6cb51076c6bd67a073049a099ae88f3007e37f8847e45c08b491cea7b1eda241', 211366],
    'g2p-encode.onnx.gz': ['eb7d670ae09add37d4634ad2bd293591fd8acc989e717f20fb6e18a7ee69aa90', 660442],
    'g2p-decode.onnx.gz': ['d86c96a5bf3db406b9691325cfc521c1444bdee4828f44db63c7aa8642a6ed3c', 1148287],
  });
  assert.ok(files.every(asset => asset.url.includes('/04e39413827f3d45af54ceb480cb77e732983c1b/')));
  assert.ok(assets.some(asset => asset.url === 'https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html' && asset.sha256 === 'f061cffaf43c8bf1200be7265abc936a8587f76cdfe138d69dd7c656408623da'));
  assert.equal(model.license.model, 'Apache-2.0');
  assert.match(model.license.trainingData, /CC BY 4.0/);
  assert.ok(model.support.sources.some(url => url === 'https://huggingface.co/datasets/Hansda/hindi-maya2-ishwari-20h/tree/c835a1a2c3892f5cd47507824bf33df19deec955'));
  assert.equal(profile.choice.paceScale, 0.9333333333333333);
});

test('Hindi INT7 route binds the unchanged fixture and rejects GPU or checksum mismatch', async () => {
  assert.equal(defaultFixtureForModel(profile.id), 'hi-article-v1');
  assert.equal(requiredFixtureForModel(profile.id), 'hi-article-v1');
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'hi-article-v1', language: 'hi', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, backend: 'webgpu' })).status, 'unsupported');
  assert.equal((await adapter.initialize({ ...options, language: 'te' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});

test('INT7 recording attribution is catalog-bound and keeps dataset terms separate', () => {
  const model = getAssetLock().models[profile.id];
  assert.doesNotThrow(() => verifyAudioAttribution({
    model: profile.id, modelTerms: model.license.model,
    attribution: 'AI-generated Hindi benchmark narration using Tamal Hansda’s Browser Voice Ishwari INT7. The Apache-2.0 INT7 checkpoint is separate from its training sources. The Hindi Maya 2 Native Ishwari 20h synthetic speech and original release annotations are CC BY 4.0; the dataset card credits Common Voice prompt material (CC0-1.0), Indic TTS Mini Hindi prompt material (CC BY 4.0), Mozilla Common Voice contributors, AI4Bharat and Rasa contributors, and the indic-tts-mini-24k transcript index publisher. Publisher credits include Tiny Voca by Muhammed Nazeem (Apache-2.0), Maya 2 Native (Apache-2.0) and Kyutai Mimi (CC BY 4.0). Source prompts retain original terms; no generated-audio reuse rights are inferred.',
    sourceUrls: model.support.sources,
  }));
});
