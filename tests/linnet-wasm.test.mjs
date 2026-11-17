import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getAssetLock } from '../lib/catalog.mjs';
import { widenSafetensorsIntoWasm } from '../web/linnet/safetensors-widen.mjs';

function safetensorsFixture() {
  const header = {
    __metadata__: { format: 'pt' },
    half: { dtype: 'F16', shape: [5], data_offsets: [0, 10] },
    single: { dtype: 'F32', shape: [1], data_offsets: [10, 14] },
  };
  let json = JSON.stringify(header);
  while ((8 + Buffer.byteLength(json)) % 8) json += ' ';
  const encoded = Buffer.from(json);
  const bytes = new Uint8Array(8 + encoded.length + 14);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(encoded.length), true);
  bytes.set(encoded, 8);
  const values = new DataView(bytes.buffer, 8 + encoded.length);
  [0x3c00, 0xc000, 0x3800, 0x7c00, 0x0000].forEach((value, index) => values.setUint16(index * 2, value, true));
  values.setFloat32(10, 3.25, true);
  return bytes;
}

test('Linnet F16 tensors widen in WASM memory while F32 data and metadata stay intact', () => {
  const memory = { buffer: new ArrayBuffer(4096) };
  const source = safetensorsFixture();
  const output = widenSafetensorsIntoWasm(source, () => 64, memory);
  const result = new Uint8Array(memory.buffer, output.pointer, output.bytes);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const headerLength = Number(view.getBigUint64(0, true));
  const header = JSON.parse(new TextDecoder().decode(result.subarray(8, 8 + headerLength)));
  assert.deepEqual(header.__metadata__, { format: 'pt' });
  assert.equal(header.half.dtype, 'F32');
  assert.equal(header.single.dtype, 'F32');
  const dataStart = 8 + headerLength;
  const halfValues = Array.from({ length: 5 }, (_, i) => view.getFloat32(dataStart + header.half.data_offsets[0] + i * 4, true));
  assert.equal(halfValues[0], 1);
  assert.equal(halfValues[1], -2);
  assert.equal(halfValues[2], 0.5);
  assert.equal(halfValues[3], Infinity);
  assert.equal(halfValues[4], 0);
  assert.ok(Number.isFinite(halfValues[4]));
  assert.equal(view.getFloat32(dataStart + header.single.data_offsets[0], true), 3.25);
});

test('Linnet weight parser rejects a malformed safetensors header before allocating WASM memory', () => {
  let allocations = 0;
  const source = new Uint8Array(8);
  new DataView(source.buffer).setBigUint64(0, 1n, true);
  assert.throws(() => widenSafetensorsIntoWasm(source, () => { allocations++; return 8; }, { buffer: new ArrayBuffer(64) }), /header length/);
  assert.equal(allocations, 0);
});

test('Linnet is registered as acceptance-gated CPU-only and every downloaded file is pinned', async () => {
  const model = getAssetLock().models['linnet-en-35m'];
  assert.ok(model);
  assert.deepEqual(model.backends, ['cpu']);
  assert.equal(model.modelRevision, 'a75fdfe50bc3d3e776b9c5040f149f49a054aaf5');
  assert.equal(model.license.requiresAcceptance, true);
  assert.equal(model.runtime.version, '0.1.1');
  assert.ok(model.assets.find(asset => asset.kind === 'voice').target.endsWith('/voices/linnet-en-f1.npy'));
  for (const asset of model.assets) {
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0);
    assert.equal(new URL(asset.url).protocol, 'https:');
  }
  assert.equal(model.assets.find(asset => asset.kind === 'model-weights').bytes, 83_075_620);
});

test('Linnet adapter is included in the normal browser benchmark factory registry', async () => {
  const bench = await readFile(new URL('../web/bench.mjs', import.meta.url), 'utf8');
  assert.match(bench, /'linnet-en-35m': createLinnetAdapter/);
  const worker = await readFile(new URL('../web/workers/linnet.mjs', import.meta.url), 'utf8');
  assert.match(worker, /Official VoxRT LinnetTTS browser WASM 0\.1\.1/);
  assert.match(worker, /fetchModelAsset\(WASM_URL, REVISION\)/);
  assert.doesNotMatch(worker, /fetch\(WASM_URL/);
  assert.match(worker, /lt_start\(voiceId/);
  assert.match(worker, /assetBytes\('voices\/linnet-en-f1\.npy'\)/);
  assert.match(worker, /lt_step\(\)/);
  assert.match(worker, /await yieldToWorkerQueue\(\)/);
  assert.match(worker, /first-party browser worker keeps the widened model allocation/);
  assert.doesNotMatch(worker, /lt_free\(expanded\.pointer/);
  assert.match(worker, /official LinnetTTS browser runtime is CPU\/WebAssembly only/i);
  assert.doesNotMatch(worker, /executionProviders\s*:\s*\[[^\]]*webgpu/i);
});
