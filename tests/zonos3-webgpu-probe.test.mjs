import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('ZONOS3 WebGPU evidence comes from the actual inference worker', async () => {
  const [inferenceWorker, client, gpuDevice, adapter, adapterWorker] = await Promise.all([
    readFile(resolve(root, 'web/zonos3/upstream/servers/web/src/worker.ts'), 'utf8'),
    readFile(resolve(root, 'web/zonos3/upstream/servers/web/src/client.ts'), 'utf8'),
    readFile(resolve(root, 'web/zonos3/upstream/servers/web/src/gpu/device.ts'), 'utf8'),
    readFile(resolve(root, 'web/adapters/zonos3.mjs'), 'utf8'),
    readFile(resolve(root, 'web/workers/zonos3.mjs'), 'utf8'),
  ]);

  assert.match(inferenceWorker, /function dispatchProbe\(\)/);
  assert.match(inferenceWorker, /GPUComputePassEncoder\?\.prototype/);
  assert.match(inferenceWorker, /'dispatchWorkgroupsIndirect'/);
  assert.match(inferenceWorker, /m\.headers\['x-benchmark-dispatch-probe'\] === '1' \? dispatchProbe\(\)/);
  assert.match(inferenceWorker, /probe: probeHook\.stop\(\)/);
  assert.doesNotMatch(inferenceWorker, /probe: \{ dispatches: probeHook\.stop\(\) \}/);
  assert.match(client, /lastDispatchProbe = m\.probe \?\? null/);
  assert.match(client, /getLastDispatchProbe\(\)[\s\S]*lastDispatchProbe = null/);
  assert.match(gpuDevice, /requestAdapter\(\{ powerPreference: 'high-performance' \}\)/);
  assert.match(gpuDevice, /isFallbackAdapter/);
  assert.match(gpuDevice, /onAdapter\?\.\(summary\)/);
  assert.match(gpuDevice, /onLost\?\.\('WebGPU uncaptured error: '/);
  assert.match(adapterWorker, /x-benchmark-dispatch-probe/);
  assert.match(adapterWorker, /const count = evidence\.dispatches;[\s\S]*if \(!count\) throw new Error/);
  assert.doesNotMatch(adapterWorker, /requestAdapter|GPUComputePassEncoder/);
  assert.match(adapter, /createRpcAdapter\(new URL\('\.\.\/workers\/zonos3\.mjs'/);
});
