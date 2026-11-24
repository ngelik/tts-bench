import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {verifyAudioAttribution} from '../tools/audio.mjs';
import * as frontend from '../web/tiny-voca-si/frontend.js';
import { assembleStockPlayback } from '../web/tiny-voca-si/playback.mjs';
import { TINY_VOCA_SINHALA } from '../web/adapters/tiny-voca-sinhala-profile.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const fixtureRoot = new URL('../fixtures/', import.meta.url);
const article = await readFile(new URL('si-article-v1.txt', fixtureRoot), 'utf8');
const manifest = JSON.parse(await readFile(new URL('si-article-v1.chunks.json', fixtureRoot), 'utf8'));
const modelLock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url), 'utf8')).models['tiny-voca-sinhala'];

test('registered Sinhala article and pinned frontend oracle bind the same 90 spans', () => {
  const oracle = TINY_VOCA_SINHALA.fixtureOracle;
  assert.equal(TINY_VOCA_SINHALA.fixtureId, 'si-article-v1');
  assert.equal(sha256(article), TINY_VOCA_SINHALA.fixtureSha256);
  assert.equal(manifest.articleSha256, TINY_VOCA_SINHALA.fixtureSha256);
  assert.equal(oracle.fixtureSha256, TINY_VOCA_SINHALA.fixtureSha256);
  assert.equal(manifest.chunks.length, 90);
  assert.equal(oracle.rows.length, 90);
  assert.equal(oracle.sourceSentences, 373);
  assert.equal(oracle.maxTokens, 207);
  assert.equal(oracle.unknownOccurrences, 0);
  for (const [index, chunk] of manifest.chunks.entries()) {
    assert.equal(chunk.id, index);
    assert.equal(chunk.sha256, oracle.rows[index].spanSha256);
    assert.equal(sha256(article.slice(chunk.start, chunk.end)), chunk.sha256);
  }
});

test('vendored publisher frontend assets retain their pinned hashes', async () => {
  for (const [name, [bytes, expectedHash]] of Object.entries(TINY_VOCA_SINHALA.frontendSource)) {
    const contents = await readFile(new URL(`../web/tiny-voca-si/${name}`, import.meta.url));
    assert.equal(contents.byteLength, bytes, name);
    assert.equal(sha256(contents), expectedHash, name);
  }
});

test('sentence and shorter controls are the publisher frontend functions', () => {
  assert.deepEqual(frontend.sentences(frontend.finished('Dr. Ada asked. Next.')), ['Dr. Ada asked.', 'Next.']);
  assert.deepEqual(frontend.shorter('one, two, three'), ['one,', 'two,', 'three']);
});

test('stock playback inserts 0.35 seconds between sentences then normalizes the whole span', () => {
  const plans = [{ sentenceEnd: true }, { sentenceEnd: true }];
  const pcm = [Float32Array.of(0.2, 1.2), Float32Array.of(-0.6)];
  const result = assembleStockPlayback(plans, pcm, 10, { pauseSeconds: 0.2, peak: 0.99 });
  assert.equal(result.pauseSamples, 2);
  assert.equal(result.samples.length, 5); // no trailing pause after the last sentence
  assert(Math.abs(result.rawPeak - 1.2) < 1e-6);
  assert.equal(result.normalizedPeak, 0.99);
  assert(Math.abs(result.samples[1] - 0.99) < 1e-6);
  assert.equal(result.samples[2], 0);
  assert.equal(result.samples[3], 0);
  assert(Math.abs(result.samples[4] + 0.495) < 1e-6);
});

test('runtime manifest keeps the CPU-only ORT 1.20.1 asset closure and both restricted voices', async () => {
  assert.deepEqual(modelLock.backends, ['cpu']);
  assert.equal(modelLock.runtime.version, '1.20.1');
  assert.equal(modelLock.runtime.integrity, TINY_VOCA_SINHALA.runtimePackageIntegrity);
  assert.deepEqual(Object.keys(TINY_VOCA_SINHALA.runtimeAssets).sort(), [
    'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm', 'ort.wasm.min.mjs',
  ].sort());
  assert.deepEqual(TINY_VOCA_SINHALA.voices.map(voice => voice.id), ['M1', 'F1']);
  assert.equal(modelLock.license.requiresAcceptance, true);
  assert.match(modelLock.license.voices, /non-obscene, non-offensive/);
  const expectedModelAssets = Object.entries(TINY_VOCA_SINHALA.modelAssets);
  const expectedRuntimeAssets = Object.entries(TINY_VOCA_SINHALA.runtimeAssets)
    .map(([name, spec]) => [`runtime/${name}`, spec]);
  const workerSource = await readFile(new URL('../web/workers/tiny-voca-sinhala.mjs', import.meta.url), 'utf8');
  const modelRoot = `models/tiny-voca-sinhala/${TINY_VOCA_SINHALA.modelRevision}/`;
  for (const [relativePath, [bytes, sha256]] of [...expectedModelAssets, ...expectedRuntimeAssets]) {
    const target = modelRoot + relativePath;
    const row = modelLock.assets.find(asset => asset.target === target);
    assert.ok(row, `exact asset lock target ${target}`);
    assert.equal(row.bytes, bytes, relativePath);
    assert.equal(row.sha256, sha256, relativePath);
    if (relativePath.startsWith('runtime/')) {
      assert.match(workerSource, /const runtimeAsset = name => checkedAsset\(`runtime\/\$\{name\}`/);
    } else {
      assert.ok(workerSource.includes(`modelAsset('${relativePath}')`), `worker requests ${relativePath}`);
    }
  }
});

test('worker explicitly rejects WebGPU and routes the bridge diagnostic action', async () => {
  const replies = [];
  globalThis.self = { postMessage(message) { replies.push(message); } };
  try {
    await import('../web/workers/tiny-voca-sinhala.mjs?worker-action-test');
    await globalThis.self.onmessage({ data: { id: 1, action: 'initialize', options: { backend: 'webgpu' } } });
    assert.equal(replies[0].value.status, 'unsupported');
    assert.match(replies[0].value.reason, /CPU\/WASM.*only/);
    await globalThis.self.onmessage({ data: { id: 2, action: 'diagnostic', options: { text: 'සිංහල' } } });
    assert.equal(replies[1].error, 'Tiny Voca Sinhala worker is not initialized');
  } finally {
    delete globalThis.self;
  }
});

test('Sinhala M1 benchmark recording credits the donor and publisher', () => {
  verifyAudioAttribution({model: 'tiny-voca-sinhala', modelTerms: modelLock.license.model,
    sourceUrls: modelLock.support.sources, attribution: 'AI-generated Sinhala benchmark narration using Emindu Perera’s Tiny Voca Sinhala M1 voice. Ven. Mettananda donated the source voice through the Path Nirvana Foundation. The model and Sinhala training dataset are GPL-3.0. The publisher credits Muhammed Nazeem’s Tiny Voca and the eSpeak NG pronunciation frontend. The donated voices are restricted to non-obscene, non-offensive speech and the publisher prohibits impersonation and deceptive use.'});
});
