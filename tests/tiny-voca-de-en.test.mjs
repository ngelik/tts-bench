import test from 'node:test';
import assert from 'node:assert/strict';
import { getAssetLock } from '../lib/catalog.mjs';
import { getModelParameters } from '../lib/model-parameters.mjs';
import { browserSourceRevision, fixtureOracle, modelRevision, resolveFixtureLanguage, validatePlan, voiceIndex, voices } from '../web/voca64/profile.mjs';

test('Voca64 profile pins both fixture routes, voices, source and official full-fixture frontend digests', () => {
  const model = getAssetLock().models['tiny-voca-de-en'];
  assert.equal(model.modelRevision, modelRevision);
  assert.equal(model.browserSourceRevision, browserSourceRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['de', 'en']);
  assert.deepEqual(voices, { de: 'fresh-de-f00', en: 'fresh-en-f00' });
  assert.equal(voiceIndex('de'), 0);
  assert.equal(voiceIndex('en'), 32);
  assert.deepEqual(fixtureOracle['de-article-v1'], {
    language: 'de', spans: 109, utterances: 349, maximumTokens: 130,
    tokenStressSha256: 'a9900703dd4607881f0170b303b533d7ead28a5057208fee033ddf10f5029633',
  });
  assert.deepEqual(fixtureOracle['english-20k-v1'], {
    language: 'en', spans: 93, utterances: 279, maximumTokens: 129,
    tokenStressSha256: '250950b3b3c6ae1f51264948131bbc56d90d85b16bb100a9a1e4471ea7350dfd',
  });
  assert.equal(getModelParameters('tiny-voca-de-en').parameterCount, 4563403);
  assert.equal(model.assets.find(asset => asset.id === 'voca64-de-en-noise-tails').sha256,
    '7aa268514bf82df347e740e56da6902e73af01b41c00344f15180bf909d53437');
});

test('Voca64 planner preserves punctuation-only official pieces while validating the 88-token ABI', () => {
  const quote = { ids: [1, 11, 2], stress: [0, 0, 0] };
  assert.equal(validatePlan(quote), quote);
  assert.throws(() => validatePlan({ ids: [1, 88, 2], stress: [0, 0, 0] }), /phoneme ABI/);
  assert.throws(() => validatePlan({ ids: [1, 20], stress: [0] }), /invalid token\/stress/);
  assert.throws(() => voiceIndex('fr'), /does not support/);
});

test('only the canonical legacy English fixture resolves an absent language; explicit mismatches and unknown routes fail', () => {
  assert.equal(resolveFixtureLanguage('english-20k-v1', undefined), 'en');
  assert.equal(resolveFixtureLanguage('english-20k-v1', 'en'), 'en');
  assert.equal(resolveFixtureLanguage('de-article-v1', 'de'), 'de');
  assert.throws(() => resolveFixtureLanguage('english-20k-v1', 'de'), /fixed English or German fixture route/);
  assert.throws(() => resolveFixtureLanguage('de-article-v1', undefined), /fixed English or German fixture route/);
  assert.throws(() => resolveFixtureLanguage('unknown-fixture', undefined), /fixed English or German fixture route/);
  assert.throws(() => resolveFixtureLanguage('__proto__', undefined), /fixed English or German fixture route/);
});
