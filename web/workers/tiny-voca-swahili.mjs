import {fetchModelAsset} from '../cache-model-asset.mjs';
import {TINY_VOCA_SWAHILI as profile} from '../adapters/tiny-voca-swahili-profile.mjs';
import {phonemize, phonemizeText, SWAHILI_SYMBOLS} from '../adapters/tiny-voca-swahili-frontend.mjs';
import {dispatchProbe, hardwareGpu} from './gpu-probe.mjs';

const modelRoot=`/models/${profile.id}/${profile.modelRevision}/`;
const runtimeRoot='/runtimes/onnxruntime-web-pocket/1.31.1/';
let ort, session, activeFixture, activeLanguage, requestedBackend, gpuName;

function sameOriginUrl(root,path,prefix){
  const url=new URL(root+path,self.location.origin);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(prefix))throw new Error('Tiny Voca Kiswahili assets must be same-origin pinned files');
  return url;
}
async function sha256(bytes){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function checkedBytes(url,spec,label,revision=profile.sourceRevision){
  const response=await fetchModelAsset(url,revision,{bufferBeforeCache:true});
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==spec.bytes||await sha256(bytes)!==spec.sha256)throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset=name=>checkedBytes(sameOriginUrl(modelRoot,name,'/models/'),profile.modelAssets[name],`Tiny Voca Kiswahili ${name}`);
const runtimeAsset=name=>checkedBytes(sameOriginUrl(runtimeRoot,name,'/runtimes/onnxruntime-web-pocket/'),profile.runtimeFiles[name],`ONNX Runtime Web ${name}`);

function unsupported(reason){
  return {status:'unsupported',reason,backendEffective:'none',voice:profile.defaultVoice,precision:profile.precision,
    settings:{modelId:profile.modelId,modelRevision:profile.modelRevision,sourceId:profile.sourceId,sourceRevision:profile.sourceRevision,
      language:profile.language,locale:profile.locale,spokenLanguage:profile.spokenLanguage,supportedLanguages:[profile.language],
      fixtureId:profile.fixtureId,fixtureSha256:profile.fixtureSha256,voiceIndex:profile.defaultVoiceIndex},
    capability:{gpuDispatchVerified:false,description:reason}};
}
async function validateMetadata(metadata,config,symbolData,cases){
  if(metadata.sample_rate!==profile.sampleRate||metadata.hop!==profile.hop||metadata.max_tokens!==profile.maxTokens||
     metadata.max_frames!==profile.maxFrames||metadata.name!=='tiny-voca-swahili'||metadata.step!==55000||
     metadata.vocab_size!==SWAHILI_SYMBOLS.length||metadata.frontend?.phonemizer!=='swahili-rule'||
     metadata.frontend?.fingerprint!==profile.upstreamFrontendFingerprint||
     JSON.stringify(metadata.frontend.symbols)!==JSON.stringify(SWAHILI_SYMBOLS)||
     config.vocab_size!==SWAHILI_SYMBOLS.length||JSON.stringify(config.speakers)!==JSON.stringify(['1','2','3','4','5','6','8'])||
     symbolData.length!==SWAHILI_SYMBOLS.length||JSON.stringify(symbolData.map(x=>x.symbol))!==JSON.stringify(SWAHILI_SYMBOLS)||
     !cases.cases?.length||cases.voice!==profile.defaultVoiceIndex||cases.speed!==profile.speed||
     cases.pitch_shift!==profile.pitchShift||cases.pitch_range!==profile.pitchRange){
    throw new Error('Tiny Voca Kiswahili model metadata differs from its pinned release or benchmark frontend');
  }
  let sentenceCount=0;const vectorRows=[];
  for(const item of cases.cases)for(const sentence of item.sentences??[]){
    const output=phonemize(sentence.text);
    if(JSON.stringify(output.tokens)!==JSON.stringify(sentence.tokens)||JSON.stringify(output.stress)!==JSON.stringify(sentence.stress)){
      throw new Error(`Published Kiswahili vector mismatch: ${sentence.text}`);
    }
    vectorRows.push([sentence.text,output.tokens,output.stress]);
    sentenceCount++;
  }
  if(sentenceCount!==4||await sha256(new TextEncoder().encode(JSON.stringify(vectorRows)))!==profile.publishedVectorDigest)throw new Error('Expected all four pinned published sentence vectors and digest');
}

async function auditFixture(auditTexts){
  if(!Array.isArray(auditTexts)||auditTexts.length!==profile.fixtureOracle.spans)throw new Error('Fixture audit requires all ordered sw-article-v1 spans');
  const rows=[];let maximumTokens=0,unknownTokens=0,nonzeroStress=0,utterances=0,coveredCharacters=0;
  for(let index=0;index<auditTexts.length;index++){
    const item=auditTexts[index];
    if(item.id!==index||typeof item.text!=='string'||!item.text.trim())throw new Error('Fixture audit spans must retain original order and contain source text');
    const plans=phonemizeText(item.text);
    if(!plans.length)throw new Error(`Fixture span ${item.id} produced no utterances`);
    let cursor=0;const planRows=[];
    for(const plan of plans){
      if(plan.start<cursor||/\S/u.test(item.text.slice(cursor,plan.start))||plan.text!==item.text.slice(plan.start,plan.end))throw new Error(`Sentence planner skipped or reordered source text in span ${item.id}`);
      coveredCharacters+=Array.from(plan.text).filter(character=>!(/\s/u.test(character))).length;
      cursor=plan.end;utterances++;maximumTokens=Math.max(maximumTokens,plan.tokens.length);
      unknownTokens+=plan.tokens.filter(id=>id===4).length;nonzeroStress+=plan.stress.filter(value=>value!==0).length;
      planRows.push([plan.tokens,plan.stress]);
    }
    if(/\S/u.test(item.text.slice(cursor)))throw new Error(`Sentence planner omitted trailing source text in span ${item.id}`);
    rows.push([item.id,planRows]);
  }
  const tokenStressSha256=await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if(utterances!==profile.fixtureOracle.utterances||coveredCharacters!==profile.fixtureOracle.nonWhitespaceCharacters||
     maximumTokens!==profile.fixtureOracle.maximumTokens||unknownTokens!==profile.fixtureOracle.unknownTokens||
     nonzeroStress!==profile.fixtureOracle.nonzeroStress||tokenStressSha256!==profile.fixtureOracle.tokenStressSha256){
    throw new Error('Kiswahili fixture token/stress audit differs from the pinned source oracle');
  }
  return {fixtureId:profile.fixtureId,sourceSha256:profile.fixtureSha256,spans:auditTexts.length,utterances,
    nonWhitespaceCharacters:coveredCharacters,maximumTokens,unknownTokens,nonzeroStress,tokenStressSha256};
}
function makeRuntime(backend){
  const webgpu=backend==='webgpu',filename=webgpu?'ort.webgpu.min.mjs':'ort.wasm.min.mjs';
  return import(sameOriginUrl(runtimeRoot,filename,'/runtimes/onnxruntime-web-pocket/').href).then(module=>{
    module.env.wasm.numThreads=1;module.env.wasm.proxy=false;
    module.env.wasm.wasmPaths=webgpu?{
      mjs:sameOriginUrl(runtimeRoot,'ort-wasm-simd-threaded.asyncify.mjs','/runtimes/onnxruntime-web-pocket/').href,
      wasm:sameOriginUrl(runtimeRoot,'ort-wasm-simd-threaded.asyncify.wasm','/runtimes/onnxruntime-web-pocket/').href,
    }:{
      mjs:sameOriginUrl(runtimeRoot,'ort-wasm-simd-threaded.mjs','/runtimes/onnxruntime-web-pocket/').href,
      wasm:sameOriginUrl(runtimeRoot,'ort-wasm-simd-threaded.wasm','/runtimes/onnxruntime-web-pocket/').href,
    };
    module.env.logLevel='error';return module;
  });
}
async function runGraph(plan,measureDispatch=false){
  if(plan.tokens.length<2||plan.tokens.length>profile.maxTokens||plan.tokens.length!==plan.stress.length)throw new Error('Invalid Kiswahili graph token/stress input');
  const shape=[1,plan.tokens.length];
  const feeds={
    tokens:new ort.Tensor('int64',BigInt64Array.from(plan.tokens,BigInt),shape),
    stress:new ort.Tensor('int64',BigInt64Array.from(plan.stress,BigInt),shape),
    voice:new ort.Tensor('int64',BigInt64Array.of(BigInt(profile.defaultVoiceIndex)),[1]),
    speed:new ort.Tensor('float32',Float32Array.of(profile.speed),[1]),
    pitch_shift:new ort.Tensor('float32',Float32Array.of(profile.pitchShift),[1]),
    pitch_range:new ort.Tensor('float32',Float32Array.of(profile.pitchRange),[1]),
  };
  const hook=measureDispatch&&requestedBackend==='webgpu'?dispatchProbe():null;
  let output;
  try{
    output=await session.run(feeds);
    const audioData=typeof output.audio.getData==='function'?await output.audio.getData():output.audio.data;
    const durationData=typeof output.durations.getData==='function'?await output.durations.getData():output.durations.data;
    const durations=Array.from(durationData,Number);
    if(durations.length!==plan.tokens.length||durations.some(value=>!Number.isSafeInteger(value)||value<0))throw new Error('Graph returned invalid token durations');
    const frames=durations.reduce((sum,value)=>sum+value,0);
    const sampleCount=frames*profile.hop;
    const samples=Float32Array.from(audioData);
    if(!Number.isSafeInteger(sampleCount)||frames<1||frames>profile.maxFrames||sampleCount!==samples.length||
       !samples.length||!samples.some(value=>value!==0)||!samples.every(Number.isFinite))throw new Error('Graph returned invalid, empty, non-finite or out-of-bounds raw PCM');
    return {samples,dispatches:hook?.stop()??0};
  }finally{
    hook?.stop();
    for(const tensor of [...Object.values(feeds),...Object.values(output??{})])tensor.dispose?.();
  }
}
async function initialize(options={}){
  await dispose();
  if(!['cpu','webgpu'].includes(options.backend))throw new Error('Tiny Voca Kiswahili requires an explicit CPU or WebGPU backend');
  if(options.fixtureId!==profile.fixtureId||options.language!==profile.language)return unsupported('Tiny Voca Kiswahili supports only the sw-article-v1 fixture in language sw.');
  if(options.sourceSha256&&options.sourceSha256!==profile.fixtureSha256)throw new Error('Kiswahili fixture hash differs from the pinned sw-article-v1 identity');
  requestedBackend=options.backend;activeFixture=options.fixtureId;activeLanguage=options.language;
  if(requestedBackend==='webgpu'){
    gpuName=await hardwareGpu();
    if(!gpuName)return unsupported('Hardware WebGPU is unavailable or a software adapter was selected; choose the CPU/WASM route.');
  }
  const [graphBytes,metadataBytes,symbolBytes,casesBytes,configBytes]=await Promise.all([
    modelAsset('swahili.onnx'),modelAsset('metadata.json'),modelAsset('symbols.json'),modelAsset('cases.json'),modelAsset('config.json'),
  ]);
  const runtimeNames=requestedBackend==='webgpu'
    ?['ort.webgpu.min.mjs','ort-wasm-simd-threaded.asyncify.mjs','ort-wasm-simd-threaded.asyncify.wasm']
    :['ort.wasm.min.mjs','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeNames.map(runtimeAsset));
  const decode=bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const metadata=decode(metadataBytes),symbols=decode(symbolBytes),cases=decode(casesBytes),config=decode(configBytes);
  await validateMetadata(metadata,config,symbols,cases);
  const graph=graphBytes.buffer.slice(graphBytes.byteOffset,graphBytes.byteOffset+graphBytes.byteLength);
  ort=await makeRuntime(requestedBackend);
  const executionProviders=requestedBackend==='webgpu'?['webgpu','wasm']:['wasm'];
  session=await ort.InferenceSession.create(graph,{executionProviders,graphOptimizationLevel:'all'});
  const expectedInputs=['tokens','stress','voice','speed','pitch_shift','pitch_range'];
  const expectedOutputs=['audio','durations'];
  if(JSON.stringify(session.inputNames)!==JSON.stringify(expectedInputs)||JSON.stringify(session.outputNames)!==JSON.stringify(expectedOutputs))throw new Error('Kiswahili graph tensor names differ from the reviewed ONNX runner contract');
  if(requestedBackend==='webgpu'){
    const device=await ort.env.webgpu.device,adapter=await ort.env.webgpu.adapter;
    if(device?.adapterInfo?.isFallbackAdapter||adapter?.isFallbackAdapter||adapter?.info?.isFallbackAdapter){await dispose();return unsupported('ONNX Runtime Web selected a software WebGPU adapter.');}
    gpuName=device?.adapterInfo?.description||adapter?.info?.description||gpuName;
  }
  const fixtureAudit=options.auditTexts?.length?await auditFixture(options.auditTexts):undefined;
  let probeDispatches=0;
  if(options.probe){
    const probePlan=phonemize(cases.cases[0].sentences[0].text);
    const result=await runGraph(probePlan,requestedBackend==='webgpu');
    probeDispatches=result.dispatches;
    if(requestedBackend==='webgpu'&&probeDispatches<1){await dispose();return unsupported('No hardware WebGPU compute dispatch was observed during the untimed Kiswahili probe.');}
  }
  return {
    status:'measured',backendEffective:requestedBackend==='webgpu'?'webgpu+wasm':'cpu/wasm',voice:profile.defaultVoice,precision:profile.precision,gpu:gpuName,
    settings:{modelId:profile.modelId,modelRevision:profile.modelRevision,sourceId:profile.sourceId,sourceRevision:profile.sourceRevision,
      parameterCount:profile.parameterCount,fixtureId:activeFixture,fixtureSha256:profile.fixtureSha256,
      language:activeLanguage,locale:profile.locale,spokenLanguage:profile.spokenLanguage,supportedLanguages:[profile.language],
      voice:profile.defaultVoice,voiceIndex:profile.defaultVoiceIndex,sampleRate:profile.sampleRate,hop:profile.hop,
      maxTokens:profile.maxTokens,maxFrames:profile.maxFrames,speed:profile.speed,pitchShift:profile.pitchShift,pitchRange:profile.pitchRange,
      precision:profile.precision,frontend:profile.frontend,frontendFingerprint:profile.frontendFingerprint,
      upstreamFrontendFingerprint:profile.upstreamFrontendFingerprint,modelAssets:profile.modelAssets,
      runtimeVersions:{onnxruntimeWeb:profile.runtimeVersion},runtimePackage:profile.runtimePackage,
      runtimePackageIntegrity:profile.runtimePackageIntegrity,executionProviders,wasmThreads:1,graphOptimizationLevel:'all',
      audio:'Raw 24 kHz PCM from individual sentence calls is joined directly in source order.',
      ...(fixtureAudit?{fixtureAudit}:{})},
    capability:{gpuDispatchVerified:requestedBackend==='webgpu'?(options.probe?probeDispatches>0:null):null,
      ...(requestedBackend==='webgpu'&&options.probe?{dispatches:probeDispatches}:{}),description:requestedBackend==='webgpu'
        ?`Observed ${probeDispatches} hardware WebGPU compute dispatches in an untimed probe; WASM remains an explicit fallback for unsupported graph operators.`
        :'Explicit ONNX Runtime Web 1.31.1 one-thread WASM CPU route with graph optimization all.'},
  };
}
async function generate(chunk,onFirstPcm){
  if(!session||activeFixture!==profile.fixtureId||activeLanguage!==profile.language)throw new Error('Tiny Voca Kiswahili worker is not initialized');
  if(!chunk||!Number.isSafeInteger(chunk.id)||typeof chunk.text!=='string'||!chunk.text.trim())throw new Error('Invalid Kiswahili source span');
  if(chunk.id<0||chunk.id>=profile.fixtureOracle.spans)throw new Error('Kiswahili source span ID is outside the pinned fixture');
  const plans=phonemizeText(chunk.text);
  if(!plans.length)throw new Error(`Kiswahili source span ${chunk.id} has no pronounceable sentence`);
  let cursor=0;const parts=[];
  for(const plan of plans){
    if(plan.start<cursor||/\S/u.test(chunk.text.slice(cursor,plan.start))||plan.text!==chunk.text.slice(plan.start,plan.end))throw new Error(`Sentence planner skipped source text in span ${chunk.id}`);
    const result=await runGraph(plan,false);
    parts.push(result.samples);onFirstPcm?.();onFirstPcm=null;cursor=plan.end;
  }
  if(/\S/u.test(chunk.text.slice(cursor)))throw new Error(`Sentence planner omitted trailing source text in span ${chunk.id}`);
  return {parts,sampleRate:profile.sampleRate,completedChunkId:chunk.id};
}
async function diagnose(options={}){
  if(!session||activeLanguage!==profile.language)throw new Error('Tiny Voca Kiswahili worker is not initialized');
  if(typeof options.text!=='string'||!options.text.trim())throw new Error('Diagnostic requires nonempty Kiswahili text');
  const plans=phonemizeText(options.text);
  if(!plans.length)throw new Error('Diagnostic text produced no pronounceable sentence');
  const rendered=[];
  for(const plan of plans){
    const result=await runGraph(plan,false);
    rendered.push({samples:result.samples.length,tokenCount:plan.tokens.length,tokens:plan.tokens,stress:plan.stress});
  }
  return {fixtureId:options.fixtureId??activeFixture,language:activeLanguage,sampleRate:profile.sampleRate,
    samples:rendered.reduce((sum,row)=>sum+row.samples,0),utterances:rendered.length,tokenPlans:rendered.map(({tokens,stress,tokenCount})=>({tokens,stress,tokenCount}))};
}
async function dispose(){const current=session;session=null;if(current)await current.release();ort=activeFixture=activeLanguage=requestedBackend=gpuName=null;}
self.onmessage=async({data})=>{
  try{
    let value;
    if(data.action==='initialize')value=await initialize(data.options);
    else if(data.action==='generate')value=await generate(data.chunk,()=>self.postMessage({id:data.id,event:'first-pcm'}));
    else if(data.action==='diagnostic')value=await diagnose(data.options??{});
    else if(data.action==='dispose')await dispose();
    else throw new Error('Unknown Tiny Voca Kiswahili worker action');
    self.postMessage({id:data.id,value},value?.parts?.map(part=>part.buffer)??[]);
  }catch(error){
    if(data.action==='initialize'){try{await dispose();}catch{/* Preserve the initial error. */}}
    self.postMessage({id:data.id,error:String(error?.message??error)});
  }
};
