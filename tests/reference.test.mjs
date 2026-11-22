import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {referenceBlock,replaceReference,ramReferenceBlock,ramChart,START,END} from '../tools/reference.mjs';import {getAssetLock} from '../lib/catalog.mjs';import {readResult} from '../tools/results.mjs';import {loadCosyWarmSelection} from '../tools/cosy-warm-selection.mjs';
const base=JSON.parse(await readFile(new URL('../results/2026-11-09t07-33-26-519z-piper-en-gb-southern-english-female-low-cpu-warm-810f85a3/result.json',import.meta.url)));
test('reference index includes new models, all runs and explicit failure instead of stale success',()=>{const old=structuredClone(base),latest=structuredClone(base);latest.id='new-attempt';latest.createdAt='2030-01-01T00:00:00Z';latest.cells[0].status='error';latest.cells[0].reason='Device lost';const block=referenceBlock([old,latest],getAssetLock().models);assert.ok(block.includes('[error](results/new-attempt/summary.md)'));assert.ok(block.includes('results/'+old.id+'/summary.md'));assert.ok(block.includes('Southern'));assert.ok(block.includes('102'));assert.match(block,/LFM3-Audio-2B.*Unknown.*Unknown.*18/);});
test('reference refresh changes only its own section and requires a unique anchored range',()=>{const text='# Repo\n\n## Reference results\n\n'+START+'\nold\n'+END+'\n\n## Other\nKeep me';const updated=replaceReference(text,START+'\nnew\n'+END);assert.ok(updated.endsWith('## Other\nKeep me'));assert.ok(updated.includes('\nnew\n'));assert.throws(()=>replaceReference(text.replace('## Reference results','## Elsewhere'),'x'));assert.throws(()=>replaceReference(text+START,'x'));});
test('reference separates different hardware instead of pooling the latest score globally',()=>{const other=structuredClone(base);other.id='different-hardware';other.environment.machineLabel='Other computer';const block=referenceBlock([base,other],getAssetLock().models);assert.ok(block.includes('**E1**'));assert.ok(block.includes('**E2**'));assert.ok(block.includes('results/'+base.id+'/summary.md'));assert.ok(block.includes('results/'+other.id+'/summary.md'));});

test('each README Listen link opens its exact hosted recording while retaining full WAV links',async()=>{
 const {entries}=JSON.parse(await readFile(new URL('../audio/manifest.json',import.meta.url)));
 const block=referenceBlock([base],getAssetLock().models,[],entries);
 const urls=[...block.matchAll(/\[▶ Listen\]\(([^)]+)\)/g)].map(m=>new URL(m[1]));
 assert.equal(urls.length,entries.length);
 entries.forEach((entry,i)=>{assert.equal(urls[i].origin,'https://ngelik.github.io');assert.equal(urls[i].pathname,'/tts-bench/audio/');assert.equal(urls[i].searchParams.get('sample'),entry.clip.path.split('/').at(-1));if(entry.full?.url)assert.ok(block.includes(entry.full.url));else assert.ok(block.includes('Not published'));});
 assert.ok(block.includes('Open the listening room'));
});

test('clip-only README rows retain the receipt-bound clip and omit unpublished full URLs',async()=>{
 const {entries}=JSON.parse(await readFile(new URL('../audio/manifest.json',import.meta.url)));
 const clipOnly=entries.map((entry,index)=>index===0?{...entry,full:{...entry.full,url:null}}:entry);
 const block=referenceBlock([base],getAssetLock().models,[],clipOnly);
 assert.ok(block.includes('Not published'));
 assert.ok(!block.includes('href="null"'));
 assert.ok(!block.includes('[Download / listen](null)'));
 const releaseBacked=clipOnly.find(entry=>entry.full.url);
 assert.ok(releaseBacked && block.includes(releaseBacked.full.url));
});

test('reference section exposes the reviewed CosyVoice3 selection report and its raw error receipt',async()=>{
 const id='2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e';
 const result=await readResult(`results/${id}/result.json`,{publication:true});
 const gpu=await readResult('results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/result.json',{publication:true});
 const selection=await loadCosyWarmSelection([result,gpu]);
 const block=referenceBlock([result,gpu],getAssetLock().models,[],[],[],[selection]);
 assert.match(block,/n=2 of 5 planned; selected/);
 assert.ok(block.includes('[15119.14 s (n=2 of 5 planned; selected)](reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection)'));
 assert.ok(block.includes('[1600.61 s (n=5)](results/2026-11-15t10-50-20-682z-fun-cosyvoice3-0.5b-2512-webgpu-warm-fb791de6/summary.md)'));
 assert.match(block,/native receipt remains error/);
 assert.ok(block.includes(`results/${id}/summary.md`));
 assert.ok(block.includes('docs/campaigns/nov14-english/cosy-cpu-warm-selection.json'));
});

// Presentation-only fixtures; these are never submitted as native measurements.
test('newer translated attempts cannot replace the original English warm row',()=>{
 const uk=structuredClone(base);uk.id='uk-presentation-only';uk.createdAt='2030-01-01T00:00:00Z';
 uk.fixture={id:'uk-article-v1',language:'uk',sha256:'a'.repeat(64),characters:19357,chunks:91};
 uk.cells[0].status='error';uk.cells[0].reason='Translation fixture test';
 const text=referenceBlock([base,uk],getAssetLock().models).split('Each native warm score')[0];
 const [english,ukrainian]=text.split('### Ukrainian (uk)');
 assert.match(english,/### English \(en\) — english-20k-v1/);
 assert.ok(english.includes(`results/${base.id}/summary.md`));assert.ok(!english.includes(uk.id));
 assert.ok(ukrainian.includes('results/uk-presentation-only/summary.md'));
 assert.ok(!ukrainian.includes(`results/${base.id}/summary.md`));
 assert.match(ukrainian,/19357 characters \/ 91 spans/);
});

test('RAM tables and chart files partition actual fixture language and identity',()=>{
 const en=structuredClone(base);en.id='en-memory-presentation';en.origin='native';
 en.protocol={...en.protocol,scenario:'cached',id:'browser-tts-cached-v1-resources',smoke:false,repetitions:1};
 en.cells[0].trials=[{metrics:{generationMeanRssBytes:123e6},memory:{}}];
 const uk=structuredClone(en);uk.id='uk-memory-presentation';uk.createdAt='2030-01-01T00:00:00Z';
 uk.fixture={id:'uk-article-v1',language:'uk',sha256:'a'.repeat(64),characters:19357,chunks:91};
 uk.cells[0].trials[0].metrics.generationMeanRssBytes=456e6;
 const models=getAssetLock().models,table=ramReferenceBlock([en,uk],models);
 assert.ok(table.includes(en.id)&&table.includes(uk.id));assert.match(table,/Ukrainian \(uk\)/);
 assert.ok(table.includes('docs/reference-memory.svg'));assert.ok(table.includes('docs/reference-memory-uk.svg'));
 const english=ramChart([en,uk],models),ukrainian=ramChart([en,uk],models,'uk');
 assert.ok(english.includes('123.00 MB')&&!english.includes('456.00 MB'));
 assert.ok(ukrainian.includes('456.00 MB')&&!ukrainian.includes('123.00 MB'));
 const revised=structuredClone(uk);revised.fixture.sha256='b'.repeat(64);revised.id='uk-revised-presentation';
 assert.equal((ramReferenceBlock([uk,revised],models).match(/\*\*RAM /g)||[]).length,2);
});
