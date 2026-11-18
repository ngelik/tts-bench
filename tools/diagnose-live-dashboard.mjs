import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url = 'https://ngelik.github.io/tts-bench/';
const browser = await chromium.launch({ executablePath: await findChrome(), headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const expected = JSON.parse(await readFile('.cache/listening-site/assets/data.json', 'utf8'));
async function dataReadback(revisioned) {
  const dataUrl = new URL('assets/data.json', url);
  if (revisioned) dataUrl.searchParams.set('codex_verify', String(Date.now()));
  const response = await fetch(dataUrl, revisioned ? {cache:'no-store',headers:{'cache-control':'no-cache'}} : {});
  const body = await response.text();
  const data = JSON.parse(body);
  return {
    status: response.status,
    url: dataUrl.href,
    updatedAt: data.updatedAt,
    modelCount: data.models?.length,
    modelIds: data.models?.map(model => model.id),
    sha256: createHash('sha256').update(body).digest('hex'),
    headers: Object.fromEntries(['age','cache-control','etag','last-modified','date'].map(name => [name,response.headers.get(name)])),
  };
}
const plainData = await dataReadback(false);
const revisionedData = await dataReadback(true);
const pageErrors = [], consoleErrors = [], failedRequests = [], badResponses = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
page.on('response', response => { if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() }); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const report = await page.evaluate(() => ({
  title: document.title,
  href: location.href,
  readyState: document.readyState,
  modelCountText: document.querySelector('#model-count')?.textContent,
  rowCount: document.querySelectorAll('#model-rows tr').length,
  rowIds: [...document.querySelectorAll('#model-rows tr')].slice(0, 8).map(row => row.dataset.model),
  expectedRows: document.querySelector('#model-rows')?.dataset,
  bodyText: document.body.innerText.slice(0, 1200),
  scripts: [...document.scripts].map(script => script.src).filter(Boolean),
  pagePath: [...document.querySelectorAll('script')].map(script => script.textContent.slice(0, 100)).filter(Boolean),
}));
console.log(JSON.stringify({ expectedHead: 'a3094bc06a7b4cfc07a5b19bf52ad0d8b858e0bc', expectedModelCount: expected.models.length, expectedModelIds: expected.models.map(model => model.id), plainData, revisionedData, report, pageErrors, consoleErrors, failedRequests, badResponses }, null, 2));
await browser.close();
