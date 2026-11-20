import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defaultFixtureForModel, fixtureLanguage, getBenchmarkFixture, listBenchmarkFixtures, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { validateResult } from '../tools/results.mjs';

const root = resolve(import.meta.dirname, '..');
const digest = value => createHash('sha256').update(value).digest('hex');

test('canonical English fixture has its published 20,000-character identity', async () => {
  const bytes = await readFile(resolve(root, 'fixtures/en-20000.txt'));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const meta = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.meta.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
  assert.equal(bytes.length, 20000);
  assert.equal(text.length, 20000);
  assert.equal(meta.license, 'MIT');
  assert.equal(meta.sha256, '4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b');
  assert.equal(digest(bytes), meta.sha256);
  assert.equal(manifest.articleSha256, meta.sha256);
  assert.equal(manifest.chunks.length, 93);
});

test('canonical chunks are contiguous, individually hashed, and reconstruct the source', async () => {
  const bytes = await readFile(resolve(root, 'fixtures/en-20000.txt'));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const manifest = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
  let offset = 0;
  let rebuilt = '';
  for (let i = 0; i < manifest.chunks.length; i++) {
    const span = manifest.chunks[i];
    const chunk = text.slice(span.start, span.end);
    assert.equal(span.id, i);
    assert.equal(span.start, offset);
    assert.equal(span.end - span.start, span.characters);
    assert.equal(digest(Buffer.from(chunk, 'utf8')), span.sha256);
    rebuilt += chunk;
    offset = span.end;
  }
  assert.equal(offset, text.length);
  assert.equal(rebuilt, text);
});

test('registered fixtures match their UTF-8, Unicode, language, source and span identities', async () => {
  const fixtures = listBenchmarkFixtures();
  assert.deepEqual(fixtures.map(fixture => fixture.id), ['english-20k-v1', 'uk-article-v1']);
  assert.equal(fixtureLanguage('english-20k-smoke-v1'), 'en');
  assert.equal(fixtureLanguage('uk-article-smoke-v1'), 'uk');
  assert.equal(fixtureLanguage('not-registered'), null);
  assert.equal(defaultFixtureForModel('ua-serhiy-0p58m'), 'uk-article-v1');
  assert.equal(requiredFixtureForModel('ua-serhiy-0p58m'), 'uk-article-v1');
  assert.equal(defaultFixtureForModel('phonon'), 'english-20k-v1');
  assert.equal(requiredFixtureForModel('phonon'), null);

  for (const fixture of fixtures) {
    const bytes = await readFile(resolve(root, 'fixtures', fixture.articleFile));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const meta = JSON.parse(await readFile(resolve(root, 'fixtures', fixture.metadataFile), 'utf8'));
    const manifest = JSON.parse(await readFile(resolve(root, 'fixtures', fixture.chunksFile), 'utf8'));
    assert.equal(digest(bytes), fixture.sha256);
    assert.equal(bytes.length, fixture.utf8Bytes);
    assert.equal(text.length, fixture.characters);
    assert.equal(Array.from(text).length, fixture.unicodeCodePoints);
    assert.equal(manifest.targetCharacters, fixture.characters);
    assert.equal(manifest.chunks.length, fixture.chunks);
    assert.equal(meta.fixtureId, fixture.id);
    assert.equal(meta.language, fixture.language);
    assert.equal(meta.sha256, fixture.sha256);
    assert.equal(meta.utf8Bytes, fixture.utf8Bytes);
    assert.equal(meta.javascriptStringLength, fixture.characters);
    assert.equal(meta.unicodeCodePoints, fixture.unicodeCodePoints);
    assert.deepEqual(meta.source, fixture.source);
    assert.equal(fixtureLanguage(fixture.id), fixture.language);
    assert.deepEqual(getBenchmarkFixture(fixture.id), fixture);

    let offset = 0;
    for (const [index, span] of manifest.chunks.entries()) {
      const chunk = text.slice(span.start, span.end);
      assert.equal(span.id, index);
      assert.equal(span.start, offset);
      assert.equal(span.characters, chunk.length);
      assert.equal(digest(Buffer.from(chunk, 'utf8')), span.sha256);
      if (span.end < text.length) {
        const previous = text.charCodeAt(span.end - 1);
        const next = text.charCodeAt(span.end);
        assert.equal(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff, false);
      }
      offset = span.end;
    }
    assert.equal(offset, text.length);
  }
});

test('native full results require the registered non-English fixture metadata', () => {
  const fixture = getBenchmarkFixture('uk-article-v1');
  const result = {
    schemaVersion: 1,
    id: 'uk-fixture-schema-check',
    createdAt: '2026-11-20T00:00:00.000Z',
    origin: 'native',
    protocol: { id: 'browser-tts-cached-v1', scenario: 'cached', timingBoundary: 'Schema fixture.', warmupRuns: 0, repetitions: 1, smoke: false, networkMbps: null },
    environment: { machineLabel: 'Schema check', os: 'Darwin 25.6.0', arch: 'arm64', cpu: 'Apple M1 Pro', logicalCores: 8, ramBytes: 17179869184, chromeVersion: 'Google Chrome 157', gpu: null, headless: false },
    fixture: { id: fixture.id, language: fixture.language, sha256: fixture.sha256, characters: fixture.characters,
      unicodeCodePoints: fixture.unicodeCodePoints, utf8Bytes: fixture.utf8Bytes, chunks: fixture.chunks, source: fixture.source },
    source: { gitCommit: null, dirty: true, manifestSha256: 'a'.repeat(64) },
    assets: [{ id: 'fixture-only-runtime', sha256: 'b'.repeat(64), bytes: 1 }],
    cells: [{ model: 'ua-serhiy-0p58m', backendRequested: 'cpu', backendEffective: 'cpu/wasm', status: 'unsupported',
      reason: 'Schema-only test.', voice: 'Serhiy', precision: 'FP32', settings: {},
      capability: { gpuDispatchVerified: false, description: 'Schema-only test.' }, warmup: [], trials: [] }],
    notes: [],
  };
  assert.equal(validateResult(result), result);
  for (const [mutate, pattern] of [
    [copy => { copy.fixture.language = 'en'; }, /Fixture language/],
    [copy => { copy.fixture.characters++; }, /registered SHA/],
    [copy => { copy.fixture.source.sourceLanguage = 'uk'; }, /source provenance/],
    [copy => { delete copy.fixture.unicodeCodePoints; }, /non-English results/],
    [copy => { delete copy.fixture.source; }, /non-English results/],
  ]) {
    const invalid = structuredClone(result);
    mutate(invalid);
    assert.throws(() => validateResult(invalid), pattern);
  }
});
