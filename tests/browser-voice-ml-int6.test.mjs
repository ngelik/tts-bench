import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import { defaultFixtureForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';
import { createBrowserVoiceAdapter } from '../web/adapters/browser-voice.mjs';
import profile from '../web/adapters/browser-voice-ml-int6-profile.mjs';

test('Malayalam INT6 profile pins checkpoint, asset closure, and source credits', () => {
  const model=getAssetLock().models[profile.id]; const assets=model.assets; const paths=assets.map(asset=>asset.target);
  const root=profile.workerUrl.slice(1,-'worker.js'.length);
  for (const name of ['worker.js','frontend.js','weight-shuffle.js','converter.mjs','weights.js',
    'runtime/ort.wasm.min.mjs','runtime/ort-wasm-simd-threaded.mjs','runtime/ort-wasm-simd-threaded.wasm.gz',
    profile.choice.weights.slice(2),profile.choice.graph.slice(2),...['frontend.json.gz','g2p-encode.onnx.gz','g2p-decode.onnx.gz'].map(name=>profile.choice.frontend.slice(2)+'/'+name)]) assert.ok(paths.includes(root+name),name);
  assert.equal(assets.find(asset=>'/'+asset.target===profile.workerUrl).sha256,'c620a0af032424a74570012281610c32c94a02598391da06d4a81fcf45f618a7');
  const files=assets.filter(asset=>asset.url.includes('/malayalam-voice-compact/resolve/')&&asset.url.includes('/int6/browser/'));
  assert.equal(files.length,5);
  assert.deepEqual(Object.fromEntries(files.map(asset=>[asset.url.split('/').at(-1),[asset.sha256,asset.bytes]])),{
    'model.weights.gz':['ed6c4a192462754a6fe2a8e77d5db195909b8f0f28e9695ba466410f33b3cba9',795702],
    'voice.onnx.gz':['0ce243edca55241b224ee3c73668ca4cae3f5a49e0f53d3a4e68dab100ed4ca2',29295],
    'frontend.json.gz':['7b72dea00f805ea9114f9e5c69df5d96a2f2f29b874cb3936a4505911c25574b',509267],
    'g2p-encode.onnx.gz':['d9e5cf65f565db252220ab68cd2b3bb5d8fdc3b88cdaf0dc521582bb248458bc',667105],
    'g2p-decode.onnx.gz':['330a504dfca39da0d04c6032a03abf0baa3680288a6077ad0f99a35291892a3f',1124269],
  });
  assert.ok(assets.some(asset=>asset.url==='https://raw.githubusercontent.com/DarvinX/multilingual-browser-tts/f2977727b8baccb989f80b492ea8da00124ecba3/web/credits.html'&&asset.sha256==='f061cffaf43c8bf1200be7265abc936a8587f76cdfe138d69dd7c656408623da'));
  assert.equal(model.license.model,'Apache-2.0'); assert.match(model.license.trainingData,/CC BY-SA 4.0/);
  assert.ok(model.support.sources.includes('https://huggingface.co/datasets/Hansda/malayalam-maya2-jahnavi-20h/blob/44b501c1e6688b61015c6ba4e07f6e17014731ca/README.md'));
  assert.equal(profile.choice.paceScale,0.9473172987974098);
  assert.deepEqual(profile.fixtures['ml-article-v1'],{language:'ml',sha256:'ef98dc2e0c65d273b4b0514501c0b8e45022ad0e5d766beedfd60b03fa5c46fd',spans:105});
  assert.equal(profile.parameterCount,932352);
});

test('Malayalam route binds native fixture and rejects GPU or checksum mismatch',async()=>{
  assert.equal(defaultFixtureForModel(profile.id),'ml-article-v1'); assert.equal(requiredFixtureForModel(profile.id), null);
  const adapter=createBrowserVoiceAdapter(profile);const options={fixtureId:'ml-article-v1',language:'ml',backend:'cpu'};
  assert.equal((await adapter.initialize({...options,backend:'webgpu'})).status,'unsupported');
  assert.equal((await adapter.initialize({...options,language:'hi'})).status,'unsupported');
  await assert.rejects(adapter.initialize({...options,sourceSha256:'0'.repeat(64)}),/checksum/);
});

test('Malayalam INT6 audio attribution is catalog-bound and distinguishes source terms',()=>{
  const model=getAssetLock().models[profile.id];
  assert.doesNotThrow(()=>verifyAudioAttribution({model:profile.id,modelTerms:model.license.model,attribution:"AI-generated Malayalam benchmark narration using Tamal Hansda’s Browser Voice Jahnavi INT6. The Apache-2.0 INT6 checkpoint is separate from its training sources. The Malayalam Maya 2 Native Jahnavi 20h synthetic speech and original release annotations are CC BY-SA 4.0. The dataset card credits Common Voice Malayalam prompt material (CC0-1.0), Indic TTS Mini Malayalam prompt indexes (CC BY 4.0), OpenSLR transcript indexes and Dakshina native-script Wikipedia text (CC BY-SA 4.0), with source prompts retaining their original terms. Credits include Mozilla Common Voice contributors, AI4Bharat and Rasa contributors, OpenSLR resource authors, Google Research and Wikipedia contributors. Publisher credits include Tiny Voca by Muhammed Nazeem (Apache-2.0), Maya 2 Native (Apache-2.0) and Kyutai Mimi (CC BY 4.0). No generated-audio reuse rights are inferred.",sourceUrls:model.support.sources}));
});

test('Roman Malayalam uses the same spoken language and the published dictionary', async () => {
  const model = getAssetLock().models[profile.id];
  const layout = profile.fixtures['ml-latn-article-v1'];
  assert.equal(layout.sha256, '16638b2f59789d7ce6b4cc0fe7692a6d56d413170eb8272d7002f58281366764');
  assert.equal(layout.spans, 116);
  assert.equal(layout.language, 'ml-Latn');
  assert.equal(profile.spokenLanguage, 'ml');
  assert.deepEqual(model.support.languages, ['ml']);
  const dictionary = model.assets.find(asset => asset.id === profile.id + '-roman-dictionary');
  assert.equal(dictionary.sha256, '95ec273b839908c628e15d8014a1dc8cee180751a8d00b718dba3dfdc35631cc');
  assert.equal('/' + dictionary.target, profile.workerUrl.replace(/worker\.js$/, 'assets/converter/ml.json.gz'));
  const adapter = createBrowserVoiceAdapter(profile);
  const options = { fixtureId: 'ml-latn-article-v1', language: 'ml-Latn', backend: 'cpu' };
  assert.equal((await adapter.initialize({ ...options, language: 'ml' })).status, 'unsupported');
  await assert.rejects(adapter.initialize({ ...options, sourceSha256: '0'.repeat(64) }), /checksum/);
});
