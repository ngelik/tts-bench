import test from 'node:test';
import assert from 'node:assert/strict';
import { createUaSerhiyWebGpuAdapter } from '../web/adapters/ua-serhiy-webgpu.mjs';

test('Ukrainian Serhiy WebGPU adapter forwards the pinned config and preserves RPC PCM', async () => {
  const originalWorker = globalThis.Worker;
  const workers = [];
  class FakeWorker {
    constructor(url, options) { this.url = String(url); this.options = options; this.messages = []; workers.push(this); }
    postMessage(message) {
      this.messages.push(message);
      let value = null;
      if (message.action === 'initialize') {
        value = { status: 'measured', backendEffective: 'webgpu+wasm', capability: { gpuDispatchVerified: true, description: 'test' } };
      } else if (message.action === 'generate') {
        value = { parts: [new Float32Array([0.1, -0.1])], sampleRate: 22_050, completedChunkId: message.chunk.id };
      }
      queueMicrotask(() => this.onmessage?.({ data: { id: message.id, value } }));
    }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = FakeWorker;
  try {
    const config = { id: 'ua-serhiy-0p58m', source: { revision: '1abd585d725a787b405c28a59ce1cbdfd34780bb' } };
    const adapter = createUaSerhiyWebGpuAdapter(config);
    const initialized = await adapter.initialize({ backend: 'webgpu', probe: true });
    assert.equal(initialized.backendEffective, 'webgpu+wasm');
    assert.equal(workers.length, 1);
    assert.equal(workers[0].url.endsWith('/web/workers/ua-serhiy-0p58m-webgpu.mjs'), true);
    assert.deepEqual(workers[0].messages[0].options.modelConfig, config);
    const output = await adapter.generateChunk({ id: 7, text: 'text', start: 0, end: 4 });
    assert.equal(output.completedChunkId, 7);
    assert.equal(output.sampleRate, 22_050);
    assert.ok(Math.abs(output.parts[0][0] - 0.1) < 1e-7);
    assert.ok(Math.abs(output.parts[0][1] + 0.1) < 1e-7);
    await adapter.dispose();
    assert.equal(workers[0].terminated, true);
  } finally {
    globalThis.Worker = originalWorker;
  }
});

test('Ukrainian Serhiy WebGPU adapter rejects another model config', () => {
  assert.throws(() => createUaSerhiyWebGpuAdapter({ id: 'other' }), /pinned model configuration/);
});
