import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {SOBBIE_TTS} from '../web/adapters/sobbie-tts-profile.mjs';
import {finished, fit, sentences} from '../web/tiny-voca/sobbie-frontend.mjs';

const repoRoot=fileURLToPath(new URL('..',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));

test('Sobbie checkpoint, browser runtime and frontend pins agree with the asset lock',async()=>{
 const lock=await json(resolve(repoRoot,'assets.lock.json'));
 const model=lock.models['sobbie-tts'];
 assert.equal(model.modelRevision,'6b6132c6d34b5fc163d8f5553580678a60532ac3');
 assert.equal(SOBBIE_TTS.modelRevision,model.modelRevision);
 assert.equal(SOBBIE_TTS.dizioneRevision,'8cd889e4de7be6bd1dd2e6891344a0729fa14dd4');
 assert.equal(SOBBIE_TTS.parameterCount,4537291);
 assert.equal(SOBBIE_TTS.modelAssets['model.onnx'].bytes,21386372);
 assert.equal(SOBBIE_TTS.modelAssets['model.onnx'].sha256,'eafb38b736c17872091c0f05de87814257925a9c3c5aeff168c74afc496d9317');
 const base='models/sobbie-tts/'+model.modelRevision+'/';
 for(const [name,expected] of Object.entries(SOBBIE_TTS.modelAssets)){
  const asset=model.assets.find(entry=>entry.target===base+name);
  assert.ok(asset,name);
  assert.equal(asset.bytes,expected.bytes,name);
  assert.equal(asset.sha256,expected.sha256,name);
 }
 const card=model.assets.find(asset=>asset.target===base+'README.md');
 const demo=model.assets.find(asset=>asset.target===base+'web/README.md');
 assert.equal(card.bytes,4801);
 assert.equal(demo.bytes,391);
 assert.ok(card.url.endsWith('/'+model.modelRevision+'/README.md'));
 assert.ok(demo.url.endsWith('/'+model.modelRevision+'/web/README.md'));
 for(const [name,expected] of Object.entries(SOBBIE_TTS.pyodideFiles)){
  const asset=model.assets.find(entry=>entry.target==='runtimes/pyodide/0.26.4/'+name);
  assert.ok(asset,name);
  assert.equal(asset.bytes,expected.bytes,name);
  assert.equal(asset.sha256,expected.sha256,name);
 }
 assert.equal(SOBBIE_TTS.numpyVersion,'1.26.4');
 assert.equal(SOBBIE_TTS.pyodideVersion,'0.26.4');
 assert.equal(SOBBIE_TTS.runtimeVersion,'1.31.1');
 for(const [name,expected] of Object.entries(SOBBIE_TTS.runtimeFiles)){
  const asset=model.runtime.files.find(entry=>entry.target==='runtimes/onnxruntime-web-pocket/1.31.1/'+name);
  assert.ok(asset,name);
  assert.equal(asset.bytes,expected.bytes,name);
  assert.equal(asset.sha256,expected.sha256,name);
 }
 assert.deepEqual([SOBBIE_TTS.defaultVoice,SOBBIE_TTS.defaultVoiceIndex],['F',0]);
 assert.deepEqual([SOBBIE_TTS.speed,SOBBIE_TTS.pitchShift,SOBBIE_TTS.pitchRange,SOBBIE_TTS.peak],[1,0,1.15,.99]);
});

test('English canonical fixture identity and shared sentence segmentation are preserved',async()=>{
 const registry=await json(resolve(repoRoot,'fixtures/registry.json'));
 const fixture=registry.fixtures.find(item=>item.id==='english-20k-v1');
 assert.ok(fixture);
 assert.equal(fixture.language,'en');
 assert.equal(fixture.sha256,SOBBIE_TTS.fixtureSha256);
 const [article,manifest,metadata]=await Promise.all([
  readFile(resolve(repoRoot,'fixtures',fixture.articleFile),'utf8'),
  json(resolve(repoRoot,'fixtures',fixture.chunksFile)),
  json(resolve(repoRoot,'fixtures',fixture.metadataFile)),
 ]);
 assert.equal(sha(Buffer.from(article,'utf8')),fixture.sha256);
 assert.equal(metadata.sha256,fixture.sha256);
 assert.equal(manifest.chunks.length,93);
 assert.equal(article.length,20000);
 const upstream=await import(pathToFileURL(resolve(repoRoot,'web/tiny-voca/frontend.mjs')).href);
 for(const chunk of manifest.chunks){
  const text=article.slice(chunk.start,chunk.end);
  assert.equal(sha(Buffer.from(text,'utf8')),chunk.sha256);
  const complete=finished(text);
  assert.deepEqual(sentences(complete),upstream.sentences(complete));
 }
});

test('publisher finish and token-fit split order are retained',()=>{
 assert.equal(finished('Warm up'),'Warm up.');
 assert.equal(finished('Hello! '),'Hello! ');
 assert.deepEqual(sentences(finished('Dr. Lane called Mr. Fox. Then he left')),
  ['Dr. Lane called Mr. Fox.','Then he left.']);
 const calls=[];
 const fake=text=>{calls.push(text);const n=text.length;return {ids:Array(n).fill(1),stress:Array(n).fill(0),text};};
 const clauses=fit('A, BB C D',fake,20);
 assert.deepEqual(calls,['A, BB C D','A,','BB C D']);
 assert.equal(clauses.length,2);
 calls.length=0;
 const wordFake=text=>{calls.push(text);const n=text.trim().split(/\s+/u).length;return {ids:Array(n).fill(1),stress:Array(n).fill(0),text};};
 const words=fit('one two three four five six seven eight',wordFake,15);
 assert.equal(words.length,4);
 assert.equal(calls[0],'one two three four five six seven eight');
 assert.deepEqual(fit('extraordinarilylongword',fake,20),[]);
});
