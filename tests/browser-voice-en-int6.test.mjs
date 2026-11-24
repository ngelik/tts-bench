import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getAssetLock } from '../lib/catalog.mjs';
import { defaultFixtureForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';
import profile, { createEnglishBrowserVoiceAdapter } from '../web/adapters/browser-voice-en-int6-profile.mjs';

test('English INT6 pins Nivedita, its source/runtime closure, and all checkpoint assets',()=>{
 const model=getAssetLock().models[profile.id],assets=model.assets,paths=assets.map(asset=>asset.target),root=profile.workerUrl.slice(1,-'worker.js'.length);
 for(const name of ['worker.js','frontend.js','weight-shuffle.js','converter.mjs','weights.js','runtime/ort.wasm.min.mjs','runtime/ort-wasm-simd-threaded.mjs','runtime/ort-wasm-simd-threaded.wasm.gz',profile.choice.weights.slice(2),profile.choice.graph.slice(2),...['frontend.json.gz','g2p-encode.onnx.gz','g2p-decode.onnx.gz'].map(name=>profile.choice.frontend.slice(2)+'/'+name)]) assert.ok(paths.includes(root+name),name);
 assert.equal(assets.find(asset=>'/'+asset.target===profile.workerUrl).sha256,'c620a0af032424a74570012281610c32c94a02598391da06d4a81fcf45f618a7');
 const files=assets.filter(asset=>asset.url.includes('/english-voice-compact/resolve/')&&asset.url.includes('/int6/browser/'));
 assert.equal(files.length,5);assert.deepEqual(Object.fromEntries(files.map(asset=>[asset.url.split('/').at(-1),[asset.sha256,asset.bytes]])),{
  'model.weights.gz':['243f716dd1b9621acedcb4dc4b6a68d4314a21911d02f764ed7a4be4fc1fc681',796191],
  'voice.onnx.gz':['ae045100b39317889380c321fad8bbba0702329f4fa73dcd769677b0f55d36c5',29287],
  'frontend.json.gz':['68a8fd9a05af95e255758ab61c110ec6e4c9a6b66ede25e8d0a128766b7f1816',132855],
  'g2p-encode.onnx.gz':['0a2f8f945e0a6fa33b1aaac7a60f27ff42bc5ac2a840a023d90d679838ac7138',641078],
  'g2p-decode.onnx.gz':['8c96fbc3e112292d54199b2e68c8b817c273ec4ecd72154d22c314337d78d973',1194159],
 });
 assert.ok(assets.some(asset=>asset.url==='https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html'&&asset.sha256==='f061cffaf43c8bf1200be7265abc936a8587f76cdfe138d69dd7c656408623da'));
 assert.equal(model.license.model,'Apache-2.0');assert.match(model.license.trainingData,/CC BY 4.0/);assert.ok(model.support.sources.includes('https://huggingface.co/datasets/Hansda/english-maya2-nivedita-20h/blob/d90ae476053ac26d9d85d41219a70a5d2651b4a3/README.md'));
 assert.equal(profile.choice.paceScale,1.0);assert.equal(profile.parameterCount,932800);
 assert.deepEqual(profile.fixtures['english-20k-v1'],{language:'en',sha256:'4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b',spans:93});
});

test('Nivedita routes the checksum-pinned English article and explicit English smoke only',async t=>{
 assert.equal(defaultFixtureForModel(profile.id),'english-20k-v1');assert.equal(requiredFixtureForModel(profile.id),'english-20k-v1');
 const originalWorker=globalThis.Worker;
 class ReadyWorker {
  postMessage(message){if(message.type==='load')queueMicrotask(()=>this.onmessage?.({data:{type:'ready',precision:'int6'}}));}
  terminate(){}
 }
 globalThis.Worker=ReadyWorker;
 t.after(()=>{if(originalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=originalWorker;});
 const adapter=createEnglishBrowserVoiceAdapter(),canonicalSha='4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b';
 const full=await adapter.initialize({fixtureId:'english-20k-v1',sourceSha256:canonicalSha,backend:'cpu'});
 assert.equal(full.status,'measured');assert.equal(full.settings.language,'en');assert.equal(full.settings.fixtureId,'english-20k-v1');
 await adapter.dispose();
 const smoke=await adapter.initialize({fixtureId:'english-20k-v1',language:'en',sourceSha256:undefined,backend:'cpu'});
 assert.equal(smoke.status,'measured');assert.equal(smoke.settings.language,'en');assert.equal(smoke.settings.fixtureId,'english-20k-v1');
 await adapter.dispose();
 assert.equal((await adapter.initialize({fixtureId:'english-20k-v1',sourceSha256:canonicalSha,backend:'webgpu'})).status,'unsupported');
 assert.equal((await adapter.initialize({fixtureId:'english-20k-v1',sourceSha256:canonicalSha,language:'de',backend:'cpu'})).status,'unsupported');
 assert.equal((await adapter.initialize({fixtureId:'english-20k-v1',backend:'cpu'})).status,'unsupported');
 assert.equal((await adapter.initialize({fixtureId:'english-20k-smoke-v1',language:'en',backend:'cpu'})).status,'unsupported');
 await assert.rejects(adapter.initialize({fixtureId:'english-20k-v1',sourceSha256:'0'.repeat(64),language:'en',backend:'cpu'}),/checksum/);
 assert.equal((await adapter.initialize({fixtureId:'fr-article-v1',language:'en',backend:'cpu'})).status,'unsupported');
 await adapter.dispose();
 const bench=await readFile(new URL('../web/bench.mjs',import.meta.url),'utf8');
 assert.match(bench,/import \{ createEnglishBrowserVoiceAdapter \} from '\.\/adapters\/browser-voice-en-int6-profile\.mjs'/);
 assert.match(bench,/'browser-voice-en-int6': createEnglishBrowserVoiceAdapter/);
});

test('English INT6 audio attribution is catalog-bound and distinguishes source terms',()=>{
 const model=getAssetLock().models[profile.id];assert.doesNotThrow(()=>verifyAudioAttribution({model:profile.id,modelTerms:model.license.model,attribution:"AI-generated English benchmark narration using Tamal Hansda’s Browser Voice Nivedita INT6. The Apache-2.0 INT6 checkpoint is separate from its training sources. The English Maya 2 Native Nivedita 20h synthetic speech and original release annotations are CC BY 4.0; the dataset card credits Common Voice English prompt material (CC0-1.0), Mozilla Common Voice and its contributors, Maya 2 Native (Apache-2.0), and Kyutai Mimi (CC BY 4.0). Publisher credits include Tiny Voca by Muhammed Nazeem (Apache-2.0) and eSpeak NG pronunciation labels. Source prompts retain their original terms; no generated-audio reuse rights are inferred.",sourceUrls:model.support.sources}));
});
