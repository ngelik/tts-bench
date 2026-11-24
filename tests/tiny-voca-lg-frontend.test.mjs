import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LUGANDA_SYMBOLS, finished, limitSpanPeak, phonemizeText, sentences } from '../web/adapters/tiny-voca-lg-frontend.mjs';
import { lug } from '../web/tiny-voca-lg/lug.js';
import { TINY_VOCA_LG } from '../web/adapters/tiny-voca-lg-profile.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const fixtureRoot = new URL('../fixtures/', import.meta.url);
const article = await readFile(new URL('lg-article-v1.txt', fixtureRoot), 'utf8');
const manifest = JSON.parse(await readFile(new URL('lg-article-v1.chunks.json', fixtureRoot), 'utf8'));

test('finished and sentence boundaries follow the stock Luganda worker', () => {
  assert.equal(finished('Mara'), 'Mara.');
  assert.equal(finished('Mara!'), 'Mara!');
  assert.deepEqual(sentences('Dr. Jo asked. Next. A-17?'), ['Dr. Jo asked.', 'Next.', 'A-17?']);
});

test('complete-span limiter caps an over-unity sample at the pinned 0.99 peak', () => {
  const samples = Float32Array.of(0.25, -1.2, 0.6);
  const result = limitSpanPeak(samples);
  assert(Math.abs(result.rawPeak - 1.2) < 1e-6);
  assert.equal(result.cappedPeak, 0.99);
  assert(Math.max(...samples.map(Math.abs)) <= 0.990001);
  assert(Math.abs(samples[1] + 0.99) < 1e-6);
});

test('registered canonical spans match pinned Python word and whole-span controls', () => {
  assert.equal(TINY_VOCA_LG.fixtureId, 'lg-article-v1');
  assert.equal(sha256(article), TINY_VOCA_LG.fixtureSha256);
  assert.equal(manifest.articleSha256, TINY_VOCA_LG.fixtureSha256);
  assert.equal(manifest.chunks.length, TINY_VOCA_LG.fixtureOracle.spans);
  assert.equal(manifest.chunks.length, 117);

  const wholeSpanRows = [];
  const wordRows = [];
  for (const [index, chunk] of manifest.chunks.entries()) {
    assert.equal(chunk.id, index);
    const text = article.slice(chunk.start, chunk.end);
    assert.equal(sha256(text), chunk.sha256);
    assert.equal(chunk.sha256, TINY_VOCA_LG.fixtureOracle.spanSha256[index]);

    const whole = lug.phonemize(text);
    assert(whole, `stock frontend produced phones for source chunk ${index}`);
    wholeSpanRows.push([index, whole.ids, whole.stress]);

    const words = [];
    for (const [punctuation, piece] of lug.chunks(lug.normalizeText(text))) {
      if (punctuation) continue;
      for (const phones of lug.words(piece)) words.push(phones.map(phone => [phone, 0]));
    }
    wordRows.push([index, words]);
  }
  assert.equal(sha256(JSON.stringify(wholeSpanRows)), TINY_VOCA_LG.fixtureOracle.pythonJsWholeSpanTokenStressSha256);
  assert.equal(sha256(JSON.stringify(wordRows)), TINY_VOCA_LG.fixtureOracle.pythonJsWordLevelSha256);
});

test('stock worker plans match all 117 pinned per-span token and stress oracles', () => {
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  for (const [index, chunk] of manifest.chunks.entries()) {
    const text = article.slice(chunk.start, chunk.end);
    const plans = phonemizeText(text);
    assert(plans.length, `stock sentence/fit controls produced an utterance for chunk ${index}`);
    const planRows = plans.map(({ tokens, stress }) => [tokens, stress]);
    const digest = sha256(JSON.stringify(planRows));
    assert.equal(digest, TINY_VOCA_LG.fixtureOracle.spanTokenStressSha256[index], `span token/stress oracle ${index}`);
    rows.push([index, planRows]);
    utterances += plans.length;
    for (const plan of plans) {
      assert.equal(plan.tokens.length, plan.stress.length);
      assert(plan.tokens.length <= TINY_VOCA_LG.maxTokens - 12);
      assert(plan.tokens.every(token => Number.isInteger(token) && token >= 0 && token < LUGANDA_SYMBOLS.length));
      maximumTokens = Math.max(maximumTokens, plan.tokens.length);
      unknownTokens += plan.tokens.filter(token => token === 4).length;
    }
  }
  assert.equal(utterances, TINY_VOCA_LG.fixtureOracle.utterances);
  assert.equal(maximumTokens, TINY_VOCA_LG.fixtureOracle.maximumTokens);
  assert.equal(unknownTokens, TINY_VOCA_LG.fixtureOracle.unknownTokens);
  assert.equal(sha256(JSON.stringify(rows)), TINY_VOCA_LG.fixtureOracle.tokenStressSha256);
});
