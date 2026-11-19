import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { startServer } from '../../lib/server.mjs';

const root = resolve(import.meta.dirname, '../..');
const outputDir = resolve(root, '.cache/inflect-mini-v3-webgpu-diagnostic');
const runtimeTarget = resolve(root, '.cache/public/runtimes/onnxruntime-web/1.23.2');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = process.env.INFLECT_MINI_SOURCE_COMMIT
  || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.match(sourceCommit, /^[0-9a-f]{40}$/, 'diagnostic is bound to an immutable source commit');
const packageJson = JSON.parse(await readFile(resolve(root, 'node_modules/onnxruntime-web/package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const lockedRuntime = packageLock.packages?.['node_modules/onnxruntime-web'];
assert.equal(packageJson.version, '1.23.2');
assert.equal(lockedRuntime?.version, '1.23.2');
assert.ok(lockedRuntime?.integrity, 'ONNX Runtime Web tarball integrity is pinned in package-lock.json');

const gpuFiles = [
  'ort.webgpu.min.mjs',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
];
const gpuRuntime = [];
await mkdir(runtimeTarget, { recursive: true });
for (const name of gpuFiles) {
  const source = resolve(root, 'node_modules/onnxruntime-web/dist', name);
  const target = resolve(runtimeTarget, name);
  const bytes = await readFile(source);
  await copyFile(source, target);
  gpuRuntime.push({ target: `runtimes/onnxruntime-web/1.23.2/${name}`, bytes: bytes.length, sha256: sha256(bytes) });
}

const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
const articleBytes = await readFile(resolve(root, 'fixtures/en-20000.txt'));
const article = new TextDecoder('utf-8', { fatal: true }).decode(articleBytes);
assert.equal(article.length, 20_000);
assert.equal(fixture.articleSha256, sha256(articleBytes));
assert.ok(fixture.chunks.length >= 1);
const sourceSpan = fixture.chunks[0];
const chunkText = article.slice(sourceSpan.start, sourceSpan.end);
assert.equal(chunkText.length, sourceSpan.characters);
assert.equal(sha256(Buffer.from(chunkText, 'utf8')), sourceSpan.sha256);
const chunk = { id: sourceSpan.id, start: sourceSpan.start, end: sourceSpan.end,
  characters: sourceSpan.characters, sha256: sourceSpan.sha256, text: chunkText };

const server = await startServer(root);
let browser;
let result = null;
let serverStats = null;
try {
  const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser = await chromium.launch({ executablePath, headless: false, chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    args: ['--no-first-run', '--no-default-browser-check', '--disable-software-rasterizer'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  const requests = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });

  result = await page.evaluate(async ({ chunk: canonicalChunk }) => {
    let pageAdapter = null;
    let pageAdapterInfo = null;
    let pageAdapterFallback = null;
    try {
      pageAdapter = await navigator.gpu?.requestAdapter();
      pageAdapterInfo = pageAdapter?.info ?? null;
      pageAdapterFallback = pageAdapter?.isFallbackAdapter ?? pageAdapterInfo?.isFallbackAdapter ?? null;
    } catch (error) {
      pageAdapterInfo = { error: String(error?.message ?? error) };
    }
    const { createInflectMiniV3Adapter } = await import('/web/adapters/inflect-mini-v3.mjs');
    const adapter = createInflectMiniV3Adapter();
    let info = null;
    let generated = null;
    try {
      info = await adapter.initialize({ backend: 'webgpu', probe: true,
        probeText: 'A short WebGPU diagnostic utterance.' });
      if (info.status !== 'measured') {
        return { status: 'hardware-or-dispatch-unavailable', reason: info.reason ?? null,
          info, pageAdapter: pageAdapterInfo, pageAdapterFallback,
          browser: { userAgent: navigator.userAgent, webgpuAvailable: Boolean(navigator.gpu),
            hardwareConcurrency: navigator.hardwareConcurrency } };
      }
      const started = performance.now();
      let firstPcmMs = null;
      generated = await adapter.generateChunk(canonicalChunk, {
        onFirstPcm: () => { firstPcmMs ??= performance.now() - started; },
      });
      const generationMs = performance.now() - started;
      if (generated.sampleRate !== 24_000 || generated.completedChunkId !== canonicalChunk.id || !generated.parts.length) {
        throw new Error('WebGPU Mini generated output has an invalid sample clock, id or part count.');
      }
      const totalSamples = generated.parts.reduce((total, part) => total + part.length, 0);
      if (!totalSamples) throw new Error('WebGPU Mini generated empty PCM.');
      const pcm = new Float32Array(totalSamples);
      let offset = 0;
      let peak = 0;
      let squareSum = 0;
      for (const part of generated.parts) {
        for (const value of part) {
          if (!Number.isFinite(value)) throw new Error('WebGPU Mini generated nonfinite PCM.');
          peak = Math.max(peak, Math.abs(value));
          squareSum += value * value;
        }
        pcm.set(part, offset);
        offset += part.length;
      }
      const rms = Math.sqrt(squareSum / totalSamples);
      if (!(peak > 1e-6 && rms > 1e-6)) throw new Error('WebGPU Mini generated silent PCM.');
      const pcmSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pcm.buffer)),
        byte => byte.toString(16).padStart(2, '0')).join('');
      const wavBytes = new Uint8Array(44 + totalSamples * 2);
      const view = new DataView(wavBytes.buffer);
      const ascii = (offset, value) => { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); };
      ascii(0, 'RIFF'); view.setUint32(4, wavBytes.length - 8, true); ascii(8, 'WAVEfmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, generated.sampleRate, true); view.setUint32(28, generated.sampleRate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data');
      view.setUint32(40, totalSamples * 2, true);
      let clipped = false;
      for (let index = 0; index < totalSamples; index++) {
        const value = pcm[index]; clipped ||= value < -1 || value > 1;
        view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
      }
      let wavBinary = '';
      for (let index = 0; index < wavBytes.length; index += 0x8000) {
        wavBinary += String.fromCharCode(...wavBytes.subarray(index, index + 0x8000));
      }
      const description = info.capability?.description ?? '';
      const dispatchMatch = /Observed (\d+) WebGPU compute dispatches/.exec(description);
      const dispatches = dispatchMatch ? Number(dispatchMatch[1]) : null;
      return {
        status: 'measured',
        info,
        pageAdapter: pageAdapterInfo,
        pageAdapterFallback,
        browser: { userAgent: navigator.userAgent, webgpuAvailable: Boolean(navigator.gpu),
          hardwareConcurrency: navigator.hardwareConcurrency },
        generation: { canonicalChunkId: canonicalChunk.id, sourceCharacters: canonicalChunk.characters,
          internalParts: generated.parts.length, samples: totalSamples, sampleRate: generated.sampleRate,
          durationSeconds: totalSamples / generated.sampleRate, firstPcmMs, generationMs,
          peak, rms, pcmSha256, clipped, wavBase64: btoa(wavBinary) },
        dispatches,
      };
    } finally {
      await adapter.dispose();
    }
  }, { chunk });

  serverStats = server.snapshot();
  const externalRequests = requests.filter(url => !url.startsWith(server.url));
  const report = {
    schemaVersion: 1,
    diagnosticOnly: true,
    scoreEligible: false,
    purpose: 'One-span physical-WebGPU dispatch diagnostic; not a benchmark score and not a registered backend claim.',
    sourceCommit,
    model: 'inflect-mini-v3-browser-port',
    modelRevision: 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6',
    packageLockIntegrity: lockedRuntime.integrity,
    gpuRuntime,
    fixture: { id: 'english-20k-v1', articleSha256: sha256(articleBytes), canonicalChunkId: chunk.id,
      sourceCharacters: chunk.characters, sourceSha256: chunk.sha256 },
    ...result,
    server: serverStats,
    network: { requestCount: requests.length, externalRequests },
    consoleErrors,
  };
  await mkdir(outputDir, { recursive: true });
  if (result.generation) {
    const wav = Buffer.from(result.generation.wavBase64, 'base64');
    delete report.generation.wavBase64;
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 1);
    assert.equal(wav.readUInt32LE(24), 24_000);
    assert.equal(wav.readUInt32LE(40), result.generation.samples * 2);
    assert.equal(wav.length, 44 + result.generation.samples * 2);
    assert.equal(result.generation.clipped, false, 'WebGPU WAV conversion did not clip PCM.');
    assert.ok(result.info.capability?.gpuDispatchVerified, 'real WebGPU dispatch was verified');
    assert.ok(Number.isInteger(result.dispatches) && result.dispatches > 0, 'WebGPU dispatch count is positive');
    assert.equal(result.info.backendEffective, 'webgpu+wasm');
    assert.notEqual(result.pageAdapterFallback, true,
      'Chrome page did not identify the selected adapter as a software fallback');
    assert.deepEqual(externalRequests, [], 'diagnostic made no off-origin requests');
    assert.deepEqual(consoleErrors, [], 'Chrome reported no page or console errors');
    const wavPath = resolve(outputDir, `span-${String(chunk.id).padStart(2, '0')}-webgpu.wav`);
    await writeFile(wavPath, wav);
    report.generation.wav = { file: wavPath.split('/').at(-1), bytes: wav.length, sha256: sha256(wav),
      encoding: 'RIFF PCM16 mono conversion of the original Float32 PCM; no clipping' };
  }
  await writeFile(resolve(outputDir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, sourceCommit, model: report.model,
    backendEffective: report.info?.backendEffective, gpu: report.info?.gpu,
    dispatches: report.dispatches, generation: report.generation, reason: report.reason,
    server: serverStats, network: report.network }, null, 2));
  if (result.status === 'measured' && !result.generation) throw new Error('WebGPU initialization measured but synthesis did not return evidence.');
} catch (error) {
  serverStats ??= server.snapshot();
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'error.json'), JSON.stringify({ schemaVersion: 1,
    diagnosticOnly: true, scoreEligible: false, sourceCommit, model: 'inflect-mini-v3-browser-port',
    error: String(error?.stack || error), result, server: serverStats }, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
