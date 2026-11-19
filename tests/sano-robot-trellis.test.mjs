import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSanoRobotTrellisAdapter } from '../web/adapters/sano-robot-trellis.mjs';

const workerSource = await readFile(new URL('../web/workers/sano-robot-trellis.js', import.meta.url), 'utf8');
const textSource = await readFile(new URL('../web/sano/robot-trellis-text.js', import.meta.url), 'utf8');


function loadTextApi() {
  const context = {};
  vm.runInNewContext(textSource, context);
  return context.SanoRobotTrellisText;
}

test('Sano Robot/Trellis split follows the pinned demo policy and preserves all non-whitespace fixture text', async () => {
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

test('Sano Robot/Trellis decimal punctuation is retained during sentence splitting', () => {
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
          status: 'measured', backendEffective: 'cpu/wasm', voice: 'SanoTTS Robot/Trellis (English, US)',
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

test('Sano Robot/Trellis adapter forwards the first real-piece PCM event before resolving the canonical span', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  globalThis.Worker = FakeWorker;
  try {
    const adapter = createSanoRobotTrellisAdapter();
    const initialized = await adapter.initialize({ backend: 'cpu', probe: true });
    assert.equal(initialized.status, 'measured');
    assert.equal(initialized.backendEffective, 'cpu/wasm');
    assert.equal(FakeWorker.instances.length, 1);
    const worker = FakeWorker.instances[0];
    assert.equal(worker.options.type, undefined);
    assert.ok(new URL(worker.url).pathname.endsWith('/web/workers/sano-robot-trellis.js'));
    const order = [];
    const chunk = { id: 3, start: 60, end: 90, text: 'A Sano Robot/Trellis test sentence.', sha256: 'f'.repeat(64) };
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

test('Sano Robot/Trellis WebGPU is explicitly unsupported without constructing a CPU worker', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  globalThis.Worker = FakeWorker;
  try {
    const result = await createSanoRobotTrellisAdapter().initialize({ backend: 'webgpu' });
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


for (const modelId of ['sano-robot-mcu', 'sano-trellis']) {
  test(`${modelId} refuses WebGPU without allocating a CPU worker`, async () => {
    const result = await createSanoRobotTrellisAdapter(modelId).initialize({backend: 'webgpu'});
    assert.equal(result.status, 'unsupported');
    assert.equal(result.backendEffective, 'none');
    assert.equal(result.capability.gpuDispatchVerified, false);
  });
}

function workerContext() {
  const context = { URL, Float32Array, Int32Array, Uint8Array, Set, importScripts() {}, location: { href: 'http://localhost/web/workers/sano-robot-trellis.js', origin: 'http://localhost' } };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(workerSource, context);
  return context;
}

test('Trellis rejects dropped phonemes, overflow and missing EOS before native inference', () => {
  const ctx = workerContext();
  vm.runInContext("config = CONFIGS['sano-trellis']; frontend = {textToIds: () => ({ids: [1, 20, 2], dropped: 'x'})};", ctx);
  assert.throws(() => vm.runInContext("tokenize('text')", ctx), /dropped unsupported/);
  vm.runInContext("frontend.textToIds = () => ({ids: Array(208).fill(1), dropped: ''});", ctx);
  assert.throws(() => vm.runInContext("tokenize('text')", ctx), /token count/);
  vm.runInContext("frontend.textToIds = () => ({ids: [1, 20, 0], dropped: ''});", ctx);
  assert.throws(() => vm.runInContext("tokenize('text')", ctx), /BOS\/EOS/);
  vm.runInContext("frontend.textToIds = () => ({ids: [1, 20, 2], dropped: ' '});", ctx);
  assert.equal(vm.runInContext("tokenize('text').ids.length", ctx), 3);
});

test('Trellis releases a genuine output handle on invalid metadata and frees all temporary pointers', () => {
  const ctx = workerContext();
  ctx.heap = new ArrayBuffer(4096);
  ctx.freed = []; ctx.released = [];
  vm.runInContext(`
    config = CONFIGS['sano-trellis']; weights = [new Uint8Array(8)];
    let cursor = 32;
    runtime = {
      HEAPU8: new Uint8Array(heap), HEAP32: new Int32Array(heap), HEAPF32: new Float32Array(heap),
      _malloc: n => {const p=cursor; cursor += Math.ceil(n/4)*4; return p;},
      _free: p => freed.push(p),
      _snt_trellis_wasm_sample_rate: () => 24000,
      _snt_trellis_wasm_run: () => 1024,
      _snt_trellis_wasm_tokens: () => 3,
      _snt_trellis_wasm_frames: () => 1,
      _snt_trellis_wasm_samples: () => 10,
      _snt_trellis_wasm_stage: () => 2048,
      _snt_trellis_wasm_handle_sample_rate: () => 22050,
      _snt_trellis_wasm_release: p => released.push(p),
    };
  `, ctx);
  assert.throws(() => vm.runInContext('synthesize([1,20,2])', ctx), /invalid waveform handle/);
  assert.deepEqual(ctx.released, [1024]);
  assert.equal(ctx.freed.length, 3);
});

test('each timed span re-tokenizes pieces and emits the first PCM before finishing later pieces', () => {
  const ctx = workerContext();
  ctx.events = []; ctx.calls = [];
  vm.runInContext(`
    config = CONFIGS['sano-robot-mcu']; runtime = {}; weights = [];
    self.SanoRobotTrellisText = {splitChunks: () => ['First.', 'Second.'], assertCoverage() {}};
    tokenize = text => {calls.push('tokenize:' + text); return {ids:[1,20,2]};};
    synthesize = ids => {calls.push('synthesize'); return new Float32Array([0.1]);};
    self.postMessage = data => {calls.push('first-pcm'); events.push(data);};
  `, ctx);
  const result = vm.runInContext("generate({id: 7, text: 'First. Second.'})", ctx);
  assert.deepEqual(ctx.calls, ['tokenize:First.', 'synthesize', 'first-pcm', 'tokenize:Second.', 'synthesize']);
  assert.equal(result.completedChunkId, 7);
  assert.equal(result.parts.length, 1);
  assert.equal(ctx.events[0].samples.length, 1);
});

test('Robot rejects unknown phones and saturated ID buffers without trusting the native count', () => {
  const ctx = workerContext();
  ctx.heap = new ArrayBuffer(65536); ctx.freed = [];
  vm.runInContext(`
    config = CONFIGS['sano-robot-mcu'];
    self.SanoRobotPhonemeCodepoints = [32, 116, 115];
    let cursor = 32;
    let rawIpa = 't͡s';
    let idCount = 5;
    g2p = {
      HEAP32: new Int32Array(heap), lengthBytesUTF8: text => text.length,
      _malloc: n => {const p=cursor; cursor += Math.ceil(n/4)*4; return p;},
      _free: p => freed.push(p), stringToUTF8() {},
      _snt_g2p_text_to_ipa: () => rawIpa.length,
      UTF8ToString: () => rawIpa,
      _snt_g2p_text_to_ids: (text, out) => {
        g2p.HEAP32.set([1,0,12,0,2], out >> 2); return idCount;
      },
    };
  `, ctx);
  assert.equal(vm.runInContext("tokenize('test', true).ids.length", ctx), 5);
  vm.runInContext("rawIpa = 'tΩ';", ctx);
  assert.throws(() => vm.runInContext("tokenize('test', true)", ctx), /would drop phoneme/);
  vm.runInContext("rawIpa = 'ts'; idCount = 1023;", ctx);
  assert.throws(() => vm.runInContext("tokenize('test', true)", ctx), /potentially truncated/);
  assert.equal(ctx.freed.length, 9);
  vm.runInContext("rawIpa = 'Ω'; idCount = 5; cursor = 32;", ctx);
  assert.equal(vm.runInContext("tokenize('test').ids.length", ctx), 5, 'timed path uses native IDs without duplicate raw G2P');
  assert.equal(ctx.freed.length, 11);
});
