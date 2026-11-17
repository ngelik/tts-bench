import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../lib/server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const server = await startServer(root);
let browser;

try {
  browser = await chromium.launch({
    executablePath: chrome,
    headless: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--use-angle=swiftshader',
      '--use-vulkan=swiftshader',
    ],
  });
  const page = await browser.newPage();
  await page.goto(server.url, { waitUntil: 'load' });
  const results = await page.evaluate(async () => {
    const { createLinnetAdapter } = await import('/web/adapters/linnet.mjs');
    const spokenText = 'A Linnet browser runtime performs a short neural speech check.';
    const runs = [];
    for (const backend of ['cpu', 'webgpu']) {
      const adapter = createLinnetAdapter();
      try {
        const initialized = await adapter.initialize({
          backend,
          probe: true,
          probeText: spokenText,
          allowSoftwareGpu: true,
        });
        const response = await adapter.generateChunk({ id: 0, text: spokenText });
        const sampleCount = response.parts.reduce((sum, part) => sum + part.length, 0);
        const samples = new Float32Array(sampleCount);
        let offset = 0;
        for (const part of response.parts) {
          samples.set(part, offset);
          offset += part.length;
        }
        let peak = 0;
        let squareSum = 0;
        for (const sample of samples) {
          if (!Number.isFinite(sample)) throw new Error('Linnet returned non-finite PCM.');
          peak = Math.max(peak, Math.abs(sample));
          squareSum += sample * sample;
        }
        const pcmSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', samples.buffer)),
          byte => byte.toString(16).padStart(2, '0')).join('');
        runs.push({
          backend,
          initialized,
          gpuDiagnostics: adapter.gpuDiagnostics(),
          sampleRate: response.sampleRate,
          sampleCount,
          durationSeconds: sampleCount / response.sampleRate,
          peak,
          rms: Math.sqrt(squareSum / sampleCount),
          pcmSha256,
        });
      } finally {
        await adapter.dispose();
      }
    }
    return runs;
  });

  const cpu = results.find(result => result.backend === 'cpu');
  const webgpu = results.find(result => result.backend === 'webgpu');
  assert.equal(cpu.initialized.status, 'measured', cpu.initialized.reason);
  assert.equal(cpu.initialized.backendEffective, 'cpu/wasm');
  assert.equal(cpu.initialized.capability.gpuDispatchVerified, null);
  assert.equal(webgpu.initialized.status, 'measured', webgpu.initialized.reason);
  assert.equal(webgpu.initialized.backendEffective, 'webgpu/wasm-hybrid');
  assert.equal(webgpu.initialized.capability.gpuDispatchVerified, true);
  assert.ok(webgpu.initialized.settings.webgpuMinMacs === 32768);
  assert.equal(webgpu.initialized.settings.webgpuAdapter.isFallbackAdapter, true,
    'hosted software adapter is explicitly identified as a diagnostic');
  assert.ok(webgpu.gpuDiagnostics.dispatchCount > 0, 'model-level inference dispatched WebGPU kernels');
  assert.ok(webgpu.gpuDiagnostics.uniqueWeightBuffers > 0, 'static dense weights were cached on the WebGPU worker');
  assert.equal(webgpu.gpuDiagnostics.weightUploadCount, webgpu.gpuDiagnostics.uniqueWeightBuffers);
  assert.ok(webgpu.gpuDiagnostics.weightUploadCount < webgpu.gpuDiagnostics.dispatchCount,
    'repeated operations reused cached WebGPU weight buffers');
  for (const run of results) {
    assert.equal(run.sampleRate, 24000);
    assert.ok(run.sampleCount > 2400, `${run.backend} emitted more than 0.1 seconds of speech`);
    assert.ok(run.peak > 0.01, `${run.backend} emitted non-silent PCM`);
    assert.ok(run.rms > 0.001, `${run.backend} emitted non-silent PCM`);
  }
  console.log(JSON.stringify({
    sourceCommit: '29dfdd503a3930e4e36c1130e4c9aab0592201ca',
    report: 'model-level short-utterance correctness diagnostic; no performance or hardware-GPU claim',
    runs: results,
  }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
