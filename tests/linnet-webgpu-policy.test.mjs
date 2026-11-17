import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { LINNET_WEBGPU_RUNTIME, isSoftwareWebGpuAdapter, shouldDispatchDenseMacs } from '../web/linnet/runtime-policy.mjs';

test('Linnet hybrid runtime is pinned to Apache source and an exact built WASM digest', () => {
  assert.equal(LINNET_WEBGPU_RUNTIME.sourceCommit, '29dfdd503a3930e4e36c1130e4c9aab0592201ca');
  assert.equal(LINNET_WEBGPU_RUNTIME.rustToolchain, '1.95.0');
  assert.equal(LINNET_WEBGPU_RUNTIME.license, 'Apache-2.0');
  assert.match(LINNET_WEBGPU_RUNTIME.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(LINNET_WEBGPU_RUNTIME.bytes) && LINNET_WEBGPU_RUNTIME.bytes > 0);
});

test('software WebGPU adapters are recognized across common fallback driver labels', () => {
  for (const info of [
    { vendor: 'google', architecture: 'swiftshader' },
    { vendor: 'Mesa', device: 'llvmpipe' },
    { vendor: 'Mesa', device: 'lavapipe' },
    { vendor: 'Microsoft', description: 'Microsoft Basic Render Driver' },
    { vendor: 'Microsoft', device: 'WARP' },
  ]) assert.equal(isSoftwareWebGpuAdapter({}, info), true, JSON.stringify(info));
  assert.equal(isSoftwareWebGpuAdapter({ isFallbackAdapter: true }, { vendor: 'Apple', device: 'M1 Pro' }), true);
  assert.equal(isSoftwareWebGpuAdapter({ isFallbackAdapter: false }, { vendor: 'Apple', device: 'M1 Pro' }), false);
});

test('only finite dense operations at or above the pinned threshold dispatch', async () => {
  assert.equal(shouldDispatchDenseMacs(1, 127, 256), false);
  assert.equal(shouldDispatchDenseMacs(1, 128, 256), true);
  assert.equal(shouldDispatchDenseMacs(0, 1, 32768), false);
  assert.equal(shouldDispatchDenseMacs(1, Number.MAX_SAFE_INTEGER, 2), false);
  const patch = await readFile(new URL('../tools/linnet-webgpu-runtime/prepare-upstream.mjs', import.meta.url), 'utf8');
  assert.equal(LINNET_WEBGPU_RUNTIME.minimumMacs, 32 * 1024);
  assert.match(patch, /const MIN_MACS: usize = 32 \* 1024;/);
});
