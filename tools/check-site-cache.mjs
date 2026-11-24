// Hosted-Chrome verification for clean and mixed-cache Pages visits.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {readdir,readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright-core';
import {findChrome} from '../lib/runner.mjs';
import {SITE_VERSION_TOKEN,siteVersion} from '../lib/site-cache.mjs';
import {matchesAuditedWav} from '../audio/waveform-integrity.mjs';

const root=resolve('.cache/listening-site');
const expected=JSON.parse(await readFile(resolve(root,'assets/data.json'),'utf8'));
const languageGroups=[{id:'en',group:expected},...Object.entries(expected.byLanguage??{}).map(([id,group])=>({id,group}))];
const eligibleIds=group=>group.models.filter(model=>['cpu','webgpu'].some(backend=>
  (model.warm?.[backend]?.status==='measured'&&Number.isFinite(model.warm[backend].medianSeconds)&&!model.warm[backend].waveform)||
  (model.memory?.[backend]?.status==='measured'&&Number.isFinite(model.memory[backend].meanMB)&&!model.memory[backend].waveform))).map(model=>model.id).sort();
const displayedAudioEntries=languageGroups.flatMap(({group})=>group.models.flatMap(model=>model.audio??[]));
const audioEntries=expected.recordings??displayedAudioEntries;
const activeResultIds=new Set(displayedAudioEntries.map(entry=>entry.resultId));
const archivedAudioEntries=audioEntries.filter(entry=>!activeResultIds.has(entry.resultId));
const selectedAudioEntries=[...new Map(languageGroups.flatMap(({group})=>group.models.flatMap(model=>['cpu','webgpu']
  .map(backend=>model.playbackAudio?.[backend]).filter(Boolean).map(entry=>[entry.clip.path,entry])))).values()];
const diagnosticAudioPaths=new Set(audioEntries.filter(entry=>matchesAuditedWav(entry.full.sha256)).map(entry=>entry.clip.path));
const selectedHealthyAudioCount=selectedAudioEntries.filter(entry=>!diagnosticAudioPaths.has(entry.clip.path)).length;
const audioPaths=audioEntries.map(entry=>entry.clip.path);
assert.equal(new Set(audioPaths).size,audioPaths.length,'Published recording paths are unique across all benchmark languages');
for (const {id,group} of languageGroups) {
  for (const model of group.models) for (const entry of model.audio??[]) {
    assert.equal(entry.language,id,`${id} recording ${entry.resultId} is attributed to its benchmark language`);
  }
}
const expectedAudioByLanguage=Object.fromEntries(languageGroups.map(({id,group})=>[id,group.models.reduce((sum,model)=>sum+(model.audio?.length??0),0)]));
const hasEligibleResult=model=>['cpu','webgpu'].some(backend=>
  (model.warm?.[backend]?.status==='measured'&&Number.isFinite(model.warm[backend].medianSeconds)&&!model.warm[backend].waveform)||
  (model.memory?.[backend]?.status==='measured'&&Number.isFinite(model.memory[backend].meanMB)&&!model.memory[backend].waveform));
const expectedIds=eligibleIds(expected);
assert.ok(expectedIds.length>0,'The built Pages data contains eligible published rows');
assert.equal(new Set(expectedIds).size,expectedIds.length,'The built Pages data has unique eligible model IDs');
for (const {id,group} of languageGroups) {
  assert.ok(Array.isArray(group.models),`The ${id} language data has a model list`);
  const ids=eligibleIds(group);
  assert.equal(new Set(ids).size,ids.length,`The ${id} language data has unique eligible model IDs`);
  if (id!=='en') assert.equal(typeof group.fixture?.id,'string',`${id} fixture identity is present`);
}
for (const language of expected.languages??[]) {
  if (language.id==='en') continue;
  assert.ok(languageGroups.some(({id})=>id===language.id),`Registered language ${language.id} has matching byLanguage data`);
}

async function filesBelow(directory,relative='') {
  const files=[];
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const path=relative ? `${relative}/${entry.name}` : entry.name;
    const full=resolve(directory,entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(full,path));
    else if (entry.isFile()) files.push({path,full});
  }
  return files.sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

async function sha256File(path) {
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

const htmlFiles={
  dashboard:await readFile(resolve(root,'index.html'),'utf8'),
  audio:await readFile(resolve(root,'audio/index.html'),'utf8'),
  diagnostics:await readFile(resolve(root,'diagnostics/index.html'),'utf8'),
};
const versionMatch=htmlFiles.dashboard.match(/assets\/app\.mjs\?v=([a-f0-9]{64})/);
assert.ok(versionMatch,'Dashboard entry HTML must reference its versioned app module');
const version=versionMatch[1];
for (const [page,html] of Object.entries(htmlFiles)) {
  assert.equal(html.includes(SITE_VERSION_TOKEN),false,`${page} HTML contains no unresolved cache token`);
  const localAssetUrls=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match=>match[1])
    .filter(url=>/\.(?:mjs|css)(?:\?|$)/.test(url));
  assert.ok(localAssetUrls.length,`${page} page has local JS/CSS assets`);
  for (const url of localAssetUrls) {
    assert.equal(new URL(url,'https://local.invalid/').searchParams.get('v'),version,`${page} asset ${url} shares the build identity`);
  }
}
for (const path of ['assets/app.mjs','assets/coverage.mjs','audio/player.mjs','assets/diagnostics.mjs']) {
  const source=await readFile(resolve(root,path),'utf8');
  assert.equal(source.includes(SITE_VERSION_TOKEN),false,`${path} contains no unresolved cache token`);
}
const stampedFiles=await filesBelow(root);
const identityEntries=[];
for (const file of stampedFiles) {
  if (file.path.toLowerCase().endsWith('.wav')) continue;
  let sha256;
  if (/\.(?:html|mjs|css)$/i.test(file.path)) {
    const text=(await readFile(file.full,'utf8')).replaceAll(version,SITE_VERSION_TOKEN);
    sha256=createHash('sha256').update(text).digest('hex');
  } else sha256=await sha256File(file.full);
  identityEntries.push({path:file.path,sha256});
}
assert.equal(siteVersion(identityEntries),version,'The query identity matches all staged non-WAV assets and receipt-bound manifests');

const staleData=JSON.stringify({schemaVersion:1,models:Array.from({length:13},(_,index)=>({id:`old-en-${index}`})),
  languages:[{id:'en',label:'English'},{id:'uk',label:'Ukrainian'}],
  byLanguage:{uk:{schemaVersion:1,models:Array.from({length:2},(_,index)=>({id:`old-uk-${index}`})),fixture:{id:'old-uk-fixture',language:'uk',characters:19980,chunks:92}}}});
const staleObservations=JSON.stringify({inputs:{},models:{},observations:[]});
const legacyApp="import '../audio/waveform-integrity.mjs'; import './coverage.mjs'; document.querySelector('#recording-count').textContent='cached legacy app'; document.body.dataset.legacyApp='loaded';";
const legacyPlayer="import './waveform-integrity.mjs'; import './links.mjs'; document.body.dataset.legacyPlayer='loaded';";
const legacyDiagnostics="document.querySelector('#recording-count').textContent='cached legacy diagnostics'; document.body.dataset.legacyDiagnostics='loaded';";
const seedHtml=`<!doctype html><html><head>
<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/diagnostics.css"><link rel="stylesheet" href="/audio/player.css">
<script type="module" src="/assets/app.mjs"></script><script type="module" src="/audio/player.mjs"></script><script type="module" src="/assets/diagnostics.mjs"></script>
</head><body><span id="recording-count">—</span><script>
Promise.all([fetch('/assets/data.json').then(r=>r.json()),fetch('/diagnostics/2026-11-multilingual/observations.json').then(r=>r.json())]).then(([data,observations])=>{document.body.dataset.legacyEnglishModels=String(data.models.length);document.body.dataset.legacyUkModels=String(data.byLanguage?.uk?.models?.length??0);document.body.dataset.legacyLanguageTotal=String(data.models.length+(data.byLanguage?.uk?.models?.length??0));document.body.dataset.legacyObservations=String(Object.keys(observations.inputs).length)});
</script></body></html>`;

const requestLog=[];
let phase='startup';
function reply(res,status,body,type,headers={}) {
  const bytes=Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status,{'content-type':type,'content-length':bytes.length,...headers});
  res.end(bytes);
}
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1');
    requestLog.push({phase,path:url.pathname,search:url.search,method:req.method});
    if (url.pathname==='/favicon.ico') return reply(res,204,'','image/x-icon');
    if (url.pathname==='/__cache_seed__/') return reply(res,200,seedHtml,'text/html; charset=utf-8',{'cache-control':'no-store'});
    const unversioned=!url.searchParams.has('v');
    if (unversioned && url.pathname==='/assets/app.mjs') return reply(res,200,legacyApp,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && url.pathname==='/audio/player.mjs') return reply(res,200,legacyPlayer,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && url.pathname==='/assets/diagnostics.mjs') return reply(res,200,legacyDiagnostics,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && ['/assets/style.css','/assets/diagnostics.css','/audio/player.css'].includes(url.pathname)) {
      const body='body{background-color:rgb(255,0,255)!important}';
      return reply(res,200,body,'text/css; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    }
    if (unversioned && ['/assets/coverage.mjs','/audio/links.mjs','/audio/waveform-integrity.mjs'].includes(url.pathname)) {
      return reply(res,200,'export const legacyCachedModule=true;','text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    }
    if (unversioned && url.pathname==='/assets/data.json') return reply(res,200,staleData,'application/json; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && url.pathname==='/diagnostics/2026-11-multilingual/observations.json') return reply(res,200,staleObservations,'application/json; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});

    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (relative.split('/').includes('..')) return reply(res,404,'Not found','text/plain');
    let file=resolve(root,relative);
    if (!file.startsWith(root+sep) && file!==resolve(root,'index.html')) return reply(res,404,'Not found','text/plain');
    let fileStat=await stat(file).catch(()=>null);
    if (fileStat?.isDirectory()) {file=resolve(file,'index.html');fileStat=await stat(file).catch(()=>null);}
    if (!fileStat?.isFile()) return reply(res,404,'Not found','text/plain');
    const extension=file.slice(file.lastIndexOf('.')).toLowerCase();
    const headers={
      'content-type':mime[extension] ?? 'application/octet-stream',
      'cache-control':url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'accept-ranges':extension==='.wav' ? 'bytes' : 'none',
    };
    if (extension==='.wav' && req.headers.range) {
      const match=String(req.headers.range).match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start=match[1] ? Number(match[1]) : 0;
        const end=match[2] ? Math.min(Number(match[2]),fileStat.size-1) : fileStat.size-1;
        if (start<=end && start<fileStat.size) {
          res.writeHead(206,{...headers,'content-length':end-start+1,'content-range':`bytes ${start}-${end}/${fileStat.size}`});
          return createReadStream(file,{start,end}).pipe(res);
        }
      }
      return reply(res,416,'Invalid range','text/plain',{'content-range':`bytes */${fileStat.size}`});
    }
    res.writeHead(200,{...headers,'content-length':fileStat.size});
    if (req.method==='HEAD') return res.end();
    createReadStream(file).pipe(res);
  } catch (error) {
    reply(res,500,String(error),'text/plain');
  }
});

let browser,base;
const baseReports={deploymentId:version,sourceModelsByLanguage:Object.fromEntries(languageGroups.map(({id,group})=>[id,group.models.length])),
  expectedVisibleRowsByLanguage:Object.fromEntries(languageGroups.map(({id,group})=>[id,eligibleIds(group).length])),
  audioEntriesByLanguage:expectedAudioByLanguage,displayedAudioEntries:displayedAudioEntries.length,
  archivedAudioEntries:archivedAudioEntries.length,expectedAudioEntries:audioEntries.length,expectedVisibleRows:expectedIds.length};
const errors=[];
const publicArg=process.argv.indexOf('--public-url');
const publicUrl=publicArg>=0 ? process.argv[publicArg+1] : null;
if (publicArg>=0 && !publicUrl) throw new Error('--public-url requires a URL');
const report={...baseReports};

function isVersioned(url,origin,expectedPath) {
  return new URL(url).origin===origin && new URL(url).pathname.endsWith(expectedPath) && new URL(url).searchParams.get('v')===version;
}
async function assertResources(page,expectedPaths) {
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));
  const origin=new URL(page.url()).origin;
  for (const path of expectedPaths) {
    const found=resources.filter(url=>new URL(url).origin===origin && new URL(url).pathname.endsWith(path));
    assert.ok(found.length,`Browser requested ${path}`);
    assert.ok(found.every(url=>isVersioned(url,origin,path)),`${path} uses only the current build identity: ${found.join(', ')}`);
  }
  return resources.filter(url=>expectedPaths.some(path=>new URL(url).pathname.endsWith(path)));
}
async function verifyPlayback(page) {
  const control=page.locator('#model-rows [data-play]').first();
  assert.equal(await control.count(),1,'Dashboard exposes a published sample control');
  await page.locator('#sample-audio').evaluate(audio=>{audio.muted=true;});
  await control.click();
  await page.waitForFunction(()=>{const audio=document.querySelector('#sample-audio');return audio.currentTime>.15&&!audio.paused&&audio.readyState>=2;},null,{timeout:15000});
  const playback=await page.locator('#sample-audio').evaluate(audio=>({currentTime:audio.currentTime,src:audio.currentSrc,paused:audio.paused}));
  assert.ok(playback.src,`Dashboard playback has a media URL`);
  assert.match(new URL(playback.src).pathname,/\/audio\/samples\/[^/]+\.wav$/,'Immutable recording stays at its stable public path');
  assert.equal(new URL(playback.src).searchParams.has('v'),false,'Immutable recordings can reuse the existing browser cache');
  await page.locator('#close-player').click();
  return playback;
}
async function openLanguagePicker(page,label) {
  const picker=page.locator('#language-picker');
  assert.equal(await picker.isVisible(),false,`${label} language picker starts hidden when closed`);
  await page.locator('#language-picker-trigger').click();
  assert.equal(await picker.isVisible(),true,`${label} language picker is visible after opening`);
}
async function selectLanguage(page,id,label) {
  const picker=page.locator('#language-picker');
  if (!await picker.isVisible()) await openLanguagePicker(page,label);
  const link=page.locator(`#language-${id}`);
  assert.equal(await link.isVisible(),true,`${label} ${id} link is visible in the picker`);
  await link.click();
  assert.equal(await picker.isVisible(),false,`${label} language picker is hidden after selecting ${id}`);
}
async function verifyLanguageRows(page,label) {
  const rows=[];
  for (const {id,group} of languageGroups) {
    const ids=eligibleIds(group);
    const tab=page.locator(`#language-${id}`);
    await openLanguagePicker(page,label);
    assert.equal(await tab.count(),1,`${label} visit exposes the registered ${id} picker link`);
    const countLabel=ids.length ? `${ids.length} ${ids.length===1?'model':'models'}` : 'Awaiting results';
    assert.equal(await tab.locator('.language-option-count').textContent(),countLabel,`${label} picker count matches ${id} eligible rows`);
    if (id==='en') {
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#language-picker').isVisible(),false,`${label} language picker hides after Escape`);
    } else await selectLanguage(page,id,label);
    await page.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count,ids.length,{timeout:20000});
    assert.equal(await tab.getAttribute('aria-current'),'page',`${label} ${id} locale link is current`);
    assert.equal(await page.locator('#model-count').innerText(),String(ids.length),`${label} model count reflects ${id} results`);
    const scoreCount=group.models.reduce((sum,model)=>sum+['cpu','webgpu'].filter(backend=>model.warm?.[backend]?.status==='measured'&&Number.isFinite(model.warm[backend].medianSeconds)&&!model.warm[backend].waveform).length,0);
    assert.equal(await page.locator('#score-count').innerText(),String(scoreCount),`${label} score count reflects ${id} warm results`);
    const visibleIds=(await page.locator('#model-rows tr').evaluateAll(items=>items.map(row=>row.dataset.model))).sort();
    assert.deepEqual(visibleIds,ids,`${label} language picker selects the correct ${id} result models`);
    if (group.fixture?.characters) {
      const languageName=new Intl.DisplayNames(['en'],{type:'language'}).of(id);
      assert.equal(await page.locator('#fixture-language').innerText(),`${group.fixture.characters.toLocaleString('en-US')} ${languageName} characters`,`${label} fixture descriptor matches ${id}`);
    }
    const selectedHealthySample=group.models.some(model=>ids.includes(model.id)&&['cpu','webgpu'].some(backend=>{
      const sample=model.playbackAudio?.[backend];
      return sample&&!matchesAuditedWav(sample.full?.sha256);
    }));
    let playback=null;
    if (id!=='en') {
      const controls=page.locator('#model-rows [data-play]');
      if (selectedHealthySample) {
        assert.ok(await controls.count()>0,`${label} ${id} exposes playback for a healthy selected sample`);
        playback=await verifyPlayback(page);
      } else assert.equal(await controls.count(),0,`${label} ${id} has no inline playback without a healthy selected sample`);
    }
    if (id!=='en'&&!ids.length) assert.equal(await page.locator('#no-results').isVisible(),true,`${label} empty ${id} results show the empty-language state`);
    rows.push({language:id,rows:ids.length,playback});
  }
  if (languageGroups.some(({id})=>id!=='en')) await selectLanguage(page,'en',label);
  await page.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count,expectedIds.length,{timeout:20000});
  return rows;
}
async function verifyOverview(page,label) {
  const boards=page.locator('#charts .edition-section');
  await boards.first().waitFor();
  assert.equal(await page.locator('#current-language').innerText(),'All languages');
  assert.equal(await page.locator('[data-view=charts]').getAttribute('aria-pressed'),'true');
  const inventory=await boards.evaluateAll(sections=>sections.map(section=>({
    edition:section.dataset.edition,
    cpu:[...section.querySelectorAll('.chart-panel.cpu .bar-row')].map(row=>row.dataset.model).sort(),
    webgpu:[...section.querySelectorAll('.chart-panel.gpu .bar-row')].map(row=>row.dataset.model).sort(),
  })));
  for(const {id,group} of languageGroups) {
    const board=inventory.find(row=>row.edition===id);
    assert.ok(board,`${label} includes ${id}`);
    for(const backend of ['cpu','webgpu']) {
      const ids=group.models.filter(model=>{
        const score=model.warm[backend];
        return score?.status==='measured' && Number.isFinite(score.medianSeconds) && !score.waveform;
      }).map(model=>model.id).sort();
      assert.deepEqual(board[backend],ids,`${label} ${id} ${backend} overview measurements`);
    }
  }
  await selectLanguage(page,'en',label);
  await page.locator('[data-view=table]').click();
}
async function verifyDashboard(page,label) {
  await page.goto(base);
  await verifyOverview(page,label);
  await page.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count || !document.querySelector('#load-error')?.hidden,expectedIds.length,{timeout:20000});
  const actualIds=(await page.locator('#model-rows tr').evaluateAll(rows=>rows.map(row=>row.dataset.model))).sort();
  assert.deepEqual(actualIds,expectedIds,`${label} visitor loaded the eligible published model IDs`);
  const rowCount=actualIds.length;
  assert.equal(await page.locator('#load-error').isVisible(),false,`${label} visitor has no dashboard load error`);
  const resources=await assertResources(page,['/assets/app.mjs','/assets/coverage.mjs','/assets/style.css','/assets/data.json','/audio/waveform-integrity.mjs']);
  const languageRows=await verifyLanguageRows(page,label);
  const playback=await verifyPlayback(page);
  return {rows:rowCount,resources,playback,languages:languageRows};
}
async function verifySecondaryPages(page,label) {
  await page.goto(new URL('audio/',base).href);
  await page.waitForFunction(count=>document.querySelectorAll('#samples .audio-card').length===count,selectedHealthyAudioCount,{timeout:15000});
  const audioCards=await page.locator('#samples .audio-card').count();
  assert.equal(audioCards,selectedHealthyAudioCount,`${label} selected recording list includes healthy selections across languages`);
  const audioUrls=await page.locator('#samples .audio-card audio').evaluateAll(nodes=>nodes.map(node=>node.src));
  assert.ok(audioUrls.length,`${label} listening page exposes recordings`);
  for (const url of audioUrls) {
    assert.match(new URL(url).pathname,/\/audio\/samples\/[^/]+\.wav$/,'Listening page keeps immutable recordings at stable paths');
    assert.equal(new URL(url).searchParams.has('v'),false,'Listening page can reuse the immutable recording cache');
  }
  const publishedCountLabel=`${audioEntries.length} clips published`;
  assert.ok((await page.locator('#show-all').innerText()).includes(`Show all ${audioEntries.length} clips`),`${label} all-clips total includes data.byLanguage recordings`);
  assert.ok((await page.locator('#status').innerText()).includes(publishedCountLabel),`${label} status total includes every language`);
  await page.locator('#show-all').click();
  await page.waitForFunction(count=>document.querySelectorAll('#samples .audio-card').length===count,audioEntries.length-diagnosticAudioPaths.size,{timeout:15000});
  if (diagnosticAudioPaths.size) await page.locator('#include-diagnostic').check();
  await page.waitForFunction(count=>document.querySelectorAll('#samples .audio-card').length===count,audioEntries.length,{timeout:15000});
  const allShownPaths=await page.locator('#samples .audio-card').evaluateAll(cards=>cards.map(card=>`audio/samples/${card.dataset.sample}`));
  assert.deepEqual(new Set(allShownPaths),new Set(audioPaths),`${label} all-language listening list reads every displayed and archived catalog recording`);
  if (archivedAudioEntries.length) {
    const archived=archivedAudioEntries[0];
    const deepLink=new URL('audio/',base);
    deepLink.searchParams.set('sample',archived.clip.path.split('/').at(-1));
    const archivePage=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    try {
      await archivePage.goto(deepLink.href);
      const archivedCard=archivePage.locator(`#samples .audio-card[data-sample="${archived.clip.path.split('/').at(-1)}"]`);
      await archivedCard.waitFor({state:'visible'});
      assert.equal(await archivedCard.count(),1,`${label} old-edition recording deep link remains available`);
    } finally {await archivePage.close();}
  }
  const audioResources=await assertResources(page,['/audio/player.mjs','/audio/catalog.mjs','/audio/player.css','/audio/links.mjs','/audio/waveform-integrity.mjs','/assets/data.json']);
  await page.goto(new URL('diagnostics/',base).href);
  await page.waitForFunction(()=>document.querySelectorAll('#groups .input-group').length>0,{timeout:15000});
  const diagnosticGroups=await page.locator('#groups .input-group').count();
  const observationsUrl=await page.locator('a[href*="observations.json"]').first().getAttribute('href');
  assert.ok(observationsUrl,'Diagnostics provides its observations JSON link');
  assert.equal(new URL(observationsUrl,page.url()).searchParams.get('v'),version,'Diagnostics link uses the page build identity');
  const receiptUrls=await page.locator('#groups .diagnostic-players a, #groups a.audio-attribution').evaluateAll(nodes=>nodes.map(node=>node.href));
  assert.ok(receiptUrls.length,'Diagnostics exposes receipt or recording-attribution links');
  for (const url of receiptUrls) assert.equal(new URL(url).searchParams.get('v'),version,'Generated diagnostics evidence links use the page build identity');
  const diagnosticAudioUrls=await page.locator('#groups .diagnostic-players audio').evaluateAll(nodes=>nodes.map(node=>node.src));
  assert.ok(diagnosticAudioUrls.length,'Diagnostics exposes its immutable recordings');
  for (const url of diagnosticAudioUrls) {
    assert.match(new URL(url).pathname,/\/diagnostics\/2026-11-multilingual\/audio\/[^/]+\.wav$/,'Diagnostics keeps immutable recordings at stable paths');
    assert.equal(new URL(url).searchParams.has('v'),false,'Diagnostics can reuse the immutable recording cache');
  }
  const diagnosticResources=await assertResources(page,['/assets/diagnostics.mjs','/assets/diagnostics.css','/diagnostics/2026-11-multilingual/observations.json']);
  return {label,audioCards,audioResources,diagnosticGroups,diagnosticResources,receiptLinks:receiptUrls.length,diagnosticRecordings:diagnosticAudioUrls.length};
}

try {
  await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
  const address=server.address();
  base=`http://127.0.0.1:${address.port}/`;
  browser=await chromium.launch({executablePath:await findChrome(),headless:false});

  const cleanContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const cleanPage=await cleanContext.newPage();
  cleanPage.on('pageerror',error=>errors.push(`clean: ${error}`));
  cleanPage.on('console',message=>{if(message.type()==='error')errors.push(`clean: ${message.text()} (${JSON.stringify(message.location())})`);});
  phase='clean-dashboard';
  const cleanDashboard=await verifyDashboard(cleanPage,'Clean');
  const cleanBackground=await cleanPage.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  const staleBackground='rgb(255, 0, 255)';
  assert.notEqual(cleanBackground,staleBackground,'The clean visit uses a non-stale page background');
  phase='clean-secondary';
  const cleanSecondary=await verifySecondaryPages(cleanPage,'clean');
  await cleanContext.close();

  const mixedContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const mixedPage=await mixedContext.newPage();
  const mixedErrors=[];
  mixedPage.on('pageerror',error=>mixedErrors.push(String(error)));
  mixedPage.on('console',message=>{if(message.type()==='error')mixedErrors.push(message.text());});
  phase='legacy-cache-seed';
  await mixedPage.goto(new URL('__cache_seed__/',base).href);
  await mixedPage.waitForFunction(()=>document.body.dataset.legacyApp==='loaded'&&document.body.dataset.legacyPlayer==='loaded'&&document.body.dataset.legacyDiagnostics==='loaded'&&document.body.dataset.legacyEnglishModels==='13'&&document.body.dataset.legacyUkModels==='2'&&document.body.dataset.legacyLanguageTotal==='15'&&document.body.dataset.legacyObservations==='0');
  assert.equal(await mixedPage.evaluate(()=>getComputedStyle(document.body).backgroundColor),staleBackground,'Seed visit cached the stale stylesheet');
  assert.equal(await mixedPage.evaluate(()=>document.body.dataset.legacyLanguageTotal),'15','The legacy seed records both English and Ukrainian model groups');
  const seeded=requestLog.filter(entry=>entry.phase==='legacy-cache-seed');
  for (const path of ['/assets/app.mjs','/assets/coverage.mjs','/assets/style.css','/assets/data.json','/audio/player.mjs','/audio/player.css','/audio/links.mjs','/audio/waveform-integrity.mjs','/assets/diagnostics.mjs','/assets/diagnostics.css','/diagnostics/2026-11-multilingual/observations.json']) {
    assert.ok(seeded.some(entry=>entry.path===path&&!entry.search),`Mixed-cache seed fetched legacy ${path}`);
  }
  mixedErrors.length=0;
  phase='mixed-dashboard';
  const mixedDashboard=await verifyDashboard(mixedPage,'Mixed-cache');
  const mixedBackground=await mixedPage.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  assert.equal(mixedBackground,cleanBackground,'The mixed-cache visit has the same computed background as the clean reference');
  assert.notEqual(mixedBackground,staleBackground,'The mixed-cache visit does not reuse the stale magenta stylesheet');
  phase='mixed-secondary';
  const mixedSecondary=await verifySecondaryPages(mixedPage,'mixed-cache');
  assert.deepEqual(mixedErrors,[],'Mixed-cache pages have no stale-module runtime errors');
  await mixedContext.close();

  report.local={base,chrome:browser.version(),background:{clean:cleanBackground,mixedCache:mixedBackground,stale:staleBackground},
    clean:{dashboard:cleanDashboard,secondary:cleanSecondary},mixedCache:{seededLegacyResources:seeded.length,legacyModelCounts:{en:13,uk:2,total:15},dashboard:mixedDashboard,secondary:mixedSecondary},errors};

  if (publicUrl) {
    const publicContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const publicPage=await publicContext.newPage();
    const publicErrors=[];
    const publicAssetResponses=[];
    const publicAssetPaths=['/assets/app.mjs','/assets/coverage.mjs','/assets/style.css','/assets/data.json','/audio/waveform-integrity.mjs'];
    publicPage.on('pageerror',error=>publicErrors.push(String(error)));
    publicPage.on('console',message=>{if(message.type()==='error')publicErrors.push(message.text());});
    publicPage.on('response',response=>{
      const path=new URL(response.url()).pathname;
      if (!publicAssetPaths.some(assetPath=>path.endsWith(assetPath))) return;
      publicAssetResponses.push(response.body().then(body=>({url:response.url(),status:response.status(),bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})).catch(error=>({url:response.url(),status:response.status(),error:String(error)})));
    });
    const freshUrl=new URL(publicUrl);
    try {
      phase='public-fresh';
      assert.equal(freshUrl.search,'','Live verification uses the exact canonical public URL');
      await publicPage.goto(freshUrl.href,{waitUntil:'domcontentloaded'});
      await verifyOverview(publicPage,'Public');
      await publicPage.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count||!document.querySelector('#load-error')?.hidden,expectedIds.length,{timeout:20000});
      const publicIds=(await publicPage.locator('#model-rows tr').evaluateAll(rows=>rows.map(row=>row.dataset.model))).sort();
      const rows=publicIds.length;
      assert.equal(new Set(publicIds).size,publicIds.length,'Public result IDs are unique');
      assert.deepEqual(publicIds,expectedIds,'Fresh hosted Chrome shows the same eligible model IDs as this build');
      assert.equal(await publicPage.locator('#load-error').isVisible(),false);
      const languages=await verifyLanguageRows(publicPage,'Public');
      const playback=await verifyPlayback(publicPage);
      assert.deepEqual(publicErrors,[],'Fresh public visit has no browser runtime errors');
      const assets=await Promise.all(publicAssetResponses);
      for (const assetPath of publicAssetPaths) {
        const match=assets.find(asset=>new URL(asset.url).pathname.endsWith(assetPath));
        assert.ok(match,`Fresh public visit fetched ${assetPath}`);
        assert.equal(match.status,200,`Fresh public ${assetPath} response is successful`);
        assert.ok(match.bytes>0&&/^[a-f0-9]{64}$/.test(match.sha256),`Fresh public ${assetPath} body was captured and hashed`);
      }
      report.public={url:freshUrl.href,rows,modelIds:publicIds,languages,playback,assets,errors:publicErrors};
    } catch (error) {
      report.public={url:freshUrl.href,rows:await publicPage.locator('#model-rows tr').count().catch(()=>null),loadError:await publicPage.locator('#load-error').isVisible().catch(()=>null),assets:await Promise.all(publicAssetResponses),errors:publicErrors,error:String(error)};
      throw error;
    } finally {await publicContext.close();}
  }

  await mkdir('.cache/site-cache-review',{recursive:true});
  await writeFile('.cache/site-cache-review/verification.json',JSON.stringify(report,null,2)+'\n');
  console.log('SITE_CACHE_REVIEW '+JSON.stringify(report));
} catch (error) {
  report.failure=String(error);
  await mkdir('.cache/site-cache-review',{recursive:true});
  await writeFile('.cache/site-cache-review/verification.json',JSON.stringify(report,null,2)+'\n').catch(()=>{});
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolveClose=>server.close(resolveClose));
}
