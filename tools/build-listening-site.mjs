import {cp,mkdir,rm,writeFile,readdir,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {buildDashboardData} from './dashboard-data.mjs';
import {SITE_VERSION_TOKEN,siteVersion,stampSiteVersion} from '../lib/site-cache.mjs';

async function filesBelow(directory,relative='') {
  const files=[];
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const child=relative ? `${relative}/${entry.name}` : entry.name;
    const full=resolve(directory,entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(full,child));
    else if (entry.isFile()) files.push({relative:child,full});
  }
  return files.sort((a,b)=>a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0);
}

async function sha256File(file) {
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

const data=await buildDashboardData();
const clips=new Set(data.models.flatMap(model=>model.audio.map(entry=>entry.clip.path)));
const out=resolve('.cache/listening-site');
// This dedicated generated directory never contains model assets or raw runs.
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const files=['audio/index.html','audio/player.mjs','audio/player.css','audio/links.mjs','audio/waveform-integrity.mjs','audio/manifest.json',...clips];
for(const file of files){const target=resolve(out,file);await mkdir(dirname(target),{recursive:true});await cp(file,target,{errorOnExist:true,force:false});}
await writeFile(resolve(out,'.nojekyll'),'');
await mkdir(resolve(out,'assets'),{recursive:true});
await cp('dashboard/index.html',resolve(out,'index.html'));
await mkdir(resolve(out,'diagnostics/2026-11-multilingual'),{recursive:true});
await cp('dashboard/diagnostics.html',resolve(out,'diagnostics/index.html'));
await cp('diagnostics/2026-11-multilingual/observations.json',resolve(out,'diagnostics/2026-11-multilingual/observations.json'));
for(const file of ['style.css','app.mjs','diagnostics.mjs','diagnostics.css'])await cp('dashboard/'+file,resolve(out,'assets',file));
await import('../diagnostics/2026-11-multilingual/stage-audio.mjs');
await import('./stage-erogol-listening.mjs');
await writeFile(resolve(out,'assets/data.json'),JSON.stringify(data)+'\n');
const outputFiles=await filesBelow(out);
const identityFiles=[];
for (const file of outputFiles) {
  // The generated JSON/manifest files bind each immutable WAV by SHA-256; avoid
  // rereading the much larger audio payloads just to derive the cache identity.
  if (file.relative.toLowerCase().endsWith('.wav')) continue;
  identityFiles.push({path:file.relative,sha256:await sha256File(file.full)});
}
const version=siteVersion(identityFiles);
for (const file of outputFiles) {
  if (!/\.(?:html|mjs|css)$/i.test(file.relative)) continue;
  const current=await readFile(file.full,'utf8');
  const next=stampSiteVersion(current,version);
  if (next.includes(SITE_VERSION_TOKEN)) throw new Error(`Unstamped site version token in ${file.relative}`);
  if (next!==current) await writeFile(file.full,next);
}
console.log(`Built benchmark dashboard: ${data.models.length} models, ${clips.size} verified recordings, deployment ${version} in .cache/listening-site`);
