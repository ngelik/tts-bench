import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getAssetLock } from '../lib/catalog.mjs';
import { getModelParameters } from '../lib/model-parameters.mjs';
import {
  englishFinished,
  englishSentences,
  fitEnglishPiece,
  fitJapanesePiece,
  planEnglishText,
  planJapaneseText,
} from '../web/tiny-voca-ja-v3/frontend.mjs';
import { japaneseFinished, japaneseSentences } from '../web/tiny-voca-ja-tsukuyomi-chan/frontend.mjs';
import { TINY_VOCA_JA_V3 as profile } from '../web/adapters/tiny-voca-ja-v3-profile.mjs';

const model = getAssetLock().models[profile.id];
const root = resolve(import.meta.dirname, '..');

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('v3 profile pins the original model, released identity and two native fixture oracles', () => {
  assert.equal(profile.modelRevision, '9b2305c81b9ca92ef8347eba473ea096c86f55c4');
  assert.equal(profile.browserSourceRevision, '49632c552d54a13664c1beb96904bef0154fbfc3');
  assert.equal(profile.assets['model.onnx'][0], 21_392_532);
  assert.equal(profile.assets['model.onnx'][1], '0ecb7542360d78e90a1571e9784c7b6474fbfde8cf43d8bbed12d54bfdb280c7');
  assert.equal(profile.releasedFrontend.version, 'oj-en-1');
  assert.equal(profile.releasedFrontend.fingerprint, 'bca0b6c0ff471d257a723e3d903d115f3e79780bdba2685905c7eb20373a60ff');
  assert.deepEqual([profile.fixtureOracle.spans, profile.fixtureOracle.utterances, profile.fixtureOracle.maximumTokens], [38, 280, 192]);
  assert.equal(profile.fixtureOracle.tokenStressSha256, 'c68fb3028eaea9c8ac20c3f28deab0f5d03d6a980a498a3e362d4b3a7459ee2d');
  assert.deepEqual(profile.fixtureOracle.unknown, [{ id: 5, phones: ['unk'] }]);
  assert.deepEqual([profile.englishFixtureOracle.spans, profile.englishFixtureOracle.utterances, profile.englishFixtureOracle.maximumTokens], [93, 266, 170]);
  assert.equal(profile.englishFixtureOracle.tokenStressSha256, '7dc69c79eebb35904e248f70fd27f157010c4426c48b330fbe4645a6466d407a');
  assert.deepEqual(profile.englishFixtureOracle.unknown, []);
  assert.equal(profile.englishFrontendVersion, 'eSpeak NG 1.52.0');
  assert.deepEqual(Object.keys(profile.espeakAssets).sort(), ['espeak-quiet.data', 'espeak-quiet.mjs', 'espeak-quiet.wasm']);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['ja', 'en']);
  assert.ok(!model.assets.some(asset => /dictionary-assets\.json/.test(asset.target)));
  assert.equal(getModelParameters(profile.id).parameterCount, 4_538_827);
});

test('vendored upstream Apache frontend sources match their pinned digests', async () => {
  for (const [name, [bytes, sha256]] of Object.entries(profile.frontendSourceDigests)) {
    const content = await readFile(resolve(root, 'web/tiny-voca-ja-v3', name));
    assert.equal(content.length, bytes, name);
    assert.equal(digest(content), sha256, name);
  }
});

test('Japanese boundaries reuse the pinned pure helper behavior and preserve one-piece unknown phones', async () => {
  assert.equal(japaneseFinished('今日は晴れです」  '), '今日は晴れです」。');
  assert.deepEqual(japaneseSentences('\uFEFF第一文です。 第二文です！」\n第三文です'), ['第一文です。', '第二文です！」', '第三文です']);
  const plans = await planJapaneseText('甲乙。', async text => ({ ids: Array.from(text, () => 4), stress: Array.from(text, () => 0), unknown: text === '甲乙。' ? ['unk'] : [] }), { maxTokens: 3 });
  assert.deepEqual(plans.map(plan => plan.phones.ids.length), [3]);
  assert.deepEqual(plans[0].phones.unknown, ['unk']);
});

test('English final marks, curly quotes, abbreviations and sentence boundaries follow upstream inference rules', () => {
  assert.equal(englishFinished('She said “go!””  '), 'She said “go!””  ');
  assert.equal(englishFinished('See you :)'), 'See you :).');
  assert.deepEqual(englishSentences('Dr. Smith stayed. It was 3.14 p.m. A second sentence!'), [
    'Dr. Smith stayed.', 'It was 3.14 p.m. A second sentence!',
  ]);
});

test('English and Japanese recursive splitting retain order and native token limits', async () => {
  const ja = await fitJapanesePiece('甲乙丙丁', async text => ({ ids: Array(text.length + 2).fill(7), stress: Array(text.length + 2).fill(0), unknown: [] }), { maxTokens: 4 });
  assert.deepEqual(ja.map(plan => plan.text), ['甲乙', '丙丁']);
  const en = await planEnglishText('One, two, three, four.', async text => ({
    ids: Array(text.split(/\s+/u).length * 3).fill(8), stress: Array(text.split(/\s+/u).length * 3).fill(0), unknown: [],
  }), { maxTokens: 6 });
  assert.ok(en.length >= 2);
  assert.ok(en.every(plan => plan.phones.ids.length <= 6));
  const empty = await fitEnglishPiece('!!!', async () => null, () => assert.fail('No-speech text must not be accepted'));
  assert.equal(empty, 0);
});
