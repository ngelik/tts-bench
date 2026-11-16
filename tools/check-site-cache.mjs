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

const root=resolve('.cache/listening-site');
const expected=JSON.parse(await readFile(resolve(root,'assets/data.json'),'utf8'));
const hasEligibleResult=model=>['cpu','webgpu'].some(backend=>
  (model.warm?.[backend]?.status==='measured'&&Number.isFinite(model.warm[backend].medianSeconds)&&!model.warm[backend].waveform)||
  (model.memory?.[backend]?.status==='measured'&&Number.isFinite(model.memory[backend].meanMB)&&!model.memory[backend].waveform));
const expectedIds=expected.models.filter(hasEligibleResult).map(model=>model.id).sort();
assert.ok(expectedIds.length>0,'The built Pages data contains eligible published rows');
assert.equal(new Set(expectedIds).size,expectedIds.length,'The built Pages data has unique eligible model IDs');

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
for (const [path,checks] of [
  ['assets/app.mjs',['waveform-integrity.mjs','assets/data.json']],
  ['audio/player.mjs',['waveform-integrity.mjs','links.mjs','assets/data.json']],
  ['assets/diagnostics.mjs',['observations.json']],
]) {
  const source=await readFile(resolve(root,path),'utf8');
  assert.equal(source.includes(SITE_VERSION_TOKEN),false,`${path} contains no unresolved cache token`);
  for (const name of checks) {
    const needle=`${name}?v=${version}`;
    assert.ok(source.includes(needle),`${path} versions ${name} with the page build identity`);
  }
}
assert.ok((await readFile(resolve(root,'assets/diagnostics.mjs'),'utf8')).includes(`audio.json?v=${version}`),'Diagnostics versions its recording attribution data');
assert.ok((await readFile(resolve(root,'assets/diagnostics.mjs'),'utf8')).includes(`.json?v=' + siteVersion`),'Diagnostics versions local receipt data');
assert.ok((await readFile(resolve(root,'assets/app.mjs'),'utf8')).includes('new URL(sample.clip.path, document.baseURI)'),'Dashboard keeps immutable recordings on stable paths');
assert.ok((await readFile(resolve(root,'audio/player.mjs'),'utf8')).includes('audio.src = `../${entry.clip.path}`'),'Audio page keeps immutable recordings on stable paths');
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

const staleData=JSON.stringify({schemaVersion:1,models:Array.from({length:13},(_,index)=>({id:`old-${index}`}))});
const staleObservations=JSON.stringify({inputs:{},models:{},observations:[]});
const legacyApp="import '../audio/waveform-integrity.mjs'; document.querySelector('#recording-count').textContent='cached legacy app'; document.body.dataset.legacyApp='loaded';";
const legacyPlayer="import './waveform-integrity.mjs'; import './links.mjs'; document.body.dataset.legacyPlayer='loaded';";
const legacyDiagnostics="document.querySelector('#recording-count').textContent='cached legacy diagnostics'; document.body.dataset.legacyDiagnostics='loaded';";
const seedHtml=`<!doctype html><html><head>
<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/diagnostics.css"><link rel="stylesheet" href="/audio/player.css">
<script type="module" src="/assets/app.mjs"></script><script type="module" src="/audio/player.mjs"></script><script type="module" src="/assets/diagnostics.mjs"></script>
</head><body><span id="recording-count">—</span><script>
Promise.all([fetch('/assets/data.json').then(r=>r.json()),fetch('/diagnostics/2026-11-multilingual/observations.json').then(r=>r.json())]).then(([data,observations])=>{document.body.dataset.legacyModels=String(data.models.length);document.body.dataset.legacyObservations=String(Object.keys(observations.inputs).length)});
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
    if (url.pathname==='/__cache_seed__/') return reply(res,200,seedHtml,'text/html; charset=utf-8',{'cache-control':'no-store'});
    const unversioned=!url.searchParams.has('v');
    if (unversioned && url.pathname==='/assets/app.mjs') return reply(res,200,legacyApp,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && url.pathname==='/audio/player.mjs') return reply(res,200,legacyPlayer,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && url.pathname==='/assets/diagnostics.mjs') return reply(res,200,legacyDiagnostics,'text/javascript; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    if (unversioned && ['/assets/style.css','/assets/diagnostics.css','/audio/player.css'].includes(url.pathname)) {
      const body='body{background-color:rgb(255,0,255)!important}';
      return reply(res,200,body,'text/css; charset=utf-8',{'cache-control':'public, max-age=86400, immutable'});
    }
    if (unversioned && ['/audio/links.mjs','/audio/waveform-integrity.mjs'].includes(url.pathname)) {
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
const baseReports={deploymentId:version,sourceModels:expected.models.length,expectedVisibleRows:expectedIds.length};
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
async function verifyDashboard(page,label) {
  await page.goto(base);
  await page.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count || !document.querySelector('#load-error')?.hidden,expectedIds.length,{timeout:20000});
  const actualIds=(await page.locator('#model-rows tr').evaluateAll(rows=>rows.map(row=>row.dataset.model))).sort();
  assert.deepEqual(actualIds,expectedIds,`${label} visitor loaded the eligible published model IDs`);
  const rowCount=actualIds.length;
  assert.equal(await page.locator('#load-error').isVisible(),false,`${label} visitor has no dashboard load error`);
  const resources=await assertResources(page,['/assets/app.mjs','/assets/style.css','/assets/data.json','/audio/waveform-integrity.mjs']);
  const playback=await verifyPlayback(page);
  return {rows:rowCount,resources,playback};
}
async function verifySecondaryPages(page,label) {
  await page.goto(new URL('audio/',base).href);
  await page.waitForFunction(()=>document.querySelectorAll('#samples .audio-card').length>0,{timeout:15000});
  const audioCards=await page.locator('#samples .audio-card').count();
  const audioResources=await assertResources(page,['/audio/player.mjs','/audio/player.css','/audio/links.mjs','/audio/waveform-integrity.mjs','/assets/data.json']);
  await page.goto(new URL('diagnostics/',base).href);
  await page.waitForFunction(()=>document.querySelectorAll('#groups .input-group').length>0,{timeout:15000});
  const diagnosticGroups=await page.locator('#groups .input-group').count();
  const diagnosticResources=await assertResources(page,['/assets/diagnostics.mjs','/assets/diagnostics.css','/diagnostics/2026-11-multilingual/observations.json']);
  return {label,audioCards,audioResources,diagnosticGroups,diagnosticResources};
}

try {
  await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
  const address=server.address();
  base=`http://127.0.0.1:${address.port}/`;
  browser=await chromium.launch({executablePath:await findChrome(),headless:false});

  const cleanContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const cleanPage=await cleanContext.newPage();
  cleanPage.on('pageerror',error=>errors.push(`clean: ${error}`));
  cleanPage.on('console',message=>{if(message.type()==='error')errors.push(`clean: ${message.text()}`);});
  phase='clean-dashboard';
  const cleanDashboard=await verifyDashboard(cleanPage,'Clean');
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
  await mixedPage.waitForFunction(()=>document.body.dataset.legacyApp==='loaded'&&document.body.dataset.legacyPlayer==='loaded'&&document.body.dataset.legacyDiagnostics==='loaded'&&document.body.dataset.legacyModels==='13'&&document.body.dataset.legacyObservations==='0');
  assert.equal(await mixedPage.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 0, 255)','Seed visit cached the stale stylesheet');
  const seeded=requestLog.filter(entry=>entry.phase==='legacy-cache-seed');
  for (const path of ['/assets/app.mjs','/assets/style.css','/assets/data.json','/audio/player.mjs','/audio/player.css','/audio/links.mjs','/audio/waveform-integrity.mjs','/assets/diagnostics.mjs','/assets/diagnostics.css','/diagnostics/2026-11-multilingual/observations.json']) {
    assert.ok(seeded.some(entry=>entry.path===path&&!entry.search),`Mixed-cache seed fetched legacy ${path}`);
  }
  mixedErrors.length=0;
  phase='mixed-dashboard';
  const mixedDashboard=await verifyDashboard(mixedPage,'Mixed-cache');
  assert.equal(await mixedPage.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(246, 245, 241)','The dashboard does not reuse the legacy stylesheet');
  phase='mixed-secondary';
  const mixedSecondary=await verifySecondaryPages(mixedPage,'mixed-cache');
  assert.deepEqual(mixedErrors,[],'Mixed-cache pages have no stale-module runtime errors');
  await mixedContext.close();

  report.local={base,chrome:browser.version(),clean:{dashboard:cleanDashboard,secondary:cleanSecondary},mixedCache:{seededLegacyResources:seeded.length,dashboard:mixedDashboard,secondary:mixedSecondary},errors};

  if (publicUrl) {
    const publicContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const publicPage=await publicContext.newPage();
    const publicErrors=[];
    const publicAssetResponses=[];
    publicPage.on('pageerror',error=>publicErrors.push(String(error)));
    publicPage.on('console',message=>{if(message.type()==='error')publicErrors.push(message.text());});
    publicPage.on('response',response=>{
      const path=new URL(response.url()).pathname;
      if (!['/assets/app.mjs','/assets/style.css','/assets/data.json','/audio/waveform-integrity.mjs'].includes(path)) return;
      publicAssetResponses.push(response.body().then(body=>({url:response.url(),status:response.status(),bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})).catch(error=>({url:response.url(),status:response.status(),error:String(error)})));
    });
    const freshUrl=new URL(publicUrl);
    try {
      phase='public-fresh';
      assert.equal(freshUrl.search,'','Live verification uses the exact canonical public URL');
      await publicPage.goto(freshUrl.href,{waitUntil:'domcontentloaded'});
      await publicPage.waitForFunction(count=>document.querySelectorAll('#model-rows tr').length===count||!document.querySelector('#load-error')?.hidden,expectedIds.length,{timeout:20000});
      const publicIds=(await publicPage.locator('#model-rows tr').evaluateAll(rows=>rows.map(row=>row.dataset.model))).sort();
      const rows=publicIds.length;
      assert.equal(new Set(publicIds).size,publicIds.length,'Public result IDs are unique');
      assert.deepEqual(publicIds,expectedIds,'Fresh hosted Chrome shows the same eligible model IDs as this build');
      assert.equal(await publicPage.locator('#load-error').isVisible(),false);
      const playback=await verifyPlayback(publicPage);
      assert.deepEqual(publicErrors,[],'Fresh public visit has no browser runtime errors');
      report.public={url:freshUrl.href,rows,modelIds:publicIds,playback,assets:await Promise.all(publicAssetResponses),errors:publicErrors};
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
