import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { LINNET_WEBGPU_RUNTIME, isSoftwareWebGpuAdapter, shouldDispatchDenseMacs } from '../web/linnet/runtime-policy.mjs';
import { materializeRhsBuffer } from '../web/linnet/gpu-rhs-buffer.mjs';

test('Linnet hybrid runtime is pinned to Apache source and an exact built WASM digest', () => {
  assert.equal(LINNET_WEBGPU_RUNTIME.sourceCommit, '29dfdd503a3930e4e36c1130e4c9aab0592201ca');
  assert.equal(LINNET_WEBGPU_RUNTIME.rustToolchain, '1.95.0');
  assert.equal(LINNET_WEBGPU_RUNTIME.license, 'Apache-2.0');
  assert.match(LINNET_WEBGPU_RUNTIME.sha256, /^[a-f0-9]{64}$/);
  assert.equal(LINNET_WEBGPU_RUNTIME.releaseTag, `linnet-webgpu-0.1.1-${LINNET_WEBGPU_RUNTIME.sha256.slice(0, 12)}`);
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

test('dynamic RHS uploads never reuse a same-address buffer after contents change', () => {
  const cache = new Map();
  const created = [];
  const makeBuffer = size => {
    const buffer = { size, values: null, destroyed: false, destroy() { this.destroyed = true; } };
    created.push(buffer);
    return buffer;
  };
  const upload = (buffer, values) => { buffer.values = Array.from(values); };
  const sameAddressAndShape = { weightKey: 'wasm:481920:128:t', cacheableWeight: false };
  const first = materializeRhsBuffer({
    ...sameAddressAndShape,
    weightBuffer: new Float32Array([1, 2, 3]).buffer,
  }, cache, makeBuffer, upload);
  const second = materializeRhsBuffer({
    ...sameAddressAndShape,
    weightBuffer: new Float32Array([7, 8, 9]).buffer,
  }, cache, makeBuffer, upload);

  assert.notEqual(first.buffer, second.buffer, 'same pointer/dimensions do not alias dynamic KV contents across generations');
  assert.deepEqual(first.buffer.values, [1, 2, 3]);
  assert.deepEqual(second.buffer.values, [7, 8, 9]);
  assert.equal(first.transient, true);
  assert.equal(second.transient, true);
  assert.equal(cache.size, 0, 'dynamic buffers never enter the immutable-weight cache');
  assert.equal(created.length, 2);
});

test('only explicitly immutable model-weight RHS buffers are cached', () => {
  const cache = new Map();
  const createBuffer = size => ({ size });
  const writeBuffer = (buffer, values) => { buffer.values = Array.from(values); };
  const request = {
    weightKey: 'wasm:72000:256:t',
    cacheableWeight: true,
    weightBuffer: new Float32Array([2, 4]).buffer,
  };
  const first = materializeRhsBuffer(request, cache, createBuffer, writeBuffer);
  const second = materializeRhsBuffer({ ...request, weightBuffer: null }, cache, createBuffer, writeBuffer);
  assert.equal(first.cacheHit, false);
  assert.equal(first.transient, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.buffer, first.buffer);
  assert.equal(cache.size, 1);
});

test('the source patch marks generic matmuls dynamic and Mat::F32 weights cacheable', async () => {
  const patch = await readFile(new URL('../tools/linnet-webgpu-runtime/prepare-upstream.mjs', import.meta.url), 'utf8');
  assert.match(patch, /try_webgpu\(input, weight, output, 1, in_features, out_features, true, false\)/);
  assert.match(patch, /try_webgpu\(a, b, out, m, k, n, false, false\)/);
  assert.match(patch, /linnet_gpu_dispatch\(a\.as_ptr\(\), b\.as_ptr\(\), out\.as_mut_ptr\(\), m as u32, k as u32, n as u32, if transpose_b \{ 1 \} else \{ 0 \}, 1\)/);
  assert.match(patch, /Mat::gemv F32 weights/);
  assert.match(patch, /Mat::gemm F32 weights/);
  assert.match(patch, /Mat::gemm_rows F32 weights/);
});

test('only the verified main build uploads an allowlisted runtime release payload', async () => {
  const workflow = await readFile(new URL('../.github/workflows/linnet-webgpu.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.ok(workflow.includes('name: linnet-webgpu-runtime-${{ github.sha }}'));
  for (const file of ['linnet-tts-webgpu-hybrid.wasm', 'LICENSE', 'NOTICE', 'BUILD-MANIFEST.json']) {
    assert.ok(workflow.includes(`.cache/linnet-webgpu-build/release/${file}`), file);
  }
  assert.doesNotMatch(workflow.slice(workflow.indexOf('name: Upload the verified runtime release payload from main')),
    /model-weights|\.safetensors|tokenizer\.model|\.npy/);
});
