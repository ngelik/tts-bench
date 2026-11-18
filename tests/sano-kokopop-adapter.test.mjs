import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSanoKokopopAdapter } from '../web/adapters/sano-kokopop.mjs';

const adapterSource = await readFile(new URL('../web/adapters/sano-kokopop.mjs', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../web/workers/sano-kokopop.mjs', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../web/sano-kokopop/runtime.js', import.meta.url), 'utf8');
const upstreamPatch = await readFile(new URL('../web/sano-kokopop/patches/kokopop-browser.patch', import.meta.url), 'utf8');

const model = {
  id: 'sano-heart-nano-gguf-f32',
  model: { url: '/models/heartnano-f32.gguf', bytes: 100, sha256: 'a'.repeat(64) },
  runtime: {
    version: 'kokopop-test',
    files: [
      { target: 'runtimes/kokopop-test/kokopop-runtime.js', bytes: 100, sha256: 'b'.repeat(64) },
      { target: 'runtimes/kokopop-test/kokopop-runtime.wasm', bytes: 100, sha256: 'c'.repeat(64) },
      { target: 'runtimes/kokopop-test/kokopop-runtime.data', bytes: 100, sha256: 'd'.repeat(64) },
    ],
  },
  info: { voice: 'heartnano', settings: { sampleRate: 24000 } },
};

class FakeWorker {
  static instances = [];
  static unsupported = false;

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.sent = [];
    this.terminated = false;
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.sent.push(message);
    queueMicrotask(() => {
      const value = message.action === 'initialize'
        ? FakeWorker.unsupported
          ? { status: 'unsupported', backendEffective: 'none', capability: { gpuDispatchVerified: false } }
          : {
            status: 'measured', backendEffective: message.options.backend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
            capability: { gpuDispatchVerified: message.options.backend === 'webgpu' },
          }
        : message.action === 'generate'
          ? { parts: [Float32Array.of(0.25, -0.125)], sampleRate: 24000, completedChunkId: message.chunk.id }
          : null;
      this.onmessage?.({ data: { id: message.id, value } });
    });
  }

  terminate() { this.terminated = true; }
}

test('Kokopop adapter forwards the pinned model config and preserves deterministic PCM chunks', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  FakeWorker.unsupported = false;
  globalThis.Worker = FakeWorker;
  try {
    const adapter = createSanoKokopopAdapter(model);
    const initialized = await adapter.initialize({ backend: 'webgpu', probe: true });
    assert.equal(initialized.backendEffective, 'webgpu+wasm');
    assert.equal(FakeWorker.instances.length, 1);
    const worker = FakeWorker.instances[0];
    assert.equal(worker.options.type, 'module');
    assert.equal(worker.sent[0].options.modelConfig, model);
    assert.equal(worker.sent[0].options.backend, 'webgpu');

    let firstPcm = 0;
    const chunk = { id: 4, start: 12, end: 25, text: 'Hello, world.' };
    const output = await adapter.generateChunk(chunk, { onFirstPcm: () => { firstPcm++; } });
    assert.equal(firstPcm, 1);
    assert.equal(output.completedChunkId, 4);
    assert.equal(output.sampleRate, 24000);
    assert.deepEqual(Array.from(output.parts[0]), [0.25, -0.125]);
    await adapter.dispose();
    assert.equal(worker.terminated, true);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('Kokopop adapter rejects unsupported and implicit backend requests', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  FakeWorker.unsupported = true;
  globalThis.Worker = FakeWorker;
  try {
    const noDevice = await createSanoKokopopAdapter(model).initialize({ backend: 'webgpu', probe: true });
    assert.equal(noDevice.status, 'unsupported');
    assert.equal(noDevice.backendEffective, 'none');
    assert.equal(FakeWorker.instances[0].terminated, true);

    const before = FakeWorker.instances.length;
    const implicit = await createSanoKokopopAdapter(model).initialize({ backend: 'auto' });
    assert.equal(implicit.status, 'unsupported');
    assert.equal(FakeWorker.instances.length, before);
  } finally {
    FakeWorker.unsupported = false;
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('Kokopop WebGPU evidence requires model scheduler ops and actual compute dispatches', () => {
  assert.match(workerSource, /GPUComputePassEncoder\?\.prototype/);
  assert.match(workerSource, /dispatchWorkgroupsIndirect/);
  assert.match(workerSource, /dispatches <= 0/);
  assert.match(workerSource, /ops\.MUL_MAT \|\| 0\) < 4/);
  assert.match(workerSource, /fallback-sensitive opcode family/);
  assert.match(workerSource, /adapter\.isFallbackAdapter === true/);
  assert.match(workerSource, /swiftshader\|llvmpipe\|software raster/);
  assert.match(upstreamPatch, /ggml_backend_sched_get_tensor_backend/);
  assert.match(upstreamPatch, /kp_webgpu_op_assignments_json/);
  assert.match(runtimeSource, /seed !== undefined/);
  assert.match(workerSource, /seed: \(42 \+ chunk\.id\) >>> 0/);
  assert.match(adapterSource, /createRpcAdapter\(WORKER_URL/);
});

test('Kokopop adapter rejects malformed canonical chunk geometry before dispatch', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  FakeWorker.unsupported = false;
  globalThis.Worker = FakeWorker;
  try {
    const adapter = createSanoKokopopAdapter(model);
    await adapter.initialize({ backend: 'cpu' });
    await assert.rejects(adapter.generateChunk({ id: 1, start: 0, end: 10, text: 'short' }), /exact canonical/);
    assert.equal(FakeWorker.instances[0].sent.filter(call => call.action === 'generate').length, 0);
    await adapter.dispose();
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});
