// Audits the complete canonical fixture in headed Chrome without neural
// synthesis or benchmark timing. Tokenization is intentionally not cached for
// or reused by measured generation.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';
import { startServer } from '../lib/server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = await mkdtemp(join(tmpdir(), 'sano-heart-nano-frontend-'));
const article = await readFile(join(root, 'fixtures/en-20000.txt'), 'utf8');
const manifest = JSON.parse(await readFile(join(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
const chunks = manifest.chunks.map(chunk => ({ ...chunk, text: article.slice(chunk.start, chunk.end) }));
const server = await startServer(root);
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: await findChrome(process.env.CHROME_PATH),
    headless: false,
    chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    args: ['--disable-software-rasterizer', '--no-first-run', '--no-default-browser-check'],
  });
  const page = await context.newPage();
  const origin = new URL(server.url).origin;
  const external = [];
  context.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  await page.goto(server.url, { waitUntil: 'load' });
  const result = await page.evaluate(async sourceChunks => new Promise((resolve, reject) => {
    const worker = new Worker('/web/workers/sano-heart-nano.js', { name: 'heart-nano frontend audit' });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Sano frontend audit timed out.')); }, 180000);
    worker.onmessage = ({ data }) => {
      if (data.error) {
        clearTimeout(timer);
        worker.terminate();
        reject(new Error(data.error));
      } else if (data.value) {
        clearTimeout(timer);
        worker.terminate();
        resolve(data.value);
      }
    };
    worker.onerror = event => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(event.message || 'Sano frontend audit worker failed.'));
    };
    worker.postMessage({ id: 1, action: 'audit', chunks: sourceChunks });
  }), chunks);
  assert.equal(result.canonicalSpans, 93);
  assert.equal(result.synthesizedPieces, 304);
  assert.ok(result.maxPieceCharacters <= 120);
  assert.ok(result.maxPhonemeTokensIncludingBosEos <= result.tokenLimit);
  assert.equal(result.droppedNonWhitespaceCharacters, 0);
  assert.deepEqual(external, []);
  const evidence = {
    schemaVersion: 1,
    model: 'sano-heart-nano',
    browser: 'headed Google Chrome',
    synthesis: false,
    sourceRevision: 'c0584a51213721faba98135821faab71bae888f0',
    modelRevision: '4a8194aa1dd958033ee449b3ad30c37e536b216e',
    fixtureSha256: manifest.articleSha256,
    result,
    externalRequests: external,
  };
  const evidencePath = join(root, 'runs/diagnostics/sano-heart-nano/frontend-audit.json');
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ evidencePath: 'runs/diagnostics/sano-heart-nano/frontend-audit.json', ...evidence }, null, 2));
} finally {
  await context?.close();
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
