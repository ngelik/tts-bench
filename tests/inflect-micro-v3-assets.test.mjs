import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
const model = lock.models['inflect-micro-v3'];

test('Micro v3 lock pins the hosted FP32 export and fixed Cassidy closure', async () => {
  assert.ok(model);
  assert.equal(model.modelRevision, 'c1a7db6ef44c931623fc2028cb0409659b83156c');
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual([model.support.voiceCount, model.support.bundledVoiceCount, model.support.languageCount], [6, 1, 1]);
  assert.deepEqual(model.support.languages, ['en']);
  assert.equal(model.license.requiresAcceptance, false);
  assert.match(model.license.model, /Apache-2\.0/);

  const weights = model.assets.filter(asset => asset.kind === 'model-weights');
  assert.deepEqual(weights.map(asset => asset.bytes), [12_355_400, 4_557_803, 30_394_832, 261_120]);
  assert.equal(weights.reduce((sum, asset) => sum + asset.bytes, 0), 47_569_155);
  assert.ok(weights.every(asset => asset.url.includes('/inflect-micro-v3-browser-onnx-v1-f86f7ec2af37/')));
  assert.ok(model.assets.some(asset => asset.id === 'inflect-micro-v3-klein-en-us-lexicon'
    && asset.sha256 === 'f88c07d53f0bc97adecc70c755416dd1103f61c47f76937339f73a7f32bf5f85'));

  for (const asset of model.assets.filter(item => item.sourcePath)) {
    const bytes = await readFile(resolve(root, asset.sourcePath));
    assert.equal(bytes.length, asset.bytes, asset.id);
    const { createHash } = await import('node:crypto');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.id);
  }
});
