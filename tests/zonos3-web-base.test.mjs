import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveZonos3WebBase } from '../web/zonos3/local-web-base.mjs';

test('ZONOS3 resolves its root-relative model base against the browser origin', () => {
  assert.equal(
    resolveZonos3WebBase('/models/zonos3-mini/revision/web/', 'http://127.0.0.1:53410'),
    'http://127.0.0.1:53410/models/zonos3-mini/revision/web/',
  );
});

test('ZONOS3 rejects cross-origin and malformed model bases', () => {
  assert.throws(
    () => resolveZonos3WebBase('//assets.example/model/web/', 'http://127.0.0.1:53410'),
    /remain on the browser origin/,
  );
  assert.throws(
    () => resolveZonos3WebBase('/models/zonos3-mini/revision/web', 'http://127.0.0.1:53410'),
    /trailing slash/,
  );
  assert.throws(
    () => resolveZonos3WebBase('/models/zonos3-mini/revision/web/', 'null'),
    /same-origin browser origin/,
  );
});

test('the WebGPU adapter passes the resolved local base to the upstream engine', async () => {
  const worker = await readFile(new URL('../web/workers/zonos3.mjs', import.meta.url), 'utf8');
  assert.match(worker, /resolveZonos3WebBase\(ZONOS3_WEB_BASE, self\.location\.origin\)/);
  assert.match(worker, /engine\.init\(\(\) => \{\}, \{ base, cache: true/);
});
