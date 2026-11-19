// Full canonical-span audit for Micro's normalized 220-character segmentation.
// This is frontend validation only; the deterministic token stub is not used
// and no model inference or benchmark timing occurs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMicroNumbers } from '../web/inflect-micro-v3/numeric.mjs';
import { INTERNAL_TEXT_LIMIT, splitMicroText } from '../web/inflect-micro-v3/frontend.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const article = await readFile(resolve(root, 'fixtures/en-20000.txt'), 'utf8');
const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
const sha256 = text => createHash('sha256').update(text).digest('hex');
assert.equal(article.length, 20_000);
assert.equal(sha256(article), fixture.articleSha256);
assert.equal(fixture.chunks.length, 93);

const audited = [];
for (const span of fixture.chunks) {
  const raw = article.slice(span.start, span.end);
  assert.equal(raw.length, span.characters, `span ${span.id} character count`);
  assert.equal(sha256(raw), span.sha256, `span ${span.id} source hash`);
  const normalized = normalizeMicroNumbers(raw).spokenText;
  const pieces = splitMicroText(normalized);
  assert.equal(pieces.join(''), normalized, `span ${span.id} concatenation`);
  assert.ok(pieces.every(piece => piece.trim() && piece.length <= INTERNAL_TEXT_LIMIT), `span ${span.id} piece bounds`);
  audited.push({ id: span.id, raw, normalized, pieces });
}

for (const id of [17, 30]) {
  const span = audited.find(item => item.id === id);
  assert.equal(span.raw.length, 221, `span ${id} regression fixture length`);
  assert.ok(span.raw.endsWith(' '), `span ${id} retains its final source space`);
  assert.equal(span.pieces.length, 2, `span ${id} splits into two nonempty utterances`);
  assert.equal(span.pieces.join(''), span.normalized, `span ${id} exact normalized-text preservation`);
}

console.log(JSON.stringify({
  fixtureSha256: fixture.articleSha256,
  canonicalSpans: audited.length,
  internalUtterances: audited.reduce((count, span) => count + span.pieces.length, 0),
  trailingSpaceRegressions: [17, 30].map(id => ({
    id,
    sourceCharacters: audited.find(span => span.id === id).raw.length,
    pieceLengths: audited.find(span => span.id === id).pieces.map(piece => piece.length),
  })),
}, null, 2));
