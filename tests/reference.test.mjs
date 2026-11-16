import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {referenceBlock,replaceReference,START,END} from '../tools/reference.mjs';import {getAssetLock} from '../lib/catalog.mjs';import {readResult} from '../tools/results.mjs';import {loadCosyWarmSelection} from '../tools/cosy-warm-selection.mjs';
const base=JSON.parse(await readFile(new URL('../results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/result.json',import.meta.url)));
test('reference index includes new models, all runs and explicit failure instead of stale success',()=>{const old=structuredClone(base),latest=structuredClone(base);latest.id='new-attempt';latest.createdAt='2030-01-01T00:00:00Z';latest.cells[0].status='error';latest.cells[0].reason='Device lost';const block=referenceBlock([old,latest],getAssetLock().models);assert.ok(block.includes('[error](results/new-attempt/summary.md)'));assert.ok(block.includes('results/'+old.id+'/summary.md'));assert.ok(block.includes('Southern'));assert.ok(block.includes('102'));assert.match(block,/LFM3-Audio-2B.*Unknown.*Unknown.*18/);});
test('reference refresh changes only its own section and requires a unique anchored range',()=>{const text='# Repo\n\n## Reference results\n\n'+START+'\nold\n'+END+'\n\n## Other\nKeep me';const updated=replaceReference(text,START+'\nnew\n'+END);assert.ok(updated.endsWith('## Other\nKeep me'));assert.ok(updated.includes('\nnew\n'));assert.throws(()=>replaceReference(text.replace('## Reference results','## Elsewhere'),'x'));assert.throws(()=>replaceReference(text+START,'x'));});
test('reference separates different hardware instead of pooling the latest score globally',()=>{const other=structuredClone(base);other.id='different-hardware';other.environment.machineLabel='Other computer';const block=referenceBlock([base,other],getAssetLock().models);assert.ok(block.includes('**E1**'));assert.ok(block.includes('**E2**'));assert.ok(block.includes('results/'+base.id+'/summary.md'));assert.ok(block.includes('results/'+other.id+'/summary.md'));});

test('each README Listen link opens its exact hosted recording while retaining full WAV links',async()=>{
 const {entries}=JSON.parse(await readFile(new URL('../audio/manifest.json',import.meta.url)));
 const block=referenceBlock([base],getAssetLock().models,[],entries);
 const urls=[...block.matchAll(/\[▶ Listen\]\(([^)]+)\)/g)].map(m=>new URL(m[1]));
 assert.equal(urls.length,entries.length);
 entries.forEach((entry,i)=>{assert.equal(urls[i].origin,'https://ngelik.github.io');assert.equal(urls[i].pathname,'/tts-bench/audio/');assert.equal(urls[i].searchParams.get('sample'),entry.clip.path.split('/').at(-1));assert.ok(block.includes(entry.full.url));});
 assert.ok(block.includes('Open the listening room'));
});

test('reference section exposes the reviewed CosyVoice3 selection and links the raw error receipt',async()=>{
 const id='2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e';
 const result=await readResult(`results/${id}/result.json`,{publication:true});
 const cached=await readResult('results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/result.json',{publication:true});
 const selection=await loadCosyWarmSelection([result,cached]);
 const block=referenceBlock([result],getAssetLock().models,[],[],[],[selection]);
 assert.match(block,/n=2 of 5 planned; selected/);
 assert.match(block,/native receipt remains error/);
 assert.ok(block.includes(`results/${id}/summary.md`));
 assert.ok(block.includes('docs/campaigns/nov14-english/cosy-cpu-warm-selection.json'));
 assert.match(block,new RegExp(`${id}.*warm.*error`));
});
