import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ALPA_SANSKRIT as profile} from '../web/adapters/alpa-sanskrit-profile.mjs';

const json = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('Alpa pins the released Sanskrit graph and official browser frontend', async () => {
  const {models} = await json('../assets.lock.json');
  const model = models[profile.id];
  assert.equal(model.modelRevision, 'b3973a79888b9c63b2fc6f56140c1699c0bd44d6');
  assert.equal(model.modelRevision, profile.modelRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['sa']);
  const graph = model.assets.find(asset => asset.kind === 'model-weights');
  assert.equal(graph.bytes, 22550089);
  assert.equal(graph.sha256, 'a4602849514fb0a08553b8728b6ca0e8595124c774d2355cd9568b261af69046');
  assert.deepEqual([graph.bytes, graph.sha256], profile.modelAssets['onnx/alpa-v0.2.onnx']);
  const config = model.assets.find(asset => asset.kind === 'model-config');
  assert.deepEqual([config.bytes, config.sha256], profile.modelAssets['onnx/alpa-v0.2.json']);
  const frontend = model.assets.find(asset => asset.id === 'alpa-sanskrit-official-text-v2');
  assert.equal(frontend.url, 'https://alpa.blog/js/text.js?v=ab33b3eb');
  assert.equal(frontend.bytes, profile.frontendAsset.bytes);
  assert.equal(frontend.sha256, profile.frontendAsset.sha256);
  assert.deepEqual([profile.defaultVoice, profile.defaultVoiceIndex, profile.sampleRate], ['female', 0, 24000]);
  assert.deepEqual([profile.speed, profile.pitchShift, profile.pitchRange], [1, 0, 1]);
});

test('Alpa binds the exact registered 90-span Sanskrit article and canonical source', async () => {
  const registry = await json('../fixtures/registry.json');
  const fixture = registry.fixtures.find(entry => entry.id === profile.fixtureId);
  assert.ok(fixture);
  assert.equal(registry.modelDefaults[profile.id], fixture.id);
  assert.equal(registry.modelRequiredFixtures[profile.id], fixture.id);
  assert.deepEqual(registry.modelFrontendLanguages[profile.id], ['sa']);
  assert.equal(fixture.sha256, profile.fixtureSha256);
  assert.equal(fixture.source.sourceSha256, profile.fixtureSourceSha256);
  assert.equal(fixture.language, 'sa');
  const article = await readFile(new URL('../fixtures/' + fixture.articleFile, import.meta.url), 'utf8');
  assert.equal(sha256(article), fixture.sha256);
  assert.equal(article.trim().split('\n\n').length, 27);
  assert.equal(/[A-Za-z0-9()]/u.test(article), false);
  const manifest = await json('../fixtures/' + fixture.chunksFile);
  assert.equal(manifest.articleSha256, fixture.sha256);
  assert.equal(manifest.chunks.length, profile.fixtureOracle.spans);
  for (const [index, span] of manifest.chunks.entries()) {
    assert.equal(span.id, index);
    assert.equal(sha256(article.slice(span.start, span.end)), span.sha256);
  }
});
