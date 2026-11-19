// Audits the complete canonical fixture in headed Chrome without neural
// synthesis or benchmark timing. Tokenization is intentionally not cached for
// or reused by measured generation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';
import { startServer } from '../lib/server.mjs';

const modelId = process.argv[2];
if (!['sano-robot-mcu', 'sano-trellis'].includes(modelId)) throw new Error('Pass sano-robot-mcu or sano-trellis.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = await mkdtemp(join(tmpdir(), 'sano-robot-trellis-frontend-'));
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
  const result = await page.evaluate(async ({ sourceChunks, modelId }) => new Promise((resolve, reject) => {
    const worker = new Worker('/web/workers/sano-robot-trellis.js', { name: 'Robot/Trellis frontend audit' });
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
    worker.postMessage({ id: 1, action: 'audit', modelId, chunks: sourceChunks });
  }), { sourceChunks: chunks, modelId });
  assert.equal(result.canonicalSpans, 93);
  assert.equal(result.synthesizedPieces, 304);
  assert.ok(result.maxPieceCharacters <= 120);
  assert.ok(result.maxPhonemeTokensIncludingBosEos <= result.tokenLimit);
  assert.equal(result.droppedNonWhitespaceCharacters, 0);
  assert.deepEqual(external, []);
  const benchmarkSourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const benchmarkSourceDirty = Boolean(execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).trim());
  assert.equal(benchmarkSourceDirty, false, 'Full-fixture audit requires the exact clean scoring implementation');
  const evidence = {
    benchmarkSourceCommit, benchmarkSourceDirty,
    workerSha256: createHash('sha256').update(await readFile(join(root, 'web/workers/sano-robot-trellis.js'))).digest('hex'),
    schemaVersion: 1,
    model: modelId,
    browser: 'headed Google Chrome',
    synthesis: false,
    sourceRevision: 'c0584a51213721faba98135821faab71bae888f0',
    modelRevision: 'c0584a51213721faba98135821faab71bae888f0',
    fixtureSha256: manifest.articleSha256,
    result,
    externalRequests: external,
  };
  const evidencePath = join(root, `runs/diagnostics/${modelId}/frontend-audit.json`);
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ evidencePath: `runs/diagnostics/${modelId}/frontend-audit.json`, ...evidence }, null, 2));
} finally {
  await context?.close();
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
