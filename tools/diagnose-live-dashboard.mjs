import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';

const url = 'https://ngelik.github.io/tts-bench/';
const browser = await chromium.launch({ executablePath: await findChrome(), headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
console.log(JSON.stringify({ report, pageErrors, consoleErrors, failedRequests, badResponses }, null, 2));
await browser.close();
