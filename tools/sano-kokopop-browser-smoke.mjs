import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '..');
const release = resolve(root, '.cache/sano-kokopop-build/release');
const evidenceDir = resolve(root, '.cache/sano-kokopop-browser-evidence');
const manifest = JSON.parse(await readFile(resolve(release, 'BUILD-MANIFEST.json'), 'utf8'));
const modelBytes = await readFile(resolve(release, 'heartnano-f32.gguf'));
const modelSha256 = createHash('sha256').update(modelBytes).digest('hex');
assert.equal(modelSha256, manifest.model.sha256);
const smokeText = 'The quick brown fox jumps over the lazy dog.';
const runtime = manifest.runtimeFiles.map(file => ({ ...file, url: '/' + file.target }));
const modelConfig = {
  id: 'sano-heart-nano-gguf-f32',
  model: { url: '/models/heartnano-f32.gguf', bytes: modelBytes.length, sha256: modelSha256 },
  runtime: { version: 'kokopop-sano-heartnano-v1', files: runtime },
  info: {
    voice: 'heartnano (US English)',
    settings: { sampleRate: 24000, speed: 1, seed: '42 + chunk.id', precision: 'F32 expanded from official Q8 weights' },
  },
};

function contentType(path) {
  if (path.endsWith('.mjs') || path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.wasm')) return 'application/wasm';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.gguf') || path.endsWith('.data')) return 'application/octet-stream';
  return 'text/html; charset=utf-8';
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const isStagedAsset = /^\/(models|runtimes|licenses)\//.test(pathname);
    const path = url.pathname === '/'
      ? resolve(root, 'web/sano-kokopop')
      : resolve(root, isStagedAsset ? '.cache/public' + pathname : '.' + pathname);
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith('..' + sep) || path.includes(sep + '.git' + sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    const body = url.pathname === '/' ? '<!doctype html><html><head><meta charset="utf-8"><title>Kokopop smoke</title></head><body>Hosted Kokopop WebGPU smoke</body></html>' : await readFile(path);
    response.writeHead(200, { 'Content-Type': contentType(path), 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

await mkdir(evidenceDir, { recursive: true });
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
let browser;
try {
  const executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: false,
    args: ['--enable-unsafe-webgpu'],
  });
  const page = await browser.newPage();
  page.on('console', message => console.log('[browser]', message.text()));
  page.on('pageerror', error => console.error('[browser-error]', error.stack || error.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  const result = await page.evaluate(async ({ config, text }) => {
    const { createSanoKokopopAdapter } = await import('/web/adapters/sano-kokopop.mjs');
    const chunk = { id: 3, start: 0, end: text.length, text };
    const cpu = createSanoKokopopAdapter(config);
    const cpuInfo = await cpu.initialize({ backend: 'cpu' });
    if (cpuInfo.status !== 'measured' || cpuInfo.backendEffective !== 'cpu/wasm') throw new Error('CPU/WASM setup did not select the explicit requested backend.');
    const cpuOutput = await cpu.generateChunk(chunk);
    await cpu.dispose();

    const gpu = createSanoKokopopAdapter(config);
    const gpuInfo = await gpu.initialize({ backend: 'webgpu', probe: true, probeText: text });
    if (gpuInfo.status === 'unsupported') {
      await gpu.dispose();
      return {
        status: 'gpu-unavailable-on-runner',
        reason: gpuInfo.reason,
        cpu: { sampleRate: cpuOutput.sampleRate, samples: Array.from(cpuOutput.parts[0]) },
        gpuInfo,
      };
    }
    const gpuOutput = await gpu.generateChunk(chunk);
    await gpu.dispose();
    return {
      status: 'measured',
      cpuInfo,
      gpuInfo,
      cpu: { sampleRate: cpuOutput.sampleRate, samples: Array.from(cpuOutput.parts[0]) },
      gpu: { sampleRate: gpuOutput.sampleRate, samples: Array.from(gpuOutput.parts[0]) },
    };
  }, { config: modelConfig, text: smokeText });

  const { writeFile: write } = await import('node:fs/promises');
  function wav(samples, sampleRate) {
    const bytes = Buffer.alloc(44 + samples.length * 2);
    bytes.write('RIFF', 0, 4, 'ascii');
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write('WAVEfmt ', 8, 8, 'ascii');
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(sampleRate, 24);
    bytes.writeUInt32LE(sampleRate * 2, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36, 4, 'ascii');
    bytes.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((sample, index) => bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
    return bytes;
  }
  function audioSummary(samples) {
    let squared = 0;
    let peak = 0;
    for (const sample of samples) {
      assert.ok(Number.isFinite(sample));
      squared += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    return { samples: samples.length, rms: Math.sqrt(squared / samples.length), peak };
  }
  const cpu = result.cpu.samples;
  assert.ok(cpu.length > 1000);
  const cpuWav = wav(cpu, result.cpu.sampleRate);
  await write(resolve(evidenceDir, 'heartnano-cpu.wav'), cpuWav);
  const report = {
    schemaVersion: 1,
    source: manifest.source,
    model: { sha256: modelSha256, bytes: modelBytes.length, artifactRevision: manifest.model.artifactRevision },
    browser: await page.evaluate(() => ({ userAgent: navigator.userAgent, webgpu: Boolean(navigator.gpu), jspi: typeof WebAssembly.Suspending === 'function' })),
    status: result.status,
    cpu: { backend: result.cpuInfo?.backendEffective || 'cpu/wasm', sampleRate: result.cpu.sampleRate, ...audioSummary(cpu), wavSha256: createHash('sha256').update(cpuWav).digest('hex') },
  };
  if (result.status === 'measured') {
    assert.equal(result.cpu.sampleRate, 24000);
    assert.equal(result.gpu.sampleRate, 24000);
    const gpu = result.gpu.samples;
    assert.equal(gpu.length, cpu.length, 'CPU and WebGPU output frame counts must match exactly');
    let xy = 0;
    let xx = 0;
    let yy = 0;
    let error = 0;
    for (let i = 0; i < cpu.length; i++) {
      xy += cpu[i] * gpu[i];
      xx += cpu[i] * cpu[i];
      yy += gpu[i] * gpu[i];
      error += (cpu[i] - gpu[i]) ** 2;
    }
    const correlation = xy / Math.sqrt(xx * yy);
    const rmsError = Math.sqrt(error / cpu.length);
    assert.ok(correlation >= 0.999, 'CPU/WebGPU correlation was ' + correlation);
    assert.ok(rmsError <= 1e-3, 'CPU/WebGPU RMS error was ' + rmsError);
    const gpuWav = wav(gpu, 24000);
    await write(resolve(evidenceDir, 'heartnano-webgpu.wav'), gpuWav);
    report.gpu = {
      backend: result.gpuInfo.backendEffective,
      sampleRate: 24000,
      ...audioSummary(gpu),
      wavSha256: createHash('sha256').update(gpuWav).digest('hex'),
      capability: result.gpuInfo.capability,
    };
    report.parity = { frames: cpu.length, correlation, rmsError, seed: 45, text: smokeText };
  } else {
    report.gpu = { status: result.status, reason: result.reason };
    // Preserve an explicit unavailable receipt on runners that do not expose
    // eligible hardware instead of mislabeling CPU fallback as GPU evidence.
  }
  report.chromePath = process.env.CHROME_PATH || 'Playwright Chromium default';
  await writeFile(resolve(evidenceDir, 'browser-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close().catch(() => {});
  await new Promise(resolveClose => server.close(resolveClose));
}
