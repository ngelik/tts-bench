// Read-only hosted Chrome check of the five-family dashboard subset and audio.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {findChrome} from '../lib/runner.mjs';

const base = 'https://ngelik.github.io/tts-bench/';
const modelIds = [
  'linnet-en-35m',
  'supratts-1.0-preview',
  'silencio-2',
  'klein-tts-x1.5-pro',
  'sopro-v2-turbo',
];
const localData = JSON.parse(await readFile('.cache/listening-site/assets/data.json', 'utf8'));
const localById = new Map(localData.models.map(model => [model.id, model]));
const localModels = modelIds.map(id => {
  const model = localById.get(id);
  assert.ok(model, `Expected build is missing ${id}`);
  return model;
});
const publicDataUrl = new URL('assets/data.json', base);
publicDataUrl.searchParams.set('live_verify', String(Date.now()));
const dataResponse = await fetch(publicDataUrl, {cache:'no-store',headers:{'cache-control':'no-cache'}});
assert.equal(dataResponse.status, 200, 'Public dashboard data request succeeds');
const dataText = await dataResponse.text();
const publicData = JSON.parse(dataText);
const publicById = new Map(publicData.models.map(model => [model.id, model]));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const dataDigest = sha256(dataText);
const format = value => Number(value).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const reportMetrics = [];
const clipEvidence = [];

function metricProjection(metric) {
  return Object.fromEntries(['status','scenario','n','resultId','sourceCommit','medianSeconds','meanMB','reportUrl','registration']
    .filter(key => metric?.[key] !== undefined)
    .map(key => [key,metric[key]]));
}

for (const id of modelIds) {
  const expected = localById.get(id);
  const published = publicById.get(id);
  assert.ok(published, `Public dashboard is missing ${id}`);
  for (const backend of ['cpu','webgpu']) {
    const warm = published.warm?.[backend];
    const cached = published.memory?.[backend];
    assert.equal(warm?.status, 'measured', `${id} ${backend} warm selection is measured`);
    assert.equal(warm.scenario, 'warm');
    assert.equal(warm.n, 5, `${id} ${backend} uses five scored warm repetitions`);
    assert.equal(cached?.status, 'measured', `${id} ${backend} cached selection is measured`);
    assert.equal(cached.scenario, 'cached');
    assert.equal(cached.n, 1, `${id} ${backend} cached RSS is a separate n=1 cell`);
    assert.deepEqual(metricProjection(warm), metricProjection(expected.warm[backend]), `${id} ${backend} warm values match exact deployed-source build`);
    assert.deepEqual(metricProjection(cached), metricProjection(expected.memory[backend]), `${id} ${backend} cached values match exact deployed-source build`);

    const playback = published.playbackAudio?.[backend];
    assert.ok(playback, `${id} ${backend} inline audio is registered`);
    assert.equal(playback.resultId, warm.resultId, `${id} ${backend} inline audio is from the selected warm result`);
    assert.equal(playback.trialIndex, warm.n, `${id} ${backend} inline audio uses final scored warm trial ${warm.n}`);
    const clip = published.audio.find(item => item.backend === backend && item.resultId === warm.resultId);
    assert.ok(clip, `${id} ${backend} warm trial audio is in the public model data`);
    assert.equal(clip.clip.path, playback.clip.path);
    assert.equal(clip.trialIndex, warm.n);
    clipEvidence.push({model:id,backend,resultId:warm.resultId,trialIndex:clip.trialIndex,path:clip.clip.path,sha256:clip.clip.sha256,bytes:clip.clip.bytes});
  }
  reportMetrics.push({
    model:id,
    cpuWarm:metricProjection(published.warm.cpu),
    webgpuWarm:metricProjection(published.warm.webgpu),
    cpuCached:metricProjection(published.memory.cpu),
    webgpuCached:metricProjection(published.memory.webgpu),
  });
}

const browser = await chromium.launch({executablePath:await findChrome(),headless:false});
const chromeVersion = browser.version();
const page = await browser.newPage();
const pageErrors = [], failedResponses = [], externalRequests = [];
pageErrors.length = 0;
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url()); });
page.on('response', response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
const focusUrl = new URL(base);
focusUrl.searchParams.set('models', modelIds.join(','));
let desktop = null, mobile = null, tableOrders = {}, chartOrders = {}, mobileSortOrders = {}, inlineAudio = [];
try {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(focusUrl.href, {waitUntil:'networkidle'});
  await page.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, modelIds.length);
  assert.equal(await page.locator('#visible-count').innerText(), `${modelIds.length} results`);
  assert.equal(await page.locator('#table-view').isVisible(), true);

  const sortedIds = (metric, backend) => [...localModels].sort((a,b) => {
    const av = metric === 'warm' ? a.warm[backend].medianSeconds : metric === 'memory' ? a.memory[backend].meanMB : a.modelMB;
    const bv = metric === 'warm' ? b.warm[backend].medianSeconds : metric === 'memory' ? b.memory[backend].meanMB : b.modelMB;
    return av - bv || a.name.localeCompare(b.name);
  }).map(model => model.id);
  const tableIds = () => page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model));

  assert.equal(await page.locator('th[data-column="cpu"]').getAttribute('aria-sort'), 'ascending', 'Focused table defaults to fastest CPU first');
  assert.equal(await page.locator('#sort-select').isVisible(), false, 'Desktop uses visible column-header sorting');
  let rows = await tableIds();
  assert.deepEqual(rows, sortedIds('warm','cpu'));
  for (const model of localModels) {
    const row = page.locator(`tr[data-model="${model.id}"]`);
    assert.equal((await row.locator('.model-name').innerText()).trim(), model.name);
    for (const [backend,label] of [['cpu','CPU'],['webgpu','GPU']]) {
      const metric = model.warm[backend];
      const memory = model.memory[backend];
      const warmLabel = `${label} · seconds`;
      const memoryLabel = backend === 'cpu' ? 'Cached RAM · CPU · avg MB' : 'Cached RAM · GPU · avg MB';
      assert.equal(await row.locator(`td[data-label="${warmLabel}"] .metric-link`).innerText(), format(metric.medianSeconds));
      assert.equal(await row.locator(`td[data-label="${memoryLabel}"] .value`).innerText(), format(memory.meanMB));
      assert.equal(await row.locator(`td[data-label="${warmLabel}"] .metric-link`).getAttribute('href'), metric.reportUrl);
    }
  }
  tableOrders.cpu = rows;
  await page.locator('th[data-column="webgpu"] button[data-sort="webgpu"]').click();
  rows = await tableIds();
  assert.deepEqual(rows, sortedIds('warm','webgpu'), 'Focused table sorts GPU warm scores fastest first');
  tableOrders.webgpu = rows;
  await page.locator('th[data-column="cpu"] button[data-sort="cpu"]').click();
  rows = await tableIds();
  assert.deepEqual(rows, sortedIds('warm','cpu'));
  await page.evaluate(() => {window.scrollTo(0,0);document.activeElement?.blur();});
  const firstAudio = await page.locator('#model-rows tr').first().locator('td[data-label="Listen · 30s"]').boundingBox();
  assert.ok(firstAudio && firstAudio.y + firstAudio.height <= 1000, `Desktop family rows and inline audio are visible: ${JSON.stringify(firstAudio)}`);
  await mkdir('.cache/five-family-review',{recursive:true});
  await page.screenshot({path:'.cache/five-family-review/five-family-desktop.png',fullPage:true});
  desktop = {viewport:{width:1440,height:1000},firstAudioCellBottom:Math.round(firstAudio.y+firstAudio.height),rowCount:rows.length};

  for (const metric of ['generation','memory','size']) {
    const chartUrl = new URL(focusUrl);
    chartUrl.searchParams.set('view','charts');
    chartUrl.searchParams.set('metric',metric);
    await page.goto(chartUrl.href,{waitUntil:'networkidle'});
    await page.waitForFunction(count => document.querySelectorAll('#charts .bar-row').length === count,metric === 'size' ? modelIds.length : modelIds.length * 2);
    assert.equal(await page.locator('#charts-view').isVisible(),true);
    assert.equal(await page.locator(`[data-metric="${metric}"]`).getAttribute('aria-pressed'),'true');
    const panels = metric === 'size' ? [['size','.chart-panel.size']] : [['cpu','.chart-panel.cpu'],['webgpu','.chart-panel.gpu']];
    for (const [backend,selector] of panels) {
      const expectedOrder = metric === 'size' ? sortedIds('size','cpu') : sortedIds(metric === 'generation' ? 'warm' : 'memory',backend);
      const actualOrder = await page.locator(`${selector} .bar-row [data-detail]`).evaluateAll(buttons => buttons.map(button => button.dataset.detail));
      assert.deepEqual(actualOrder,expectedOrder,`${metric} ${backend} chart is sorted fastest/smallest first`);
      chartOrders[`${metric}/${backend}`] = actualOrder;
    }
    assert.equal(await page.locator('#charts .bar-row').count(),metric === 'size' ? modelIds.length : modelIds.length*2);
  }

  await page.goto(focusUrl.href,{waitUntil:'networkidle'});
  await page.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, modelIds.length);
  await page.locator('audio').evaluate(audio => {audio.muted = true;});
  for (const model of localModels) {
    for (const backend of ['cpu','webgpu']) {
      const playback = model.playbackAudio[backend];
      const expectedSrc = new URL(playback.clip.path,base).href;
      const button = page.locator(`tr[data-model="${model.id}"] [data-play][data-backend="${backend}"]`);
      assert.equal(await button.count(),1,`${model.id} ${backend} has a native inline listen button`);
      await button.click();
      await page.waitForFunction(src => {
        const audio = document.querySelector('audio');
        return audio && audio.currentSrc === src && audio.currentTime > 0.15 && !audio.paused && audio.readyState >= 2;
      },expectedSrc,{timeout:20000});
      const duration = await page.locator('audio').evaluate(audio => audio.duration);
      assert.equal(duration,30,`${model.id} ${backend} audio is the complete 30-second excerpt`);
      inlineAudio.push({model:model.id,backend,resultId:playback.resultId,trialIndex:playback.trialIndex,path:playback.clip.path,durationSeconds:duration});
    }
  }
  await page.locator('#close-player').click();

  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,'Five-family table fits mobile width');
  assert.equal(await page.locator('#model-rows tr').count(),modelIds.length);
  assert.equal(await page.locator('#sort-select').isVisible(),true,'Mobile sort selector is visible');
  await page.locator('#sort-select').selectOption('webgpu');
  rows = await tableIds();
  assert.deepEqual(rows,sortedIds('warm','webgpu'),'Mobile selector sorts GPU warm scores fastest first');
  mobileSortOrders.webgpu = rows;
  await page.locator('#sort-select').selectOption('cpu');
  rows = await tableIds();
  assert.deepEqual(rows,sortedIds('warm','cpu'),'Mobile selector restores fastest CPU first');
  mobileSortOrders.cpu = rows;
  await page.evaluate(() => {window.scrollTo(0,0);document.activeElement?.blur();});
  const mobileAudio = await page.locator('#model-rows tr').first().locator('td[data-label="Listen · 30s"]').boundingBox();
  assert.ok(mobileAudio && mobileAudio.y + mobileAudio.height <= 844,`Mobile first family audio controls fit the initial viewport: ${JSON.stringify(mobileAudio)}`);
  await page.screenshot({path:'.cache/five-family-review/five-family-mobile.png',fullPage:true});
  mobile = {viewport:{width:390,height:844},firstAudioCellBottom:Math.round(mobileAudio.y+mobileAudio.height),horizontalOverflow:false,rowCount:modelIds.length,sortOrders:mobileSortOrders};
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors,[],'Public dashboard raised no browser errors');
assert.deepEqual(failedResponses,[],'Public dashboard returned no failed HTTP responses');
assert.deepEqual(externalRequests,[],'Five-family view made no external requests');
const result = {
  status:'PASS',
  site:base,
  deployedSourceCommit:process.env.DEPLOYED_SOURCE_COMMIT,
  pagesDeploymentRun:process.env.PAGES_DEPLOYMENT_RUN_URL,
  verifierCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  publicData:{updatedAt:publicData.updatedAt,modelCount:publicData.models.length,sha256:dataDigest,etag:dataResponse.headers.get('etag'),lastModified:dataResponse.headers.get('last-modified')},
  chrome:chromeVersion,
  models:modelIds,
  selectedMetrics:reportMetrics,
  tableOrders,
  chartOrders,
  inlineAudio,
  clipEvidence,
  desktop,
  mobile,
  browserErrors:pageErrors,
  failedResponses,
  externalRequests,
};
await writeFile('.cache/five-family-review/verification.json',JSON.stringify(result,null,2)+'\n');
console.log('FIVE_FAMILY_PUBLIC_READBACK_PASS');
console.log(JSON.stringify(result,null,2));
