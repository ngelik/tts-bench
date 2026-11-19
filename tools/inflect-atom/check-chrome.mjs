// Hosted CPU compatibility evidence only: never reference benchmark timings.
import { chromium } from 'playwright-core';
import { cp, mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { startServer } from '../../lib/server.mjs';
const root = process.cwd(), assets = path.resolve(process.argv[2]);
const stage = path.join(root, '.cache/public');
await mkdir(path.join(stage, 'models'), { recursive: true });
await cp(assets, path.join(stage, 'models/inflect-atom-v3'), { recursive: true });
await mkdir(path.join(stage, 'runtimes/onnxruntime-web/1.23.2'), { recursive: true });
for (const name of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) await cp(path.join(root, 'node_modules/onnxruntime-web/dist', name), path.join(stage, 'runtimes/onnxruntime-web/1.23.2', name));
const profile = await mkdtemp(path.join(tmpdir(), 'atom-hosted-'));
const server = await startServer(root);
let context;
const failures = [];
const evidence = { scope: 'Hosted CPU browser compatibility diagnostic; not M1 reference performance', source: process.env.GITHUB_SHA, backend: 'cpu', spans: [] };
try {
  context = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: false, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== new URL(server.url).origin) { failures.push(route.request().url()); await route.abort(); }
    else await route.continue();
  });
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  page.on('pageerror', error => console.error(error));
  await page.goto(server.url);
  evidence.capability = await page.evaluate(async () => {
    const { createInflectAtomAdapter } = await import('/web/adapters/inflect-atom.mjs');
    globalThis.atom = createInflectAtomAdapter();
    return atom.initialize({ backend: 'cpu', probe: true });
  });
  assert.equal(evidence.capability.status, 'measured');
  await context.setOffline(true);
  const article = await readFile('fixtures/en-20000.txt', 'utf8');
  const chunks = JSON.parse(await readFile('fixtures/en-20000.chunks.json', 'utf8')).chunks;
  for (let i = 0; i < chunks.length; i++) {
    const { start, end } = chunks[i];
    const result = await page.evaluate(async ({ text, id, preserve }) => {
      const output = await atom.generateChunk({ text, id });
      const count = output.parts.reduce((n, part) => n + part.length, 0);
      const joined = new Float32Array(count);
      let offset = 0;
      for (const part of output.parts) { joined.set(part, offset); offset += part.length; }
      let peak = 0, power = 0, finite = true;
      for (const sample of joined) { finite &&= Number.isFinite(sample); peak = Math.max(peak, Math.abs(sample)); power += sample * sample; }
      const waveform = atom.validateArticle(joined, output.sampleRate, [count]).waveform;
      const digest = await crypto.subtle.digest('SHA-256', joined.buffer);
      let pcm = null;
      if (preserve) { const bytes = new Uint8Array(joined.buffer); let binary = ''; for (let p = 0; p < bytes.length; p += 16384) binary += String.fromCharCode(...bytes.subarray(p, p + 16384)); pcm = btoa(binary); }
      return { id, waveform, completedChunkId: output.completedChunkId, sampleRate: output.sampleRate, samples: count, finite, peak, rms: Math.sqrt(power / count), pcmSha256: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join(''), pcm };
    }, { text: article.slice(start, end), id: String(i), preserve: i === 0 });
    assert.equal(result.completedChunkId, String(i)); assert.equal(result.sampleRate, 24000);
    assert(result.finite && result.samples > 0 && result.peak < 1 && result.rms > 1e-5);
    if (result.pcm) {
      const pcm = Buffer.from(result.pcm, 'base64');
      assert.equal(createHash('sha256').update(pcm).digest('hex'), result.pcmSha256);
      await writeFile(path.join(assets, 'chrome-first-span.f32'), pcm);
    }
    delete result.pcm; evidence.spans.push(result);
    await writeFile(path.join(assets, 'chrome-cpu-compatibility.json'), JSON.stringify(evidence, null, 2) + '\n');
  }
  await page.evaluate(() => atom.dispose());
  assert.equal(failures.length, 0); assert.equal(evidence.spans.length, 93);
  console.log(`Hosted offline CPU Chrome passed ${evidence.spans.length} canonical spans`);
} finally { await context?.close(); await server.close(); await rm(profile, { recursive: true, force: true }); }
