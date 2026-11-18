import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('installed packages and repository-built runtime bytes match every pin without downloading weights',async()=>{
 const lock=JSON.parse(await readFile(join(root,'assets.lock.json'))), checked=new Set();
 for(const model of Object.values(lock.models))for(const file of model.runtime.files){
  if(file.generated){
   assert.ok(file.generated.artifactPath,`${file.target} has a generated artifact path`);
   assert.match(file.generated.build,/tools\/build-sano-kokopop-webgpu\.sh/,`${file.target} documents its generation provenance`);
   checked.add('generated/'+file.target+'/'+file.sha256);
   continue;
  }
  if(file.sourcePath){
   const source=resolve(root,file.sourcePath),bytes=await readFile(source);
   assert.equal(bytes.length,file.bytes,`${file.sourcePath} byte length`);
   assert.equal(sha(bytes),file.sha256,`${file.sourcePath} content hash`);
   checked.add('source/'+file.sourcePath+'/'+file.sha256);
   continue;
  }
  const pkg=file.package??model.runtime.package, version=file.version??model.runtime.version;
  const meta=JSON.parse(await readFile(join(root,'node_modules',pkg,'package.json')));
  assert.equal(meta.version,version,`${pkg} changed; update and validate model/runtime pins explicitly`);
  if(file.url)continue;
  const key=pkg+'/'+file.path+'/'+file.sha256;if(checked.has(key))continue;checked.add(key);
  const bytes=await readFile(join(root,'node_modules',pkg,file.path));
  assert.equal(bytes.length,file.bytes,key+' byte length');assert.equal(sha(bytes),file.sha256,key+' content hash');
 }
 assert.ok(checked.size>0);
});

test('fresh asset import reads URL-backed runtime notices from the provided asset tree',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tts-asset-import-'));
 try{
  await mkdir(join(dir,'lib'));await mkdir(join(dir,'node_modules/mock-runtime'),{recursive:true});
  await copyFile(join(root,'lib/assets.mjs'),join(dir,'lib/assets.mjs'));
  await copyFile(join(root,'lib/catalog.mjs'),join(dir,'lib/catalog.mjs'));
  await copyFile(join(root,'lib/model-support.mjs'),join(dir,'lib/model-support.mjs'));
  await writeFile(join(dir,'node_modules/mock-runtime/package.json'),JSON.stringify({name:'mock-runtime',version:'1.0.0'}));
  const bytes=Buffer.from('Pinned runtime license fixture\n');
  const file={path:'LICENSE',target:'licenses/mock-runtime/LICENSE',bytes:bytes.length,sha256:sha(bytes),url:'https://example.invalid/LICENSE'};
  const model={displayName:'Import test',modelRevision:'a'.repeat(40),backends:['cpu'],support:{voiceCount:null,bundledVoiceCount:null,languageCount:null,languages:null,scope:'Test fixture',sources:['https://example.invalid/model'],notes:'Unknown test support'},license:{requiresAcceptance:false},runtime:{package:'mock-runtime',version:'1.0.0',files:[file]},assets:[]};
  await writeFile(join(dir,'assets.lock.json'),JSON.stringify({schemaVersion:1,models:{mock:model}}));
  const source=join(dir,'asset-tree');await mkdir(join(source,'licenses/mock-runtime'),{recursive:true});
  await writeFile(join(source,file.target),bytes);
  const {prepareAssets}=await import(pathToFileURL(join(dir,'lib/assets.mjs')).href);
  const receipts=await prepareAssets('mock',{mode:'import',source});
  assert.equal(receipts.length,1);assert.equal(receipts[0].sha256,file.sha256);
  assert.deepEqual(await readFile(join(dir,'.cache/public',file.target)),bytes);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('generated assets import from pinned build artifact paths and verify without public URLs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tts-generated-asset-import-'));
 try{
  await mkdir(join(dir,'lib'));await mkdir(join(dir,'artifact/licenses'),{recursive:true});
  await copyFile(join(root,'lib/assets.mjs'),join(dir,'lib/assets.mjs'));
  await copyFile(join(root,'lib/catalog.mjs'),join(dir,'lib/catalog.mjs'));
  await copyFile(join(root,'lib/model-support.mjs'),join(dir,'lib/model-support.mjs'));
  const runtimeBytes=Buffer.from('generated wasm fixture');
  const modelBytes=Buffer.from('generated model fixture');
  const build='Pinned build: tools/build fixture at exact source revision.';
  const generated=(artifactPath,bytes)=>({artifactPath,build,bytes:bytes.length,sha256:sha(bytes)});
  const runtimeFile={path:'runtime.wasm',target:'runtimes/generated-v1/runtime.wasm',kind:'runtime',...generated('runtime.wasm',runtimeBytes)};
  const modelAsset={id:'generated-weight',target:'models/generated/model.bin',kind:'model-weights',...generated('model.bin',modelBytes)};
  const model={displayName:'Generated import test',modelRevision:'a'.repeat(40),backends:['cpu'],support:{voiceCount:null,bundledVoiceCount:null,languageCount:null,languages:null,scope:'Test fixture',sources:['https://example.invalid/model'],notes:'Unknown test support'},license:{requiresAcceptance:false},runtime:{package:'generated-runtime',version:'v1',files:[runtimeFile]},assets:[modelAsset]};
  await writeFile(join(dir,'assets.lock.json'),JSON.stringify({schemaVersion:1,models:{mock:model}}));
  const source=join(dir,'artifact');
  await writeFile(join(source,'runtime.wasm'),runtimeBytes);
  await writeFile(join(source,'model.bin'),modelBytes);
  const {prepareAssets}=await import(pathToFileURL(join(dir,'lib/assets.mjs')).href+'?generated='+Date.now());
  await assert.rejects(prepareAssets('mock',{mode:'fetch'}),/generated from pinned source and cannot be fetched directly/);
  const receipts=await prepareAssets('mock',{mode:'import',source});
  assert.equal(receipts.length,2);
  assert.deepEqual(await readFile(join(dir,'.cache/public',runtimeFile.target)),runtimeBytes);
  assert.deepEqual(await readFile(join(dir,'.cache/public',modelAsset.target)),modelBytes);
  assert.deepEqual(await prepareAssets('mock',{mode:'verify'}),receipts);
 }finally{await rm(dir,{recursive:true,force:true});}
});
