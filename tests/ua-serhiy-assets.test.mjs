import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { fetchVerifiedUaSerhiyAsset, uaSerhiyLocalUrl } from '../web/ua-serhiy-0p58m/assets.mjs';

const baseUrl = 'http://127.0.0.1:51291/worker.mjs';
const modelUrl = '/models/ua-serhiy-0p58m/1abd585d725a787b405c28a59ce1cbdfd34780bb/onnx/duration.onnx';
const bytes = new TextEncoder().encode('pinned-test-bytes');
const sha256 = createHash('sha256').update(bytes).digest('hex');

test('Serhiy URL fence accepts only its pinned model revision and local runtimes', () => {
  assert.equal(uaSerhiyLocalUrl(modelUrl, baseUrl), 'http://127.0.0.1:51291' + modelUrl);
  assert.equal(uaSerhiyLocalUrl('/runtimes/onnxruntime-web/1.23.2/ort.webgpu.min.mjs', baseUrl),
    'http://127.0.0.1:51291/runtimes/onnxruntime-web/1.23.2/ort.webgpu.min.mjs');
  assert.throws(() => uaSerhiyLocalUrl('https://example.org/model.onnx', baseUrl), /pinned local closure/);
  assert.throws(() => uaSerhiyLocalUrl('/models/ua-serhiy-0p58m/latest/graph.onnx', baseUrl), /pinned local closure/);
  assert.throws(() => uaSerhiyLocalUrl('/private/secret', baseUrl), /pinned local closure/);
  assert.throws(() => uaSerhiyLocalUrl(modelUrl + '?token=secret', baseUrl), /pinned local closure/);
});

test('Serhiy verified fetch uses normal same-origin HTTP caching and validates the pin', async () => {
  let request;
  const asset = { url: modelUrl, bytes: bytes.byteLength, sha256 };
  const loaded = await fetchVerifiedUaSerhiyAsset(asset, {
    baseUrl,
    cryptoImpl: webcrypto,
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(bytes, { status: 200 });
    },
  });
  assert.deepEqual(new Uint8Array(loaded), bytes);
  assert.equal(request.url, 'http://127.0.0.1:51291' + modelUrl);
  assert.equal(request.init.cache, 'default');
  assert.equal(request.init.credentials, 'same-origin');
  assert.equal(request.init.redirect, 'error');
});

test('Serhiy verified fetch rejects missing, wrong-size, and tampered assets', async () => {
  const asset = { url: modelUrl, bytes: bytes.byteLength, sha256 };
  const fetchImpl = async () => new Response(bytes, { status: 200 });
  await assert.rejects(fetchVerifiedUaSerhiyAsset({ ...asset, bytes: bytes.byteLength + 1 }, {
    baseUrl, cryptoImpl: webcrypto, fetchImpl,
  }), /has 17 bytes; expected 18/);
  await assert.rejects(fetchVerifiedUaSerhiyAsset({ ...asset, sha256: '0'.repeat(64) }, {
    baseUrl, cryptoImpl: webcrypto, fetchImpl,
  }), /SHA-256 mismatch/);
  await assert.rejects(fetchVerifiedUaSerhiyAsset({ ...asset, sha256: 'bad' }, {
    baseUrl, cryptoImpl: webcrypto, fetchImpl,
  }), /byte count and SHA-256/);
});
