import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
    const probeText = 'First, the river turns slowly beneath the bridge.';
    const spokenText = 'Next, a bright blue lantern guides the travelers home.';
    const runs = [];
    for (const backend of ['cpu', 'webgpu']) {
      const adapter = createLinnetAdapter();
      try {
        const initialized = await adapter.initialize({
          backend,
          probe: true,
          probeText,
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
        const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
        const wavView = new DataView(wavBuffer);
        const putText = (offset, value) => { for (let i = 0; i < value.length; i++) wavView.setUint8(offset + i, value.charCodeAt(i)); };
        putText(0, 'RIFF'); wavView.setUint32(4, 36 + samples.length * 2, true); putText(8, 'WAVE');
        putText(12, 'fmt '); wavView.setUint32(16, 16, true); wavView.setUint16(20, 1, true);
        wavView.setUint16(22, 1, true); wavView.setUint32(24, response.sampleRate, true);
        wavView.setUint32(28, response.sampleRate * 2, true); wavView.setUint16(32, 2, true);
        wavView.setUint16(34, 16, true); putText(36, 'data'); wavView.setUint32(40, samples.length * 2, true);
        for (let i = 0; i < samples.length; i++) {
          const sample = Math.max(-1, Math.min(1, samples[i]));
          wavView.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
        }
        const wavBytes = new Uint8Array(wavBuffer);
        let wavBinary = '';
        for (let i = 0; i < wavBytes.length; i += 0x8000) {
          wavBinary += String.fromCharCode(...wavBytes.subarray(i, Math.min(i + 0x8000, wavBytes.length)));
        }
        runs.push({
          backend,
          probeText,
          spokenText,
          initialized,
          gpuDiagnostics: adapter.gpuDiagnostics(),
          sampleRate: response.sampleRate,
          sampleCount,
          durationSeconds: sampleCount / response.sampleRate,
          peak,
          rms: Math.sqrt(squareSum / sampleCount),
          pcmSha256,
          wavBase64: btoa(wavBinary),
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
  assert.equal(webgpu.initialized.backendEffective, 'webgpu+wasm');
  assert.match(webgpu.initialized.precision, /FP32 WebGPU and remaining kernels use WASM SIMD128/);
  assert.equal(webgpu.initialized.capability.gpuDispatchVerified, true);
  assert.ok(webgpu.initialized.settings.webgpuMinMacs === 32768);
  assert.match(webgpu.initialized.settings.runtimeSha256, /^[a-f0-9]{64}$/);
  assert.equal(webgpu.initialized.settings.webgpuAdapter.isFallbackAdapter, true,
    'hosted software adapter is explicitly identified as a diagnostic');
  assert.ok(webgpu.gpuDiagnostics.dispatchCount > 0, 'model-level inference dispatched WebGPU kernels');
  assert.ok(webgpu.gpuDiagnostics.uniqueWeightBuffers > 0, 'static dense weights were cached on the WebGPU worker');
  assert.ok(webgpu.gpuDiagnostics.dynamicWeightUploads > 0,
    'dynamic KV RHS data is uploaded on every WebGPU dispatch instead of reusing pointer aliases');
  assert.equal(webgpu.gpuDiagnostics.weightUploadCount,
    webgpu.gpuDiagnostics.uniqueWeightBuffers + webgpu.gpuDiagnostics.dynamicWeightUploads);
  assert.ok(webgpu.gpuDiagnostics.weightUploadCount < webgpu.gpuDiagnostics.dispatchCount,
    'immutable model weights are cached while dynamic attention values remain fresh');
  for (const run of results) {
    assert.equal(run.sampleRate, 24000);
    assert.ok(run.sampleCount > 2400, `${run.backend} emitted more than 0.1 seconds of speech`);
    assert.ok(run.peak > 0.01, `${run.backend} emitted non-silent PCM`);
    assert.ok(run.rms > 0.001, `${run.backend} emitted non-silent PCM`);
  }
  const artifactDir = resolve(root, '.cache/linnet-webgpu-validation');
  await mkdir(artifactDir, { recursive: true });
  for (const run of results) {
    await writeFile(resolve(artifactDir, `${run.backend}.wav`), Buffer.from(run.wavBase64, 'base64'));
    delete run.wavBase64;
  }
  await writeFile(resolve(artifactDir, 'README.txt'), [
    'Short LINNET model-level hybrid/runtime smoke output generated in headed Chrome.',
    'It is diagnostic audio, not a scored recording or a speed comparison.',
    'The synthesis uses VoxRT linnet-en-35m at its pinned revision and authorized built-in voice linnet-en-f1.',
    `Cache regression sequence: “${results[1].probeText}” followed by “${results[1].spokenText}”.`,
    'Linnet model weights by VoxRT, licensed under the Linnet Weights License 1.0.',
    'Powered by Linnet (VoxRT).',
    'Hybrid runtime: Apache-2.0 VoxRT/LinnetTTS source v0.1.1, pinned in web/linnet/runtime-policy.mjs.',
  ].join('\n') + '\n');
  await writeFile(resolve(artifactDir, 'report.json'), JSON.stringify({
    sourceCommit: '29dfdd503a3930e4e36c1130e4c9aab0592201ca',
    report: 'model-level short-utterance correctness diagnostic; no performance or hardware-GPU claim',
    cacheRegression: 'two different utterances per backend; immutable weight buffers may be cached, dynamic RHS buffers are fresh per dispatch',
    runs: results,
  }, null, 2) + '\n');
  console.log(JSON.stringify({
    sourceCommit: '29dfdd503a3930e4e36c1130e4c9aab0592201ca',
    report: 'model-level short-utterance correctness diagnostic; no performance or hardware-GPU claim',
    runs: results,
  }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
