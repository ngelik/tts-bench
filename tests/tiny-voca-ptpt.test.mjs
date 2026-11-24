import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { TINY_VOCA_PTPT as profile } from '../web/adapters/tiny-voca-ptpt-profile.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const load = path => readFile(new URL('../' + path, import.meta.url));

test('the Portuguese pronunciation oracle covers each registered source span', async () => {
  const bytes = await load('web/tiny-voca-ptpt/frontend-coverage.json');
  assert.equal(sha256(bytes), profile.fixtureOracle.coverageSha256);
  const oracle = JSON.parse(bytes);
  const manifest = await load('fixtures/pt-pt-article-v1.chunks.json');
  assert.equal(sha256(manifest), profile.fixtureOracle.chunkManifestSha256);
  const { chunks } = JSON.parse(manifest);
  const article = (await load('fixtures/pt-pt-article-v1.txt')).toString();
  assert.equal(sha256(article), oracle.fixtureSha256);
  assert.equal(oracle.coverage.length, chunks.length);
  for (const [index, row] of oracle.coverage.entries()) {
    const chunk = chunks[index];
    assert.equal(row.chunk, chunk.id);
    assert.equal(sha256(article.slice(chunk.start, chunk.end)), chunk.sha256);
    assert.ok(row.parts.length > 0);
  }
  const parts = oracle.coverage.flatMap(row => row.parts);
  assert.equal(parts.length, profile.fixtureOracle.utterances);
  assert.equal(Math.max(...parts.map(part => part.tokens)), profile.fixtureOracle.maximumTokens);
});

test('the Portuguese worker rejects an incorrect locale or article before asset loading', async t => {
  const replies = [];
  globalThis.self = {postMessage: reply => replies.push(reply)};
  t.after(() => { delete globalThis.self; });
  await import('../web/workers/tiny-voca-ptpt.mjs');
  for (const [options, reason] of [
    [{backend: 'cpu', language: 'pt-BR', fixtureId: profile.fixtureId}, /exact pt-PT profile/],
    [{backend: 'cpu', language: profile.language, fixtureId: profile.fixtureId, sourceSha256: '0'.repeat(64)}, /source SHA-256/],
    [{backend: 'auto', language: profile.language, fixtureId: profile.fixtureId}, /explicit cpu or webgpu backend/],
  ]) {
    await self.onmessage({data: {id: 1, action: 'initialize', options}});
    assert.match(replies.pop().error, reason);
  }
});
