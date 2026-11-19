import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeEffectiveBackendAllowed } from '../tools/results.mjs';

test('ZONOS3 labels the hybrid WebGPU and host codec path truthfully', () => {
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'webgpu', 'webgpu+cpu-codec-host'), true);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'webgpu', 'webgpu'), true);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'cpu', 'cpu/wasm'), true);
});

test('the ZONOS3 hybrid label is not accepted for unrelated WebGPU models', () => {
  assert.equal(nativeEffectiveBackendAllowed('other-model', 'webgpu', 'webgpu+cpu-codec-host'), false);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'cpu', 'webgpu+cpu-codec-host'), false);
});
