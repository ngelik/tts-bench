import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { referencePcm, rejectTruncation } from '../web/sopro/reference.mjs';

const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url)));
const model = lock.models['sopro-v2-turbo'];

test('Sopro uses the fingerprinted synthetic 24 kHz F2 PCM16 reference', async () => {
  const voice = model.assets.find(asset => asset.kind === 'voice');
  const wav = await readFile(new URL('../' + voice.sourcePath, import.meta.url));
  assert.equal(createHash('sha256').update(wav).digest('hex'), voice.sha256);
  const pcm = referencePcm(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength));
  assert.equal(pcm.length, 720000);
  assert.ok(pcm.some(x => x > 0.05));
  assert.throws(() => referencePcm(new ArrayBuffer(44)), /PCM16/);
});

test('Sopro catches upstream silent truncation when the sentence loses EOS', () => {
  const tokenizer = { spec: { eosId: 2 }, encode: text => text === 'fits' ? [1, 17, 2] : [1, 17, 18] };
  rejectTruncation(tokenizer);
  assert.deepEqual(tokenizer.encode('fits', 'en'), [1, 17, 2]);
  assert.throws(() => tokenizer.encode('too long', 'en'), /budget/);
});

test('Sopro profile inventory deduplicates the upstream common weights', () => {
  const weights = model.assets.filter(asset => asset.kind === 'model-weights');
  const bytes = profile => weights.filter(asset => asset.target.includes('/common/') || asset.target.includes('/' + profile + '/')).reduce((n, asset) => n + asset.bytes, 0);
  assert.equal(bytes('wasm-uint8'), 338588731);
  assert.equal(bytes('webgpu-fp16'), 363318207);
  assert.equal(weights.reduce((n, asset) => n + asset.bytes, 0), 509819881);
});
