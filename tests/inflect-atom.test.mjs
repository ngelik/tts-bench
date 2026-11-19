import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhitespace, phonemizeEnglish, misakiEnglish } from '../web/inflect-atom/frontend.mjs';
test('Atom normalizes only line whitespace and preserves punctuation and lexical input', () => {
  const input = 'Hello,\n\nworld!\tAgain.\r\n';
  assert.equal(normalizeWhitespace(input), 'Hello,  world! Again.  ');
  const received = [];
  phonemizeEnglish(input, (text) => { received.push(text); return text; });
  assert.deepEqual(received, ['Hello', 'world', 'Again']);
});
test('Atom follows pinned US Misaki diphthong, stress, flap and syllabic conversion', () => {
  assert.equal(misakiEnglish('a^ɪ a^ʊ e^ɪ o^ʊ ɔ^ɪ ɚ ɜːɹ t^ʃ d^ʒ ɾ ʔ n\u0329'), 'I W A O Y əɹ ɜɹ ʧ ʤ T t ᵊn');
});
test('Atom rejects whitespace-only input before calling the phonemizer', () => {
  assert.throws(() => phonemizeEnglish('\n\t', () => { throw new Error('unexpected'); }), /nonempty/);
});

// This calls the actual shared helper with the exact identity imported by the
// worker; an accidental decorated/invalid cache key fails before any fetch.
test('Atom compiled runtime identity satisfies the shared cache contract', async (t) => {
  const { ATOM_ASSET_REVISION } = await import('../web/inflect-atom/constants.mjs');
  const { fetchModelAsset } = await import('../web/cache-model-asset.mjs');
  const savedSelf = globalThis.self, savedCaches = globalThis.caches;
  let stored = null, opened = null;
  globalThis.self = { location: new URL('http://127.0.0.1:1234/web/workers/inflect-atom.mjs') };
  globalThis.caches = { open: async (name) => {
    opened = name;
    return { match: async () => stored?.clone(), put: async (_url, response) => { stored = response; } };
  } };
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, 'http://127.0.0.1:1234/models/inflect-atom-v3/encoder.onnx');
    return new Response('verified asset');
  });
  try {
    const response = await fetchModelAsset('/models/inflect-atom-v3/encoder.onnx', ATOM_ASSET_REVISION);
    assert.equal(await response.text(), 'verified asset');
    assert.equal(opened, 'tts-model-assets-v1-' + ATOM_ASSET_REVISION);
  } finally {
    if (savedSelf === undefined) delete globalThis.self; else globalThis.self = savedSelf;
    if (savedCaches === undefined) delete globalThis.caches; else globalThis.caches = savedCaches;
  }
});

test('Atom provider metadata permits genuine paired reports without hiding other settings', async () => {
  const { atomProviderSettings } = await import('../web/inflect-atom/constants.mjs');
  const { pairedWarm } = await import('../tools/result-selection.mjs');
  const asset = { id: 'atom-test-weight', sha256: 'a'.repeat(64), bytes: 1, kind: 'model-weights' };
  const model = { assets: [asset], runtime: { files: [] } };
  const result = { origin: 'native', protocol: { repetitions: 5 }, fixture: {}, source: { manifestSha256: 'b'.repeat(64) }, environment: {}, assets: [asset] };
  const base = { model: 'inflect-atom-v3', status: 'measured', trials: Array.from({ length: 5 }, () => ({})), voice: 'Cassidy', precision: 'FP32' };
  const cpu = { result, cell: { ...base, settings: atomProviderSettings({ seed: 7717 }, ['wasm']) } };
  const gpu = { result, cell: { ...base, settings: atomProviderSettings({ seed: 7717 }, ['webgpu', 'wasm']) } };
  assert.equal(pairedWarm(cpu, gpu, model), true);
  gpu.cell.settings.seed = 7718;
  assert.equal(pairedWarm(cpu, gpu, model), false);
});
