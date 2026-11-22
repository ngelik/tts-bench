import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { defaultFixtureForModel, frontendLanguagesForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { assetDigests, browserSourceRevision, defaultVoice, defaultVoiceIndex, fixtureOracle, modelRevision, releasedVoices } from '../web/tiny-voca-it/profile.mjs';

test('Tiny Voca Italian pins the released checkpoint, profile and required fixture', () => {
  const model = getAssetLock().models['tiny-voca-it'];
  assert.equal(model.modelRevision, modelRevision);
  assert.equal(model.browserSourceRevision, browserSourceRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual([model.support.voiceCount, model.support.bundledVoiceCount, model.support.languageCount], [2, 2, 1]);
  assert.deepEqual(model.support.languages, ['it']);
  assert.equal(defaultFixtureForModel('tiny-voca-it'), fixtureOracle.fixtureId);
  assert.equal(requiredFixtureForModel('tiny-voca-it'), fixtureOracle.fixtureId);
  assert.deepEqual(frontendLanguagesForModel('tiny-voca-it'), ['it']);
  assert.equal(defaultVoice, 'EM4');
  assert.equal(defaultVoiceIndex, 12);
  assert.deepEqual(releasedVoices, { EM4: 12, EF4: 13 });
  assert.equal(fixtureOracle.spans, 107);
  assert.equal(fixtureOracle.utterances, 346);
  assert.equal(fixtureOracle.maximumTokens, 205);
  assert.equal(fixtureOracle.tokenStressSha256, '459fb1bd3052d810baa65c3471f352c8eb541b94ccc7b43a1023554ebf31cc1e');
  assert.deepEqual(fixtureOracle.unknowns.map(item => [item.span, item.symbols]), [[30, ['h']], [57, ['d̪']], [79, ['d̪']]]);
});

test('Tiny Voca Italian runtime and frontend entries match the pinned digest inventory', () => {
  const model = getAssetLock().models['tiny-voca-it'];
  const byName = new Map(model.assets.map(asset => [asset.target.split('/').at(-1), asset]));
  for (const [filename, [bytes, sha256]] of Object.entries(assetDigests)) {
    const entry = byName.get(filename);
    assert.ok(entry, `asset lock must include ${filename}`);
    assert.equal(entry.bytes, bytes, filename);
    assert.equal(entry.sha256, sha256, filename);
  }
  assert.equal(model.assets.find(asset => asset.id === 'tiny-voca-it-fp32-onnx').sha256,
    '6b24645e827aa4ed10af33ed6cb3937acde94c2dfd7075b1634999c4d9752964');
  assert.equal(model.runtime.version, '1.20.1');
  assert.equal(model.runtime.files.length, 0);
});
