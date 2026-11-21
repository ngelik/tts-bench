import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { addFixture, checkFixtures, execute } from '../tools/translation-fixture.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const canonicalEnglishBytes = await readFile(join(repoRoot, 'fixtures/en-20000.txt'));
const canonicalRegistry = JSON.parse(await readFile(join(repoRoot, 'fixtures/registry.json'), 'utf8'));
const canonicalEnglishEntry = canonicalRegistry.fixtures.find(fixture => fixture.id === 'english-20k-v1');

async function fixtureCheckout(t) {
  const root = await mkdtemp(join(tmpdir(), 'translation-fixture-test-'));
  const fixtures = join(root, 'fixtures');
  await mkdir(fixtures);
  await writeFile(join(fixtures, 'en-20000.txt'), canonicalEnglishBytes);
  await writeFile(join(fixtures, 'en-20000.chunks.json'), await readFile(join(repoRoot, 'fixtures/en-20000.chunks.json')));
  await writeFile(join(fixtures, 'en-20000.meta.json'), await readFile(join(repoRoot, 'fixtures/en-20000.meta.json')));
  await writeFile(join(fixtures, 'registry.json'), `${JSON.stringify({
    schemaVersion: 1,
    defaultFixtureId: 'english-20k-v1',
    fixtures: [canonicalEnglishEntry],
    modelDefaults: {},
    modelRequiredFixtures: {},
  }, null, 2)}\n`);
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('add preserves Unicode text exactly and emits browser-compatible deterministic chunks', async t => {
  const root = await fixtureCheckout(t);
  const text = ('中文語句無空格，測試分塊。e\u0301👩‍🔬 العربية שלום  \n').repeat(43) + 'Final ending.\n';
  const input = join(root, 'translation.txt');
  await writeFile(input, Buffer.from(text, 'utf8'));
  const args = [
    'add', '--language', 'zh-hant-tw', '--id', 'mixed-script-story-v1', '--text', input,
    '--creator', 'Translator credit', '--description', 'Translation provenance and review status recorded by the contributor.',
    '--license', 'MIT',
  ];

  const added = await execute(args, root);
  assert.equal(added.status, 'added');
  assert.equal(added.fixture.language, 'zh-Hant-TW');
  assert.equal(added.fixture.characters, text.length);
  assert.equal(added.fixture.unicodeCodePoints, Array.from(text).length);
  assert.notEqual(added.fixture.characters, added.fixture.unicodeCodePoints);
  assert.equal(added.fixture.utf8Bytes, Buffer.byteLength(text));
  assert.equal(added.fixture.chunks > 1, true);
  assert.deepEqual(added.contentContract, {
    utf8Bom: 'rejected',
    lineEndings: 'LF only; CR and CRLF rejected',
    finalLf: 'preserved exactly as supplied and included in counts and hashes',
  });

  const fixtureBytes = await readFile(join(root, 'fixtures/mixed-script-story-v1.txt'));
  assert.deepEqual(fixtureBytes, Buffer.from(text, 'utf8'));
  const registry = JSON.parse(await readFile(join(root, 'fixtures/registry.json'), 'utf8'));
  const fixture = registry.fixtures.at(-1);
  assert.equal(fixture.id, 'mixed-script-story-v1');
  assert.equal(fixture.smokeId, 'mixed-script-story-smoke-v1');
  assert.equal(fixture.source.description, 'Translation provenance and review status recorded by the contributor.');
  assert.equal(fixture.source.sourceSha256, canonicalEnglishEntry.sha256);

  const manifestBytes = await readFile(join(root, 'fixtures/mixed-script-story-v1.chunks.json'), 'utf8');
  const manifest = JSON.parse(manifestBytes);
  const segments = new Set([0, text.length, ...[...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(text)]
    .flatMap(segment => [segment.index, segment.index + segment.segment.length])]);
  let cursor = 0;
  let reconstructed = '';
  for (const [index, chunk] of manifest.chunks.entries()) {
    assert.equal(chunk.id, index);
    assert.equal(chunk.start, cursor);
    assert.ok(chunk.end > chunk.start);
    assert.ok(chunk.end - chunk.start <= 250);
    assert.ok(segments.has(chunk.start));
    assert.ok(segments.has(chunk.end));
    const part = text.slice(chunk.start, chunk.end);
    assert.equal(chunk.characters, part.length);
    reconstructed += part;
    cursor = chunk.end;
  }
  assert.equal(cursor, text.length);
  assert.equal(reconstructed, text);
  const finalSpan = manifest.chunks.at(-1);
  const finalText = text.slice(finalSpan.start, finalSpan.end);
  assert.match(finalText, /Final ending\.\n$/);
  assert.match(finalText, /[^\s]/u);
  const otherRoot = await fixtureCheckout(t);
  const otherInput = join(otherRoot, 'same-text.txt');
  await writeFile(otherInput, Buffer.from(text, 'utf8'));
  await addFixture({
    root: otherRoot, language: 'zh-Hant-TW', id: 'same-story-v1', text: otherInput, creator: 'Translator credit',
    description: 'Translation provenance and review status recorded by the contributor.', license: 'MIT',
  });
  const otherManifest = JSON.parse(await readFile(join(otherRoot, 'fixtures/same-story-v1.chunks.json'), 'utf8'));
  assert.deepEqual(otherManifest.chunks, manifest.chunks);
  assert.equal((await checkFixtures({ root, id: fixture.id })).status, 'ok');
  assert.deepEqual(await execute(['check', '--id', fixture.id], root), await checkFixtures({ root, id: fixture.id }));
  assert.deepEqual(await execute(['list'], root), {
    fixtures: [
      {
        id: canonicalEnglishEntry.id, smokeId: canonicalEnglishEntry.smokeId, language: 'en', characters: canonicalEnglishEntry.characters,
        unicodeCodePoints: canonicalEnglishEntry.unicodeCodePoints, utf8Bytes: canonicalEnglishEntry.utf8Bytes,
        chunks: canonicalEnglishEntry.chunks, sha256: canonicalEnglishEntry.sha256,
      },
      added.fixture,
    ],
  });
});

test('check rejects empty creator or license and authored grapheme-splitting offsets', async t => {
  const root = await fixtureCheckout(t);
  const input = join(root, 'grapheme.txt');
  const text = `${'x'.repeat(220)}e\u0301${'z'.repeat(40)}`;
  await writeFile(input, text);
  await addFixture({
    root, language: 'uk-UA', id: 'grapheme-story-v1', text: input, creator: 'Contributor',
    description: 'Translation and review provenance supplied by the contributor.', license: 'MIT',
  });
  const metadataPath = join(root, 'fixtures/grapheme-story-v1.meta.json');
  const originalMetadata = await readFile(metadataPath, 'utf8');
  const metadata = JSON.parse(originalMetadata);
  metadata.creator = '';
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  await assert.rejects(checkFixtures({ root, id: 'grapheme-story-v1' }), /creator and license metadata/);
  metadata.creator = 'Contributor';
  metadata.license = '';
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  await assert.rejects(checkFixtures({ root, id: 'grapheme-story-v1' }), /creator and license metadata/);
  await writeFile(metadataPath, originalMetadata);

  const manifestPath = join(root, 'fixtures/grapheme-story-v1.chunks.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.chunks[0].end, 220);
  const split = 221;
  const article = text;
  const first = article.slice(0, split);
  const second = article.slice(split);
  manifest.chunks[0].end = split;
  manifest.chunks[0].characters = first.length;
  manifest.chunks[0].sha256 = createHash('sha256').update(first, 'utf8').digest('hex');
  manifest.chunks[1].start = split;
  manifest.chunks[1].characters = second.length;
  manifest.chunks[1].sha256 = createHash('sha256').update(second, 'utf8').digest('hex');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await assert.rejects(checkFixtures({ root, id: 'grapheme-story-v1' }), /grapheme-safe, speakable chunk/);
});

test('add preserves final-newline choices and rejects BOM, CRLF, and invalid UTF-8 without registry mutation', async t => {
  const root = await fixtureCheckout(t);
  const registryPath = join(root, 'fixtures/registry.json');
  const before = await readFile(registryPath);
  const common = {
    root, language: 'ar-EG', id: 'arabic-story-v1', creator: 'Contributor',
    description: 'Translated text with stated review provenance.', license: 'MIT',
  };
  const noFinalLf = join(root, 'no-final-lf.txt');
  await writeFile(noFinalLf, 'مرحبا e\u0301');
  const result = await addFixture({ ...common, text: noFinalLf });
  const metadata = JSON.parse(await readFile(join(root, 'fixtures/arabic-story-v1.meta.json'), 'utf8'));
  assert.equal(metadata.terminalNewline, 'none');
  assert.equal(await readFile(join(root, 'fixtures/arabic-story-v1.txt'), 'utf8'), 'مرحبا e\u0301');
  assert.equal(result.fixture.language, 'ar-EG');

  const committedRegistry = await readFile(registryPath);
  for (const [name, bytes, message] of [
    ['bom.txt', Buffer.from([0xef, 0xbb, 0xbf, 0x61]), /without a byte-order mark/],
    ['crlf.txt', Buffer.from('one\r\ntwo\n', 'utf8'), /CR or CRLF/],
    ['invalid.txt', Buffer.from([0x61, 0xc3, 0x28]), /not valid UTF-8/],
    ['whitespace.txt', Buffer.from(' \n\t', 'utf8'), /at least one non-whitespace character/],
  ]) {
    const input = join(root, name);
    await writeFile(input, bytes);
    await assert.rejects(addFixture({ ...common, id: name.replace('.txt', '-v1'), text: input }), message);
    assert.deepEqual(await readFile(registryPath), committedRegistry);
    assert.equal(await readFile(join(root, 'fixtures/.translation-fixture.lock')).then(() => true, () => false), false);
  }
  assert.notDeepEqual(committedRegistry, before);
});

test('add is immutable and collision or concurrent-lock failures preserve registry and files', async t => {
  const root = await fixtureCheckout(t);
  const registryPath = join(root, 'fixtures/registry.json');
  const input = join(root, 'text.txt');
  await writeFile(input, 'A short translated fixture.\n');
  const options = {
    root, language: 'fr-CA', id: 'french-story-v1', text: input, creator: 'Contributor',
    description: 'Translation and review provenance supplied by the contributor.', license: 'MIT',
  };
  await addFixture(options);
  const committedRegistry = await readFile(registryPath);
  const oldText = await readFile(join(root, 'fixtures/french-story-v1.txt'));
  await writeFile(input, 'replacement that must not overwrite\n');
  await assert.rejects(addFixture(options), /already exists and is immutable/);
  assert.deepEqual(await readFile(registryPath), committedRegistry);
  assert.deepEqual(await readFile(join(root, 'fixtures/french-story-v1.txt')), oldText);

  await assert.rejects(addFixture({ ...options, id: 'french-story-smoke-v1' }), /collides with an existing fixture or smoke ID/);
  await addFixture({ ...options, id: 'spanish-smoke-v1' });
  await assert.rejects(addFixture({ ...options, id: 'spanish-v1' }), /collides with an existing fixture or smoke ID/);
  const registryAfterNamespaceChecks = await readFile(registryPath);

  const otherId = { ...options, id: 'german-story-v1' };
  const collision = join(root, 'fixtures/german-story-v1.txt');
  await writeFile(collision, 'pre-existing orphan\n');
  await assert.rejects(addFixture(otherId), /Refusing to overwrite existing fixture file/);
  assert.deepEqual(await readFile(registryPath), registryAfterNamespaceChecks);
  assert.equal(await readFile(collision, 'utf8'), 'pre-existing orphan\n');

  await writeFile(join(root, 'fixtures/.translation-fixture.lock'), 'owned by another process\n');
  await assert.rejects(addFixture({ ...otherId, id: 'italian-story-v1' }), /Another translation-fixture add holds/);
  assert.deepEqual(await readFile(registryPath), registryAfterNamespaceChecks);
  assert.equal(await readFile(join(root, 'fixtures/.translation-fixture.lock'), 'utf8'), 'owned by another process\n');
});

test('add fails closed when the canonical English source bytes do not match the pin', async t => {
  const root = await fixtureCheckout(t);
  const registryPath = join(root, 'fixtures/registry.json');
  const before = await readFile(registryPath);
  await writeFile(join(root, 'fixtures/en-20000.txt'), Buffer.from('tampered English source', 'utf8'));
  const input = join(root, 'new-text.txt');
  await writeFile(input, 'Translated text.\n');
  await assert.rejects(addFixture({
    root, language: 'es-MX', id: 'spanish-story-v1', text: input, creator: 'Contributor',
    description: 'Translation and review provenance supplied by the contributor.', license: 'MIT',
  }), /Canonical English source file SHA-256/);
  assert.deepEqual(await readFile(registryPath), before);
  assert.equal(await readFile(join(root, 'fixtures/spanish-story-v1.txt')).then(() => true, () => false), false);
});

test('list rejects noncanonical language casing in the registry', async t => {
  const root = await fixtureCheckout(t);
  const input = join(root, 'text.txt');
  await writeFile(input, 'A short translated fixture.\n');
  await addFixture({
    root, language: 'zh-hant', id: 'traditional-story-v1', text: input, creator: 'Contributor',
    description: 'Translation and review provenance supplied by the contributor.', license: 'MIT',
  });
  const registryPath = join(root, 'fixtures/registry.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  assert.equal(registry.fixtures.at(-1).language, 'zh-Hant');
  registry.fixtures.at(-1).language = 'zh-hant';
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  await assert.rejects(execute(['list'], root), /canonical BCP 47 casing/);
});

test('CLI parser enforces the documented command shape', async () => {
  assert.match((await execute(['--help'])).help, /line endings/);
  await assert.rejects(execute(['add', '--language', 'en_US', '--id', 'x-v1', '--text', 'x', '--creator', 'a', '--description', 'b', '--license', 'MIT']), /Invalid BCP 47/);
  await assert.rejects(execute(['add', '--language', 'uk', '--id', '../escape-v1', '--text', 'x', '--creator', 'a', '--description', 'b', '--license', 'MIT']), /safe, lowercase, versioned/);
  await assert.rejects(execute(['add', '--language', 'uk', '--id', 'no-license-v1', '--text', 'x', '--creator', 'a', '--description', 'b']), /Missing required option: --license/);
  await assert.rejects(execute(['list', '--id', 'english-20k-v1']), /does not accept options/);
  await assert.rejects(execute(['check', '--language', 'uk']), /accepts only --id/);
  assert.equal(canonicalEnglishBytes.length, canonicalEnglishEntry.utf8Bytes);
});
