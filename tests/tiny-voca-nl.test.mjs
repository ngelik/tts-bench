import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAssetLock } from '../lib/catalog.mjs';
import { TINY_VOCA_NL } from '../web/adapters/tiny-voca-nl-profile.mjs';
import { makeInt64Tensor } from '../web/tiny-voca-nl/tensors.mjs';
import { validateTinyVocaNlConfig } from '../web/tiny-voca-nl/config.mjs';

test('Dutch ONNX tensor dimensions match the publisher worker ABI', () => {
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, { type, data, dims }); }
  }
  const ort = { Tensor };
  const tokens = makeInt64Tensor(ort, [1, 13, 29]);
  const stress = makeInt64Tensor(ort, [0, 1, 2]);
  const voice = makeInt64Tensor(ort, [0], [1]);
  assert.equal(tokens.type, 'int64');
  assert.deepEqual(tokens.dims, [1, 3]);
  assert.deepEqual([...tokens.data], [1n, 13n, 29n]);
  assert.deepEqual(stress.dims, [1, 3]);
  assert.deepEqual(voice.dims, [1]);
  assert.deepEqual([...voice.data], [0n]);
  assert.throws(() => makeInt64Tensor(ort, [0], [2]), /shape does not match/);
});

test('Dutch profile, imported glue modules, and all model assets have immutable lock entries', async () => {
  const model = getAssetLock().models['tiny-voca-nl'];
  assert.ok(model);
  assert.equal(model.modelRevision, TINY_VOCA_NL.modelRevision);
  assert.equal(model.sourceRevision, TINY_VOCA_NL.sourceRevision);
  assert.equal(model.spaceRevision, TINY_VOCA_NL.spaceRevision);
  assert.deepEqual(model.backends, ['cpu']);
  assert.deepEqual(model.support.languages, ['nl']);
  assert.equal(model.license.requiresAcceptance, false);
  assert.equal(model.support.voiceCount, 1);
  assert.equal(model.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(model.assets.filter(asset => asset.kind === 'frontend').length, 1);
  assert.equal(model.assets.filter(asset => asset.target.includes('ThirdPartyNotices.txt')).length, 1);

  const locked = new Map(model.assets.map(asset => [asset.target, asset]));
  for (const [path, [bytes, sha256]] of Object.entries(TINY_VOCA_NL.assets)) {
    const entry = [...locked.values()].find(asset => asset.target.endsWith(`/${path}`));
    assert.ok(entry, `missing lock entry for ${path}`);
    assert.equal(entry.bytes, bytes, path);
    assert.equal(entry.sha256, sha256, path);
    assert.match(entry.url, /\/resolve\/[a-f0-9]{40}\//, `source URL is not revision-pinned for ${path}`);
  }

  for (const path of ['dutch.mjs', 'assets/espeak.mjs', 'assets/ort/ort.wasm.min.mjs', 'assets/ort/ort-wasm-simd-threaded.mjs']) {
    assert.ok(Object.hasOwn(TINY_VOCA_NL.assets, path), `imported glue is not checksum-pinned: ${path}`);
  }
  const worker = await readFile(resolve(import.meta.dirname, '../web/workers/tiny-voca-nl.mjs'), 'utf8');
  for (const path of ['assets/ort/ort-wasm-simd-threaded.mjs', 'assets/espeak.mjs', 'dutch.mjs']) {
    assert.ok(worker.includes(`asset('${path}')`), `worker does not verify imported module bytes: ${path}`);
  }
});

const pinnedModelMetadata = getAssetLock().models['tiny-voca-nl'].assets.find(asset => asset.target.endsWith('/assets/model.json'));
const pinnedModelMetadataPath = resolve(import.meta.dirname, '../.cache/public', pinnedModelMetadata.target);
test('Dutch worker accepts the actual pinned model.json metadata', { skip: !existsSync(pinnedModelMetadataPath) }, async () => {
  const model = getAssetLock().models['tiny-voca-nl'];
  const value = JSON.parse(await readFile(pinnedModelMetadataPath, 'utf8'));
  assert.equal(value.symbols.length, TINY_VOCA_NL.symbolCount);
  validateTinyVocaNlConfig(value, TINY_VOCA_NL);
  assert.throws(() => validateTinyVocaNlConfig({ ...value, symbols: value.symbols.slice(1) }, TINY_VOCA_NL), /config differs/);
});
