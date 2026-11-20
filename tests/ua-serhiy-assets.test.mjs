import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getAssetLock } from '../lib/catalog.mjs';
import { getModelParameters } from '../lib/model-parameters.mjs';
import { UA_SERHIY_CONFIG } from '../web/adapters/ua-serhiy-config.mjs';

const root = resolve(import.meta.dirname, '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('Ukrainian Serhiy registration locks the source, four generated inference graphs and frontend closure', async () => {
  const model = getAssetLock().models['ua-serhiy-0p58m'];
  assert.ok(model);
  assert.equal(model.modelRevision, UA_SERHIY_CONFIG.source.revision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.equal(model.license.model, 'GPL-3.0');
  assert.equal(model.license.requiresAcceptance, true);
  assert.equal(model.support.voiceCount, 1);
  assert.equal(model.support.bundledVoiceCount, 1);
  assert.deepEqual(model.support.languages, ['uk']);
  assert.ok(model.support.sources.some(url => url.endsWith('/README.md')));
  assert.ok(model.support.sources.some(url => url.endsWith('/NOTICE.md')));

  const graphAssets = model.assets.filter(asset => asset.kind === 'model-weights');
  assert.equal(graphAssets.length, 4);
  assert.equal(graphAssets.reduce((sum, asset) => sum + asset.bytes, 0), 2_339_985);
  assert.ok(graphAssets.every(asset => asset.generated?.artifactPath));
  for (const graph of Object.values(UA_SERHIY_CONFIG.graphs)) {
    assert.ok(graphAssets.some(asset => asset.bytes === graph.bytes && asset.sha256 === graph.sha256 && graph.url.endsWith(asset.target.split('/').at(-1))));
  }
  assert.equal(model.assets.find(asset => asset.id === 'ua-serhiy-source-weights-fp16').kind, 'model-support',
    'source checkpoint is recorded without double-counting deployed browser weights');
  assert.equal(model.assets.find(asset => asset.id === 'ua-serhiy-source-weights-fp16').sha256,
    UA_SERHIY_CONFIG.source.originalWeightsSha256);

  const ort = model.runtime.files;
  assert.ok(ort.some(file => file.path === 'dist/ort-wasm-simd-threaded.wasm'));
  assert.ok(ort.some(file => file.path === 'dist/ort-wasm-simd-threaded.asyncify.wasm'));
  assert.ok(ort.some(file => file.path === 'dist/ort.webgpu.min.mjs'));
  for (const [id, digest, bytes] of [
    ['ua-serhiy-espeak-module', UA_SERHIY_CONFIG.runtime.espeak.moduleSha256, UA_SERHIY_CONFIG.runtime.espeak.moduleBytes],
    ['ua-serhiy-espeak-wasm', UA_SERHIY_CONFIG.runtime.espeak.wasmSha256, UA_SERHIY_CONFIG.runtime.espeak.wasmBytes],
    ['ua-serhiy-espeak-data', UA_SERHIY_CONFIG.runtime.espeak.dataSha256, UA_SERHIY_CONFIG.runtime.espeak.dataBytes],
  ]) {
    const asset = model.assets.find(item => item.id === id);
    assert.equal(asset.sha256, digest);
    assert.equal(asset.bytes, bytes);
  }

  for (const [id, path] of [
    ['ua-serhiy-model-license', 'web/ua-serhiy-0p58m/LICENSE'],
    ['ua-serhiy-teacher-license', 'web/ua-serhiy-0p58m/LICENSE.teacher'],
  ]) {
    const asset = model.assets.find(item => item.id === id);
    const bytes = await readFile(resolve(root, path));
    assert.equal(bytes.byteLength, asset.bytes);
    assert.equal(sha256(bytes), asset.sha256);
  }

  const parameters = getModelParameters('ua-serhiy-0p58m');
  assert.equal(parameters.parameterCount, 575_888);
  assert.equal(parameters.countKind, 'exact');
  assert.match(parameters.scope, /stored-tensor count may include non-trainable buffers/);
});
