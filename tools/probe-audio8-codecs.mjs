// Non-scoring hardware regression diagnostic. Both decoders consume the same GPU-generated codes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';
import { startServer } from '../lib/server.mjs';
import { prepareAssets } from '../lib/assets.mjs';
import { checkSignal } from '../web/audio8/signal.mjs';
import { wavInfo } from './audio.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain'), '', 'Run the diagnostic from a clean committed checkout');
const model = 'audio8-realistic-0.6b-int4';
await prepareAssets(model, { mode: 'verify', acceptLicense: true });
const text = await readFile('fixtures/en-20000.txt', 'utf8');
const { chunks: [chunk] } = JSON.parse(await readFile('fixtures/en-20000.chunks.json', 'utf8'));
const span = text.slice(chunk.start, chunk.end);
assert.equal(hash(span), chunk.sha256);
const profile = await mkdtemp(join(tmpdir(), 'audio8-codec-diagnostic-'));
const out = resolve('runs', 'audio8-codec-replay-' + new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(out, { recursive: true });
const server = await startServer(process.cwd());
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: await findChrome(), headless: false, chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    args: ['--no-first-run', '--no-default-browser-check', '--disable-software-rasterizer'],
  });
  const page = context.pages()[0];
  const external = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'blob:' || url.origin === new URL(server.url).origin) return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  await page.goto(server.url);
  const result = await page.evaluate(async text => {
    const { encodeWavBase64 } = await import('/web/bench.mjs');
    const worker = new Worker('/web/workers/audio8.mjs', { type: 'module' });
    let id = 0;
    function call(action, data) {
      return new Promise((ok, reject) => {
        const timer = setTimeout(() => reject(new Error('Audio8 stage replay timed out')), 15 * 60_000);
        worker.onmessage = ({ data: reply }) => {
          if (reply.id !== id) return;
          clearTimeout(timer);
          if (reply.error) reject(new Error(reply.error)); else ok(reply.value);
        };
        worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message)); };
        worker.postMessage({ id: ++id, action, ...data });
      });
    }
    try {
      const config = await call('initialize', { options: { backend: 'webgpu', probe: false } });
      if (config.status !== 'measured') throw new Error(config.reason);
      const { parts, ...stages } = await call('replay-codecs', { text });
      return { config, ...stages, wav: encodeWavBase64(parts[0], 44100) };
    } finally { worker.terminate(); }
  }, span);
  const { wav, ...evidence } = result;
  const bytes = Buffer.from(wav, 'base64');
  const { samples, sampleRate } = wavInfo(bytes);
  const receipt = { kind: 'audio8-same-code-decoder-diagnostic-v1', sourceCommit, model,
    chrome: context.browser().version(), sourceSpan: chunk, externalRequests: external,
    ...evidence, correctedWav: { file: 'corrected.wav', bytes: bytes.length, sha256: hash(bytes) } };
  await writeFile(join(out, 'corrected.wav'), bytes);
  await writeFile(join(out, 'diagnostic.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  assert.deepEqual(external, []);
  assert.equal(git('rev-parse', 'HEAD'), sourceCommit);
  assert.equal(git('status', '--porcelain'), '');
  assert.ok(evidence.arDispatches > 0 && evidence.legacy.dispatches > 0);
  assert.equal(evidence.corrected.dispatches, 0);
  assert.equal(sampleRate, 44100);
  assert.equal(samples, evidence.frames * 2048);
  assert.equal(samples, evidence.corrected.samples);
  assert.equal(samples, evidence.legacy.samples);
  assert.throws(() => checkSignal(evidence.legacy, sampleRate), /waveform collapsed/, 'Legacy defect must reproduce');
  checkSignal(evidence.corrected, sampleRate);
  console.log('Same-code replay passed:', out);
} finally {
  try { await context?.close(); }
  finally { await server.close(); await rm(profile, { recursive: true, force: true }); }
}
