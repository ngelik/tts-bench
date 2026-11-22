import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontendFingerprint, phonemize } from '../web/alpa-es/frontend.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('Alpa Spanish frontend matches the four pinned native controls', async () => {
  const oracle = JSON.parse(await readFile(resolve(ROOT, 'tests/fixtures-alpa-es-controls.json'), 'utf8'));
  assert.equal(await frontendFingerprint(), oracle.fingerprint);
  for (const expected of oracle.controls) {
    const actual = phonemize(expected.text);
    for (const key of ['symbols', 'ids', 'weight', 'unknown']) assert.deepEqual(actual[key], expected[key], `${expected.id} ${key}`);
  }
});

test('Alpa Spanish frontend matches all registered fixture spans and the native token/weight digest', async () => {
  const articleBytes = await readFile(resolve(ROOT, 'fixtures/es-ar-article-v1.txt'));
  const article = articleBytes.toString('utf8');
  const spans = JSON.parse(await readFile(resolve(ROOT, 'fixtures/es-ar-article-v1.chunks.json'), 'utf8'));
  const rows = [], unknownCounts = new Map();
  let maximumTokens = 0, unknownGroups = 0, spansWithUnknowns = 0;
  for (const span of spans.chunks) {
    const text = article.slice(span.start, span.end);
    assert.equal(sha256(text), span.sha256, `fixture span ${span.id} digest`);
    const phones = phonemize(text);
    maximumTokens = Math.max(maximumTokens, phones.ids.length);
    rows.push([span.id, [phones.ids, phones.weight]]);
    if (phones.unknown.length) spansWithUnknowns++;
    for (const value of phones.unknown) { unknownGroups++; unknownCounts.set(value, (unknownCounts.get(value) ?? 0) + 1); }
  }
  assert.equal(sha256(articleBytes), 'cfcf5a8095bab6894cc93faad6d3a01f2bfbf731144f54a66b61309fb507bcb4');
  assert.equal(spans.chunks.length, 104);
  assert.equal(maximumTokens, 218);
  assert.equal(unknownGroups, 63);
  assert.equal(spansWithUnknowns, 34);
  assert.deepEqual(Object.fromEntries([...unknownCounts].sort(([a], [b]) => a.localeCompare(b))), JSON.parse(await readFile(resolve(ROOT, 'tests/fixtures-alpa-es-unknown-groups.json'), 'utf8')));
  assert.equal(sha256(JSON.stringify(rows)), '0edc9e136d64f4c65f75436d0b57f56fb14da1260cee43381f84f569c302f54d');
});

test('Alpa Spanish retains stock digit unknown and no-pronounceable behavior', () => {
  assert.deepEqual(phonemize('Grace volvió a las 17:40 y usó la tarjeta 0027.').unknown, ['17', '40', '0027']);
  assert.throws(() => phonemize('¿¡…?!'), { message: 'the text has nothing to pronounce' });
  assert.throws(() => phonemize('   '), { message: 'text must not be empty' });
});
