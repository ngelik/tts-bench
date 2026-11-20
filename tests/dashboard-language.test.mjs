import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSupport} from '../lib/model-support.mjs';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional headed Chrome UI test, never a benchmark. The Ukrainian dataset and
// tone below are deliberately synthetic and served only by this local test.
// TTS_BENCH_UI_CHROME=/path/to/chrome TTS_BENCH_UI_DATA=/path/to/data.json
// node --test tests/dashboard-language.test.mjs
const root = fileURLToPath(new URL('..', import.meta.url));
const eligible = model => ['cpu', 'webgpu'].some(backend =>
  model.warm[backend]?.status === 'measured' && !model.warm[backend].waveform);
function tone() {
  const rate = 8000, frames = rate * 2, out = Buffer.alloc(44 + frames * 2);
  out.write('RIFF', 0); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) out.writeInt16LE(Math.round(500 * Math.sin(i * Math.PI / 20)), 44 + i * 2);
  return out;
}
test('language tabs isolate metrics, audio, URL state and empty datasets in headed Chrome', {
  skip: !process.env.TTS_BENCH_UI_CHROME,
  timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.TTS_BENCH_PLAYWRIGHT || 'playwright-core');
  const original = JSON.parse(await readFile(process.env.TTS_BENCH_UI_DATA || resolve(root, '.cache/listening-site/assets/data.json')));
  const en = original.models.filter(model => model.id !== 'matcha-ljspeech' && eligible(model)).slice(0, 3);
  assert.equal(en.length,3,'Test needs three real English result rows');
  const ukrainian = structuredClone(en[0]);
  ukrainian.name = 'Synthetic Ukrainian UI fixture';
  for (const backend of ['cpu', 'webgpu']) {
    const sample = ukrainian.playbackAudio[backend];
    if (sample) { sample.language = 'uk'; sample.voice = 'Synthetic test tone'; sample.clip.path = 'audio/qa-uk.wav'; }
    for (const kind of ['warm', 'memory']) {
      const metric = ukrainian[kind][backend];
      if (metric.status === 'measured') {
        metric.createdAt = '2026-11-20T00:00:00Z';
        if (kind === 'warm') metric.medianSeconds = backend === 'cpu' ? 7.25 : 8.5;
        else metric.meanMB = backend === 'cpu' ? 321.5 : 456.75;
      }
    }
  }
  ukrainian.audio = Object.values(ukrainian.playbackAudio).filter(Boolean);
  let data = {...original, models: en, languages: [{id:'en', label:'English'}, {id:'uk', label:'Українська'}], byLanguage: {uk: {fixture:{characters:12345,language:'uk',articleFile:'uk-article-v1.txt'}, models:[ukrainian]}}};
  const files = new Map([
    ['/', ['dashboard/index.html','text/html']], ['/assets/app.mjs',['dashboard/app.mjs','text/javascript']],
    ['/assets/style.css',['dashboard/style.css','text/css']], ['/audio/waveform-integrity.mjs',['audio/waveform-integrity.mjs','text/javascript']],
  ]);
  const server = http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    try {
      if (path === '/assets/data.json') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); return; }
      if (path === '/audio/qa-uk.wav') { res.setHeader('Content-Type','audio/wav'); res.end(tone()); return; }
      const file = files.get(path);
      if (!file) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type',file[1]); res.end(await readFile(resolve(root,file[0])));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(ok => server.listen(0,'127.0.0.1',ok));
  t.after(() => new Promise(ok => { server.closeAllConnections(); server.close(ok); }));
  const browser = await chromium.launch({executablePath:process.env.TTS_BENCH_UI_CHROME,headless:false});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const review = resolve(process.env.TTS_BENCH_UI_REVIEW || resolve(root,'.cache/dashboard-language-review'));
  await mkdir(review,{recursive:true});
  await page.goto(base);
  await page.waitForFunction(() => document.querySelectorAll('#model-rows tr').length === 3);
  assert.equal(await page.locator('#language-en').getAttribute('aria-selected'),'true');
  await page.screenshot({path:resolve(review,'desktop-english.png'),fullPage:true});
  await page.getByRole('tab',{name:'Українська'}).click();
  assert.equal(new URL(page.url()).searchParams.get('lang'),'uk');
  assert.equal(await page.locator('#model-rows tr').count(),1);
  assert.equal(await page.locator('#fixture-language').innerText(),'12,345 Ukrainian characters');
  assert.equal(await page.locator('#model-count').innerText(),'1');
  assert.equal(await page.locator('#method-fixture').textContent(),'12,345 Ukrainian characters');
  assert.equal(await page.locator('#fixture-link').getAttribute('href'),'https://github.com/ngelik/tts-bench/blob/main/fixtures/uk-article-v1.txt');
  assert.match(await page.locator('#model-rows').innerText(),/Synthetic Ukrainian UI fixture/);
  await page.locator('#model-rows .model-name').click();
  assert.match(await page.locator('#detail-content').innerText(),/Warm generation · 12,345 Ukrainian characters/);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.locator('#close-details').click();
  await page.locator('[data-view=charts]').click();
  assert.equal(await page.locator('#charts .bar-row').count(),['cpu','webgpu'].filter(b=>ukrainian.warm[b].status==='measured'&&!ukrainian.warm[b].waveform).length);
  await page.screenshot({path:resolve(review,'desktop-uk-charts.png'),fullPage:true});
  await page.goBack();
  assert.equal(await page.locator('#language-en').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#model-rows tr').count(),3);
  await page.goForward();
  assert.equal(await page.locator('#language-uk').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-view=charts]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-view=table]').click();
  const play = page.locator('#model-rows [data-play]').first();
  if (await play.count()) {
    await play.click();
    await page.waitForFunction(() => document.querySelector('#sample-audio').readyState >= 2);
    assert.match(await page.locator('#sample-audio').getAttribute('src'),/qa-uk.wav/);
    await page.locator('#language-en').click();
    assert.equal(await page.locator('#player').isVisible(),false);
    assert.equal(await page.locator('#sample-audio').getAttribute('src'),null);
  }
  await page.goto(`${base}?lang=uk&models=${en[0].id}&view=charts&metric=memory`);
  await page.waitForFunction(() => document.querySelector('#language-uk').getAttribute('aria-selected')==='true');
  assert.equal(await page.locator('[data-metric=memory]').getAttribute('aria-pressed'),'true');
  await page.locator('#language-uk').focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#language-en').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#language-en').evaluate(el=>el===document.activeElement),true);
  assert.equal(new URL(page.url()).searchParams.get('models'),en[0].id);
  await page.keyboard.press('End');
  assert.equal(await page.locator('#language-uk').getAttribute('aria-selected'),'true');
  await page.locator('#theme-toggle').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.locator('#language-en').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  await page.screenshot({path:resolve(review,'desktop-alternate-theme.png'),fullPage:true});
  for (const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await page.goto(`${base}?lang=uk`);
    await page.waitForFunction(()=>document.querySelectorAll('#model-rows tr').length===1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}px`);
    await page.screenshot({path:resolve(review,`mobile-uk-${width}.png`),fullPage:true});
  }
  data = {...data, byLanguage:{uk:{models:[]}}};
  await page.goto(`${base}?lang=uk`);
  await page.getByText('No published Ukrainian results yet.',{exact:true}).waitFor();
  assert.equal(await page.locator('#load-error').isVisible(),false);
  assert.equal(await page.locator('#model-rows tr').count(),0);
  assert.equal(await page.locator('#clear-filters').isVisible(),false);
  await page.screenshot({path:resolve(review,'mobile-uk-empty.png'),fullPage:true});
  await page.locator('#language-en').click();
  assert.equal(await page.locator('#model-rows tr').count(),3);
  // Deliberately synthetic support metadata exercises unknowns and exact
  // filter boundaries without changing the real publication input.
  const capabilityModels = structuredClone(en);
  Object.assign(capabilityModels[0], {modelMB:10, support:{...en[0].support,languageCount:2,voiceCount:1,bundledVoiceCount:1,languages:['en','uk']}});
  Object.assign(capabilityModels[1], {modelMB:50, support:{...en[1].support,languageCount:7,voiceCount:11,bundledVoiceCount:1,languages:['en','uk','de','fr','ja','es','pt']}});
  Object.assign(capabilityModels[2], {modelMB:null, support:{...en[2].support,languageCount:null,voiceCount:null,bundledVoiceCount:null,languages:null}});
  capabilityModels.forEach(model=>validateSupport(model.support));
  data = {...data, models:capabilityModels, fixture:{characters:9999}};
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelectorAll('#model-rows tr').length===3);
  assert.equal(await page.locator('#fixture-language').innerText(),'9,999 English characters');
  await page.goto(`${base}?cohort=historical&voices=all`);
  await page.waitForFunction(()=>document.querySelectorAll('#model-rows tr').length===3);
  assert.equal(new URL(page.url()).searchParams.has('cohort'),false);
  assert.equal(new URL(page.url()).searchParams.get('voices'),'all');
  const filterCases = [
    ['weight-filter','le10',1],['weight-filter','10to50',1],['weight-filter','unknown',1],
    ['supported-language','uk',2],['supported-language','unlisted',1],
    ['language-count','2to5',1],['language-count','6to20',1],['language-count','unknown',1],
    ['voice-count','one',1],['voice-count','11to100',1],['voice-count','unknown',1],
  ];
  for (const [id,value,count] of filterCases) {
    await page.locator(`#${id}`).selectOption(value);
    assert.equal(await page.locator('#model-rows tr').count(),count,`${id} ${value}`);
    await page.locator(`#${id}`).selectOption('all');
  }
  await page.locator('#weight-filter').selectOption('le10');
  await page.locator('#supported-language').selectOption('uk');
  await page.locator('#voice-count').selectOption('one');
  assert.equal(await page.locator('#model-rows tr').count(),1);
  await page.locator('#language-count').selectOption('6to20');
  assert.equal(await page.locator('#model-rows tr').count(),0);
  await page.locator('#clear-filters').click();
  assert.equal(await page.locator('#model-rows tr').count(),3);
  await page.locator('#voice-count').selectOption('unknown');
  assert.match(await page.locator('#model-rows').innerText(),/Languages not specified · Voices not specified/);
  await page.locator('#language-uk').click();
  await page.goBack();
  await page.waitForFunction(()=>document.querySelector('#language-en').getAttribute('aria-selected')==='true');
  assert.equal(await page.locator('#voice-count').inputValue(),'unknown');
  await page.goForward();
  assert.equal(await page.locator('#language-uk').getAttribute('aria-selected'),'true');
  await page.goto(`${base}?voices=unknown`);
  await page.waitForFunction(()=>document.querySelector('#voice-count').value==='unknown');
  assert.equal(await page.locator('#model-rows tr').count(),1);
  await page.locator('#reset').click();
  await page.locator('[data-view=charts]').click();
  await page.locator('[data-metric=coverage]').click();
  assert.equal(await page.locator('#charts .bar-row').count(),4,'Unknown totals are omitted, known counts remain');
  assert.equal(await page.getByRole('region',{name:'Supported languages chart'}).getByRole('heading').innerText(),'Supported languages');
  assert.equal(await page.getByRole('region',{name:'Supported voices chart'}).getByRole('heading').innerText(),'Supported voices');
  assert.doesNotMatch(await page.locator('#charts').innerText(),/undefined/);
  assert.equal(await page.locator('#charts .key').count(),0,'Coverage uses a neutral accent, not backend colors');
  assert.equal(await page.locator('#chart-order').innerText(),'Reported support · broadest first');
  for (const label of ['Supported languages chart','Supported voices chart']) {
    const ids = await page.getByRole('region',{name:label}).locator('.bar-row').evaluateAll(nodes=>nodes.map(node=>node.dataset.model));
    assert.deepEqual(ids,[capabilityModels[1].id,capabilityModels[0].id],'Coverage places the larger known total first');
  }
  await page.locator('[data-metric=memory]').click();
  assert.equal(await page.locator('#chart-order').innerText(),'Eligible results · lowest first');
  await page.locator('[data-metric=coverage]').click();
  assert.doesNotMatch(await page.locator('#results').innerText(),/matched|matching pair|historical/i);
  await page.locator('#charts [data-detail]').first().click();
  assert.doesNotMatch(await page.locator('#detail-content').innerText(),/Matched native|Historical|Contains archived/);
  await page.locator('#close-details').click();
  // Verify the full real English dataset remains usable; no synthetic score
  // is ever included in this screenshot or in a generated site asset.
  data = {...original, languages:data.languages, byLanguage:{uk:{models:[]}}};
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#model-count').textContent !== '—');
  const eligibleReal = original.models.filter(model=>['cpu','webgpu'].some(backend=>
    (model.warm[backend]?.status==='measured'&&Number.isFinite(model.warm[backend].medianSeconds)&&!model.warm[backend].waveform)||
    (model.memory[backend]?.status==='measured'&&Number.isFinite(model.memory[backend].meanMB)&&!model.memory[backend].waveform)));
  assert.equal(await page.locator('#model-rows tr').count(),eligibleReal.length);
  await page.locator('#theme-toggle').click();
  assert.ok(await page.locator('#model-rows .license-tag').evaluateAll(nodes=>nodes.every(node=>node.textContent.length<=36&&node.title.length>0)));
  await page.screenshot({path:resolve(review,'desktop-real-english.png')});
  await page.locator('[data-view=charts]').click();
  await page.locator('[data-metric=coverage]').click();
  await page.screenshot({path:resolve(review,'desktop-real-coverage.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-view=table]').click();
  await page.locator('#filter-details summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#filter-details').getAttribute('open'),'');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(review,'mobile-real-filters.png')});
  await page.locator('#weight-filter').selectOption('le10');
  assert.equal(await page.locator('#weight-filter').inputValue(),'le10');
  await page.locator('#reset').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#weight-filter').inputValue(),'all');
  assert.equal(await page.locator('#model-rows tr').count(),eligibleReal.length);
  await page.goto(`${base}?model=${en[0].id}`);
  await page.locator('#details').waitFor({state:'visible'});
  assert.equal(await page.locator('#detail-title').innerText(),en[0].name);
  await page.locator('#close-details').click();
  await page.goto(`${base}?lang=uk&model=${en[0].id}`);
  await page.getByText('No published Ukrainian results yet.',{exact:true}).waitFor();
  assert.equal(await page.locator('#details').isVisible(),false);
  // A newly registered language must work without another frontend release.
  const french = structuredClone(ukrainian); french.name = 'Synthetic French UI fixture';
  for (const sample of Object.values(french.playbackAudio).filter(Boolean)) sample.language = 'fr';
  data = {...original, languages:[{id:'en',label:'English'},{id:'uk',label:'Українська'},{id:'fr',label:'Français'}],
    byLanguage:{uk:{models:[]},fr:{models:[french],fixture:{id:'fr-article-v1',language:'fr',characters:3210,articleFile:'fr-article-v1.txt'}}}};
  await page.goto(`${base}?lang=fr&model=${french.id}&view=charts&metric=coverage`);
  await page.getByRole('tab',{name:'Français'}).waitFor();
  assert.equal(await page.locator('#language-fr').getAttribute('lang'),'fr');
  assert.equal(await page.locator('#language-fr').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#fixture-language').innerText(),'3,210 French characters');
  assert.match(await page.locator('#detail-content').innerText(),/Warm generation · 3,210 French characters/);
  assert.equal(await page.getByRole('link',{name:'Link to this model'}).getAttribute('href'),`/?lang=fr&model=${french.id}&view=charts&metric=coverage`);
  assert.equal(await page.locator('#fixture-link').getAttribute('href'),'https://github.com/ngelik/tts-bench/blob/main/fixtures/fr-article-v1.txt');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.locator('#close-details').click();
  await page.locator('#language-en').click();
  await page.goBack();
  assert.equal(await page.locator('#language-fr').getAttribute('aria-selected'),'true');
  // Back restores the legacy model deep link as well as the language.
  await page.locator('#close-details').click();
  await page.locator('#language-fr').focus(); await page.keyboard.press('Home');
  assert.equal(await page.locator('#language-en').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#language-fr').getAttribute('aria-selected'),'true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for (const articleFile of ['../outside.txt','https://example.com/fixture.txt','fr.txt?download=1']) {
    data.byLanguage.fr.fixture.articleFile = articleFile;
    await page.goto(`${base}?lang=fr`);
    await page.waitForFunction(()=>document.querySelector('#language-fr')?.getAttribute('aria-selected')==='true');
    assert.equal(await page.locator('#fixture-link').getAttribute('href'),null,'Unsafe fixture paths never become links');
  }
  // Missing labels use endonyms, while unknown URL languages safely use English.
  data.languages[2] = {id:'fr'};
  await page.goto(`${base}?lang=fr`); await page.getByRole('tab',{name:'Français'}).waitFor();
  await page.goto(`${base}?lang=de&q=Kokoro`);
  await page.waitForFunction(()=>document.querySelector('#language-en')?.getAttribute('aria-selected')==='true');
  assert.equal(new URL(page.url()).searchParams.has('lang'),false);
  assert.equal(new URL(page.url()).searchParams.get('q'),'Kokoro');
  assert.deepEqual(errors,[]);
});
