import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MINI_VOZ } from '../web/adapters/mini-voz-profile.mjs';
import { fetchModelAsset } from '../web/cache-model-asset.mjs';
import * as frontend from '../web/mini-voz/frontend.js';

const root = resolve(import.meta.dirname, '..');

test('Mini Voz keeps the pinned stock frontend and Spanish fixture profile', async () => {
  const bytes = await readFile(resolve(root, 'web/mini-voz/frontend.js'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    MINI_VOZ.assets['site/tts/frontend.js'][1]);
  assert.equal(MINI_VOZ.fixtureId, 'es-es-article-v1');
  assert.equal(MINI_VOZ.fixtureSha256, '8acee2d2fe70fb184d7a3f30e000d4a7cf5a9e09fc7523f32e958e7b1451653e');
  assert.equal(MINI_VOZ.language, 'es-ES');
  assert.deepEqual(MINI_VOZ.voices.map(voice => voice.id), ['F1', 'F2', 'M1', 'M2']);
  assert.equal(MINI_VOZ.defaultVoice, 'F1');
  assert.deepEqual(MINI_VOZ.fixtureOracle, {
    spans: 105,
    utterances: 334,
    maximumTokens: 180,
    unknownPhones: 0,
    tokenStressSha256: 'a61c896a882dbf911dde51d61fd07507afa23ddec593db7fae8698947224ac77',
  });
});

test('Mini Voz stock Spanish frontend normalization and sentence helpers are retained', () => {
  assert.equal(frontend.normalizeText('  EE. UU. — 1.234,50 €  '), 'Estados Unidos — 1.234 euros con 50 céntimos');
  assert.equal(frontend.finished('Hola mundo'), 'Hola mundo.');
  assert.deepEqual(frontend.sentences(frontend.finished('¿Qué tal? ¡Muy bien!')), ['¿Qué tal?', '¡Muy bien!']);
  assert.deepEqual(frontend.shorter('uno, dos, tres'), ['uno,', 'dos,', 'tres']);
});

test('Mini Voz can verify downloaded bytes after Chrome rejects the cache write', async (t) => {
  const savedSelf = globalThis.self;
  const savedCaches = globalThis.caches;
  globalThis.self = { location: new URL('http://127.0.0.1:1234/web/workers/mini-voz.mjs') };
  globalThis.caches = { open: async () => ({
    match: async () => undefined,
    put: async () => { throw new Error('Cache.put() encountered a network error'); },
  }) };
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, 'http://127.0.0.1:1234/models/mini-voz/model.onnx');
    return new Response(new Uint8Array([1, 2, 3]));
  });
  try {
    const path = '/models/mini-voz/model.onnx';
    const revision = MINI_VOZ.modelRevision;
    const response = await fetchModelAsset(path, revision, { bufferBeforeCache: true });
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), Uint8Array.of(1, 2, 3));
    await assert.rejects(fetchModelAsset(path, revision), /Cache\.put\(\) encountered a network error/);
  } finally {
    if (savedSelf === undefined) delete globalThis.self; else globalThis.self = savedSelf;
    if (savedCaches === undefined) delete globalThis.caches; else globalThis.caches = savedCaches;
  }
});
