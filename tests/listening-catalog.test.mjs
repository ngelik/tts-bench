import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listeningCatalog} from '../audio/catalog.mjs';
import {siteVersion} from '../lib/site-cache.mjs';

const manifest = JSON.parse(await readFile(new URL('../audio/manifest.json',import.meta.url),'utf8'));
const older = manifest.entries[0];
const newer = manifest.entries.find(entry=>entry.model===older.model && entry.backend===older.backend && entry.clip.path!==older.clip.path);
assert.ok(newer,'Regression uses two genuine published recordings of the same model/backend');
const selected = {...newer,matchesSelectedMemory:true};
const activeModel = {id:newer.model,name:'Current displayed model',audio:[selected],playbackAudio:{[newer.backend]:selected}};
const current = {models:[activeModel],byLanguage:{},recordings:[older,newer]};

test('all published clip identities survive retirement from the active result group',()=>{
  const index=listeningCatalog(current);
  assert.deepEqual(index.entries.map(entry=>entry.clip.path),[older.clip.path,newer.clip.path]);
  assert.deepEqual(index.entries[0],older,'Archived recording bytes, hashes and provenance are untouched');
  assert.deepEqual(index.selectedEntries,[selected],'Only current displayed playback remains a default');
  const deepLink=older.clip.path.split('/').at(-1);
  assert.deepEqual(index.entries.find(entry=>entry.clip.path.split('/').at(-1)===deepLink),older);
  assert.equal(index.entries.find(entry=>entry.clip.path===newer.clip.path).matchesSelectedMemory,true);
});

test('retired-only model remains filterable but does not become a default example',()=>{
  const index=listeningCatalog({models:[],byLanguage:{uk:{models:[]}},recordings:[{...older,name:'Original archived model'}]});
  assert.deepEqual(index.models,[{id:older.model,name:'Original archived model'}]);
  assert.equal(index.entries.length,1);assert.equal(index.selectedEntries.length,0);
});

test('duplicate active language rows do not duplicate recordings and old data still loads',()=>{
  const index=listeningCatalog({models:[activeModel],byLanguage:{uk:{models:[activeModel]}}});
  assert.deepEqual(index.entries,[selected]);assert.deepEqual(index.selectedEntries,[selected]);
});

test('unsafe paths, conflicting identity and orphan selected entries fail closed',()=>{
  assert.throws(()=>listeningCatalog({...current,recordings:[{...older,clip:{...older.clip,path:'audio/../private.wav'}}]}),/Invalid published clip path/);
  assert.throws(()=>listeningCatalog({...current,recordings:[{...newer,clip:{...newer.clip,sha256:'0'.repeat(64)}}]}),/Conflicting recording identity/);
  assert.throws(()=>listeningCatalog({models:[{...activeModel,audio:[]}]}),/Selected recording missing/);
});

test('archive additions participate in the deployment cache identity without rehashing WAV payloads',()=>{
  const version=data=>siteVersion([{path:'assets/data.json',sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex')}]);
  assert.notEqual(version(current),version({...current,recordings:[newer]}));
});
