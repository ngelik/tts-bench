// Optional real-Chrome UI verification. No inference or model downloads.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {findChrome} from '../lib/runner.mjs';
import {matchesAuditedWav} from '../audio/waveform-integrity.mjs';
const expected = JSON.parse(await readFile('.cache/listening-site/assets/data.json', 'utf8'));
const languageGroups = [expected, ...Object.values(expected.byLanguage ?? {})];
const allLanguageModels = languageGroups.flatMap(group => group.models ?? []);
const ukData = expected.byLanguage?.uk ?? null;
const campaignModelIds = [
  'audio8-realistic-0.6b-int4',
  'fun-cosyvoice3-0.5b-2512',
  'ming-3.0-tts-0.5b-gguf',
  'ming-3.0-tts-0.5b-fusor-mix-cpu',
];
const campaignModels = expected.models.filter(model => campaignModelIds.includes(model.id));
assert.equal(campaignModels.length, campaignModelIds.length, 'Campaign subset IDs must exist in the dashboard data');
const cosySelection = expected.models.find(model => model.id === 'fun-cosyvoice3-0.5b-2512')?.warm.cpu;
const cosySelectionReportUrl = 'https://github.com/ngelik/tts-bench/blob/main/reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection';
const urlArg = process.argv.indexOf('--url');
let base = urlArg >= 0 ? process.argv[urlArg + 1] : null;
const baselineArg = process.argv.indexOf('--baseline-url');
const baselineUrl = baselineArg >= 0 ? process.argv[baselineArg + 1] : null;
let server, browser;
const number = n => n.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const eligibleWarm = metric => metric?.status === 'measured' && Number.isFinite(metric.medianSeconds) && !metric.waveform;
const eligibleMemory = metric => metric?.status === 'measured' && Number.isFinite(metric.meanMB) && !metric.waveform;
// Mirror dashboard/app.mjs: registered configurations without any eligible warm
// or memory result remain in source metadata but do not produce a result row.
const hasEligibleResult = model => ['cpu','webgpu'].some(backend => eligibleWarm(model.warm[backend]) || eligibleMemory(model.memory[backend]));
const resultModels = models => models.filter(hasEligibleResult);
const expectedResultModels = resultModels(expected.models);
const ukResultModels = resultModels(ukData?.models ?? []);
const campaignResultModels = resultModels(campaignModels);
const resultCountLabel = count => `${count} result${count === 1 ? '' : 's'}`;
async function selectLanguage(page, id) {
  if (!await page.locator('#language-picker').evaluate(dialog => dialog.open)) await page.locator('#language-picker-trigger').click();
  await page.locator(`#language-${id}`).click();
}
async function expectLanguage(page, id) {
  assert.equal(await page.locator(`#language-${id}`).getAttribute('aria-current'), 'page');
}
assert.ok(campaignResultModels.length > 0, 'The dashboard campaign subset includes eligible results');
const currentWaveformFault = model => ['cpu','webgpu'].some(backend => {
  const warm = model.warm[backend], memory = model.memory[backend];
  if ((warm?.registration === 'current' && warm.waveform) || (memory?.registration === 'current' && memory.waveform)) return true;
  const sample = model.playbackAudio?.[backend];
  const selectedCurrentMetric = (warm?.registration === 'current' && sample?.matchesSelectedWarm) || (memory?.registration === 'current' && sample?.matchesSelectedMemory);
  return Boolean(selectedCurrentMetric && sample && matchesAuditedWav(sample.full.sha256));
});
const expectedGeneration = (models, backend) => models.filter(model => eligibleWarm(model.warm[backend]));
const expectedMemory = (models, backend) => models.filter(model => eligibleMemory(model.memory[backend]));
const activeAudioEntries = allLanguageModels.flatMap(model => model.audio ?? []);
const expectedAudioEntries = expected.recordings ?? activeAudioEntries;
assert.ok(expectedAudioEntries.every(entry => activeAudioEntries.some(active => active.clip.path === entry.clip.path) ||
  entry.resultId && entry.model && entry.backend && entry.clip?.path), 'The complete recording catalog retains active and archived clip identities');
const flaggedAudioPaths = new Set(expectedAudioEntries.filter(entry => matchesAuditedWav(entry.full.sha256)).map(entry => entry.clip.path));
const capabilityCount = value => Number.isSafeInteger(value) && value >= 1 ? value : null;
const capabilityCodes = model => [...new Set((Array.isArray(model.support?.languages) ? model.support.languages : [])
  .filter(code => typeof code === 'string' && code.trim()).map(code => code.trim()))];
function matchesCapabilityRange(value, bucket, kind) {
  if (bucket === 'all') return true;
  if (bucket === 'unknown') return value === null;
  if (value === null) return false;
  if (kind === 'weight') return bucket === 'le10' ? value <= 10
    : bucket === '10to50' ? value > 10 && value <= 50
    : bucket === '50to200' ? value > 50 && value <= 200
    : bucket === '200to1000' ? value > 200 && value <= 1000
    : bucket === 'gt1000' ? value > 1000 : false;
  if (kind === 'languages') return bucket === 'one' ? value === 1
    : bucket === '2to5' ? value >= 2 && value <= 5
    : bucket === '6to20' ? value >= 6 && value <= 20
    : bucket === 'gt20' ? value > 20 : false;
  return bucket === 'one' ? value === 1
    : bucket === '2to10' ? value >= 2 && value <= 10
    : bucket === '11to100' ? value >= 11 && value <= 100
    : bucket === 'gt100' ? value > 100 : false;
}
function matchesCapabilityFilters(model, filters) {
  const weight = Number.isFinite(model.modelMB) && model.modelMB >= 0 ? model.modelMB : null;
  const languageCount = capabilityCount(model.support?.languageCount);
  const voiceCount = capabilityCount(model.support?.voiceCount);
  const codes = capabilityCodes(model);
  return matchesCapabilityRange(weight, filters.weight, 'weight') &&
    matchesCapabilityRange(languageCount, filters.languages, 'languages') &&
    matchesCapabilityRange(voiceCount, filters.voices, 'voices') &&
    (filters.supports === 'all' || (filters.supports === 'unlisted' ? codes.length === 0 : codes.includes(filters.supports)));
}
const errors = [], external = [], failedResponses = [];
const review = '.cache/dashboard-review';
const waveformBadge = row => row.locator('button.output-warning').filter({hasText:'Waveform fault'});
let mobileFilterWidths = null;
async function measureResults(page) {
  return page.evaluate(() => {
    const first = document.querySelector('#model-rows tr');
    if (!first) throw new Error('The first result row is missing');
    const top = first.getBoundingClientRect().top;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let words = 0, node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('[hidden],script,style,noscript')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom <= top + 1) words += (node.nodeValue.match(/\b[\p{L}\p{N}’'-]+\b/gu) ?? []).length;
    }
    return {firstResultRowTop: Math.round(top), visibleWordsBeforeFirstRow: words};
  });
}
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
  await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, expectedResultModels.length);
  const candidateLayout = await measureResults(page);
  assert.ok(candidateLayout.firstResultRowTop < 650, `First result row should remain near the top; observed y=${candidateLayout.firstResultRowTop}`);
  assert.equal(await page.locator('#model-count').innerText(), String(expectedResultModels.length));
  assert.equal(await page.locator('#score-count').innerText(), String(expectedGeneration(expected.models, 'cpu').length + expectedGeneration(expected.models, 'webgpu').length));
  await expectLanguage(page, 'en');
  await page.locator('#language-picker-trigger').click();
  assert.equal(await page.locator('#language-en .language-option-count').textContent(), `${expectedResultModels.length} ${expectedResultModels.length === 1 ? 'model' : 'models'}`);
  assert.ok(typeof ukData?.fixture?.id === 'string' && ukData.fixture.language === 'uk', 'The built dashboard data contains the active registered Ukrainian fixture edition');
  assert.equal(await page.locator('#language-uk .language-option-count').textContent(), ukResultModels.length ? `${ukResultModels.length} ${ukResultModels.length === 1 ? 'model' : 'models'}` : 'Awaiting results');
  await page.keyboard.press('Escape');
  const ukPlayback = ukResultModels.flatMap(model => ['cpu','webgpu'].map(backend => ({model,backend,sample:model.playbackAudio?.[backend]})))
    .find(entry => entry.sample?.language === 'uk' && !matchesAuditedWav(entry.sample.full.sha256));
  const deData = expected.byLanguage?.de;
  const deModel = deData?.models?.find(model => model.id === 'apptor-tiny-tts');
  const deClipOnly = deModel?.playbackAudio?.cpu;
  assert.ok(deData?.fixture?.id && deModel && deClipOnly && deClipOnly.full?.url == null, 'The Standard German M2 CPU clip is published without a full WAV URL');
  for (const model of expected.models.filter(model => !hasEligibleResult(model))) {
    assert.equal(await page.locator(`tr[data-model="${model.id}"]`).count(), 0, `${model.id} remains registered without an eligible result row`);
  }
  const visibleAbove = await page.locator('body').innerText();
  assert.doesNotMatch(visibleAbove, /PUBLISHED MEASUREMENTS|Open evidence\. Local inference\./);
  assert.equal(await page.locator('.evidence-tag.historical').count(), 0, 'Historical status is not a visible model badge');
  assert.equal(await page.locator('.model-sub').getByText(/Matched pair|Historical/, {exact:false}).count(), 0, 'Paired and historical labels are absent from model rows');
  let baselineLayout = null;
  if (baselineUrl) {
    const baseline = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    try {
      const baselineDataResponsePromise = baseline.waitForResponse(response => {
        const url = new URL(response.url());
        return url.origin === new URL(baselineUrl).origin && url.pathname.endsWith('/assets/data.json');
      });
      await baseline.goto(baselineUrl);
      const baselineDataResponse = await baselineDataResponsePromise;
      assert.equal(baselineDataResponse.status(), 200, 'Baseline dashboard data request succeeds');
      const baselineData = await baselineDataResponse.json();
      const baselineResultCount = resultModels(baselineData.models).length;
      await baseline.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, baselineResultCount);
      baselineLayout = {url:baselineUrl,...await measureResults(baseline)};
      await mkdir(review, {recursive:true});
      await baseline.screenshot({path:`${review}/baseline-desktop.png`,fullPage:true});
    } finally {await baseline.close();}
  }
  const rankedIds = (models, value, direction = 1) => [...models].sort((a, b) => {
    const av = value(a), bv = value(b);
    return av == null && bv == null ? a.name.localeCompare(b.name) : av == null ? 1 : bv == null ? -1 : (av - bv) * direction || a.name.localeCompare(b.name);
  }).map(model => model.id);
  const assertRows = async models => {
    assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)),
      rankedIds(models, model => eligibleWarm(model.warm.cpu) ? model.warm.cpu.medianSeconds : null));
  };
  const assertDefaultOrder = async () => {
    assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(expectedResultModels, model => eligibleWarm(model.warm.cpu) ? model.warm.cpu.medianSeconds : null));
    assert.equal(await page.locator('th[data-column="cpu"]').getAttribute('aria-sort'), 'ascending');
    assert.equal(await page.locator('#sort-select').inputValue(), 'cpu');
  };
  const assertChartOrder = async (models, metric) => {
    const backends = metric === 'size' ? ['size'] : metric === 'coverage' ? ['languages','voices'] : ['cpu','webgpu'];
    for (const backend of backends) {
      const panelName = backend === 'size' ? 'Model size' : backend === 'cpu' ? 'CPU' : backend === 'webgpu' ? 'GPU' : backend === 'languages' ? 'Supported languages' : 'Supported voices';
      const panel = page.getByRole('region', {name: `${panelName} chart`, exact:true});
      const value = model => backend === 'size' ? model.modelMB : metric === 'coverage' ? model.support?.[backend === 'languages' ? 'languageCount' : 'voiceCount'] : model[metric === 'generation' ? 'warm' : 'memory'][backend][metric === 'generation' ? 'medianSeconds' : 'meanMB'];
      const eligible = backend === 'size' ? models.filter(model => hasEligibleResult(model) && Number.isFinite(model.modelMB))
        : metric === 'coverage' ? models.filter(model => capabilityCount(value(model)) !== null)
        : metric === 'generation' ? expectedGeneration(models, backend) : expectedMemory(models, backend);
      if (metric === 'generation') {
        for (const model of eligible.filter(model => model.warm[backend].n === 1 && !model.warm[backend].selectionKind)) {
          assert.equal(await panel.locator(`.bar-row[data-model="${model.id}"] .metric-count`).innerText(), 'n=1');
        }
      }
      assert.deepEqual(await panel.locator('.bar-row [data-detail]').evaluateAll(buttons => buttons.map(button => button.dataset.detail)), rankedIds(eligible, value, metric === 'coverage' ? -1 : 1));
    }
  };
  await selectLanguage(page, 'uk');
  await page.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, ukResultModels.length);
  await expectLanguage(page, 'uk');
  assert.equal(await page.locator('#results').getAttribute('aria-labelledby'), 'results-title');
  assert.equal(await page.locator('#fixture-language').innerText(), `${ukData.fixture.characters.toLocaleString('en-US')} Ukrainian characters`);
  assert.equal(await page.locator('#model-count').innerText(), String(ukResultModels.length));
  assert.equal(await page.locator('#model-count-label').innerText(), ukResultModels.length === 1 ? 'configuration' : 'configurations');
  assert.equal(await page.locator('#score-count').innerText(), String(expectedGeneration(ukData.models, 'cpu').length + expectedGeneration(ukData.models, 'webgpu').length));
  await assertRows(ukResultModels);
  const ukCapabilityCases = [
    ['weight-filter','weight','unknown'],
    ['language-count','languages','unknown'],
    ['voice-count','voices','unknown'],
    ['supported-language','supports','unlisted'],
  ];
  for (const [selectId,key,value] of ukCapabilityCases) {
    await page.locator('#reset').click();
    await page.locator(`#${selectId}`).selectOption(value);
    const filters = {weight:'all',supports:'all',languages:'all',voices:'all',[key]:value};
    await assertRows(ukResultModels.filter(model => matchesCapabilityFilters(model, filters)));
    const param = { 'weight-filter':'weight','supported-language':'supports','language-count':'languages','voice-count':'voices' }[selectId];
    assert.equal(new URL(page.url()).searchParams.get(param),value,`Ukrainian ${selectId} selection is shareable`);
  }
  await page.locator('#reset').click();
  await assertRows(ukResultModels);
  if (ukResultModels.length > 0 && ukPlayback) {
    const ukRow = page.locator(`tr[data-model="${ukPlayback.model.id}"]`);
    const ukPlayButton = ukRow.locator(`[data-play="${ukPlayback.model.id}"][data-backend="${ukPlayback.backend}"]`);
    assert.equal(await ukPlayButton.count(), 1, 'The Ukrainian result row exposes its selected audio action');
    assert.equal(await ukPlayButton.isVisible(), true);
    await page.locator('#sample-audio').evaluate(audio => { audio.muted = true; });
    await ukPlayButton.click();
    await page.waitForFunction(() => {const audio=document.querySelector('#sample-audio');return audio.currentTime > .15 && !audio.paused && audio.readyState >= 2;});
    assert.equal(await page.locator('#player-error').isVisible(), false);
    assert.ok((await page.locator('#player-title').innerText()).includes(ukPlayback.model.name));
    assert.ok((await page.locator('#player-caption').innerText()).includes(ukPlayback.sample.voice));
    assert.equal(await page.locator('#sample-audio').evaluate(audio => audio.currentSrc), new URL(ukPlayback.sample.clip.path, base).href, 'The Ukrainian tab plays its registered local recording');
    await page.locator('#close-player').click();
    const ukDetailUrl = new URL(base);
    ukDetailUrl.search = '';
    ukDetailUrl.searchParams.set('lang','uk');
    ukDetailUrl.searchParams.set('model',ukPlayback.model.id);
    await page.goto(ukDetailUrl.href);
    await page.waitForFunction(() => document.querySelector('#details')?.open);
    assert.equal(await page.locator('#detail-title').innerText(),ukPlayback.model.name,'A language-scoped Ukrainian model deep link opens the right details');
    assert.equal(new URL(page.url()).searchParams.get('lang'),'uk');
    await page.locator('#close-details').click();
  } else {
    assert.equal(await page.locator('#no-results h3').innerText(), 'No published Ukrainian results yet.');
    await expectLanguage(page, 'uk');
  }
  for (const [language, group] of Object.entries(expected.byLanguage ?? {})) {
    if (language === 'uk') continue;
    const models = resultModels(group.models ?? []);
    const displayName = new Intl.DisplayNames(['en'], {type:'language'}).of(language);
    const tabLabel = {
      'ku-Arab-IQ': 'Kurdish Behdînî (Arabic script)',
      'bn-Latn': 'Romanized Bengali',
      'ur-Latn': 'Roman Urdu',
    }[language] ?? expected.languages?.find(entry => entry.id === language)?.label ?? displayName;
    const tab = page.locator(`#language-${language}`);
    assert.equal(await tab.count(), 1, `A registered ${language} edition has a language tab`);
    assert.ok((await tab.textContent()).includes(tabLabel), `${language} picker link uses a human-readable language name`);
    if (language === 'ku-Arab-IQ') {
      assert.equal(await tab.locator('.language-option-english').textContent(), 'Kurdish Behdînî (Arabic script)');
    }
    await selectLanguage(page, language);
    await page.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, models.length);
    await expectLanguage(page, language);
    assert.equal(await page.locator('#results').getAttribute('aria-labelledby'), 'results-title');
    const pickerName = await tab.locator('.language-option-native, .language-option-english').first().textContent();
    assert.equal(await page.locator('#current-language').textContent(), pickerName);
    assert.equal(await page.locator('#model-count').innerText(), String(models.length));
    assert.equal(await page.locator('#score-count').innerText(), String(expectedGeneration(group.models, 'cpu').length + expectedGeneration(group.models, 'webgpu').length));
    if (group.fixture?.characters) {
      assert.equal(await page.locator('#fixture-language').innerText(), `${group.fixture.characters.toLocaleString('en-US')} ${displayName} characters`);
    }
    await assertRows(models);
    for (const [selectId, key, value] of [
      ['weight-filter','weight','unknown'],
      ['language-count','languages','unknown'],
      ['voice-count','voices','unknown'],
      ['supported-language','supports','unlisted'],
    ]) {
      await page.locator('#reset').click();
      await page.locator(`#${selectId}`).selectOption(value);
      const filters = {weight:'all',supports:'all',languages:'all',voices:'all',[key]:value};
      await assertRows(models.filter(model => matchesCapabilityFilters(model, filters)));
    }
    await page.locator('#reset').click();
    await assertRows(models);
    if (models.length === 0) {
      assert.equal(await page.locator('#no-results').isVisible(), true, `${language} remains usable before it has published results`);
    }
  }
  await selectLanguage(page, 'en');
  await page.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, expectedResultModels.length);
  await expectLanguage(page, 'en');
  await assertDefaultOrder();
  for (const model of expectedResultModels) {
    for (const [backend, label] of [['cpu', 'CPU'], ['webgpu', 'GPU']]) {
      const metric = model.warm[backend];
      if (!eligibleWarm(metric) || metric.n !== 1 || metric.selectionKind) continue;
      const row = page.locator(`tr[data-model="${model.id}"]`);
      assert.equal(await row.locator(`td[data-label="${label} · seconds"] .metric-count`).innerText(), 'n=1');
    }
  }
  if (cosySelection?.selectionKind === 'operator-shortened-warm-selection') {
    const row = page.locator('tr[data-model="fun-cosyvoice3-0.5b-2512"]');
    const score = row.locator('td[data-label="CPU · seconds"] a.metric-link');
    const cpuCount = row.locator('td[data-label="CPU · seconds"] .metric-count');
    const gpuCount = row.locator('td[data-label="GPU · seconds"] .metric-count');
    assert.equal(await score.getAttribute('href'), cosySelectionReportUrl, 'The selected CPU score opens its readable selection report');
    assert.match(await score.getAttribute('title'), /Reviewed selection: 2 completed scored articles from 5 planned/);
    assert.equal(await cpuCount.innerText(), `n=${cosySelection.n}/${cosySelection.originalPlannedRepetitions} · partial`, 'The selected count and planned denominator stay visible');
    const cosyGpu = expected.models.find(model => model.id === 'fun-cosyvoice3-0.5b-2512')?.warm.webgpu;
    if (eligibleWarm(cosyGpu)) assert.equal(await gpuCount.innerText(), `n=${cosyGpu.n}`, 'The historical GPU score shows its actual scored count');
    await row.locator('.model-name').click();
    const cpuDetails = page.locator('#detail-content .detail-card').filter({hasText: 'CPU warm generation'});
    assert.equal(await cpuDetails.locator(`a[href="${cosySelection.reportUrl}"]`).count(), 1, 'Details retain the raw native receipt link');
    assert.equal(await cpuDetails.locator(`a[href="https://github.com/ngelik/tts-bench/blob/main/${cosySelection.selectionPath}"]`).count(), 1, 'Details retain the reviewed sidecar link');
    await page.keyboard.press('Escape');
  }
  for (const model of expectedResultModels) for (const backend of ['cpu', 'webgpu']) {
    const metric = model.warm[backend];
    if (metric.selectionKind !== 'operator-shortened-warm-selection') continue;
    const row = page.locator(`tr[data-model="${model.id}"]`);
    const label = backend === 'cpu' ? 'CPU' : 'GPU';
    const cell = row.locator(`td[data-label="${label} · seconds"]`);
    assert.equal(await cell.locator('a.metric-link').getAttribute('href'), metric.selectionReportUrl);
    assert.equal(await cell.locator('.metric-count').innerText(), `n=${metric.n}/${metric.originalPlannedRepetitions} · partial`);
    assert.equal(metric.receiptStatus, 'error', 'Selection preserves the terminal raw status');
    assert.ok(metric.n < metric.originalPlannedRepetitions);
  }
  const audio8 = expected.models.find(model => model.id === 'audio8-realistic-0.6b-int4');
  const audio8ArchivedFault = audio8?.audio.find(entry => matchesAuditedWav(entry.full.sha256));
  const audio8CurrentGpuRecording = audio8?.playbackAudio?.webgpu;
  assert.ok(audio8ArchivedFault, 'The Audio8 archived waveform diagnostic remains published');
  assert.ok(audio8CurrentGpuRecording && (audio8CurrentGpuRecording.matchesSelectedWarm || audio8CurrentGpuRecording.matchesSelectedMemory), 'Audio8 exposes a recording selected by its current measurement');
  assert.equal(matchesAuditedWav(audio8CurrentGpuRecording.full.sha256), false, 'The current Audio8 GPU recording passed waveform review');
  const audio8Row = page.locator('tr[data-model="audio8-realistic-0.6b-int4"]');
  assert.equal(await waveformBadge(audio8Row).count(), 0, 'An archived-only Audio8 fault does not badge the current result row');
  assert.equal(await audio8Row.locator('[data-play][data-backend="webgpu"]').count(), 1, 'The healthy replacement GPU recording remains playable from the results table');
  const audio8Fault = audio8?.playbackAudio?.webgpu && matchesAuditedWav(audio8.playbackAudio.webgpu.full.sha256) ? audio8.playbackAudio.webgpu : null;
  if (audio8Fault) {
    const row = page.locator('tr[data-model="audio8-realistic-0.6b-int4"]');
    const audioCell = row.locator('td[data-label="Listen · 30s"]');
    assert.equal(await audioCell.locator('[data-play][data-backend="webgpu"]').count(), 0, 'Faulted GPU playback is not an ordinary homepage control');
    assert.match(await audioCell.locator('.metric-unavailable').filter({hasText:'GPU'}).getAttribute('aria-label'), /waveform flagged/);
  }
  if (audio8 && audio8.memory.webgpu?.waveform) {
    const row = page.locator('tr[data-model="audio8-realistic-0.6b-int4"]');
    const memoryCell = row.locator('td[data-label="Cached RAM · GPU · avg MB"] .metric-unavailable');
    assert.equal(await memoryCell.innerText(), '—', 'A fault-derived RAM measurement has no ordinary result value');
    assert.match(await memoryCell.getAttribute('aria-label'), /Waveform-flagged recording/);
    await page.locator('[data-view="charts"]').click();
    await page.locator('[data-metric="memory"]').click();
    assert.equal(await page.locator('.chart-panel.gpu .bar-row [data-detail="audio8-realistic-0.6b-int4"]').count(), 0, 'Fault-derived RAM is excluded from the ranked chart');
    await page.locator('[data-metric="generation"]').click();
    await page.locator('[data-view="table"]').click();
    await row.locator('.model-name').click();
    const diagnosticCard = page.locator('#detail-content .detail-card').filter({hasText: 'GPU memory diagnostic'});
    assert.ok((await diagnosticCard.innerText()).includes(number(audio8.memory.webgpu.meanMB)), 'The diagnostic RAM value remains in optional model details');
    await page.keyboard.press('Escape');
  }
  for (const id of ['tiny-voca', 'ming-3.0-tts-0.5b-fusor-mix-cpu']) {
    const model = expected.models.find(item => item.id === id);
    if (!model) continue;
    const row = page.locator(`tr[data-model="${id}"]`);
    const memoryBackends = ['cpu', 'webgpu'].filter(backend => eligibleMemory(model.memory[backend]) && model.memory[backend].scenario === 'cached');
    if (!memoryBackends.length) continue;
    const hasWarmResult = ['cpu', 'webgpu'].some(backend => eligibleWarm(model.warm[backend]));
    assert.equal(await row.locator('.cached-only').count(), Number(!hasWarmResult), `${id} is labeled cached-only only when it has no eligible warm result`);
    for (const backend of memoryBackends) {
      const label = `Cached RAM · ${backend === 'cpu' ? 'CPU' : 'GPU'} · avg MB`;
      assert.equal(await row.locator(`td[data-label="${label}"] .value`).innerText(), number(model.memory[backend].meanMB));
    }
  }
  const audio8Gpu = audio8?.warm.webgpu;
  if (audio8Gpu?.status === 'error' && audio8Gpu.registration === 'archived' && audio8Gpu.pendingCurrent) {
    const explanation = `${audio8Gpu.reason ? `An earlier run failed (${audio8Gpu.reason}).` : 'An earlier run failed.'} ${audio8Gpu.pendingCurrent}`;
    const row = page.locator('tr[data-model="audio8-realistic-0.6b-int4"]');
    const tableStatus = row.locator('td[data-label="GPU · seconds"] .metric-unavailable');
    assert.equal(await tableStatus.innerText(), '—');
    assert.ok((await tableStatus.getAttribute('title')).includes(`Retest scheduled. ${explanation}`));
    assert.ok((await tableStatus.getAttribute('aria-label')).includes(explanation), 'The blank cell keeps the recorded failure and current schedule accessible');

    await row.locator('.model-name').click();
    const details = page.locator('#detail-content');
    const warmCard = details.locator('.detail-card').filter({hasText: 'GPU warm generation'});
    assert.match(await warmCard.innerText(), /Retest scheduled/);
    assert.ok((await warmCard.innerText()).includes(explanation), 'Details retain the earlier failure reason and current schedule');
    assert.equal(await warmCard.locator(`a[href="${audio8Gpu.reportUrl}"]`).count(), 1, 'Details retain the earlier run receipt');
    if (audio8Fault) {
      const diagnosticAudioLink = details.locator(`a[href="./audio/?sample=${audio8Fault.clip.path.split('/').at(-1)}"]`);
      assert.equal(await diagnosticAudioLink.count(), 1, 'Details retain a direct route to opt-in diagnostic playback');
      assert.equal(await details.locator(`li button[data-play][data-backend="webgpu"]`).count(), 0, 'Flagged playback stays behind the diagnostic control');
    }
    await page.keyboard.press('Escape');

    const retestChartUrl = new URL(base);
    retestChartUrl.search = '';
    retestChartUrl.searchParams.set('models', audio8.id);
    retestChartUrl.searchParams.set('view', 'charts');
    await page.goto(retestChartUrl.href);
    await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '1 result');
    const chartStatus = page.locator('.chart-panel.gpu .bar-row').filter({has: page.locator('[data-detail="audio8-realistic-0.6b-int4"]')});
    assert.equal(await chartStatus.count(), 0, 'An archived failed timing is not plotted');
    await page.goto(base);
    await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, expectedResultModels.length);
  }
  const chartCampaignUrl = new URL(base);
  chartCampaignUrl.search = '';
  chartCampaignUrl.searchParams.set('models', campaignModelIds.join(','));
  chartCampaignUrl.searchParams.set('view', 'charts');
  await page.goto(chartCampaignUrl.href);
  await page.waitForFunction(label => document.querySelector('#visible-count')?.textContent === label, resultCountLabel(campaignResultModels.length));
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(campaignResultModels, model => eligibleWarm(model.warm.cpu) ? model.warm.cpu.medianSeconds : null));
  assert.equal(await page.locator('#charts .bar-row').count(), expectedGeneration(campaignModels, 'cpu').length + expectedGeneration(campaignModels, 'webgpu').length);
  await assertChartOrder(campaignModels, 'generation');
  if (cosySelection?.selectionKind === 'operator-shortened-warm-selection') {
    const chartRow = page.locator('.chart-panel.cpu .bar-row').filter({has: page.locator('[data-detail="fun-cosyvoice3-0.5b-2512"]')});
    const score = chartRow.locator('a.selection-report-link');
    assert.equal(await score.getAttribute('href'), cosySelectionReportUrl, 'The chart score also opens the readable selection report');
    assert.match(await score.getAttribute('title'), /Reviewed selection: 2 completed scored articles from 5 planned/);
  }

  for (const model of campaignResultModels) for (const backend of ['cpu', 'webgpu']) {
    const metric = model.warm[backend];
    if (metric.selectionKind !== 'operator-shortened-warm-selection') continue;
    const panel = backend === 'cpu' ? 'cpu' : 'gpu';
    const row = page.locator(`.chart-panel.${panel} .bar-row`).filter({has: page.locator(`[data-detail="${model.id}"]`)});
    assert.equal(await row.locator('a.selection-report-link').getAttribute('href'), metric.selectionReportUrl);
  }

  const campaignUrl = new URL(base);
  campaignUrl.search = '';
  campaignUrl.searchParams.set('models', campaignModelIds.join(','));
  campaignUrl.searchParams.set('q', 'Audio8');
  campaignUrl.searchParams.set('view', 'charts');
  await page.goto(campaignUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '1 result');
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), ['audio8-realistic-0.6b-int4']);
  assert.equal(await page.locator('#charts-view').isVisible(), true);
  assert.equal(await page.locator('#charts .bar-row').count(), expectedGeneration([campaignModels.find(model => model.id === 'audio8-realistic-0.6b-int4')], 'cpu').length + expectedGeneration([campaignModels.find(model => model.id === 'audio8-realistic-0.6b-int4')], 'webgpu').length);
  const scopeNote = await page.locator('#scope-note').innerText();
  for (const model of campaignModels) assert.ok(scopeNote.includes(model.name), `Subset banner should name ${model.id}`);
  await page.locator('#scope-note [data-clear-model-scope]').click();
  const clearedCampaignUrl = new URL(page.url());
  assert.equal(clearedCampaignUrl.searchParams.has('models'), false);
  assert.equal(clearedCampaignUrl.searchParams.get('q'), 'Audio8', 'Clearing the subset preserves search');
  assert.equal(clearedCampaignUrl.searchParams.get('view'), 'charts', 'Clearing the subset preserves the selected view');
  assert.equal(await page.locator('#visible-count').innerText(), '1 result');
  assert.equal(await page.locator('#model-rows tr').count(), 1);

  const repeatedScopeUrl = new URL(base);
  repeatedScopeUrl.search = '';
  campaignModelIds.slice(0, 2).forEach(id => repeatedScopeUrl.searchParams.append('models', id));
  await page.goto(repeatedScopeUrl.href);
  const repeatedModels = resultModels(campaignModels.filter(model => campaignModelIds.slice(0, 2).includes(model.id)));
  await page.waitForFunction(label => document.querySelector('#visible-count')?.textContent === label, resultCountLabel(repeatedModels.length));
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), rankedIds(repeatedModels, model => eligibleWarm(model.warm.cpu) ? model.warm.cpu.medianSeconds : null));

  const unknownScopeUrl = new URL(base);
  unknownScopeUrl.search = '';
  unknownScopeUrl.searchParams.set('models', `${campaignResultModels[0].id},bad-model-id`);
  await page.goto(unknownScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '1 result');
  assert.deepEqual(await page.locator('#model-rows tr').evaluateAll(rows => rows.map(row => row.dataset.model)), [campaignResultModels[0].id], 'Unknown IDs must not expose unrelated configurations');
  assert.ok((await page.locator('#scope-note').innerText()).includes('bad-model-id'));

  const onlyUnknownScopeUrl = new URL(base);
  onlyUnknownScopeUrl.search = '';
  onlyUnknownScopeUrl.searchParams.set('models', 'bad-model-id');
  await page.goto(onlyUnknownScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '0 results');
  assert.equal(await page.locator('#model-rows tr').count(), 0, 'An all-unknown selection must stay empty');
  assert.equal(await page.locator('#no-results h3').innerText(), 'No recognized configurations in this subset.');
  assert.ok((await page.locator('#no-results p').innerText()).includes('bad-model-id'));
  assert.equal(await page.locator('#clear-filters').innerText(), 'Clear subset and filters');
  await page.locator('#clear-filters').click();
  assert.equal(new URL(page.url()).searchParams.has('models'), false, 'The empty-state action clears an all-unknown subset');
  assert.equal(await page.locator('#model-rows tr').count(), expectedResultModels.length, 'Clear subset returns to the full eligible result list');

  const emptyScopeUrl = new URL(base);
  emptyScopeUrl.search = '';
  emptyScopeUrl.searchParams.set('models', '');
  await page.goto(emptyScopeUrl.href);
  await page.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '0 results');
  assert.equal(await page.locator('#model-rows tr').count(), 0, 'An explicitly empty selection must stay empty');
  assert.ok((await page.locator('#no-results p').innerText()).includes('No model IDs were selected'));
  assert.equal(await page.locator('#clear-filters').innerText(), 'Clear subset and filters');
  await page.locator('#clear-filters').click();
  assert.equal(new URL(page.url()).searchParams.has('models'), false, 'The empty-state action clears an empty subset');
  assert.equal(await page.locator('#model-rows tr').count(), expectedResultModels.length);

  assert.equal(await page.locator('audio').count(), 1);
  assert.equal(await page.locator('audio').getAttribute('src'), null, 'Audio must not download on initial load');
  for (const model of expectedResultModels) {
    const row = page.locator(`tr[data-model="${model.id}"]`);
    assert.equal(await row.locator('.license-tag').getAttribute('title'), model.license.model);
    assert.ok((await row.locator('.license-tag').innerText()).trim().length > 0, 'The model license stays visible in the table');
    assert.doesNotMatch(await row.innerText(), /\b(?:Awaiting|Unsupported|Run failed|Retest scheduled)\b/, 'Unavailable states stay in cell details, not the results surface');
    for (const [column, value, eligible] of [[1,model.modelMB,Number.isFinite(model.modelMB)],[3,model.warm.cpu.medianSeconds,eligibleWarm(model.warm.cpu)],[4,model.warm.webgpu.medianSeconds,eligibleWarm(model.warm.webgpu)],[5,model.memory.cpu.meanMB,eligibleMemory(model.memory.cpu)],[6,model.memory.webgpu.meanMB,eligibleMemory(model.memory.webgpu)]]) {
      const cell = row.locator('td').nth(column);
      if (eligible) assert.equal(await cell.locator('.value').innerText(), number(value));
      else if (column >= 3) assert.equal(await cell.locator('.metric-unavailable').innerText(), '—');
    }
  }
  for (const model of expectedResultModels) {
    const row = page.locator(`tr[data-model="${model.id}"]`);
    const waveform = currentWaveformFault(model);
    const scored = ['cpu','webgpu'].some(b => model.warm[b].outputNotes?.scored);
    const warmup = ['cpu','webgpu'].some(b => model.warm[b].outputNotes?.warmup);
    assert.equal(await row.locator('.output-warning').count(), Number(waveform) + Number(scored));
    assert.equal(await row.locator('.output-warmup').count(), Number(warmup));
    if (waveform) {
      await waveformBadge(row).click();
      assert.match(await page.locator('#detail-content').innerText(), /Waveform fault/);
      await page.keyboard.press('Escape');
    }
    if (scored || warmup) {
      const noteButton = scored ? row.getByRole('button', {name:/Check audio/}) : row.locator('.output-warmup');
      await noteButton.click();
      for (const backend of ['cpu','webgpu']) for (const kind of ['scored','warmup']) {
        const note = model.warm[backend].outputNotes?.[kind];
        if (note) assert.ok((await page.locator('#detail-content').innerText()).includes(note.text));
      }
      await page.keyboard.press('Escape');
    }
  }
  await mkdir(review, {recursive:true});
  await page.evaluate(() => {window.scrollTo(0,0);document.activeElement?.blur();});
  await page.screenshot({path:`${review}/desktop.png`,fullPage:true});
  await page.locator('#search').fill('KOKORO');
  assert.equal(await page.locator('#model-rows tr').count(), 1);
  await page.locator('.model-name').click();
  assert.equal(await page.locator('#details').evaluate(d => d.open), true);
  assert.match(await page.locator('#detail-content').innerText(), /Sampled generation peak/);
  assert.ok((await page.locator('#detail-content').innerText()).includes(number(expected.models.find(m=>m.id==='kokoro-82m').memory.webgpu.peakMB)));
  await page.screenshot({path:`${review}/details.png`});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#details').evaluate(d => d.open), false);
  assert.equal(await page.locator('.model-name').evaluate(b => b === document.activeElement), true);
  await page.locator('#search').fill('');
  await selectLanguage(page, 'de');
  await page.waitForFunction(() => document.querySelector('#language-de')?.getAttribute('aria-current') === 'page');
  await page.locator(`#model-rows tr[data-model="${deModel.id}"] [data-play="${deModel.id}"][data-backend="cpu"]`).click();
  await page.waitForFunction(() => {const audio=document.querySelector('#sample-audio');return audio.currentTime > .15 && !audio.paused;});
  const fullLink = page.locator('#player-full');
  assert.equal(await fullLink.isHidden(), true, 'Clip-only playback hides the full WAV link');
  assert.equal(await fullLink.getAttribute('href'), null, 'Clip-only playback removes any previous full WAV URL');
  await page.locator('#player-details').click();
  assert.equal(await page.locator('#details').evaluate(dialog => dialog.open), true);
  assert.equal(await page.locator('.recording-list a').filter({hasText:'Full WAV'}).count(), 0, 'Clip-only detail panel omits the unpublished full WAV link');
  await page.locator('#close-details').click();
  await page.locator('#close-player').click();
  await selectLanguage(page, 'en');
  const englishRelease = expected.models.flatMap(model => ['cpu','webgpu'].map(backend => ({model,backend,sample:model.playbackAudio?.[backend]})))
    .find(entry => entry.sample?.full?.url && !matchesAuditedWav(entry.sample.full.sha256));
  assert.ok(englishRelease, 'A release-backed English sample is available for the reverse playback switch');
  await page.locator(`#model-rows tr[data-model="${englishRelease.model.id}"] [data-play="${englishRelease.model.id}"][data-backend="${englishRelease.backend}"]`).click();
  await page.waitForFunction(() => {const audio=document.querySelector('#sample-audio');return audio.currentTime > .15 && !audio.paused;});
  assert.equal(await fullLink.isVisible(), true, 'Release-backed playback restores the full WAV link');
  assert.equal(await fullLink.getAttribute('href'), englishRelease.sample.full.url, 'Release-backed playback points to the selected receipt asset');
  await page.locator('#close-player').click();
  await page.locator('#search').fill('no model matches this');
  assert.equal(await page.locator('#no-results').isVisible(), true);
  await page.locator('#clear-filters').click();
  await page.locator('#license').selectOption('Apache-2.0');
  assert.equal(await page.locator('#model-rows tr').count(), expectedResultModels.filter(m => m.license.model === 'Apache-2.0').length);
  await page.locator('#reset').click();
  const expectedForCapabilities = filters => expectedResultModels.filter(model => matchesCapabilityFilters(model, filters));
  const capabilityValues = {weight:'all',supports:'all',languages:'all',voices:'all'};
  const filterParams = {'weight-filter':'weight','supported-language':'supports','language-count':'languages','voice-count':'voices'};
  const assertFilterValues = async (selectId, key, values) => {
    for (const value of values) {
      await page.locator('#reset').click();
      await page.locator(`#${selectId}`).selectOption(value);
      capabilityValues[key] = value;
      await assertRows(expectedForCapabilities(capabilityValues));
      const queryValue = new URL(page.url()).searchParams.get(filterParams[selectId]);
      assert.equal(queryValue, value === 'all' ? null : value, `${selectId} selection is shareable in the URL`);
    }
    capabilityValues[key] = 'all';
  };
  const expectedFilterOptions = {
    'weight-filter':['all','le10','10to50','50to200','200to1000','gt1000','unknown'],
    'language-count':['all','one','2to5','6to20','gt20','unknown'],
    'voice-count':['all','one','2to10','11to100','gt100','unknown'],
  };
  for (const [id, values] of Object.entries(expectedFilterOptions)) {
    assert.deepEqual(await page.locator(`#${id} option`).evaluateAll(options => options.map(option => option.value)), values);
    assert.equal(await page.locator(`#${id}`).isVisible(), true, `${id} is visible on desktop`);
    await assertFilterValues(id, filterParams[id], values.slice(1));
  }
  const reportedLanguage = expectedResultModels.flatMap(capabilityCodes)[0];
  assert.ok(reportedLanguage, 'At least one eligible configuration reports a supported language code');
  const supportedLanguageValues = await page.locator('#supported-language option').evaluateAll(options => options.map(option => option.value));
  assert.ok(supportedLanguageValues.includes(reportedLanguage));
  assert.ok(supportedLanguageValues.includes('unlisted'));
  await assertFilterValues('supported-language','supports',[reportedLanguage,'unlisted']);

  // Legacy cohort URLs are ignored so they cannot silently hide eligible rows.
  for (const oldCohort of ['paired','historical','source-cohort-v1']) {
    const legacyCohortUrl = new URL(base);
    legacyCohortUrl.search = '';
    legacyCohortUrl.searchParams.set('cohort', oldCohort);
    await page.goto(legacyCohortUrl.href);
    await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, expectedResultModels.length);
    await assertRows(expectedResultModels);
    assert.equal(new URL(page.url()).searchParams.has('cohort'), false, 'Obsolete cohort query is discarded without hiding results');
  }
  const scopedLegacyCohortUrl = new URL(base);
  scopedLegacyCohortUrl.search = '';
  scopedLegacyCohortUrl.searchParams.set('cohort','paired');
  scopedLegacyCohortUrl.searchParams.set('weight','unknown');
  await page.goto(scopedLegacyCohortUrl.href);
  await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n,
    expectedForCapabilities({...capabilityValues,weight:'unknown'}).length);
  await assertRows(expectedForCapabilities({...capabilityValues,weight:'unknown'}));
  assert.equal(new URL(page.url()).searchParams.has('cohort'), false);
  assert.equal(new URL(page.url()).searchParams.get('weight'),'unknown','Capability filters survive cleanup of an old cohort parameter');
  await page.locator('#reset').click();
  await assertDefaultOrder();
  await page.locator('[data-sort="webgpu"]').click();
  const measuredGpu = expectedGeneration(expectedResultModels, 'webgpu').sort((a,b) => a.warm.webgpu.medianSeconds-b.warm.webgpu.medianSeconds);
  assert.equal(await page.locator('#model-rows tr').first().getAttribute('data-model'), measuredGpu[0].id);
  const unavailableGpu = expectedResultModels.filter(m => !eligibleWarm(m.warm.webgpu)).sort((a,b)=>a.name.localeCompare(b.name));
  if (unavailableGpu.length) assert.equal(await page.locator('#model-rows tr').last().getAttribute('data-model'), unavailableGpu.at(-1).id);
  await page.locator('[data-sort="webgpu"]').click();
  if (unavailableGpu.length) assert.equal(await page.locator('#model-rows tr').last().getAttribute('data-model'), unavailableGpu.at(-1).id, 'Missing scores remain last even descending');
  await page.locator('[data-view="charts"]').click();
  for (const metric of ['generation','memory','size','coverage']) {
    await page.locator(`[data-metric="${metric}"]`).click();
    assert.equal(await page.locator('.chart-panel').count(), metric === 'size' ? 1 : 2);
    const chartCount = metric === 'size' ? expectedResultModels.filter(model => Number.isFinite(model.modelMB)).length
      : metric === 'coverage' ? expectedResultModels.filter(model => capabilityCount(model.support?.languageCount) !== null).length + expectedResultModels.filter(model => capabilityCount(model.support?.voiceCount) !== null).length
      : metric === 'generation' ? expectedGeneration(expectedResultModels, 'cpu').length + expectedGeneration(expectedResultModels, 'webgpu').length
      : expectedMemory(expectedResultModels, 'cpu').length + expectedMemory(expectedResultModels, 'webgpu').length;
    assert.equal(await page.locator('.bar-row').count(), chartCount);
    assert.equal(await page.locator('#charts').evaluate(e => e.innerHTML.includes('NaN')), false);
    await assertChartOrder(expectedResultModels, metric);
  }
  await page.locator('[data-metric="generation"]').click();
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
  assert.equal(await page.locator('.overview').isVisible(), false, 'Duplicate overview counters are hidden on mobile');
  assert.equal(await page.locator('#updated').isVisible(), false, 'The latest-receipt date is hidden on mobile');
  assert.equal(await page.locator('#visible-count').isVisible(), false, 'The unfiltered configuration count is not repeated');
  const mobileTitleLines = await page.locator('h1').evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
  });
  assert.equal(mobileTitleLines, 1, 'The mobile title fits on one line');
  assert.ok((await page.locator('.intro-copy').boundingBox()).height < 22, 'The mobile hardware and workload baseline fits on one line');
  const filterDetails = page.locator('#filter-details');
  assert.equal(await filterDetails.evaluate(details => details.open), false, 'Less-used filters start collapsed on mobile');
  await filterDetails.locator('summary').click();
  assert.equal(await filterDetails.evaluate(details => details.open), true, 'The Filters disclosure opens accessibly');
  mobileFilterWidths = await page.evaluate(() => Object.fromEntries(['weight-filter','supported-language','language-count','voice-count','license'].map(id => {
    const control = document.querySelector('#' + id), field = control.parentElement;
    return [id,{field:Math.round(field.getBoundingClientRect().width),control:Math.round(control.getBoundingClientRect().width)}];
  })));
  for (const [id,size] of Object.entries(mobileFilterWidths)) assert.ok(size.control > 100, `Mobile ${id} stays usable: ${JSON.stringify(size)}`);
  await filterDetails.locator('summary').click();
  await page.locator('#sort-select').selectOption('cpu');
  assert.equal(await page.locator('#model-rows tr').first().getAttribute('data-model'), expectedGeneration(expectedResultModels, 'cpu').sort((a,b)=>a.warm.cpu.medianSeconds-b.warm.cpu.medianSeconds)[0].id);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => {window.scrollTo(0,0);document.activeElement?.blur();});
  const firstAudioCellLocator = page.locator('#model-rows tr').first().locator('td[data-label="Listen · 30s"]');
  const initialFirstAudioCell = await firstAudioCellLocator.boundingBox();
  await firstAudioCellLocator.scrollIntoViewIfNeeded();
  const firstAudioCell = await firstAudioCellLocator.boundingBox();
  assert.ok(firstAudioCell && firstAudioCell.y >= 0 && firstAudioCell.y + firstAudioCell.height <= 844,
    `The first result's listen controls are reachable in the 390px mobile layout: ${JSON.stringify(firstAudioCell)}`);
  assert.equal(await firstAudioCellLocator.locator('[data-play]').first().isVisible(), true);
  const mobileDefaultLayout = {initialAudioCellTop:Math.round(initialFirstAudioCell.y),scrolledAudioCellBottom:Math.round(firstAudioCell.y + firstAudioCell.height),viewportHeight:844};
  await page.screenshot({path:`${review}/mobile.png`,fullPage:true});
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({path:`${review}/mobile-viewport.png`});
  await page.locator('.model-name').first().click();
  assert.equal(await page.locator('#details').evaluate(d => d.scrollWidth <= d.clientWidth), true);
  await page.locator('#close-details').click();
  await page.goto(new URL('?model=piper-en-gb-southern-english-female-low', base).href);
  await page.waitForFunction(() => document.querySelector('#details').open);
  assert.match(await page.locator('#detail-title').innerText(), /Piper/);
  await page.locator('#close-details').click();
  // Shareable family views must preserve the requested filter, chart and units.
  await page.setViewportSize({width:1440,height:1000});
  const family = resultModels(expected.models.filter(model => model.name.toLowerCase().includes('lfm3')));
  assert.ok(family.length >= 4, 'The published LFM3 configurations must remain discoverable');
  await page.goto(new URL('?q=LFM3', base).href);
  await page.waitForFunction(n => document.querySelectorAll('#model-rows tr').length === n, family.length);
  assert.equal(await page.locator('#search').inputValue(), 'LFM3');
  assert.equal(await page.locator('#table-view').isVisible(), true);
  await page.screenshot({path:`${review}/lfm3-table.png`,fullPage:true});
  for (const metric of ['generation','memory','size']) {
    await page.goto(new URL(`?q=LFM3&view=charts&metric=${metric}`, base).href);
    const familyChartCount = metric === 'size' ? family.filter(model => Number.isFinite(model.modelMB)).length : metric === 'generation' ? expectedGeneration(family, 'cpu').length + expectedGeneration(family, 'webgpu').length : expectedMemory(family, 'cpu').length + expectedMemory(family, 'webgpu').length;
    await page.waitForFunction(n => document.querySelectorAll('.bar-row').length === n, familyChartCount);
    assert.equal(await page.locator('[data-view="charts"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator(`[data-metric="${metric}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#charts').evaluate(e => e.innerHTML.includes('NaN')), false);
    await assertChartOrder(family, metric);
    await page.screenshot({path:`${review}/lfm3-${metric}.png`,fullPage:true});
  }

  const syntheticPage = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  try {
    const syntheticData = structuredClone(expected);
    const sourceAudio8 = expected.models.find(model => model.id === 'audio8-realistic-0.6b-int4');
    const archivedAudio8Fault = sourceAudio8.audio.find(entry => matchesAuditedWav(entry.full.sha256));
    const archivedOnly = structuredClone(sourceAudio8);
    archivedOnly.id = 'synthetic-archived-waveform-only';
    archivedOnly.name = 'Synthetic archived waveform only';
    archivedOnly.pairedWarm = false;
    const currentFault = structuredClone(sourceAudio8);
    currentFault.id = 'synthetic-current-metric-waveform';
    currentFault.name = 'Synthetic current metric waveform fault';
    currentFault.pairedWarm = false;
    currentFault.memory.webgpu = {...currentFault.memory.webgpu,waveform:{finding:'Synthetic current result waveform fault',url:'https://github.com/ngelik/tts-bench/tree/main/diagnostics/audio8-waveform',diagnosticSeconds:[12.5]}};
    const currentRecordingFault = structuredClone(sourceAudio8);
    currentRecordingFault.id = 'synthetic-current-recording-waveform';
    currentRecordingFault.name = 'Synthetic current recording waveform fault';
    currentRecordingFault.pairedWarm = false;
    currentRecordingFault.playbackAudio.webgpu = {...structuredClone(archivedAudio8Fault),resultId:currentRecordingFault.memory.webgpu.resultId,matchesSelectedMemory:true};
    const unknownCapabilities = structuredClone(expected.models[0]);
    unknownCapabilities.id = 'synthetic-unknown-capabilities';
    unknownCapabilities.name = 'Synthetic unknown capabilities';
    unknownCapabilities.modelMB = null;
    delete unknownCapabilities.support;
    unknownCapabilities.audio = [];
    unknownCapabilities.playbackAudio = {cpu:null,webgpu:null};
    const synthetic = structuredClone(expected.models[0]);
    synthetic.id = 'synthetic-no-eligible-result';
    synthetic.name = 'Synthetic no-result configuration';
    synthetic.pairedWarm = false;
    synthetic.warm.cpu = {...synthetic.warm.cpu,status:'error',medianSeconds:999,reason:'Synthetic failure'};
    synthetic.warm.webgpu = {...synthetic.warm.webgpu,status:'unsupported',medianSeconds:null,reason:'Synthetic unsupported path'};
    synthetic.memory.cpu = {...synthetic.memory.cpu,status:'measured',meanMB:999,waveform:{finding:'Synthetic diagnostic only',diagnosticSeconds:[],url:'https://github.com/ngelik/tts-bench'}};
    synthetic.memory.webgpu = {...synthetic.memory.webgpu,status:'error',meanMB:null,reason:'Synthetic pending only'};
    synthetic.audio = [];
    synthetic.playbackAudio = {cpu:null,webgpu:null};
    syntheticData.models.push(archivedOnly,currentFault,currentRecordingFault,unknownCapabilities,synthetic);
    await syntheticPage.route('**/assets/data.json*', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(syntheticData)}));
    await syntheticPage.goto(base);
    const syntheticVisibleCount = expectedResultModels.length + 4;
    await syntheticPage.waitForFunction(count => document.querySelectorAll('#model-rows tr').length === count, syntheticVisibleCount);
    assert.equal(await syntheticPage.locator('#model-count').innerText(), String(syntheticVisibleCount), 'A model with only error, unsupported and fault-only data is excluded from result counts');
    assert.equal(await syntheticPage.locator('#model-rows tr[data-model="synthetic-no-eligible-result"]').count(), 0);
    const unknownRow = syntheticPage.locator('tr[data-model="synthetic-unknown-capabilities"]');
    assert.equal(await unknownRow.count(), 1, 'A measured model with unknown capability metadata remains visible');
    assert.match(await unknownRow.locator('.capability-counts').innerText(), /Languages not specified · Voices not specified/);
    assert.equal(await unknownRow.locator('.capability-languages').innerText(), 'Languages not listed');
    for (const [selectId,key,value] of [
      ['weight-filter','weight','unknown'],['language-count','languages','unknown'],
      ['voice-count','voices','unknown'],['supported-language','supports','unlisted'],
    ]) {
      await syntheticPage.locator('#reset').click();
      await syntheticPage.locator(`#${selectId}`).selectOption(value);
      const filters={weight:'all',supports:'all',languages:'all',voices:'all',[key]:value};
      const syntheticVisibleModels=[...expectedResultModels,archivedOnly,currentFault,currentRecordingFault,unknownCapabilities]
        .filter(model=>matchesCapabilityFilters(model,filters));
      assert.deepEqual(await syntheticPage.locator('#model-rows tr').evaluateAll(rows=>rows.map(row=>row.dataset.model)),rankedIds(syntheticVisibleModels,model=>eligibleWarm(model.warm.cpu)?model.warm.cpu.medianSeconds:null),`${selectId} includes the explicitly unspecified model`);
      assert.ok(syntheticVisibleModels.some(model=>model.id==='synthetic-unknown-capabilities'));
    }
    await syntheticPage.locator('#reset').click();
    const archivedOnlyRow = syntheticPage.locator('tr[data-model="synthetic-archived-waveform-only"]');
    assert.equal(await waveformBadge(archivedOnlyRow).count(),0,'A historical fault is not presented as a current output warning');
    assert.equal(await archivedOnlyRow.locator('[data-play][data-backend="webgpu"]').count(),1,'The healthy selected replacement remains playable');
    const currentMetricFaultRow = syntheticPage.locator('tr[data-model="synthetic-current-metric-waveform"]');
    assert.equal(await waveformBadge(currentMetricFaultRow).count(),1,'A current metric waveform finding remains visible independently of clip metadata');
    assert.equal(await currentMetricFaultRow.locator('[data-play][data-backend="webgpu"]').count(),1,'Healthy selected audio remains playable when only a metric carries the fault');
    const currentRecordingFaultRow = syntheticPage.locator('tr[data-model="synthetic-current-recording-waveform"]');
    assert.equal(await waveformBadge(currentRecordingFaultRow).count(),1,'A faulted recording selected by a current metric keeps its visible warning');
    assert.equal(await currentRecordingFaultRow.locator('[data-play][data-backend="webgpu"]').count(),0,'Faulted current playback stays behind diagnostic opt-in');
    await syntheticPage.locator('[data-view="charts"]').click();
    await syntheticPage.locator('[data-metric="size"]').click();
    const syntheticSizeCount = expectedResultModels.filter(model => Number.isFinite(model.modelMB)).length + [archivedOnly,currentFault,currentRecordingFault,unknownCapabilities].filter(model => Number.isFinite(model.modelMB)).length;
    assert.equal(await syntheticPage.locator('#charts .bar-row').count(), syntheticSizeCount, 'A downloaded weight alone does not add a model to size ranking');
    assert.equal(await syntheticPage.locator('#charts [data-detail="synthetic-no-eligible-result"]').count(), 0);
    await syntheticPage.goto(new URL('?models=synthetic-no-eligible-result',base).href);
    await syntheticPage.waitForFunction(() => document.querySelector('#visible-count')?.textContent === '0 results');
    assert.ok((await syntheticPage.locator('#no-results p').innerText()).includes('No eligible published measurements'));
    await syntheticPage.goto(new URL('?model=synthetic-no-eligible-result',base).href);
    await syntheticPage.waitForFunction(() => document.querySelector('#details')?.open);
    assert.equal(await syntheticPage.locator('#detail-title').innerText(), 'Synthetic no-result configuration', 'A direct model link still exposes its evidence details');
  } finally {await syntheticPage.close();}

  const audioUrl = new URL('audio/', base);
  await page.goto(audioUrl.href);
  const selectedPaths = new Set(allLanguageModels.flatMap(model => ['cpu','webgpu'].map(backend => model.playbackAudio[backend]?.clip.path).filter(Boolean)));
  const selectedHealthy = [...selectedPaths].filter(path => !flaggedAudioPaths.has(path));
  const audio8DiagnosticEntry = expectedAudioEntries.find(entry => entry.model === 'audio8-realistic-0.6b-int4' && entry.backend === 'webgpu' && matchesAuditedWav(entry.full.sha256));
  assert.equal(audio8DiagnosticEntry?.clip.path, audio8ArchivedFault.clip.path, 'The old Audio8 fault remains available in the diagnostic recording set');
  assert.ok((await page.locator('#show-all').innerText()).includes(`Show all ${expectedAudioEntries.length} clips`), 'Listening-room total includes every registered language');
  assert.ok((await page.locator('#status').innerText()).includes(`${expectedAudioEntries.length} clips published`), 'Listening-room status total includes all data.byLanguage recordings');
  await page.waitForFunction(count => document.querySelectorAll('#samples .audio-card').length === count, selectedHealthy.length);
  const defaultAudioPaths = await page.locator('#samples .audio-card').evaluateAll(cards => cards.map(card => `audio/samples/${card.dataset.sample}`));
  assert.deepEqual(new Set(defaultAudioPaths), new Set(selectedHealthy), 'The default listening page shows one healthy selected example per configuration/backend');
  const ukAudioEntries = (ukData?.models ?? []).flatMap(model => model.audio);
  const ukSelectedEntries = (ukData?.models ?? []).flatMap(model => ['cpu','webgpu'].map(backend => model.playbackAudio?.[backend]).filter(Boolean));
  const ukSelectedHealthy = ukSelectedEntries.filter(entry => !matchesAuditedWav(entry.full.sha256));
  if (ukAudioEntries.length > 0) {
    assert.ok(ukAudioEntries.some(entry => entry.language === 'uk'), 'The listening room catalog contains actual Ukrainian recordings');
    for (const entry of ukSelectedHealthy) {
      const card = page.locator(`#samples .audio-card[data-sample="${entry.clip.path.split('/').at(-1)}"]`);
      assert.equal(await card.count(), 1, 'Each selected Ukrainian clip is listed in the default listening room');
      assert.ok((await card.locator('.audio-meta').innerText()).includes('Ukrainian'));
    }
    if (ukSelectedHealthy.length) {
      const ukEntry = ukSelectedHealthy[0];
      const ukCard = page.locator(`#samples .audio-card[data-sample="${ukEntry.clip.path.split('/').at(-1)}"]`);
      const ukAudioControl = ukCard.locator('audio');
      await ukAudioControl.evaluate(audio => { audio.muted = true; });
      await ukAudioControl.evaluate(async audio => { await audio.play(); });
      await page.waitForFunction(selector => {const audio=document.querySelector(selector);return audio && audio.currentTime>.15 && !audio.paused && audio.readyState>=2;},
        `#samples .audio-card[data-sample="${ukEntry.clip.path.split('/').at(-1)}"] audio`);
      assert.equal(await ukAudioControl.evaluate(audio => new URL(audio.getAttribute('src'),document.baseURI).pathname), new URL(`../${ukEntry.clip.path}`,audioUrl).pathname);
      await ukAudioControl.evaluate(audio => audio.pause());
    }
  }
  for (const [language, group] of Object.entries(expected.byLanguage ?? {})) {
    if (language === 'uk') continue;
    const displayName = new Intl.DisplayNames(['en'], {type:'language'}).of(language);
    const languageEntries = (group.models ?? []).flatMap(model => model.audio ?? []);
    const healthySelected = (group.models ?? []).flatMap(model => ['cpu','webgpu'].map(backend => model.playbackAudio?.[backend]).filter(Boolean))
      .filter(entry => !matchesAuditedWav(entry.full.sha256));
    if (languageEntries.length) assert.ok(languageEntries.every(entry => entry.language === language), `${displayName} recordings retain their fixture language`);
    for (const entry of healthySelected) {
      const card = page.locator(`#samples .audio-card[data-sample="${entry.clip.path.split('/').at(-1)}"]`);
      assert.equal(await card.count(), 1, `A selected ${displayName} clip is listed in the listening room`);
      assert.ok((await card.locator('.audio-meta').innerText()).includes(displayName), `The ${displayName} clip has a readable language label`);
    }
    if (healthySelected.length) {
      const entry = healthySelected[0];
      const card = page.locator(`#samples .audio-card[data-sample="${entry.clip.path.split('/').at(-1)}"]`);
      const audio = card.locator('audio');
      await audio.evaluate(element => { element.muted = true; });
      await audio.evaluate(async element => { await element.play(); });
      await page.waitForFunction(selector => {
        const element = document.querySelector(selector);
        return element && element.currentTime > .15 && !element.paused && element.readyState >= 2;
      }, `#samples .audio-card[data-sample="${entry.clip.path.split('/').at(-1)}"] audio`);
      assert.equal(await audio.evaluate(element => new URL(element.getAttribute('src'), document.baseURI).pathname),
        new URL(`../${entry.clip.path}`, audioUrl).pathname, `${displayName} listening card loads its registered clip`);
      await audio.evaluate(element => element.pause());
    }
  }
  assert.equal(await page.locator('#samples .diagnostic-note').count(), 0);
  assert.equal(await page.locator('#samples details[open]').count(), 0, 'Attribution and receipt details start collapsed');
  if (audio8DiagnosticEntry) assert.equal(await page.locator(`#samples .audio-card[data-sample="${audio8DiagnosticEntry.clip.path.split('/').at(-1)}"]`).count(), 0, 'The faulted Audio8 GPU recording is excluded from default playback');
  await page.screenshot({path:`${review}/audio-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'The default listening page fits mobile width');
  await page.screenshot({path:`${review}/audio-mobile.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#show-all').click();
  await page.waitForFunction(count => document.querySelectorAll('#samples .audio-card').length === count, expectedAudioEntries.length - flaggedAudioPaths.size);
  await page.locator('#include-diagnostic').check();
  await page.waitForFunction(count => document.querySelectorAll('#samples .audio-card').length === count, expectedAudioEntries.length);
  const allAudioPaths = await page.locator('#samples .audio-card').evaluateAll(cards => cards.map(card => `audio/samples/${card.dataset.sample}`));
  assert.deepEqual(new Set(allAudioPaths), new Set(expectedAudioEntries.map(entry => entry.clip.path)), 'Show all retains old and current fixture edition recordings');
  const activeResultIds = new Set(activeAudioEntries.map(entry => entry.resultId));
  const archivedEntries = expectedAudioEntries.filter(entry => !activeResultIds.has(entry.resultId));
  if (archivedEntries.length) {
    const archived = archivedEntries[0];
    const deepLink = new URL('audio/', base);
    deepLink.searchParams.set('sample', archived.clip.path.split('/').at(-1));
    const archivedPage = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    try {
      await archivedPage.goto(deepLink.href);
      const archivedCard = archivedPage.locator(`#samples .audio-card[data-sample="${archived.clip.path.split('/').at(-1)}"]`);
      await archivedCard.waitFor({state:'visible'});
      assert.equal(await archivedCard.count(), 1, 'An older-edition recording remains directly accessible by its stable clip link');
    } finally { await archivedPage.close(); }
  }
  assert.equal(await page.locator('#samples .diagnostic-note').count(), flaggedAudioPaths.size, 'Waveform-flagged clips are explicit when diagnostic playback is enabled');
  if (audio8DiagnosticEntry) {
    const faultCard = page.locator(`#samples .audio-card[data-sample="${audio8DiagnosticEntry.clip.path.split('/').at(-1)}"]`);
    assert.equal(await faultCard.count(), 1, 'Diagnostic opt-in exposes the Audio8 GPU clip');
    assert.ok((await faultCard.innerText()).includes('Diagnostic clip'));
    const evidence = faultCard.locator('details');
    await evidence.locator('summary').click();
    assert.equal(await evidence.locator(`a[href="${'https://github.com/ngelik/tts-bench/tree/main/diagnostics/audio8-waveform'}"]`).count(), 1);
    assert.equal(await evidence.locator(`a[href="${audio8DiagnosticEntry.reportUrl}"]`).count(), 1, 'The archived clip keeps its run receipt in recording details');
    const audioControl = faultCard.locator('audio');
    await audioControl.evaluate(a => {
      a.muted = true;
      a.addEventListener('error', () => { window.__diagnosticAudioError = {code:a.error?.code ?? null,message:a.error?.message ?? null,src:a.currentSrc}; }, {once:true});
    });
    const diagnosticPlayer = await audioControl.evaluate(a => ({controls:a.controls,preload:a.preload,src:new URL(a.getAttribute('src'),document.baseURI).pathname}));
    assert.equal(diagnosticPlayer.controls, true, 'The opt-in diagnostic clip retains an audio control');
    assert.equal(diagnosticPlayer.preload, 'none');
    assert.ok(diagnosticPlayer.src.endsWith(audio8DiagnosticEntry.clip.path), 'Diagnostic audio resolves to its published local WAV');
    const diagnosticSelector = `.audio-card[data-sample="${audio8DiagnosticEntry.clip.path.split('/').at(-1)}"] audio`;
    await audioControl.click({position:{x:18,y:27}});
    await page.waitForFunction(selector => {
      const player = document.querySelector(selector);
      return player && (player.currentTime > .15 && !player.paused && player.readyState >= 2 || player.error);
    }, diagnosticSelector, {timeout:10000}).catch(async () => {
      const state = await audioControl.evaluate(a => ({currentTime:a.currentTime,paused:a.paused,readyState:a.readyState,networkState:a.networkState,error:a.error?.code ?? null,src:a.currentSrc}));
      throw new Error(`Diagnostic clip did not start after a real audio-control click: ${JSON.stringify(state)}`);
    });
    const playbackState = await audioControl.evaluate(a => ({currentTime:a.currentTime,paused:a.paused,error:a.error?.code ?? null,src:a.currentSrc}));
    assert.ok(playbackState.currentTime > .15 && !playbackState.paused, `Diagnostic clip should remain listenable on explicit click: ${JSON.stringify(playbackState)}`);
    await audioControl.evaluate(a => a.pause());
  }
  const sample = expected.models.find(model => model.audio.length).audio[0];
  const legacy = new URL('audio/', base); legacy.searchParams.set('sample', sample.clip.path.split('/').at(-1));
  await page.goto(legacy.href);
  await page.waitForFunction(() => document.querySelectorAll('#samples .audio-card').length === 1);
  await page.locator('#samples audio').evaluate(async a => {a.muted=true;await a.play();});
  await page.waitForFunction(() => document.querySelector('#samples audio').currentTime > .15);

  const diagnosticsUrl = new URL('diagnostics/', base);
  await page.goto(diagnosticsUrl.href);
  await page.waitForFunction(() => document.querySelectorAll('#groups .input-group').length > 0);
  assert.equal(await page.locator('#groups blockquote').count() > 0, true);
  assert.equal(await page.locator('#groups blockquote').first().isVisible(), false, 'Passage text is available in a collapsed detail');
  assert.equal(await page.locator('#groups .development-details[open]').count(), 0, 'Development probes are hidden by default');
  assert.doesNotMatch(await page.locator('#groups').innerText(), /Untimed/);
  await page.screenshot({path:`${review}/diagnostics-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Short-input diagnostics fit mobile width');
  await page.screenshot({path:`${review}/diagnostics-mobile.png`,fullPage:true});
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failedResponses, []);
  const result = {base,chrome:browser.version(),models:expectedResultModels.length,registeredModels:expected.models.length,eligibleResultModels:expectedResultModels.length,playedClips:clips,filters:true,sorting:true,charts:true,details:true,keyboard:true,mobile:true,mobileFilterWidths,mobileDefaultLayout,legacyDeepLink:true,familyDeepLinks:true,audioSelection:true,audioDiagnostics:true,diagnosticsPage:true,layout:{baseline:baselineLayout,cleaned:{url:base,...candidateLayout},...(baselineLayout ? {firstRowMovedUpBy:baselineLayout.firstResultRowTop-candidateLayout.firstResultRowTop,visibleWordsReducedBy:baselineLayout.visibleWordsBeforeFirstRow-candidateLayout.visibleWordsBeforeFirstRow} : {})},externalRequests:external.length,errors};
  await writeFile(`${review}/verification.json`, JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {await browser?.close(); server?.kill('SIGTERM');}
