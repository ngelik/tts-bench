import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSanoHeartNanoAdapter } from '../web/adapters/sano-heart-nano.mjs';

const workerSource = await readFile(new URL('../web/workers/sano-heart-nano.js', import.meta.url), 'utf8');
const textSource = await readFile(new URL('../web/sano/heart-nano-text.js', import.meta.url), 'utf8');
const benchmark = await readFile(new URL('../web/bench.mjs', import.meta.url), 'utf8');

function loadTextApi() {
  const context = {};
  vm.runInNewContext(textSource, context);
  return context.SanoHeartNanoText;
}

test('Sano heart-nano split follows the pinned demo policy and preserves all non-whitespace fixture text', async () => {
  const { splitChunks, nonWhitespace, assertCoverage } = loadTextApi();
  const article = await readFile(new URL('../fixtures/en-20000.txt', import.meta.url), 'utf8');
  const { chunks } = JSON.parse(await readFile(new URL('../fixtures/en-20000.chunks.json', import.meta.url), 'utf8'));
  let pieces = 0;
  let maxChars = 0;
  for (const chunk of chunks) {
    const text = article.slice(chunk.start, chunk.end);
    const split = splitChunks(text);
    assert.equal(assertCoverage(text, split).sourceNonWhitespaceCharacters, Array.from(nonWhitespace(text)).length);
    assert.ok(split.every(piece => piece.length <= 120));
    pieces += split.length;
    maxChars = Math.max(maxChars, ...split.map(piece => piece.length));
  }
  assert.equal(chunks.length, 93);
  assert.equal(pieces, 304);
  assert.equal(maxChars, 120);
});

test('Sano heart-nano decimal punctuation is retained during sentence splitting', () => {
  const { splitChunks, nonWhitespace, assertCoverage } = loadTextApi();
  const text = 'The reading was 3.5 units. The next was 4.0 units.';
  const pieces = splitChunks(text);
  assert.equal(pieces.length, 2);
  assert.equal(nonWhitespace(pieces.join('')), nonWhitespace(text));
  assert.equal(assertCoverage(text, pieces).pieces, 2);
});

class FakeWorker {
  static instances = [];
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.terminated = false;
    FakeWorker.instances.push(this);
  }
  postMessage(message) {
    queueMicrotask(() => {
      if (message.action === 'initialize') {
        this.onmessage?.({ data: { id: message.id, value: {
          status: 'measured', backendEffective: 'cpu/wasm', voice: 'SanoTTS heart-nano (English, US)',
          precision: 'INT8', settings: {}, capability: { gpuDispatchVerified: null, description: 'CPU WASM.' },
        } } });
      } else if (message.action === 'generate') {
        this.onmessage?.({ data: { id: message.id, event: 'first-pcm', samples: Float32Array.of(0.125, -0.25), sampleRate: 24000 } });
        this.onmessage?.({ data: { id: message.id, value: {
          parts: [Float32Array.of(0.5)], sampleRate: 24000, completedChunkId: message.chunk.id,
        } } });
      } else this.onmessage?.({ data: { id: message.id, value: null } });
    });
  }
  terminate() { this.terminated = true; }
}

test('Sano heart-nano adapter forwards the first real-piece PCM event before resolving the canonical span', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  globalThis.Worker = FakeWorker;
  try {
    const adapter = createSanoHeartNanoAdapter();
    const initialized = await adapter.initialize({ backend: 'cpu', probe: true });
    assert.equal(initialized.status, 'measured');
    assert.equal(initialized.backendEffective, 'cpu/wasm');
    assert.equal(FakeWorker.instances.length, 1);
    const worker = FakeWorker.instances[0];
    assert.equal(worker.options.type, undefined);
    assert.ok(new URL(worker.url).pathname.endsWith('/web/workers/sano-heart-nano.js'));
    const order = [];
    const chunk = { id: 3, start: 60, end: 90, text: 'A Sano heart-nano test sentence.', sha256: 'f'.repeat(64) };
    const response = await adapter.generateChunk(chunk, { onFirstPcm: () => order.push('first-pcm') });
    order.push('complete');
    assert.deepEqual(order, ['first-pcm', 'complete']);
    assert.equal(response.completedChunkId, chunk.id);
    assert.equal(response.sampleRate, 24000);
    assert.deepEqual(response.parts.map(part => Array.from(part)), [[0.125, -0.25], [0.5]]);
    await adapter.dispose();
    assert.equal(worker.terminated, true);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('Sano heart-nano WebGPU is explicitly unsupported without constructing a CPU worker', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  globalThis.Worker = FakeWorker;
  try {
    const result = await createSanoHeartNanoAdapter().initialize({ backend: 'webgpu' });
    assert.equal(result.status, 'unsupported');
    assert.match(result.reason, /CPU WebAssembly.*does not implement WebGPU dispatch/);
    assert.equal(result.backendEffective, 'none');
    assert.equal(result.capability.gpuDispatchVerified, false);
    assert.equal(FakeWorker.instances.length, 0);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('timed generation re-splits and tokenizes each sentence piece before WASM synthesis', () => {
  assert.match(workerSource, /const pieces = textApi\.splitChunks\(chunk\.text\)/);
  assert.match(workerSource, /const \{ ids \} = tokenizePiece\(text\);\s+const pcm = synthesizePiece\(text, ids\)/);
  assert.match(workerSource, /event: 'first-pcm'.*samples: pcm/s);
  assert.doesNotMatch(workerSource, /preflightByChunk|preflightChunks/);
  assert.doesNotMatch(benchmark, /preflightChunks/);
});

test('Sano heart-nano rejects unknown non-whitespace phones and the official token/output limits', () => {
  assert.match(workerSource, /unsupported\.length/);
  assert.match(workerSource, /MAX_TOKENS = 207/);
  assert.match(workerSource, /MAX_SECONDS = 30/);
  assert.match(workerSource, /samplesWritten >= OUT_CAP/);
  assert.match(workerSource, /samplesWritten < 0/);
});
