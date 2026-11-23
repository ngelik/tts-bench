import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  FIATO,
  resolveFiatoLanguage,
  resolveFiatoVoice,
  supportsFiatoFixture,
} from '../web/adapters/fiato-profile.mjs';
import { finished, sentences } from '../web/tiny-voca/fiato-frontend.mjs';

const readRepoJson = path => readFile(new URL(path, import.meta.url), 'utf8').then(JSON.parse);

test('Fiato uses the immutable canonical article and publisher default route', async () => {
  const registry = await readRepoJson('../fixtures/registry.json');
  const fixture = registry.fixtures.find(entry => entry.id === FIATO.fixtureId);
  assert.equal(fixture.language, 'en');
  assert.equal(fixture.chunks, FIATO.fixtureOracle.spans);
  assert.equal(fixture.characters, 20_000);
  const article = await readFile(new URL('../fixtures/' + fixture.articleFile, import.meta.url));
  assert.equal(createHash('sha256').update(article).digest('hex'), FIATO.fixtureSha256);
  assert.equal(resolveFiatoLanguage(undefined), 'en');
  assert.equal(resolveFiatoLanguage('en', 'en-US'), 'en');
  assert.throws(() => resolveFiatoLanguage('fr'), /supports en only/);
  assert.throws(() => resolveFiatoLanguage('en', 'fr-FR'), /supports en-US only/);
  assert.deepEqual(resolveFiatoVoice(undefined), { id: 'F1', index: 0 });
  assert.throws(() => resolveFiatoVoice('M1'), /Unsupported Fiato voice/);
  assert.throws(() => resolveFiatoVoice('unknown'), /Unsupported Fiato voice/);
  assert.equal(supportsFiatoFixture(fixture.id), true);
  assert.equal(supportsFiatoFixture('another-fixture'), false);
  assert.deepEqual(registry.modelFrontendLanguages.fiato, ['en']);
});

test('Fiato keeps the official sentence and expression boundaries', () => {
  assert.deepEqual(sentences('Dr. Lane called Mr. Fox. Then he left'), [
    'Dr. Lane called Mr. Fox.',
    'Then he left',
  ]);
  assert.deepEqual(sentences('It ended. Next, <gasp> I saw the ship.'), [
    'It ended.',
    'Next, <gasp> I saw the ship.',
  ]);
  assert.deepEqual(sentences('Wait! <gasp> You are telling me?'), [
    'Wait! <gasp> You are telling me?',
  ]);
  assert.equal(finished('Wait <sigh>'), 'Wait <sigh>.');
  assert.equal(finished('Wait <exhale>.'), 'Wait <exhale>.');
  assert.equal(finished('Stop! <gasp>'), 'Stop! <gasp>');
  assert.deepEqual(FIATO.expressionTokenIds, { '<sigh>': 76, '<exhale>': 77, '<gasp>': 78 });
});

test('Fiato locks the stock graph, pronunciation archive and browser backend closure', async () => {
  const lock = (await readRepoJson('../assets.lock.json')).models.fiato;
  assert.equal(lock.modelRevision, FIATO.modelRevision);
  assert.equal(lock.parameterCount, FIATO.parameterCount);
  assert.deepEqual(lock.backends, ['cpu', 'webgpu']);
  assert.equal(lock.runtime.version, FIATO.runtimeVersion);
  const modelRoot = FIATO.modelRoot.slice(1);
  const pairs = [
    ...Object.entries(FIATO.modelAssets),
    ...Object.entries(FIATO.phonemizerLicenses),
    ['demo/worker.js', [FIATO.officialWorkerSource.bytes, FIATO.officialWorkerSource.sha256]],
  ];
  for (const [path, [bytes, sha256]] of pairs) {
    const pin = lock.assets.find(asset => asset.target === modelRoot + path);
    assert.ok(pin, path);
    assert.deepEqual([pin.bytes, pin.sha256], [bytes, sha256], path);
  }
  const expectedRuntime = Object.keys(FIATO.runtimeFiles).sort();
  assert.deepEqual(lock.runtime.files.filter(asset => asset.kind !== 'license')
    .map(asset => asset.path.split('/').at(-1)).sort(), expectedRuntime);
});
