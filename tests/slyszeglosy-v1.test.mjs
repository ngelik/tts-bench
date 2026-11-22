import test from 'node:test';
import assert from 'node:assert/strict';
import { SLYSZE_GLOSY_V1_PROFILE as profile } from '../web/adapters/slyszeglosy-v1-config.mjs';
import { defaultFixtureForModel, fixtureLanguage, frontendLanguagesForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { getAssetLock } from '../lib/catalog.mjs';

test('Słyszę Głosy V1 is constrained to the Polish article and F voice', () => {
  assert.equal(defaultFixtureForModel('slyszeglosy-v1'), 'pl-article-v1');
  assert.equal(requiredFixtureForModel('slyszeglosy-v1'), 'pl-article-v1');
  assert.deepEqual(frontendLanguagesForModel('slyszeglosy-v1'), ['pl']);
  assert.equal(fixtureLanguage('pl-article-v1'), 'pl');
  assert.deepEqual(profile.voices, { F: 0, M: 1 });
  assert.deepEqual(profile.fixtureOracle['pl-article-v1'], {
    language: 'pl', spans: 98, utterances: 324, maximumTokens: 233, unknownPhonemes: 0,
    fixtureSha256: '09e2f4876dca3feaf6c40ff9631dcdad383bf359d8d1a004c28510003668631d',
    tokenStressSha256: 'fde1d51a074ed33d0c8fba076150d4045549bb9e45bc0bf9dc656e82cceb9bf1',
  });
});

test('Słyszę Głosy source, model and shared runtimes are pinned with noncommercial acknowledgment', () => {
  const model = getAssetLock().models['slyszeglosy-v1'];
  assert.equal(model.modelRevision, profile.modelRevision);
  assert.equal(model.browserSourceRevision, profile.sourceRevision);
  assert.equal(model.license.requiresAcceptance, true);
  assert.equal(model.runtime.version, '1.20.1');
  assert.deepEqual(model.runtime.files, []);
  assert.equal(model.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.ok(model.assets.some(asset => asset.target.endsWith('/assets/frontend/slyszeglosy_text.py')));
  assert.ok(model.assets.some(asset => asset.target.endsWith('/ort.webgpu.min.js')));
  assert.ok(model.assets.every(asset => !asset.target.startsWith('.cache/public/')));
  assert.deepEqual(model.support.languages, ['pl']);
});
