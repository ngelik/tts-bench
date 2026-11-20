import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeEffectiveBackendAllowed, nativeZonos3CpuSettingsAllowed } from '../tools/results.mjs';

test('ZONOS3 labels the hybrid WebGPU and host codec path truthfully', () => {
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'webgpu', 'webgpu+cpu-codec-host'), true);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'webgpu', 'webgpu'), true);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'cpu', 'cpu/wasm'), true);
});

test('the ZONOS3 hybrid label is not accepted for unrelated WebGPU models', () => {
  assert.equal(nativeEffectiveBackendAllowed('other-model', 'webgpu', 'webgpu+cpu-codec-host'), false);
  assert.equal(nativeEffectiveBackendAllowed('zonos3-mini', 'cpu', 'webgpu+cpu-codec-host'), false);
});

test('ZONOS3 CPU v3 accepts only the measured one-thread GGML profile', () => {
  const settings = { runtimeRelease: 'audio-cpp-zonos3-cpu-wasm-v3', threads: 1, pthreadPoolSize: 12 };
  assert.equal(nativeZonos3CpuSettingsAllowed('zonos3-mini', 'cpu', settings), true);
  assert.equal(nativeZonos3CpuSettingsAllowed('zonos3-mini', 'cpu', { ...settings, threads: 6 }), false);
  assert.equal(nativeZonos3CpuSettingsAllowed('zonos3-mini', 'cpu', { ...settings, pthreadPoolSize: 6 }), false);
  assert.equal(nativeZonos3CpuSettingsAllowed('zonos3-mini', 'webgpu', {}), true);
  assert.equal(nativeZonos3CpuSettingsAllowed('other-model', 'cpu', {}), true);
});
