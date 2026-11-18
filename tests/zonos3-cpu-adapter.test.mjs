import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createZonos3CpuAdapter } from '../web/adapters/zonos3-cpu.mjs';

const workerSource = await readFile(new URL('../web/workers/zonos3-cpu.js', import.meta.url), 'utf8');
const model = {
  id: 'zonos3-mini',
  name: 'ZONOS3-Mini',
  family: 'zonos3',
  cpuRuntimeVersion: 'audio-cpp-zonos3-cpu-wasm-v1',
  cpuRuntimeFiles: {
    jsUrl: '/runtimes/audio-cpp-zonos3-cpu-wasm-v1/bench_zonos3_cpu.js',
    wasmUrl: '/runtimes/audio-cpp-zonos3-cpu-wasm-v1/bench_zonos3_cpu.wasm',
  },
  cpuAssets: {
    backbone: { modelUrl: '/models/zonos3/backbone-ptq.gguf', filename: 'backbone-ptq.gguf', bytes: 100, sha256: 'a'.repeat(64) },
    decoder: { modelUrl: '/models/zonos3/zac-keep2.gguf', filename: 'zac-keep2.gguf', bytes: 100, sha256: 'b'.repeat(64) },
    speakerEncoder: { modelUrl: '/models/zonos3/spk-encoder.gguf', filename: 'spk-encoder.gguf', bytes: 100, sha256: 'c'.repeat(64) },
    speakerEmbedding: { modelUrl: '/models/zonos3/Imogen_en-British_F_1.embedding.npy', filename: 'Imogen_en-British_F_1.embedding.npy', bytes: 896, sha256: 'd'.repeat(64) },
  },
  info: { voice: 'Imogen', settings: { language: 'en_us' } },
};

class FakeWorker {
  static instances = [];
  static failure = null;

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.sent = [];
    this.terminated = false;
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.sent.push(message);
    if (message.action === 'generate') queueMicrotask(() => this.onmessage?.({ data: { id: message.id, event: 'first-pcm' } }));
    queueMicrotask(() => {
      const value = message.action === 'initialize'
        ? { status: 'measured', backendEffective: 'cpu/wasm', capability: { gpuDispatchVerified: false } }
        : message.action === 'generate'
          ? { parts: [Float32Array.of(0.125, -0.25)], sampleRate: 44100, completedChunkId: message.chunk.id }
          : null;
      this.onmessage?.({ data: { id: message.id, ...(FakeWorker.failure ? { error: FakeWorker.failure } : { value }) } });
    });
  }

  terminate() { this.terminated = true; }
}

test('ZONOS3 CPU adapter passes the pinned config and preserves the PCM chunk contract', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  FakeWorker.failure = null;
  globalThis.Worker = FakeWorker;
  try {
    const adapter = createZonos3CpuAdapter(model);
    const initialized = await adapter.initialize({ backend: 'cpu', probe: true });
    assert.equal(initialized.backendEffective, 'cpu/wasm');
    assert.equal(FakeWorker.instances.length, 1);
    const worker = FakeWorker.instances[0];
    assert.equal(worker.options.name, 'tts-bench-zonos3-cpu');
    assert.equal(worker.options.type, undefined);
    assert.equal(new URL(worker.url).searchParams.get('cpuRuntimeVersion'), model.cpuRuntimeVersion);
    assert.equal(worker.sent[0].options.modelConfig, model);

    let firstPcmCalls = 0;
    const chunk = { id: 9, start: 20, end: 32, text: 'Hello Zonos.' };
    const response = await adapter.generateChunk(chunk, { onFirstPcm: () => { firstPcmCalls += 1; } });
    assert.equal(firstPcmCalls, 1);
    assert.equal(response.completedChunkId, chunk.id);
    assert.equal(response.sampleRate, 44100);
    assert.deepEqual(Array.from(response.parts[0]), [0.125, -0.25]);
    await adapter.dispose();
    assert.equal(worker.terminated, true);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('ZONOS3 CPU adapter rejects WebGPU instead of silently falling back', async () => {
  const previousWorker = globalThis.Worker;
  FakeWorker.instances = [];
  globalThis.Worker = FakeWorker;
  try {
    const result = await createZonos3CpuAdapter(model).initialize({ backend: 'webgpu' });
    assert.equal(result.status, 'unsupported');
    assert.match(result.reason, /CPU\/WASM only/);
    assert.equal(result.backendEffective, 'none');
    assert.equal(FakeWorker.instances.length, 0);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('ZONOS3 CPU adapter enforces the fixed Emscripten pthread pool ceiling', () => {
  assert.throws(() => createZonos3CpuAdapter(model, { threads: 13 }), /thread count must be an integer from 1 to 12/);
  assert.match(workerSource, /const PTHREAD_POOL_SIZE = 12/);
  assert.match(workerSource, /threads > MAX_THREADS/);
});

test('ZONOS3 CPU worker verifies local range assets and reports the actual offline CPU backend', () => {
  assert.match(workerSource, /audio-cpp-zonos3-cpu-wasm-v1/);
  assert.match(workerSource, /requireAsset\(assets\.backbone, 'backbone-ptq\.gguf'\)/);
  assert.match(workerSource, /requireAsset\(assets\.decoder, 'zac-keep2\.gguf'\)/);
  assert.match(workerSource, /requireAsset\(assets\.speakerEncoder, 'spk-encoder\.gguf'\)/);
  assert.match(workerSource, /Imogen_en-British_F_1\.embedding\.npy/);
  assert.match(workerSource, /backendEffective: 'cpu\/wasm'/);
  assert.match(workerSource, /seedPerChunk: '42 \+ canonical chunk id/);
  assert.match(workerSource, /selectedVoiceIds: \[info\.voiceId/);
  assert.match(workerSource, /Not implemented by this community CPU port/);
  assert.match(workerSource, /Offline audio\.cpp generation/);
  assert.match(workerSource, /range\+|headers: \{ Range:/);
  assert.match(workerSource, /network\.status !== 206/);
  assert.match(workerSource, /network\.status === 200 && start === 0 && end === asset\.bytes - 1/);
  assert.match(workerSource, /crypto\.subtle\.digest\('SHA-256', body\)/);
  assert.match(workerSource, /network\.headers\.get\('Content-Range'\)/);
  assert.match(workerSource, /rate !== 44100/);
  assert.match(workerSource, /\.every\(Number\.isFinite\)/);
  assert.doesNotMatch(workerSource, /navigator\.gpu/);
});

test('ZONOS3 CPU bridge rejects truncated or internally split generation output', async () => {
  const bridge = await readFile(new URL('../web/zonos3-cpu/bench_bridge.cpp', import.meta.url), 'utf8');
  assert.match(bridge, /audiocpp_result_custom_schema\(result, &schema, &data\)/);
  assert.match(bridge, /zonos3_generation_v1/);
  assert.match(bridge, /metadata\.require\("frames"\)\.as_i64\(\) <= 0/);
  assert.match(bridge, /metadata\.require\("chunks"\)\.as_i64\(\) != 1/);
  assert.match(bridge, /metadata\.require\("reached_limit"\)\.as_bool\(\)/);
  assert.match(bridge, /before terminal EOS/);
});
