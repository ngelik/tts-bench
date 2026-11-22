import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fitJapanesePiece,
  japaneseFinished,
  japaneseSentences,
  japaneseShorter,
  planJapaneseText,
  visitJapanesePieces,
} from '../web/tiny-voca-ja-tsukuyomi-chan/frontend.mjs';
import { TINY_VOCA_JA_TSUKUYOMI_CHAN as profile } from '../web/adapters/tiny-voca-ja-tsukuyomi-chan-profile.mjs';

test('profile pins the Japanese fixture, release, symbol inventory, and native frontend oracle', () => {
  assert.equal(profile.id, 'tiny-voca-ja-tsukuyomi-chan');
  assert.equal(profile.modelRevision, '7ed75cc5f521cc6be4cb57689b2c038928259ae9');
  assert.equal(profile.browserSourceRevision, '66ee00d2c8cd61b34be1cde5880bac0e45b89fcf');
  assert.equal(profile.fixtureOracle.fixtureId, 'ja-article-v1');
  assert.equal(profile.fixtureOracle.spans, 38);
  assert.equal(profile.fixtureOracle.utterances, 280);
  assert.equal(profile.fixtureOracle.maximumTokens, 171);
  assert.equal(profile.fixtureOracle.tokenAccentBoundarySha256, '90409375724ae71bf3a4af8fae386b5fa19264fd8931502e9b9e092050bfed58');
  assert.equal(profile.offlineSupport.status, 'unsupported');
  assert.equal(profile.symbols.length, 49);
  assert.equal(profile.assetDigests['model.weights.bin'][0], 18_373_632);
});

test('Japanese punctuation completion and sentence boundaries preserve source text', () => {
  assert.equal(japaneseFinished('今日は晴れです。'), '今日は晴れです。');
  assert.equal(japaneseFinished('今日は晴れです」  '), '今日は晴れです」。');
  assert.equal(japaneseFinished('   '), '   ');
  assert.deepEqual(japaneseSentences('\uFEFF第一文です。 第二文です！」\n第三文です'), ['第一文です。', '第二文です！」', '第三文です']);
  assert.deepEqual(japaneseSentences('……！'), []);
});

test('overlong Japanese pieces split first on punctuation, then by Unicode code point', () => {
  assert.deepEqual(japaneseShorter('甲、乙；丙'), ['甲、', '乙；', '丙']);
  assert.deepEqual(japaneseShorter('甲乙😀'), ['甲乙', '😀']);
  assert.deepEqual(japaneseShorter('甲'), []);
});

test('duration guard runs only under token limit and before accepting each waveform plan', async () => {
  const calls = [];
  const phonemize = async text => /^。+$/u.test(text) ? null : ({ ids: Array(text.length).fill(5), accent: Array(text.length).fill([0, 1, 1]), phraseBoundary: Array(text.length).fill(0) });
  const guard = async phones => { calls.push(phones.ids.length); return Array(phones.ids.length).fill(1); };
  const fitted = await fitJapanesePiece('甲乙丙', phonemize, guard, { maxTokens: 2, maxFrames: 10 });
  assert.deepEqual(calls, [2, 1]);
  assert.deepEqual(fitted.map(plan => plan.phones.ids.length), [2, 1]);

  calls.length = 0;
  const noneGuarded = await fitJapanesePiece('甲乙丙', phonemize, guard, { maxTokens: 2, maxFrames: 10 });
  assert.equal(noneGuarded.length, 2);
  assert.deepEqual(calls, [2, 1]);
});

test('duration overflow recursively fits before waveform and unsplittable pieces fail', async () => {
  const calls = [];
  const phonemize = async text => /^。+$/u.test(text) ? null : ({ ids: Array(text.length).fill(5), accent: Array(text.length).fill([0, 1, 1]), phraseBoundary: Array(text.length).fill(0) });
  const guard = async phones => { calls.push(phones.ids.length); return Array(phones.ids.length).fill(6); };
  const fitted = await planJapaneseText('甲乙。', phonemize, guard, { maxTokens: 20, maxFrames: 12 });
  assert.deepEqual(calls, [3, 2]);
  assert.deepEqual(fitted.map(plan => plan.text), ['甲乙']);
  assert.deepEqual(fitted.map(plan => plan.frames), [12]);
  await assert.rejects(fitJapanesePiece('甲', phonemize, guard, { maxTokens: 20, maxFrames: 1 }), /One Japanese character/);
});

test('accepted Japanese pieces are synthesized immediately before planning the next split', async () => {
  const events = [];
  const phonemize = async text => {
    events.push('g2p:' + text.length);
    return { ids: Array(text.length).fill(5), accent: Array(text.length).fill([0, 1, 1]), phraseBoundary: Array(text.length).fill(0) };
  };
  const guard = async phones => {
    events.push('duration:' + phones.ids.length);
    return Array(phones.ids.length).fill(1);
  };
  const accepted = [];
  await visitJapanesePieces('甲乙丙', phonemize, guard, async plan => {
    events.push('wave:' + plan.phones.ids.length);
    accepted.push(plan.text);
  }, { maxTokens: 2, maxFrames: 10 });
  assert.deepEqual(events, ['g2p:3', 'g2p:2', 'duration:2', 'wave:2', 'g2p:1', 'duration:1', 'wave:1']);
  assert.deepEqual(accepted, ['甲乙', '丙']);
});

test('duration graph output must match token count and contain positive frames', async () => {
  const phones = { ids: [5, 6], accent: [[0, 1, 1], [0, 1, 1]], phraseBoundary: [0, 1] };
  await assert.rejects(fitJapanesePiece('甲', async () => phones, async () => [1]), /invalid durations/);
  await assert.rejects(fitJapanesePiece('甲', async () => phones, async () => [0, 0]), /empty prediction/);
});
