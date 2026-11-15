// Optional real-Chrome UI verification. No inference or model downloads.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {findChrome} from '../lib/runner.mjs';
const expected = JSON.parse(await readFile('.cache/listening-site/assets/data.json', 'utf8'));
const campaignModelIds = [
  'audio8-realistic-0.6b-int4',
  'fun-cosyvoice3-0.5b-2512',
  'ming-3.0-tts-0.5b-gguf',
  'ming-3.0-tts-0.5b-fusor-mix-cpu',
];
const campaignModels = expected.models.filter(model => campaignModelIds.includes(model.id));
assert.equal(campaignModels.length, campaignModelIds.length, 'Campaign subset IDs must exist in the dashboard data');
const urlArg = process.argv.indexOf('--url');
let base = urlArg >= 0 ? process.argv[urlArg + 1] : null;
let server, browser;
const number = n => n.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const errors = [], external = [], failedResponses = [];
const review = '.cache/dashboard-review';
try {
  if (!base) {
    server = spawn(process.execPath, ['tools/serve-dashboard.mjs'], {stdio:['ignore','pipe','pipe']});
    base = await new Promise((ok, bad) => {
      const timer = setTimeout(() => bad(new Error('Preview server timed out')), 10000);
      server.stdout.on('data', b => {const match = String(b).match(/http:\/\/127\.0\.0\.1:\d+\//); if (match) {clearTimeout(timer); ok(match[0]);}});
      server.once('error', e => {clearTimeout(timer); bad(e);});
      server.once('exit', code => {clearTimeout(timer); bad(new Error('Preview server exited: '+code));});
    });
  }
  browser = await chromium.launch({executablePath:await findChrome(), headless:false});
  const page = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => {if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url());});
  page.on('response', r => {if (r.status() >= 400) failedResponses.push(r.status()+' '+r.url());});
  await page.goto(base);
  await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, expected.models.length);
  const rankedIds = (models, value) => [...models].sort((a, b) => {
    const av = value(a), bv = value(b);
    return av == null && bv == null ? a.name.localeCompare(b.name) : av == null ? 1 : bv == null ? -1 : av - bv || a.name.localeCompare(b.name);
  }).map(model => model.id);
  const assertDefaultOrder = async () => {
    assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(expected.models, model => model.warm.cpu.medianSeconds));
    assert.equal(await page.locator('th[data-column="cpu"]').getAttribute('aria-sort'), 'ascending');
    assert.equal(await page.locator('#sort-select').inputValue(), 'cpu');
  };
  const assertChartOrder = async (models, metric) => {
    for (const backend of metric === 'size' ? ['size'] : ['cpu', 'webgpu']) {
      const panel = page.getByRole('region', {name: `${backend === 'size' ? 'Model size' : backend === 'cpu' ? 'CPU' : 'GPU'} chart`, exact:true});
      const value = model => backend === 'size' ? model.modelMB : model[metric === 'generation' ? 'warm' : 'memory'][backend][metric === 'generation' ? 'medianSeconds' : 'meanMB'];
      assert.deepEqual(await panel.locator('.bar-row [data-detail]').evaluateAll(buttons => buttons.map(button => button.dataset.detail)), rankedIds(models, value));
    }
  };
  await assertDefaultOrder();
  const chartCampaignUrl = new URL(base);
  chartCampaignUrl.search = '';
  chartCampaignUrl.searchParams.set('models', campaignModelIds.join(','));
  chartCampaignUrl.searchParams.set('view', 'charts');
  await page.goto(chartCampaignUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '4 of 4 selected configurations');
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(campaignModels, model => model.warm.cpu.medianSeconds));
  assert.equal(await page.locator('#charts .bar-row').count(), 8);
  await assertChartOrder(campaignModels, 'generation');

  const campaignUrl = new URL(base);
  campaignUrl.search = '';
  campaignUrl.searchParams.set('models', campaignModelIds.join(','));
  campaignUrl.searchParams.set('q', 'Audio8');
  campaignUrl.searchParams.set('view', 'charts');
  await page.goto(campaignUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '1 of 4 selected configurations');
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), ['audio8-realistic-0.6b-int4']);
  assert.equal(await page.locator('#charts-view').isVisible(), true);
  assert.equal(await page.locator('#charts .bar-row').count(), 2);
  const scopeNote = await page.locator('#scope-note').innerText();
  for (const model of campaignModels) assert.ok(scopeNote.includes(model.name), `Subset banner should name ${model.id}`);
  await page.locator('#scope-note [data-clear-model-scope]').click();
  const clearedCampaignUrl = new URL(page.url());
  assert.equal(clearedCampaignUrl.searchParams.has('models'), false);
  assert.equal(clearedCampaignUrl.searchParams.get('q'), 'Audio8', 'Clearing the subset preserves search');
  assert.equal(clearedCampaignUrl.searchParams.get('view'), 'charts', 'Clearing the subset preserves the selected view');
  assert.equal(await page.locator('#visible-count').innerText(), `1 of ${expected.models.length} configurations`);
  assert.equal(await page.locator('#model-rows tr').count(), 1);

  const repeatedScopeUrl = new URL(base);
  repeatedScopeUrl.search = '';
  campaignModelIds.slice(0, 2).forEach(id => repeatedScopeUrl.searchParams.append('models', id));
  await page.goto(repeatedScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '2 of 2 selected configurations');
  const repeatedModels = campaignModels.filter(model => campaignModelIds.slice(0, 2).includes(model.id));
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(repeatedModels, model => model.warm.cpu.medianSeconds));

  const unknownScopeUrl = new URL(base);
  unknownScopeUrl.search = '';
  unknownScopeUrl.searchParams.set('models', `${campaignModelIds[0]},bad-model-id`);
  await page.goto(unknownScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '1 of 1 selected configurations');
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), [campaignModelIds[0]], 'Unknown IDs must not expose unrelated configurations');
  assert.ok((await page.locator('#scope-note').innerText()).includes('bad-model-id'));

  const onlyUnknownScopeUrl = new URL(base);
  onlyUnknownScopeUrl.search = '';
  onlyUnknownScopeUrl.searchParams.set('models', 'bad-model-id');
  await page.goto(onlyUnknownScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '0 of 0 selected configurations');
  assert.equal(await page.locator('#model-rows tr').count(), 0, 'An all-unknown selection must stay empty');
  assert.equal(await page.locator('#no-results h3').innerText(), 'No recognized configurations in this subset.');
  assert.ok((await page.locator('#no-results p').innerText()).includes('bad-model-id'));
  assert.equal(await page.locator('#clear-filters').innerText(), 'Clear subset and filters');
  await page.locator('#clear-filters').click();
  assert.equal(new URL(page.url()).searchParams.has('models'), false, 'The empty-state action clears an all-unknown subset');
  assert.equal(await page.locator('#model-rows tr').count(), expected.models.length, 'Clear subset returns to the full configuration list');

  const emptyScopeUrl = new URL(base);
  emptyScopeUrl.search = '';
  emptyScopeUrl.searchParams.set('models', '');
  await page.goto(emptyScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '0 of 0 selected configurations');
  assert.equal(await page.locator('#model-rows tr').count(), 0, 'An explicitly empty selection must stay empty');
  assert.ok((await page.locator('#no-results p').innerText()).includes('No model IDs were selected'));
  assert.equal(await page.locator('#clear-filters').innerText(), 'Clear subset and filters');
  await page.locator('#clear-filters').click();
  assert.equal(new URL(page.url()).searchParams.has('models'), false, 'The empty-state action clears an empty subset');
  assert.equal(await page.locator('#model-rows tr').count(), expected.models.length);

  assert.equal(await page.locator('audio').count(), 1);
  assert.equal(await page.locator('audio').getAttribute('src'), null, 'Audio must not download on initial load');
  for (const model of expected.models) {
    const row = page.locator(`tr[data-model="${model.id}"]`);
    assert.equal(await row.locator('.license-tag').getAttribute('title'), model.license.model);
    for (const [column, value] of [[1,model.modelMB],[3,model.warm.cpu.medianSeconds],[4,model.warm.webgpu.medianSeconds],[5,model.memory.cpu.meanMB],[6,model.memory.webgpu.meanMB]]) {
      if (value != null) assert.equal(await row.locator('td').nth(column).locator('.value').innerText(), number(value));
    }
  }
  for (const model of expected.models) {
    const row = page.locator(`tr[data-model="${model.id}"]`);
    const scored = ['cpu','webgpu'].some(b => model.warm[b].outputNotes?.scored);
    const warmup = ['cpu','webgpu'].some(b => model.warm[b].outputNotes?.warmup);
    assert.equal(await row.locator('.output-warning').count(), Number(scored));
    assert.equal(await row.locator('.output-warmup').count(), Number(warmup));
    if (scored || warmup) {
      await row.locator(scored ? '.output-warning' : '.output-warmup').click();
      for (const backend of ['cpu','webgpu']) for (const kind of ['scored','warmup']) {
        const note = model.warm[backend].outputNotes?.[kind];
        if (note) assert.ok((await page.locator('#detail-content').innerText()).includes(note.text));
      }
      await page.keyboard.press('Escape');
    }
  }
  await mkdir(review, {recursive:true});
  await page.screenshot({path:`${review}/desktop.png`,fullPage:true});
  await page.locator('#search').fill('KOKORO');
  assert.equal(await page.locator('#model-rows tr').count(), 1);
  await page.locator('.model-name').click();
  assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
  assert.match(await page.locator('#detail-content').innerText(), /Sampled generation peak/);
  assert.ok((await page.locator('#detail-content').innerText()).includes(number(expected.models.find(m=>m.id==='kokoro-82m').memory.webgpu.peakMB)));
  await page.screenshot({path:`${review}/details.png`});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
  assert.equal(await page.locator('.model-name').evaluate(b => b === document.activeElement), true);
  await page.locator('#search').fill('no model matches this');
  assert.equal(await page.locator('#no-results').isVisible(), true);
  await page.locator('#clear-filters').click();
  await page.locator('#license').selectOption('Apache-2.0');
  assert.equal(await page.locator('#model-rows tr').count(), expected.models.filter(m => m.license.model === 'Apache-2.0').length);
  await page.locator('#reset').click();
  await page.locator('#cohort').selectOption('paired');
  assert.equal(await page.locator('#model-rows tr').count(), expected.models.filter(m => m.pairedWarm).length);
  await page.locator('#cohort').selectOption('historical');
  assert.equal(await page.locator('#model-rows tr').count(), expected.models.filter(m => ['cpu','webgpu'].some(b => m.warm[b].origin === 'historical-import')).length);
  assert.equal(await page.locator('.evidence-tag.historical').count(), expected.models.filter(m => ['cpu','webgpu'].some(b => m.warm[b].origin === 'historical-import')).length);
  const cohorts = await page.locator('#cohort option').evaluateAll(options => options.map(o => o.value).filter(v => !['all','paired','historical'].includes(v)));
  for (const key of cohorts) {await page.locator('#cohort').selectOption(key); assert.equal(await page.locator('#model-rows tr').count(), expected.models.filter(m => ['cpu','webgpu'].some(b => m.warm[b].cohortKey === key)).length);}
  await page.locator('#reset').click();
  await assertDefaultOrder();
  await page.locator('[data-sort="webgpu"]').click();
  const measuredGpu = expected.models.filter(m => m.warm.webgpu.medianSeconds != null).sort((a,b) => a.warm.webgpu.medianSeconds-b.warm.webgpu.medianSeconds);
  assert.equal(await page.locator('#model-rows tr').first().getAttribute('data-model'), measuredGpu[0].id);
  const unavailableGpu = expected.models.filter(m => m.warm.webgpu.medianSeconds == null).sort((a,b)=>a.name.localeCompare(b.name));
  if (unavailableGpu.length) assert.equal(await page.locator('#model-rows tr').last().getAttribute('data-model'), unavailableGpu.at(-1).id);
  await page.locator('[data-sort="webgpu"]').click();
  if (unavailableGpu.length) assert.equal(await page.locator('#model-rows tr').last().getAttribute('data-model'), unavailableGpu.at(-1).id, 'Missing scores remain last even descending');
  await page.locator('[data-view="charts"]').click();
  for (const metric of ['generation','memory','size']) {
    await page.locator(`[data-metric="${metric}"]`).click();
    assert.equal(await page.locator('.chart-panel').count(), metric === 'size' ? 1 : 2);
    assert.equal(await page.locator('.bar-row').count(), expected.models.length*(metric === 'size' ? 1 : 2));
    assert.equal(await page.locator('#charts').evaluate(e => e.innerHTML.includes('NaN')), false);
    await assertChartOrder(expected.models, metric);
  }
  await page.locator('[data-metric="generation"]').click();
  await page.locator('#cohort').selectOption(cohorts.at(-1));
  await page.screenshot({path:`${review}/charts.png`,fullPage:true});
  await page.locator('#reset').click();
  await page.locator('[data-view="table"]').click();
  await page.locator('audio').evaluate(a => {a.muted = true;});
  let clips = 0;
  for (const model of expected.models) for (const backend of ['cpu','webgpu']) {
    const button = page.locator(`tr[data-model="${model.id}"] [data-play][data-backend="${backend}"]`);
    if (await button.count() === 0) continue;
    await button.click();
    await page.waitForFunction(() => {const a=document.querySelector('audio');return a.currentTime > .15 && !a.paused && a.readyState >= 2;});
    assert.equal(await page.locator('audio').evaluate(a => a.duration), 30);
    assert.equal(await page.locator('#player-error').isVisible(), false);
    clips++;
  }
  await page.locator('#model-rows').evaluate(rows => {const buttons=rows.querySelectorAll('[data-play]');buttons[0].click();buttons[1].click();});
  await page.waitForFunction(() => {const a=document.querySelector('audio');return a.currentTime > .15 && !a.paused;});
  assert.equal(await page.locator('#player-error').isVisible(), false, 'Rapid switching must not show a stale playback error');
  await page.locator('#close-player').click();
  assert.equal(await page.locator('audio').evaluate(a => a.paused), true);
  await page.setViewportSize({width:390,height:844});
  assert.ok((await page.locator('#cohort').boundingBox()).width > 100, 'Mobile evidence filter stays usable');
  assert.ok((await page.locator('#license').boundingBox()).width > 100, 'Mobile license filter stays usable');
  await page.locator('#sort-select').selectOption('cpu');
  assert.equal(await page.locator('#model-rows tr').first().getAttribute('data-model'), expected.models.filter(m=>m.warm.cpu.medianSeconds!=null).sort((a,b)=>a.warm.cpu.medianSeconds-b.warm.cpu.medianSeconds)[0].id);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({path:`${review}/mobile.png`,fullPage:true});
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({path:`${review}/mobile-viewport.png`});
  await page.locator('.model-name').first().click();
  assert.equal(await page.locator('dialog').evaluate(d => d.scrollWidth <= d.clientWidth), true);
  await page.locator('#close-details').click();
  await page.goto(new URL('?model=piper-en-gb-southern-english-female-low', base).href);
  await page.waitForFunction(() => document.querySelector('dialog').open);
  assert.match(await page.locator('#detail-title').innerText(), /Piper/);
  await page.locator('#close-details').click();
  // Shareable family views must preserve the requested filter, chart and units.
  await page.setViewportSize({width:1440,height:1000});
  const family = expected.models.filter(model => model.name.toLowerCase().includes('lfm3'));
  assert.ok(family.length >= 4, 'The published LFM3 configurations must remain discoverable');
  await page.goto(new URL('?q=LFM3', base).href);
  await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, family.length);
  assert.equal(await page.locator('#search').inputValue(), 'LFM3');
  assert.equal(await page.locator('#table-view').isVisible(), true);
  await page.screenshot({path:`${review}/lfm3-table.png`,fullPage:true});
  for (const metric of ['generation','memory','size']) {
    await page.goto(new URL(`?q=LFM3&view=charts&metric=${metric}`, base).href);
    await page.waitForFunction(n => document.querySelectorAll('.bar-row').length === n, family.length*(metric === 'size' ? 1 : 2));
    assert.equal(await page.locator('[data-view="charts"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator(`[data-metric="${metric}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#charts').evaluate(e => e.innerHTML.includes('NaN')), false);
    await assertChartOrder(family, metric);
    await page.screenshot({path:`${review}/lfm3-${metric}.png`,fullPage:true});
  }
  const sample = expected.models.find(m=>m.audio.length).audio[0];
  const legacy = new URL('audio/', base); legacy.searchParams.set('sample', sample.clip.path.split('/').at(-1));
  await page.goto(legacy.href);
  await page.waitForFunction(() => document.querySelectorAll('article').length === 1);
  await page.locator('audio').evaluate(async a => {a.muted=true;await a.play();});
  await page.waitForFunction(() => document.querySelector('audio').currentTime > .15);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failedResponses, []);
  const result = {base,chrome:browser.version(),models:expected.models.length,playedClips:clips,filters:true,sorting:true,charts:true,details:true,keyboard:true,mobile:true,legacyDeepLink:true,familyDeepLinks:true,externalRequests:external.length,errors};
  await writeFile(`${review}/verification.json`, JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {await browser?.close(); server?.kill('SIGTERM');}
