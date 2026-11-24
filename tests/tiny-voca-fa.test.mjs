import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../web/workers/tiny-voca-fa.js', import.meta.url), 'utf8');
const article = await readFile(new URL('../fixtures/fa-article-v1.txt', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../fixtures/fa-article-v1.chunks.json', import.meta.url)));
const context = vm.createContext({ self: {}, TextEncoder, TextDecoder });
vm.runInContext(code, context);

test('Persian sentence splitting, normalization and punctuation match the pinned upstream worker on the full fixture', () => {
  // Reference produced by demo/worker.js at mallahyari/tiny-ava@d4bd268.
  const prepare = vm.runInContext(
    '(text) => splitSentences(text).flatMap(splitLongSentence).map(sentence => [sentence, punctChunks(normalizePersian(terminal(sentence)))])',
    context,
  );
  const segments = manifest.chunks.flatMap(({ id, start, end }) =>
    prepare(article.slice(start, end)).map(([sentence, parts]) => [id, sentence, parts]),
  );
  assert.equal(segments.length, 315);
  assert.equal(createHash('sha256').update(JSON.stringify(segments)).digest('hex'),
    'f208a6df92bb2eda75d7e211202a212535789ef20fd967bfeb52f4043c33d728');
});

test('Persian ByT5 decoder accepts the ONNX int64 token representation', () => {
  const decode = vm.runInContext('byt5Decode', context);
  assert.equal(decode([0n, 118n, 100n, 111n, 68n, 112n, 1n]), 'salAm');
});

test('Persian stress placement retains ezafe and skips non-phone decoder symbols like the publisher', () => {
  const words = vm.runInContext('repr1Words', context);
  assert.deepEqual(JSON.parse(JSON.stringify(words('?Ab-e'))), [[['ɑ', 1], ['b', 0], ['e', 2]]]);
  for (const symbol of [';', '$', '#', '%']) {
    assert.deepEqual(JSON.parse(JSON.stringify(words('a' + symbol + 'b'))), JSON.parse(JSON.stringify(words('ab'))));
    assert.deepEqual(JSON.parse(JSON.stringify(words(symbol))), []);
  }
});
