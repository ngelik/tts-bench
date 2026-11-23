import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createFrontend } from '../web/tiny-voca-ptbr/frontend.mjs';
import { Dizione } from '../web/tiny-voca-ptbr/assets/dizione/engine.js';
import * as symbols from '../web/tiny-voca-ptbr/assets/dizione/symbols.js';
import { makeTokenizer } from '../web/tiny-voca-ptbr/tokens.js';
import { TINY_VOCA_PTBR } from '../web/adapters/tiny-voca-ptbr-profile.mjs';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');

test('Tiny Voca Brazilian Portuguese reproduces the complete fixture token/stress oracle', async () => {
  const [article, metadata, chunks, lexicon, table] = await Promise.all([
    read('fixtures/pt-br-article-v1.txt'),
    read('fixtures/pt-br-article-v1.meta.json').then(JSON.parse),
    read('fixtures/pt-br-article-v1.chunks.json').then(JSON.parse),
    read('web/tiny-voca-ptbr/assets/dizione/data/lexicon.tsv'),
    read('web/tiny-voca-ptbr/assets/dizione/data/open_table.json').then(JSON.parse),
  ]);
  assert.equal(createHash('sha256').update(article).digest('hex'), TINY_VOCA_PTBR.fixtureSha256);
  assert.equal(metadata.fixtureId, TINY_VOCA_PTBR.fixtureId);
  assert.equal(chunks.chunks.length, TINY_VOCA_PTBR.fixtureOracle.spans);
  const frontend = createFrontend({ Dizione, symbols, makeTokenizer }, lexicon, table, TINY_VOCA_PTBR.maxTokens);
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (const { id, start, end } of chunks.chunks) {
    const plans = frontend.planText(article.slice(start, end));
    assert.ok(plans.length > 0, `fixture span ${id} produces audio tokens`);
    rows.push([id, plans.map(plan => {
      assert.equal(plan.ids.length, plan.stress.length);
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.symbols.filter(symbol => symbol === '<unk>').length;
      return [plan.ids, plan.stress];
    })]);
  }
  const tokenStressSha256 = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  assert.deepEqual({ spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256 }, TINY_VOCA_PTBR.fixtureOracle);
});
