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
const assetLockBytes = await readFile(resolve(root, 'assets.lock.json'));
const assetLock = JSON.parse(assetLockBytes.toString('utf8'));
const registeredModel = assetLock.models?.['inflect-mini-v3-browser-port'];
assert.ok(registeredModel, 'registered Mini browser-port model exists in the asset lock');
const stagedModel = JSON.parse(await readFile(resolve(root, '.cache/inflect-mini-v3-browser-diagnostic/staged-model.json'), 'utf8'));
assert.equal(stagedModel.sourceCommit, sourceCommit, 'generated graph artifact matches the diagnostic source pin');
assert.equal(stagedModel.modelRevision, 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6');
const generatedFiles = new Map(stagedModel.files.map(file => [file.path.split('/').at(-1), file]));
const modelAssets = registeredModel.assets.filter(asset => asset.generated).map(asset => {
  const filename = asset.generated.artifactPath.split('/').at(-1);
  const generated = generatedFiles.get(filename);
  assert.ok(generated, `build manifest contains ${filename}`);
  assert.equal(generated.bytes, asset.bytes, `${filename} size matches the public lock`);
  assert.equal(generated.sha256, asset.sha256, `${filename} digest matches the public lock`);
  return { id: asset.id, target: asset.target, bytes: generated.bytes, sha256: generated.sha256 };
});
assert.equal(modelAssets.length, 6, 'all six registered generated model assets are verified');
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
const canonicalChunks = fixture.chunks.map(span => {
  const text = article.slice(span.start, span.end);
  assert.equal(text.length, span.characters);
  assert.equal(sha256(Buffer.from(text, 'utf8')), span.sha256);
  return { id: span.id, start: span.start, end: span.end, characters: span.characters, sha256: span.sha256, text };
});
assert.equal(canonicalChunks.map(span => span.text).join(''), article,
  'all canonical spans cover the complete source in order');
const fullArticleRequested = process.env.INFLECT_MINI_FULL_HYBRID_ARTICLE === 'true';
if (fullArticleRequested) assert.equal(canonicalChunks.length, 93, 'full hybrid mode uses all 93 canonical spans');

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
  const runtimeWarnings = [];
  const requests = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const raw = message.text();
    const normalized = raw.replace(/\u001b\[[0-9;]*m/g, '');
    const providerPlacementWarning = /\[W:onnxruntime:, session_state\.cc:1316 VerifyEachNodeIsAssignedToAnEp\] Some nodes were not assigned to the preferred execution providers which may or may not have an negative impact on performance\. e\.g\. ORT explicitly assigns shape related ops to CPU to improve perf\.$/.test(normalized);
    const providerPlacementDetail = /\[W:onnxruntime:, session_state\.cc:1318 VerifyEachNodeIsAssignedToAnEp\] Rerunning with verbose output on a non-minimal build will show node assignments\.$/.test(normalized);
    if (providerPlacementWarning || providerPlacementDetail) runtimeWarnings.push(normalized);
    else consoleErrors.push(raw);
  });
  page.on('request', request => requests.push(request.url()));
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });

  result = await page.evaluate(async ({ chunk: canonicalChunk, fullArticleChunks }) => {
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
    const browser = { userAgent: navigator.userAgent, webgpuAvailable: Boolean(navigator.gpu),
      hardwareConcurrency: navigator.hardwareConcurrency };
    function tensorStats(tensor) {
      const data = tensor.data;
      let min = Infinity; let max = -Infinity; let squareSum = 0;
      let finiteCount = 0; let nanCount = 0; let positiveInfinityCount = 0; let negativeInfinityCount = 0;
      for (const value of data) {
        if (Number.isNaN(value)) { nanCount++; continue; }
        if (value === Infinity) { positiveInfinityCount++; continue; }
        if (value === -Infinity) { negativeInfinityCount++; continue; }
        finiteCount++; min = Math.min(min, value); max = Math.max(max, value); squareSum += value * value;
      }
      return { dtype: tensor.dtype, dims: tensor.dims, length: data.length, finiteCount, nanCount,
        positiveInfinityCount, negativeInfinityCount, min: finiteCount ? min : null,
        max: finiteCount ? max : null, peak: finiteCount ? Math.max(Math.abs(min), Math.abs(max)) : null,
        rms: finiteCount ? Math.sqrt(squareSum / finiteCount) : null };
    }
    function flattenTensors(value, prefix = '', output = new Map()) {
      if (value && value.data instanceof Float32Array && Array.isArray(value.dims)) {
        output.set(prefix, value); return output;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => flattenTensors(item, `${prefix}.${index}`, output));
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          if (key === 'phones' || key === 'phoneIds' || key === 'seed' || key === 'source') continue;
          flattenTensors(item, prefix ? `${prefix}.${key}` : key, output);
        }
      }
      return output;
    }
    function compareTensors(left, right) {
      if (JSON.stringify(left.dims) !== JSON.stringify(right.dims) || left.data.length !== right.data.length) {
        return { sameShape: false, left: tensorStats(left), right: tensorStats(right) };
      }
      const a = left.data; const b = right.data;
      let maximumAbsoluteError = 0; let maximumErrorIndex = null; let squareError = 0;
      let exactEqual = true; let differingValues = 0; let nonfinitePairs = 0;
      let sumA = 0; let sumB = 0; let sumA2 = 0; let sumB2 = 0; let sumAB = 0; let finitePairs = 0;
      for (let index = 0; index < a.length; index++) {
        if (!Number.isFinite(a[index]) || !Number.isFinite(b[index])) { nonfinitePairs++; continue; }
        finitePairs++;
        const delta = a[index] - b[index];
        if (delta !== 0) { exactEqual = false; differingValues++; }
        const absolute = Math.abs(delta);
        if (absolute > maximumAbsoluteError) { maximumAbsoluteError = absolute; maximumErrorIndex = index; }
        squareError += delta * delta;
        sumA += a[index]; sumB += b[index]; sumA2 += a[index] * a[index]; sumB2 += b[index] * b[index]; sumAB += a[index] * b[index];
      }
      const meanA = finitePairs ? sumA / finitePairs : 0;
      const meanB = finitePairs ? sumB / finitePairs : 0;
      const covariance = finitePairs ? sumAB / finitePairs - meanA * meanB : 0;
      const varianceA = finitePairs ? sumA2 / finitePairs - meanA * meanA : 0;
      const varianceB = finitePairs ? sumB2 / finitePairs - meanB * meanB : 0;
      const rmsError = finitePairs ? Math.sqrt(squareError / finitePairs) : null;
      const rmsA = finitePairs ? Math.sqrt(Math.max(0, sumA2 / finitePairs)) : null;
      const rmsB = finitePairs ? Math.sqrt(Math.max(0, sumB2 / finitePairs)) : null;
      return { sameShape: true, dtype: left.dtype, dims: left.dims, length: a.length, exactEqual,
        differingValues, nonfinitePairs, maximumAbsoluteError, maximumErrorIndex, rmsError,
        relativeRmsError: rmsA > 0 ? rmsError / rmsA : null,
        rmsRatioRightToLeft: rmsA > 0 ? rmsB / rmsA : null,
        correlation: varianceA > 0 && varianceB > 0 ? covariance / Math.sqrt(varianceA * varianceB) : null,
        left: tensorStats(left), right: tensorStats(right) };
    }
    function compareRuns(left, right) {
      const comparison = [];
      let leftInputs = null; let rightInputs = null;
      for (let index = 0; index < Math.max(left.diagnostics.utterances.length, right.diagnostics.utterances.length); index++) {
        const a = left.diagnostics.utterances[index]; const b = right.diagnostics.utterances[index];
        if (!a || !b) { comparison.push({ utteranceIndex: index, inputMatch: false, reason: 'utterance count differs' }); continue; }
        const inputMatch = a.seed === b.seed && a.phones === b.phones
          && JSON.stringify(a.phoneIds) === JSON.stringify(b.phoneIds);
        const at = flattenTensors(a); const bt = flattenTensors(b);
        const tensorPaths = [...new Set([...at.keys(), ...bt.keys()])];
        const tensors = tensorPaths.map(path => {
          const x = at.get(path); const y = bt.get(path);
          return { path, ...(x && y ? compareTensors(x, y) : { sameShape: false, missing: !x ? 'left' : 'right' }) };
        });
        comparison.push({ utteranceIndex: index, seedLeft: a.seed, seedRight: b.seed,
          phoneIdsMatch: inputMatch, phoneCountLeft: a.phoneIds.length, phoneCountRight: b.phoneIds.length,
          tensors });
        if (index === 0) { leftInputs = a.waveformInputs; rightInputs = b.waveformInputs; }
      }
      const firstNonExact = comparison.flatMap(row => row.tensors ?? [])
        .find(item => item.sameShape && item.exactEqual === false)?.path ?? null;
      const waveformInputNames = ['hidden', 'style', 'source_spec'];
      const waveformInputChecks = leftInputs && rightInputs ? waveformInputNames.map(name => ({ name,
        comparison: compareTensors(leftInputs[name], rightInputs[name]) })) : [];
      const leftWave = left.diagnostics.utterances[0]?.waveform;
      const rightWave = right.diagnostics.utterances[0]?.waveform;
      return { inputIdentityMatch: comparison.every(row => row.phoneIdsMatch !== false),
        firstNonExactTensor: firstNonExact, utterances: comparison,
        waveformInputs: waveformInputChecks,
        firstUtteranceWaveform: leftWave && rightWave ? compareTensors(leftWave, rightWave) : null };
    }
    function summarizeDiagnostics(diagnostics) {
      return { backendEffective: diagnostics.backendEffective,
        utterances: diagnostics.utterances.map(utterance => ({
          seed: utterance.seed,
          phoneCount: utterance.phoneIds.length,
          waveformInputSource: utterance.waveformInputs.source,
          tensors: Object.fromEntries([...flattenTensors(utterance)].map(([path, tensor]) => [path, tensorStats(tensor)])),
        })) };
    }
    function compactRun(run) {
      const { diagnostics, ...rest } = run;
      return { ...rest, stageSummary: diagnostics ? summarizeDiagnostics(diagnostics) : null };
    }
    function metricAccumulator() {
      return { pairs: 0, nonfinitePairs: 0, differingValues: 0, maximumAbsoluteError: 0,
        maximumErrorIndex: null, squareError: 0, sumA: 0, sumB: 0, sumA2: 0, sumB2: 0, sumAB: 0 };
    }
    function addPair(acc, a, b, index) {
      if (!Number.isFinite(a) || !Number.isFinite(b)) { acc.nonfinitePairs++; return; }
      acc.pairs++;
      const delta = a - b;
      if (delta !== 0) acc.differingValues++;
      const absolute = Math.abs(delta);
      if (absolute > acc.maximumAbsoluteError) {
        acc.maximumAbsoluteError = absolute;
        acc.maximumErrorIndex = index;
      }
      acc.squareError += delta * delta;
      acc.sumA += a; acc.sumB += b;
      acc.sumA2 += a * a; acc.sumB2 += b * b; acc.sumAB += a * b;
    }
    function finishAccumulator(acc) {
      const meanA = acc.pairs ? acc.sumA / acc.pairs : 0;
      const meanB = acc.pairs ? acc.sumB / acc.pairs : 0;
      const varianceA = acc.pairs ? acc.sumA2 / acc.pairs - meanA * meanA : 0;
      const varianceB = acc.pairs ? acc.sumB2 / acc.pairs - meanB * meanB : 0;
      const rmsA = acc.pairs ? Math.sqrt(Math.max(0, acc.sumA2 / acc.pairs)) : null;
      const rmsB = acc.pairs ? Math.sqrt(Math.max(0, acc.sumB2 / acc.pairs)) : null;
      const rmsError = acc.pairs ? Math.sqrt(acc.squareError / acc.pairs) : null;
      const covariance = acc.pairs ? acc.sumAB / acc.pairs - meanA * meanB : 0;
      return { pairs: acc.pairs, nonfinitePairs: acc.nonfinitePairs, differingValues: acc.differingValues,
        maximumAbsoluteError: acc.maximumAbsoluteError, maximumErrorIndex: acc.maximumErrorIndex,
        rmsError, relativeRmsError: rmsA > 0 ? rmsError / rmsA : null,
        rmsRatioHybridToCpu: rmsA > 0 ? rmsB / rmsA : null,
        correlation: varianceA > 0 && varianceB > 0 ? covariance / Math.sqrt(varianceA * varianceB) : null,
        cpuRms: rmsA, hybridRms: rmsB };
    }
    function compareFullParts(referenceParts, actualParts, globalAccumulator) {
      const samePartCount = referenceParts.length === actualParts.length;
      const partLengthsMatch = samePartCount && referenceParts.every((part, index) => part.length === actualParts[index].length);
      if (!partLengthsMatch) {
        globalAccumulator.sampleClockMismatchedSpans++;
        return { samePartCount, partLengthsMatch, cpuPartLengths: referenceParts.map(part => part.length),
          hybridPartLengths: actualParts.map(part => part.length), comparablePairs: 0 };
      }
      const spanAccumulator = metricAccumulator();
      let sampleOffset = 0;
      for (let partIndex = 0; partIndex < referenceParts.length; partIndex++) {
        const cpuPart = referenceParts[partIndex]; const hybridPart = actualParts[partIndex];
        for (let index = 0; index < cpuPart.length; index++) {
          addPair(spanAccumulator, cpuPart[index], hybridPart[index], sampleOffset + index);
          addPair(globalAccumulator, cpuPart[index], hybridPart[index], globalAccumulator.pairs);
        }
        sampleOffset += cpuPart.length;
      }
      return { samePartCount, partLengthsMatch, comparablePairs: spanAccumulator.pairs,
        ...finishAccumulator(spanAccumulator) };
    }
    async function summarizePcmParts(parts, chunk) {
      const samples = parts.reduce((sum, part) => sum + part.length, 0);
      if (!samples || !parts.length || parts.length % 2 !== 1) {
        throw new Error(`Full Mini diagnostic span ${chunk.id} returned an invalid utterance/pause sequence.`);
      }
      const pcm = new Float32Array(samples);
      let offset = 0; let min = Infinity; let max = -Infinity; let squareSum = 0; let nonfiniteSamples = 0;
      for (let partIndex = 0; partIndex < parts.length; partIndex++) {
        const part = parts[partIndex];
        if (!(part instanceof Float32Array) || part.length < 1) throw new Error(`Full Mini span ${chunk.id} has an invalid PCM part.`);
        if (partIndex % 2 === 1 && (part.length !== 2_880 || part.some(value => value !== 0))) {
          throw new Error(`Full Mini span ${chunk.id} contains a malformed 120 ms inter-utterance pause.`);
        }
        for (const value of part) {
          if (!Number.isFinite(value)) { nonfiniteSamples++; continue; }
          min = Math.min(min, value); max = Math.max(max, value); squareSum += value * value;
        }
        pcm.set(part, offset); offset += part.length;
      }
      const rms = nonfiniteSamples < samples ? Math.sqrt(squareSum / (samples - nonfiniteSamples)) : null;
      const peak = nonfiniteSamples < samples ? Math.max(Math.abs(min), Math.abs(max)) : null;
      const digest = await crypto.subtle.digest('SHA-256', pcm.buffer);
      return { pcm, summary: { id: chunk.id, sourceCharacters: chunk.characters, sourceSha256: chunk.sha256,
        internalUtterances: (parts.length + 1) / 2, pcmParts: parts.length, samples, sampleRate: 24_000,
        durationSeconds: samples / 24_000, nonfiniteSamples, peak, rms,
        nonSilent: peak > 1e-6 && rms > 1e-6, clipped: min < -1 || max > 1,
        pcmSha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') } };
    }
    function float32WavBase64(pcm, sampleRate) {
      const wav = new Uint8Array(44 + pcm.length * 4); const view = new DataView(wav.buffer);
      const ascii = (at, value) => { for (let index = 0; index < value.length; index++) view.setUint8(at + index, value.charCodeAt(index)); };
      ascii(0, 'RIFF'); view.setUint32(4, wav.length - 8, true); ascii(8, 'WAVEfmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
      view.setUint16(32, 4, true); view.setUint16(34, 32, true); ascii(36, 'data');
      view.setUint32(40, pcm.length * 4, true);
      for (let index = 0; index < pcm.length; index++) view.setFloat32(44 + index * 4, pcm[index], true);
      let binary = '';
      for (let index = 0; index < wav.length; index += 0x8000) binary += String.fromCharCode(...wav.subarray(index, index + 0x8000));
      return btoa(binary);
    }
    async function runFullArticleBackend(backend, { sessionProviders = null, referenceParts = null } = {}) {
      const adapter = createInflectMiniV3Adapter();
      try {
        const info = await adapter.initialize({ backend, probe: backend === 'webgpu', diagnosticCapture: false,
          ...(backend === 'webgpu' ? { probeText: 'A short WebGPU diagnostic utterance.' } : {}),
          ...(sessionProviders ? { diagnosticSessionProviders: sessionProviders } : {}) });
        if (info.status !== 'measured') throw new Error(`Full Mini ${backend} initialization failed: ${info.reason ?? info.status}`);
        const started = performance.now(); let firstPcmMs = null; let totalSamples = 0;
        const rows = []; const retainedParts = referenceParts ? null : [];
        const prefix = new Float32Array(30 * 24_000); let prefixSamples = 0;
        const globalComparison = referenceParts ? { ...metricAccumulator(), sampleClockMismatchedSpans: 0 } : null;
        const comparisons = [];
        for (let spanIndex = 0; spanIndex < fullArticleChunks.length; spanIndex++) {
          const chunk = fullArticleChunks[spanIndex]; const output = await adapter.generateChunk(chunk, {
            onFirstPcm: () => { firstPcmMs ??= performance.now() - started; },
          });
          if (output.sampleRate !== 24_000 || output.completedChunkId !== chunk.id || !output.parts?.length) {
            throw new Error(`Full Mini ${backend} returned an invalid span clock or ID for ${chunk.id}.`);
          }
          const summarized = await summarizePcmParts(output.parts, chunk);
          if (summarized.summary.samples < 1) throw new Error(`Full Mini ${backend} returned empty PCM for span ${chunk.id}.`);
          rows.push(summarized.summary); totalSamples += summarized.summary.samples;
          if (prefixSamples < prefix.length) {
            const count = Math.min(prefix.length - prefixSamples, summarized.pcm.length);
            prefix.set(summarized.pcm.subarray(0, count), prefixSamples); prefixSamples += count;
          }
          if (referenceParts) {
            comparisons.push({ spanId: chunk.id,
              ...compareFullParts(referenceParts[spanIndex], output.parts, globalComparison) });
          } else {
            retainedParts.push(output.parts);
          }
        }
        if (prefixSamples !== prefix.length) throw new Error('Full Mini diagnostic article is shorter than its exact 30-second prefix.');
        const generationMs = performance.now() - started;
        const dispatchMatch = /Observed (\d+) WebGPU compute dispatches/.exec(info.capability?.description ?? '');
        const summary = { backendEffective: info.backendEffective, capability: info.capability,
          settings: info.settings, chunkCount: rows.length, totalSourceCharacters: rows.reduce((sum, row) => sum + row.sourceCharacters, 0),
          totalInternalUtterances: rows.reduce((sum, row) => sum + row.internalUtterances, 0),
          totalSamples, sampleRate: 24_000, audioSeconds: totalSamples / 24_000,
          firstPcmMs, generationMs, nonfiniteSamples: rows.reduce((sum, row) => sum + row.nonfiniteSamples, 0),
          silentChunks: rows.filter(row => !row.nonSilent).length, clippedChunks: rows.filter(row => row.clipped).length,
          pcmChunkSha256: rows.map(row => ({ id: row.id, sha256: row.pcmSha256 })), chunks: rows,
          dispatches: dispatchMatch ? Number(dispatchMatch[1]) : null };
        return { summary, retainedParts, comparisons,
          globalComparison: globalComparison ? { ...finishAccumulator(globalComparison),
            sampleClockMismatchedSpans: globalComparison.sampleClockMismatchedSpans } : null,
          prefixWavBase64: float32WavBase64(prefix, 24_000) };
      } finally {
        await adapter.dispose();
      }
    }
    async function runBackend(backend, { waveformInputs = null, keepRawWav = false,
      sessionProviders = null, label = backend } = {}) {
      const adapter = createInflectMiniV3Adapter();
      try {
        const requestedBackend = sessionProviders ? 'webgpu' : backend;
        const info = await adapter.initialize({ backend: requestedBackend, probe: requestedBackend === 'webgpu', diagnosticCapture: true,
          ...(requestedBackend === 'webgpu' ? { probeText: 'A short WebGPU diagnostic utterance.' } : {}),
          ...(sessionProviders ? { diagnosticSessionProviders: sessionProviders } : {}) });
        if (info.status !== 'measured') return { status: 'unavailable', backend: label, info, browser };
        const started = performance.now(); let firstPcmMs = null;
        const chunk = waveformInputs ? { ...canonicalChunk, diagnosticWaveformInputs: waveformInputs } : canonicalChunk;
        const generated = await adapter.generateChunk(chunk, { onFirstPcm: () => { firstPcmMs ??= performance.now() - started; } });
        const generationMs = performance.now() - started;
        if (generated.sampleRate !== 24_000 || generated.completedChunkId !== canonicalChunk.id
            || !generated.parts.length || !generated.diagnostics?.utterances?.length) {
          throw new Error(`${backend} diagnostic synthesis returned an incomplete receipt or stage capture.`);
        }
        const totalSamples = generated.parts.reduce((total, part) => total + part.length, 0);
        const pcm = new Float32Array(totalSamples); let offset = 0; let min = Infinity; let max = -Infinity;
        let squareSum = 0; let finiteCount = 0; let nanCount = 0; let infinityCount = 0;
        for (const part of generated.parts) {
          for (const value of part) {
            if (Number.isNaN(value)) { nanCount++; continue; }
            if (!Number.isFinite(value)) { infinityCount++; continue; }
            min = Math.min(min, value); max = Math.max(max, value); squareSum += value * value; finiteCount++;
          }
          pcm.set(part, offset); offset += part.length;
        }
        const rms = finiteCount ? Math.sqrt(squareSum / finiteCount) : null;
        const peak = finiteCount ? Math.max(Math.abs(min), Math.abs(max)) : null;
        const clipped = finiteCount !== totalSamples || min < -1 || max > 1;
        const pcmSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pcm.buffer)),
          byte => byte.toString(16).padStart(2, '0')).join('');
        let rawFloatWavBase64 = null;
        if (keepRawWav) {
          const wav = new Uint8Array(44 + totalSamples * 4); const view = new DataView(wav.buffer);
          const ascii = (at, value) => { for (let index = 0; index < value.length; index++) view.setUint8(at + index, value.charCodeAt(index)); };
          ascii(0, 'RIFF'); view.setUint32(4, wav.length - 8, true); ascii(8, 'WAVEfmt ');
          view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, 1, true);
          view.setUint32(24, generated.sampleRate, true); view.setUint32(28, generated.sampleRate * 4, true);
          view.setUint16(32, 4, true); view.setUint16(34, 32, true); ascii(36, 'data');
          view.setUint32(40, totalSamples * 4, true);
          for (let index = 0; index < totalSamples; index++) view.setFloat32(44 + index * 4, pcm[index], true);
          let binary = '';
          for (let index = 0; index < wav.length; index += 0x8000) binary += String.fromCharCode(...wav.subarray(index, index + 0x8000));
          rawFloatWavBase64 = btoa(binary);
        }
        const dispatchMatch = /Observed (\d+) WebGPU compute dispatches/.exec(info.capability?.description ?? '');
        return { status: 'measured', backend: label, info, generation: { canonicalChunkId: canonicalChunk.id,
          sourceCharacters: canonicalChunk.characters, internalParts: generated.parts.length,
          samples: totalSamples, sampleRate: generated.sampleRate, durationSeconds: totalSamples / generated.sampleRate,
          firstPcmMs, generationMs, min: finiteCount ? min : null, max: finiteCount ? max : null,
          peak, rms, finiteCount, nanCount, infinityCount, clipped, pcmSha256,
          ...(rawFloatWavBase64 ? { rawFloatWavBase64 } : {}) },
          diagnostics: generated.diagnostics,
          dispatches: dispatchMatch ? Number(dispatchMatch[1]) : null, browser };
      } finally {
        await adapter.dispose();
      }
    }

    const cpu = await runBackend('cpu', { keepRawWav: true });
    if (cpu.status !== 'measured') return { status: 'cpu-comparison-baseline-failed', cpu, pageAdapter: pageAdapterInfo, pageAdapterFallback, browser };
    const webgpu = await runBackend('webgpu', { keepRawWav: true });
    if (webgpu.status !== 'measured') return { status: 'hardware-or-dispatch-unavailable', reason: webgpu.info?.reason ?? null,
      cpu, webgpu, pageAdapter: pageAdapterInfo, pageAdapterFallback, browser };
    const gpuWithCpuInputs = await runBackend('webgpu', {
      waveformInputs: cpu.diagnostics.utterances.map(item => item.waveformInputs),
    });
    const cpuWithGpuInputs = await runBackend('cpu', {
      waveformInputs: webgpu.diagnostics.utterances.map(item => item.waveformInputs),
    });
    const durationWebgpuHybrid = await runBackend('webgpu', {
      sessionProviders: [['webgpu', 'wasm'], ['wasm'], ['wasm']],
      label: 'hybrid-webgpu-wasm-duration+wasm-bridge+wasm-waveform',
      keepRawWav: true,
    });
    let fullArticle = null;
    if (fullArticleChunks.length) {
      const cpuFull = await runFullArticleBackend('cpu');
      const hybridFull = await runFullArticleBackend('webgpu', {
        sessionProviders: [['webgpu', 'wasm'], ['wasm'], ['wasm']],
        referenceParts: cpuFull.retainedParts,
      });
      fullArticle = { cpu: cpuFull.summary, durationWebgpuHybrid: hybridFull.summary,
        comparison: { spans: hybridFull.comparisons, global: hybridFull.globalComparison },
        cpuPrefixWavBase64: cpuFull.prefixWavBase64,
        durationWebgpuHybridPrefixWavBase64: hybridFull.prefixWavBase64 };
      cpuFull.retainedParts = null;
    }
    return { status: 'compared', cpu: compactRun(cpu), webgpu: compactRun(webgpu),
      gpuWithCpuInputs: compactRun(gpuWithCpuInputs), cpuWithGpuInputs: compactRun(cpuWithGpuInputs),
      durationWebgpuHybrid: compactRun(durationWebgpuHybrid),
      ...(fullArticle ? { fullArticle } : {}),
      comparisons: {
        naturalCpuVsWebgpu: compareRuns(cpu, webgpu),
        sameCpuWaveformInputsCpuVsWebgpu: compareRuns(cpu, gpuWithCpuInputs),
        sameGpuWaveformInputsCpuVsWebgpu: compareRuns(cpuWithGpuInputs, webgpu),
        cpuVsDurationWebgpuHybrid: compareRuns(cpu, durationWebgpuHybrid),
      },
      pageAdapter: pageAdapterInfo, pageAdapterFallback, browser };
  }, { chunk, fullArticleChunks: fullArticleRequested ? canonicalChunks : [] });

  serverStats = server.snapshot();
  const externalRequests = requests.filter(url => !url.startsWith(server.url));
  await mkdir(outputDir, { recursive: true });
  const rawWaveFiles = {};
  for (const name of ['cpu', 'webgpu', 'durationWebgpuHybrid']) {
    const run = result?.[name];
    const encoded = run?.generation?.rawFloatWavBase64;
    if (!encoded) continue;
    const wav = Buffer.from(encoded, 'base64');
    delete run.generation.rawFloatWavBase64;
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 3, 'raw diagnostic WAV retains IEEE Float32 without clipping');
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 24_000);
    assert.equal(wav.readUInt16LE(34), 32);
    assert.equal(wav.readUInt32LE(40), run.generation.samples * 4);
    assert.equal(wav.length, 44 + run.generation.samples * 4);
    const filename = `span-${String(chunk.id).padStart(2, '0')}-${name}-float32.wav`;
    const wavPath = resolve(outputDir, filename);
    await writeFile(wavPath, wav);
    rawWaveFiles[name] = { file: filename, bytes: wav.length, sha256: sha256(wav),
      encoding: 'WAVE_FORMAT_IEEE_FLOAT, mono 32-bit Float32; original amplitudes retained without gain or clipping' };
  }
  const fullArticleAudioFiles = {};
  for (const [key, name] of [['cpuPrefixWavBase64', 'cpu'],
    ['durationWebgpuHybridPrefixWavBase64', 'durationWebgpuHybrid']]) {
    const encoded = result?.fullArticle?.[key];
    if (!encoded) continue;
    const wav = Buffer.from(encoded, 'base64');
    delete result.fullArticle[key];
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 3, 'full-article prefix retains IEEE Float32 without clipping');
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 24_000);
    assert.equal(wav.readUInt16LE(34), 32);
    assert.equal(wav.readUInt32LE(40), 30 * 24_000 * 4);
    assert.equal(wav.length, 44 + 30 * 24_000 * 4);
    const filename = `full-article-${name}-prefix-30s-float32.wav`;
    await writeFile(resolve(outputDir, filename), wav);
    fullArticleAudioFiles[name] = { file: filename, bytes: wav.length, sha256: sha256(wav),
      encoding: 'Exact first 30 seconds of canonical-span Float32 PCM; mono 24 kHz, no gain, normalization, or clipping' };
  }
  const report = {
    schemaVersion: 1,
    diagnosticOnly: true,
    scoreEligible: false,
    purpose: 'CPU/WASM versus physical WebGPU stage comparison for one canonical span; diagnostic only, not a score or registered backend claim.',
    sourceCommit,
    model: 'inflect-mini-v3-browser-port',
    modelRevision: 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6',
    assetLockSha256: sha256(assetLockBytes),
    buildManifest: stagedModel.buildManifest,
    modelAssets,
    packageLockIntegrity: lockedRuntime.integrity,
    gpuRuntime,
    fixture: { id: 'english-20k-v1', articleSha256: sha256(articleBytes), canonicalChunkId: chunk.id,
      sourceCharacters: chunk.characters, sourceSha256: chunk.sha256,
      fullArticleRequested, canonicalSpanCount: canonicalChunks.length },
    rawWaveFiles,
    fullArticleAudioFiles,
    ...result,
    server: serverStats,
    network: { requestCount: requests.length, externalRequests },
    runtimeWarnings,
    consoleErrors,
  };
  await writeFile(resolve(outputDir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, sourceCommit, model: report.model,
    cpu: report.cpu?.generation, webgpu: report.webgpu?.generation,
    durationWebgpuHybrid: report.durationWebgpuHybrid?.generation,
    durationDispatches: report.durationWebgpuHybrid?.dispatches,
    fullArticle: report.fullArticle ? {
      cpu: { chunkCount: report.fullArticle.cpu.chunkCount, totalSamples: report.fullArticle.cpu.totalSamples,
        generationMs: report.fullArticle.cpu.generationMs, nonfiniteSamples: report.fullArticle.cpu.nonfiniteSamples,
        silentChunks: report.fullArticle.cpu.silentChunks, clippedChunks: report.fullArticle.cpu.clippedChunks },
      hybrid: { backendEffective: report.fullArticle.durationWebgpuHybrid.backendEffective,
        dispatches: report.fullArticle.durationWebgpuHybrid.dispatches,
        chunkCount: report.fullArticle.durationWebgpuHybrid.chunkCount,
        totalSamples: report.fullArticle.durationWebgpuHybrid.totalSamples,
        generationMs: report.fullArticle.durationWebgpuHybrid.generationMs,
        nonfiniteSamples: report.fullArticle.durationWebgpuHybrid.nonfiniteSamples,
        silentChunks: report.fullArticle.durationWebgpuHybrid.silentChunks,
        clippedChunks: report.fullArticle.durationWebgpuHybrid.clippedChunks },
      comparison: report.fullArticle.comparison.global } : null,
    dispatches: report.webgpu?.dispatches, comparisons: report.comparisons,
    reason: report.reason,
    server: serverStats, network: report.network }, null, 2));
  assert.equal(result.status, 'compared', 'CPU/WASM and physical WebGPU tensor comparison completed');
  assert.equal(result.webgpu.info.backendEffective, 'webgpu+wasm');
  assert.ok(result.webgpu.info.capability?.gpuDispatchVerified, 'real WebGPU dispatch was verified');
  assert.ok(Number.isInteger(result.webgpu.dispatches) && result.webgpu.dispatches > 0,
    'the WebGPU graph reported actual compute dispatches');
  assert.notEqual(result.pageAdapterFallback, true, 'Chrome did not identify a software WebGPU fallback');
  assert.ok(Number.isInteger(result.durationWebgpuHybrid.dispatches) && result.durationWebgpuHybrid.dispatches > 0,
    'duration-only hybrid verified real WebGPU compute dispatches');
  assert.equal(result.durationWebgpuHybrid.info.backendEffective,
    'hybrid-webgpu-wasm-duration+wasm-bridge+wasm-waveform');
  assert.deepEqual(result.durationWebgpuHybrid.info.settings.sessionExecutionProviders,
    [['webgpu', 'wasm'], ['wasm'], ['wasm']]);
  assert.equal(result.durationWebgpuHybrid.generation.clipped, false,
    'duration-only hybrid Float32 output remains unclipped without gain or clipping');
  assert.equal(result.comparisons.cpuVsDurationWebgpuHybrid.inputIdentityMatch, true,
    'CPU and duration-only hybrid use identical text, phones, token IDs and seeds');
  assert.ok(result.comparisons.sameCpuWaveformInputsCpuVsWebgpu.waveformInputs.every(item => item.comparison.exactEqual),
    'CPU and GPU waveform graphs were compared with identical CPU inputs');
  assert.ok(result.comparisons.sameGpuWaveformInputsCpuVsWebgpu.waveformInputs.every(item => item.comparison.exactEqual),
    'CPU and GPU waveform graphs were compared with identical WebGPU inputs');
  if (fullArticleRequested) {
    assert.ok(result.fullArticle, 'requested full-article hybrid diagnostic completed');
    const { cpu, durationWebgpuHybrid, comparison } = result.fullArticle;
    assert.equal(cpu.chunkCount, 93);
    assert.equal(durationWebgpuHybrid.chunkCount, 93);
    assert.equal(cpu.totalSourceCharacters, 20_000);
    assert.equal(durationWebgpuHybrid.totalSourceCharacters, 20_000);
    assert.equal(cpu.nonfiniteSamples, 0);
    assert.equal(durationWebgpuHybrid.nonfiniteSamples, 0);
    assert.equal(cpu.silentChunks, 0);
    assert.equal(durationWebgpuHybrid.silentChunks, 0);
    assert.equal(cpu.clippedChunks, 0);
    assert.equal(durationWebgpuHybrid.clippedChunks, 0);
    assert.equal(durationWebgpuHybrid.backendEffective,
      'hybrid-webgpu-wasm-duration+wasm-bridge+wasm-waveform');
    assert.ok(Number.isInteger(durationWebgpuHybrid.dispatches) && durationWebgpuHybrid.dispatches > 0);
    assert.equal(comparison.sampleClockMismatchedSpans, 0,
      'CPU and hybrid produced sample-aligned internal parts for every canonical span');
    assert.equal(comparison.nonfinitePairs, 0);
    assert.equal(result.fullArticle.comparison.spans.length, 93);
    assert.ok(result.fullArticle.comparison.spans.every(span => span.samePartCount && span.partLengthsMatch));
    assert.deepEqual(Object.keys(fullArticleAudioFiles).sort(), ['cpu', 'durationWebgpuHybrid']);
  }
  assert.deepEqual(externalRequests, [], 'diagnostic made no off-origin requests');
  assert.deepEqual(consoleErrors, [], 'Chrome reported no page or console errors');
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
