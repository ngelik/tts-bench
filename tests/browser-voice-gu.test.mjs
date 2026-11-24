import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { createBrowserVoiceAdapter } from '../web/adapters/browser-voice.mjs';
import profile from '../web/adapters/browser-voice-gu-profile.mjs';

test('Gujarati routes use the original stock worker and its complete model/runtime closure', () => {
  const entries = getAssetLock().models[profile.id].assets;
  const files = entries.map(asset => asset.target);
  const root = profile.workerUrl.slice(1, -'worker.js'.length);
  for (const name of ['worker.js', 'converter.mjs', 'frontend.js', 'weight-shuffle.js', 'weights.js',
    'runtime/ort.wasm.min.mjs', 'runtime/ort-wasm-simd-threaded.mjs', 'runtime/ort-wasm-simd-threaded.wasm.gz',
    profile.choice.weights.slice(2), profile.choice.graph.slice(2), ...['frontend.json.gz', 'g2p-encode.onnx.gz',
      'g2p-decode.onnx.gz'].map(name => profile.choice.frontend.slice(2) + '/' + name)]) {
    assert.ok(files.includes(root + name), name);
  }
  assert.equal(entries.find(entry => '/' + entry.target === profile.workerUrl).sha256,
    'c620a0af032424a74570012281610c32c94a02598391da06d4a81fcf45f618a7');
  assert.equal(entries.filter(entry => entry.kind === 'model-weights').length, 4);
});

test('Gujarati CPU worker rejects an incorrect fixture identity and reports unsupported GPU early', async () => {
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'gu-article-v1', language: 'gu', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, backend: 'webgpu' })).status, 'unsupported');
  assert.equal((await adapter.initialize({ ...options, language: 'hi' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});
