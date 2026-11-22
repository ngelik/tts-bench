import test from 'node:test';
import assert from 'node:assert/strict';
import { KOREAN_TTS_PROFILE as profile } from '../web/adapters/korean-tts-config.mjs';
import { defaultFixtureForModel, fixtureLanguage, frontendLanguagesForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { getAssetLock } from '../lib/catalog.mjs';

test('Korean TTS registers only the Korean and English fixture routes', () => {
  assert.equal(defaultFixtureForModel('korean-tts'), 'ko-article-v1');
  assert.equal(requiredFixtureForModel('korean-tts'), null);
  assert.deepEqual(frontendLanguagesForModel('korean-tts'), ['ko', 'en']);
  assert.equal(fixtureLanguage('ko-article-v1'), 'ko');
  assert.equal(fixtureLanguage('english-20k-v1'), 'en');
});

test('Korean TTS full-fixture oracle and bilingual loanword control are pinned', () => {
  assert.deepEqual(profile.fixtureOracle['ko-article-v1'], {
    language: 'ko', spans: 47, utterances: 306, maximumTokens: 185,
    tokenStressSha256: '59bd3e7412386b6d821536dd64d89d432accb0b2d40b0bda14ebd7f1736c20e5',
    firstSpanSamples: 833536, firstSpanGpuDispatches: 5880,
  });
  assert.deepEqual(profile.fixtureOracle['english-20k-v1'], {
    language: 'en', spans: 93, utterances: 253, maximumTokens: 165,
    tokenStressSha256: '23818df42a87890720dc65f08fa61b04104fa3f4f7d6e96126ab9d851138d4df',
    firstSpanSamples: 338176, firstSpanGpuDispatches: 2520,
  });
  assert.equal(profile.diagnosticControl.text, '오늘 Python으로 테스트를 진행했습니다.');
  assert.equal(profile.diagnosticControl.voice, 'KSS');
  assert.equal(profile.diagnosticControl.mode, 'ko-loan');
  assert.equal(profile.diagnosticControl.ids.length, 44);
  assert.equal(profile.diagnosticControl.stress.length, 44);
  assert.ok(profile.diagnosticControl.stress.every(value => value === 0));
});

test('Korean TTS lock pins local runtime files and noncommercial acceptance', () => {
  const model = getAssetLock().models['korean-tts'];
  assert.equal(model.modelRevision, profile.sourceRevision);
  assert.equal(model.license.requiresAcceptance, true);
  assert.equal(model.runtime.version, '1.20.1');
  assert.deepEqual(model.runtime.files, []);
  assert.equal(model.assets.length, 26);
  assert.equal(model.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(model.assets.filter(asset => asset.kind === 'runtime').length, 15);
  assert.ok(model.assets.every(asset => !asset.target.startsWith('.cache/public/')));
  assert.ok(model.assets.some(asset => asset.target.endsWith('/assets/config.json')));
  assert.ok(model.assets.some(asset => asset.target.endsWith('/ort.webgpu.min.js')));
  assert.deepEqual(model.support.languages, ['ko', 'en']);
});
