import assert from 'node:assert/strict';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../../lib/server.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const backend = process.argv[2] ?? 'cpu';
assert.ok(['cpu', 'webgpu'].includes(backend), 'Pass cpu or webgpu.');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = await mkdtemp(resolve(os.tmpdir(), 'tiny-voca-he-cache-'));
const server = await startServer(root);

async function initializeInChrome(probe) {
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: chrome,
    headless: false,
    chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    viewport: {width: 1000, height: 700},
    args: ['--no-first-run', '--no-default-browser-check', '--disable-software-rasterizer'],
  });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(server.url, {waitUntil: 'load', timeout: 60000});
    await page.waitForFunction(() => Boolean(window.bench), null, {timeout: 30000});
    const options = {model: 'tiny-voca-he', backend, probe, fixtureId: 'he-article-v1'};
    const result = await page.evaluate(input => window.bench.initialize(input), options);
    await page.evaluate(() => window.bench.dispose());
    return result;
  } finally {
    await context.close();
  }
}

try {
  // The harness closes the capability browser and opens the same profile in a new Chrome process.
  const first = await initializeInChrome(true);
  assert.equal(first.status, 'measured');
  assert.equal(first.settings.fixtureId, 'he-article-v1');
  if (backend === 'webgpu') assert.equal(first.capability.gpuDispatchVerified, true);
  const before = server.snapshot().bytes;
  const second = await initializeInChrome(false);
  assert.equal(second.status, 'measured');
  assert.deepEqual(second.settings, first.settings);
  assert.equal(second.assetCache.misses, 0, 'the fresh browser must reuse every verification asset');
  assert.ok(second.assetCache.verifiedBytes >= 332967475, 'both weights must come from verified cache bytes');
  const downloadBytes = server.snapshot().bytes - before;
  assert.ok(downloadBytes < 332967475, 'cached startup must avoid re-downloading the model weights');
  console.log(JSON.stringify({backend, firstCache: first.assetCache, secondCache: second.assetCache, downloadBytes, settingsStable: true}, null, 2));
} finally {
  await server.close();
  await rm(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 100});
}
