import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSanoHeartAdapter } from '../web/adapters/sano-heart.mjs';

const workerSource = await readFile(new URL('../web/workers/sano-heart.js', import.meta.url), 'utf8');
const benchmark = await readFile(new URL('../web/bench.mjs', import.meta.url), 'utf8');

test('Sano heart reports explicit CPU-only behavior without constructing a worker for GPU requests', async () => {
  const previousWorker = globalThis.Worker;
  let constructed = false;
  globalThis.Worker = class { constructor() { constructed = true; } };
  try {
    const result = await createSanoHeartAdapter().initialize({ backend: 'webgpu' });
    assert.equal(result.status, 'unsupported');
    assert.equal(result.backendEffective, 'none');
    assert.equal(result.capability.gpuDispatchVerified, false);
    assert.match(result.precision, /FP32/);
    assert.equal(constructed, false);
  } finally {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test('Sano heart worker pins the matching full-size FP32 model/runtime ABI', async () => {
  const posted = [];
  const context = {
    URL,
    self: {
      location: { origin: 'http://127.0.0.1:4173', href: 'http://127.0.0.1:4173/web/workers/sano-heart.js' },
      postMessage(message) { posted.push(message); },
    },
    importScripts() {},
  };
  context.globalThis = context;
  vm.runInNewContext(workerSource, context, { filename: 'sano-heart.js' });
  await context.self.onmessage({ data: { id: 1, action: 'initialize', options: { backend: 'webgpu' } } });
  const result = posted.at(-1).value;
  assert.equal(result.status, 'unsupported');
  assert.equal(result.voice, 'SanoTTS heart (English, US)');
  assert.equal(result.settings.parameterCount, 2272145);
  assert.equal(result.settings.sampleRate, 24000);
  assert.equal(result.settings.lineage, 'en_us_r227f32');
  assert.match(workerSource, /meta\.weights !== 'f32'/);
  assert.match(workerSource, /_snt_nano_wasm_weight_format\(\) !== 1/);
  assert.match(workerSource, /EXPECTED_FRONT_BYTES = 3273696/);
  assert.match(workerSource, /EXPECTED_DEC_BYTES = 5864224/);
  assert.match(workerSource, /heart-nano-text\.js/);
  assert.match(benchmark, /'sano-heart': createSanoHeartAdapter/);
});
