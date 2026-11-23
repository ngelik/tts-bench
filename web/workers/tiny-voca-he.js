/* SPDX-License-Identifier: Apache-2.0
 * Pinned Tiny Voca Hebrew and RenikudPlus browser pipeline.
 */
let profile, ortRuntime, py, acoustic, renikud, prepare, decodeWindow, acousticPlan, planSentences, planShorter;
let backend, activeFixture, activeLanguage, cacheEnabled=true, cacheStore=null, gpuName=null;
let assetCacheStats={hits:0,misses:0,verifiedBytes:0};
const PY='/runtimes/pyodide/0.26.4/';
const ORT='/runtimes/onnxruntime-web/1.20.1/';
const ROOT='/models/tiny-voca-he/fdc9b3080984c94768239989391fbaddcf9b5519/assets/';
const G2P='/models/renikud-plus/679c56ca449d41873fb8ff7711ddf7563d28198f/';
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
function dispatchProbe() {
  const prototype = self.GPUComputePassEncoder?.prototype;
  if (!prototype || typeof prototype.dispatchWorkgroups !== 'function') throw Error('WebGPU dispatch instrumentation unavailable');
  const dispatch = prototype.dispatchWorkgroups;
  let count = 0;
  prototype.dispatchWorkgroups = function (...args) {
    count++;
    return dispatch.apply(this, args);
  };
  return { stop() {
    prototype.dispatchWorkgroups = dispatch;
    return count;
  } };
}

async function checked(url,spec,label) {
  const parsed=new URL(url,self.location.href);
  if(parsed.origin!==self.location.origin||!/^\/(models|runtimes)\//.test(parsed.pathname))throw Error(label+': asset must be a same-origin pinned model/runtime path');
  const request=new Request(parsed.href);
  const cacheName = `tiny-voca-he-${profile.modelRevision}-${profile.g2pModelRevision}`;
  if (cacheEnabled && self.caches) {
    try {
      cacheStore ??= await caches.open(cacheName);
      const hit = await cacheStore.match(request);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (bytes.byteLength === spec.bytes && await sha256(bytes) === spec.sha256) {
          assetCacheStats.hits++;
          assetCacheStats.verifiedBytes += bytes.byteLength;
          return bytes;
        }
        await cacheStore.delete(request);
      }
    } catch {
      cacheStore = null;
    }
  }
  assetCacheStats.misses++;
  const response=await fetch(parsed.href,{cache:'no-store'});
  if(!response.ok) throw Error(`${label}: HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==spec.bytes||await sha256(bytes)!==spec.sha256) throw Error(`${label}: size or SHA-256 mismatch`);
  if (cacheEnabled && self.caches) {
    try {
      cacheStore ??= await caches.open(cacheName);
      await cacheStore.put(request, new Response(bytes.slice()));
    } catch {
      cacheStore = null;
    }
  }
  return bytes;
}
function intTensor(values,dims=[1,values.length]) { return new ortRuntime.Tensor('int64',BigInt64Array.from(values,BigInt),dims); }
function joinedPeak(parts) {
  const result=new Float32Array(parts.reduce((n,x)=>n+x.length,0)); let at=0,peak=0;
  for(const part of parts){result.set(part,at);at+=part.length;}
  for(const sample of result){if(!Number.isFinite(sample))throw Error('Non-finite acoustic PCM');peak=Math.max(peak,Math.abs(sample));}
  if(!result.length||!peak)throw Error('Empty or silent acoustic PCM');
  if(peak>profile.peak){const scale=profile.peak/peak;for(let i=0;i<result.length;i++)result[i]*=scale;}
  return result;
}
async function renderPlan(source) {
  if(typeof source!=='string'||!source.trim()||!/[\u05d0-\u05ea]/u.test(source)) throw Error('Tiny Voca Hebrew requires Hebrew text');
  const prepared=JSON.parse(prepare(source));
  if(!Array.isArray(prepared.windows)||!prepared.windows.length) throw Error('RenikudPlus produced no Hebrew inference windows');
  let ipa='';
  for(const window of prepared.windows){
    const inputs=Object.fromEntries(Object.entries(window.feeds).map(([name,values])=>[name,intTensor(values,name==='speaker'||name==='target_speaker'?[1]:[1,values.length])]));
    let outputs;
    try {
      outputs=await renikud.run(inputs);
      const result={};
      for(const name of renikud.outputNames) result[name]={dims:outputs[name].dims,data:Array.from(await outputs[name].getData())};
      ipa+=decodeWindow(window.text,JSON.stringify(window.feeds),JSON.stringify(result));
    } finally { for(const item of [...Object.values(inputs),...Object.values(outputs??{})])item.dispose?.(); }
  }
  return JSON.parse(acousticPlan(ipa,prepared.normalized));
}
async function* fit(source) {
  const result=await renderPlan(source);
  if(!Array.isArray(result.ids)||!Array.isArray(result.stress)||result.ids.length!==result.stress.length||!result.ids.length) throw Error('Tiny Voca Hebrew returned invalid phoneme tokens');
  if(result.unknown?.length) throw Error('Tiny Voca Hebrew frontend returned unknown phones');
  if(result.ids.length<=profile.tokenLimit){yield result;return;}
  const children=JSON.parse(planShorter(source));
  if(!children.length) throw Error('A single Hebrew word exceeds the stock 140-token limit');
  for(const child of children) yield* fit(child);
}
async function* plannedTokens(text) {
  const finished=JSON.parse(planSentences(text));
  for(const sentence of finished) yield* fit(sentence);
}
async function planSpan(text) {
  const plans=[];for await(const plan of plannedTokens(text))plans.push(plan);
  if(!plans.length) throw Error('No Hebrew utterance was planned');
  return plans;
}
async function auditFixture(texts) {
  const full=texts.length===profile.fixtureOracle.spans;const expected=full?profile.fixtureOracle:profile.smokeOracle;
  if(!Array.isArray(texts)||![3,profile.fixtureOracle.spans].includes(texts.length)) throw Error('Hebrew audit requires three smoke spans or all 71 ordered spans');
  const rows=[];let utterances=0,maximumTokens=0,unknownTokens=0,unknownWords=0;
  for(let id=0;id<texts.length;id++){
    const item=texts[id];if(!item||item.id!==id||typeof item.text!=='string'||!item.text.trim())throw Error('Invalid or reordered Hebrew fixture span '+id);
    const plans=await planSpan(item.text);
    for(const plan of plans){utterances++;maximumTokens=Math.max(maximumTokens,plan.ids.length);unknownTokens+=plan.ids.filter(x=>x===4).length;unknownWords+=plan.unknown?.length??0;}
    rows.push([id,plans.map(({ids,stress})=>[ids,stress])]);
  }
  const tokenStressSha256=await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual={spans:rows.length,utterances,maximumTokens,unknownTokens,unknownWords,tokenStressSha256};
  for(const key of Object.keys(expected))if(actual[key]!==expected[key])throw Error('Hebrew fixture token oracle mismatch: '+JSON.stringify(actual));
  if(unknownTokens||unknownWords)throw Error('Hebrew fixture includes unknown phones or words');
  return {fixtureId:profile.fixtureId,fixtureSha256:profile.fixtureSha256,status:full?'matched':'partial',...actual};
}
async function renderSpan(text,onFirstPcm) {
  const pieces=[];
  for await(const tokens of plannedTokens(text)){
    if(tokens.ids.length>profile.maxTokens) throw Error('Acoustic token ceiling exceeded');
    const inputs={tokens:intTensor(tokens.ids),stress:intTensor(tokens.stress),voice:intTensor([profile.defaultVoiceIndex],[1]),
      speed:new ortRuntime.Tensor('float32',Float32Array.of(profile.speed),[1]),
      pitch_shift:new ortRuntime.Tensor('float32',Float32Array.of(profile.pitchShift),[1]),
      pitch_range:new ortRuntime.Tensor('float32',Float32Array.of(profile.pitchRange),[1])};
    let outputs;
    try {
      outputs=await acoustic.run(inputs);
      const audio=await outputs.audio.getData(), durations=Array.from(await outputs.durations.getData(),Number);
      const frames=durations.reduce((a,b)=>a+b,0);
      if(!audio.length||!audio.some(x=>x!==0)||!audio.every(Number.isFinite)||audio.length!==frames*profile.hop||frames>profile.maxFrames) throw Error('Invalid acoustic output shape or samples');
      if(!pieces.length) onFirstPcm?.();
      pieces.push(Float32Array.from(audio));
    } finally { for(const item of [...Object.values(inputs),...Object.values(outputs??{})])item.dispose?.(); }
  }
  return joinedPeak(pieces);
}
async function controls(spec) {
  const compare=async(name,pair)=>{
    if(!pair||typeof pair.left!=='string'||typeof pair.right!=='string')throw Error('Missing '+name+' control pair');
    const left=await planSpan(pair.left);const right=await planSpan(pair.right);
    const shape=x=>JSON.stringify(x.map(({ids,stress})=>[ids,stress]));
    if(shape(left)!==shape(right))throw Error(name+' control token mismatch');
    return {matched:true,utterances:left.length};
  };
  const result={numbers:await compare('number',spec.numbers),niqqud:await compare('niqqud',spec.niqqud)};
  const first=await planSpan(spec.repeat),second=await planSpan(spec.repeat);
  const shape=x=>JSON.stringify(x.map(({ids,stress})=>[ids,stress]));
  if(shape(first)!==shape(second))throw Error('Repeated stock Renikud inference changed tokens');
  result.repeatedStockG2pMatched=true;
  let rejected=false;try{await renderPlan(spec.english);}catch{rejected=true;}
  if(!rejected)throw Error('English-only control was not rejected');
  result.englishRejected=true;return result;
}
async function initialize(options={}) {
  profile=options.modelConfig;
  if(profile?.id!=='tiny-voca-he'||profile.modelRevision!=='fdc9b3080984c94768239989391fbaddcf9b5519'||profile.defaultVoice!=='AH'||profile.defaultVoiceIndex!==0||profile.step!==104000) throw Error('Exact Tiny Voca Hebrew profile required');
  if(options.fixtureId!==profile.fixtureId||(options.language??profile.language)!==profile.language) return {status:'unsupported',reason:'Only he-article-v1 Hebrew is supported.',backendEffective:'none'};
  if(options.voice&&options.voice!=='AH') return {status:'unsupported',reason:'Checkpoint has only the male AH voice.',backendEffective:'none'};
  if(!['cpu','webgpu'].includes(options.backend)) throw Error('Explicit cpu or webgpu backend required');
  backend=options.backend; activeFixture=profile.fixtureId; activeLanguage=profile.language;
  cacheEnabled = options.cache !== false;
  const webgpu=backend==='webgpu';
  if (webgpu) {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) {
      return { status: 'unsupported', reason: 'Hardware WebGPU unavailable.', backendEffective: 'none' };
    }
    gpuName = adapter.info?.description || adapter.info?.vendor || null;
  }
  const [configBytes,acousticBytes]=await Promise.all([
    checked(ROOT+'tiny-voca-he.json',profile.assets['tiny-voca-he.json'],'Tiny Voca Hebrew config'),
    checked(ROOT+'tiny-voca-he.onnx',profile.assets['tiny-voca-he.onnx'],'Tiny Voca Hebrew model'),
  ]);
  const config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(configBytes));
  if(config.sample_rate!==profile.sampleRate||config.hop!==profile.hop||JSON.stringify(config.voices)!==JSON.stringify(['AH'])||
    JSON.stringify(config.inputs)!==JSON.stringify(['tokens','stress','voice','speed','pitch_shift','pitch_range'])||JSON.stringify(config.outputs)!==JSON.stringify(['audio','durations'])||
    config.max_tokens!==profile.maxTokens||config.max_frames!==profile.maxFrames||config.step!==profile.step||config.frontend!=='renikud-plus'||
    config.frontend_fingerprint!==profile.frontendFingerprint||config.symbols.length!==46)throw Error('Tiny Voca Hebrew JSON config differs from pinned profile');
  const g2pBytes=await checked(G2P+'model_int8.onnx',profile.assets['renikud-plus-model-int8.onnx'],'RenikudPlus model');
  const pyFiles=['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'];
  for(const file of pyFiles){const [bytes,digest]=profile.pyodideDigests[file];await checked(PY+file,{bytes,sha256:digest},'Pyodide '+file);}
  const rt=webgpu?['ort.webgpu.min.js','ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm']:['ort.wasm.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'];
  for(const file of rt){const [bytes,digest]=profile.runtimeDigests[file];await checked(ORT+file,{bytes,sha256:digest},'ONNX Runtime '+file);}
  importScripts(ORT+(webgpu?'ort.webgpu.min.js':'ort.wasm.min.js'));
  ortRuntime=self.ort||globalThis.ort;ortRuntime.env.logLevel='error';ortRuntime.env.wasm.numThreads=1;ortRuntime.env.wasm.proxy=false;
  ortRuntime.env.wasm.wasmPaths=webgpu?{mjs:ORT+'ort-wasm-simd-threaded.jsep.mjs',wasm:ORT+'ort-wasm-simd-threaded.jsep.wasm'}:ORT;
  acoustic=await ortRuntime.InferenceSession.create(acousticBytes,{executionProviders:webgpu?['webgpu','wasm']:['wasm'],graphOptimizationLevel:'all'});
  renikud=await ortRuntime.InferenceSession.create(g2pBytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  const expectedInputs=['tokens','stress','voice','speed','pitch_shift','pitch_range'];
  if([...acoustic.inputNames].sort().join(',')!==[...expectedInputs].sort().join(',')||[...acoustic.outputNames].sort().join(',')!=='audio,durations') throw Error('Tiny Voca acoustic ONNX ABI mismatch');
  if([...renikud.inputNames].sort().join(',')!=='attention_mask,input_ids,speaker,target_speaker'||[...renikud.outputNames].sort().join(',')!=='consonant_logits,stress_logits,vowel_logits')throw Error('RenikudPlus ONNX ABI mismatch');
  const {onnxMetadata}=await import(new URL('../tiny-voca-he/onnx-metadata.mjs',self.location.href).href);
  const metadata=onnxMetadata(g2pBytes);
  const metaBytes=new TextEncoder().encode(JSON.stringify(metadata));
  const wheelSpecs=[
    ['renikud_plus-0.6.0-py3-none-any.whl','c5390ec31c2d5e4e25140f9205f6f3a5bb00f3a70454d7799fe35adef272fb42',22510],
    ['hebrew_num2words-0.1.0-py3-none-any.whl','e63bae884cc4aafce01ce4d5dc0e7fb747ede824b15820d20dacde7fdab432b9',15006],
  ];
  const [wheelA,wheelB,textPy,plannerPy,bridgePy]=await Promise.all([
    ...wheelSpecs.map(([name,sha256,bytes])=>checked(ROOT+name,{sha256,bytes},name)),
    checked(ROOT+'tiny_voca_text.py',profile.assets['tiny_voca_text.py'],'Tiny Voca text frontend'),
    checked(ROOT+'stock_planner.py',profile.assets['stock_planner.py'],'Stock sentence planner'),
    checked(ROOT+'hebrew_bridge.py',profile.assets['hebrew_bridge.py'],'Browser Hebrew bridge'),
  ]);
  importScripts(PY+'pyodide.js');py=await self.loadPyodide({indexURL:new URL(PY,self.location.href).href});
  if(py.version!==profile.pyodideVersion)throw Error('Unexpected Pyodide version '+py.version);
  const numpyUrl=new URL(ROOT+'numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl',self.location.href).href;
  await checked(numpyUrl,profile.numpyWheel,'NumPy Pyodide wheel');
  await py.loadPackage(numpyUrl);
  py.unpackArchive(wheelA,'zip',{extractDir:'/hebrew'});py.unpackArchive(wheelB,'zip',{extractDir:'/hebrew'});
  py.FS.mkdirTree('/hebrew');py.FS.writeFile('/hebrew/text.py',textPy);py.FS.writeFile('/hebrew/stock_planner.py',plannerPy);py.FS.writeFile('/hebrew/hebrew_bridge.py',bridgePy);
  py.globals.set('input_names_json',JSON.stringify(renikud.inputNames));py.globals.set('renikud_metadata_json',new TextDecoder().decode(metaBytes));
  py.runPython('import sys;sys.path.insert(0,"/hebrew");from stock_planner import *');
  py.runPython(new TextDecoder().decode(bridgePy));
  py.runPython('def plan_sentences_json(s): return json.dumps(sentences(finished(s)),ensure_ascii=False)\ndef plan_shorter_json(s): return json.dumps(shorter(s),ensure_ascii=False)');
  prepare=py.globals.get('prepare');decodeWindow=py.globals.get('decode_window');acousticPlan=py.globals.get('acoustic_plan');
  planSentences=py.globals.get('plan_sentences_json');planShorter=py.globals.get('plan_shorter_json');
  if(py.runPython('tv.frontend_fingerprint()')!==profile.frontendFingerprint||py.runPython('g2p.exact_map_default')!==true) throw Error('Renikud/Tiny Voca frontend profile mismatch');
  const fixtureAudit=options.auditTexts?.length?await auditFixture(options.auditTexts):null;
  const controlReceipt=options.control?await controls(profile.controls):null;
  let dispatches=0;
  if (webgpu && options.probe) {
    const hook = dispatchProbe();
    try {
      await renderSpan(options.probeText || 'שלום עולם.', null);
    } finally {
      dispatches = hook.stop();
    }
    if (dispatches < 1) throw Error('No hardware acoustic WebGPU dispatch was observed');
  }
  const gpuDevice=webgpu?(ortRuntime.env.webgpu?.device?.adapterInfo||{}):null;
  if(webgpu&&(gpuDevice.isFallbackAdapter||ortRuntime.env.webgpu?.adapter?.isFallbackAdapter||ortRuntime.env.webgpu?.adapter?.info?.isFallbackAdapter))throw Error('ONNX Runtime Web selected software WebGPU');
  if(webgpu)gpuName=gpuDevice.description||gpuDevice.vendor||gpuName;
  const probeGpu = webgpu && options.probe;
  let capabilityDescription = 'Acoustic and G2P inference use CPU/WASM.';
  if (webgpu) {
    capabilityDescription = probeGpu
      ? `Observed ${dispatches} hardware dispatches in the acoustic ONNX graph. RenikudPlus runs CPU/WASM.`
      : 'Acoustic WebGPU configured. RenikudPlus runs CPU/WASM.';
  }
  return {
    status: 'measured',
    backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice,
    precision: profile.precision,
    ...(webgpu ? { gpu: gpuName } : {}),
    settings: {
      modelId: profile.modelId,
      modelRevision: profile.modelRevision,
      sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId,
      fixtureSha256: profile.fixtureSha256,
      language: profile.language,
      locale: profile.locale,
      supportedLanguages: [profile.language],
      voice: profile.defaultVoice,
      voiceIndex: profile.defaultVoiceIndex,
      speed: profile.speed,
      pitchShift: profile.pitchShift,
      pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate,
      hop: profile.hop,
      maxTokens: profile.maxTokens,
      tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames,
      step: profile.step,
      parameterCount: profile.parameterCount,
      precision: profile.precision,
      frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint,
      g2p: {
        modelId: profile.g2pModelId,
        modelRevision: profile.g2pModelRevision,
        executionProviders: ['wasm'],
        settings: 'Released MAP defaults, niqqud strip, speaker and target 0, no lexicon or phrase cache.',
      },
      executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'],
      g2pExecutionProviders: ['wasm'],
      wasmThreads: 1,
      runtimeVersions: {
        onnxruntimeWeb: profile.onnxruntimeWebVersion,
        pyodide: py.version,
        numpy: profile.numpyVersion,
        renikudPlus: '0.6.0',
        hebrewNum2Words: '0.1.0',
      },
      waveform: 'Stock Tiny Voca source-filter output with contiguous utterances and one 0.99 peak cap per source span.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
      ...(controlReceipt ? { controlReceipt } : {}),
    },
    assetCache: { enabled: cacheEnabled, ...assetCacheStats },
    capability: {
      gpuDispatchVerified: probeGpu ? dispatches > 0 : null,
      ...(probeGpu ? { dispatches } : {}),
      description: capabilityDescription,
    },
  };
}
async function generate(chunk,onFirstPcm) {
  if(!acoustic||activeFixture!==profile.fixtureId||activeLanguage!==profile.language||!backend)throw Error('Tiny Voca Hebrew adapter is not initialized');
  if(!chunk||!Number.isSafeInteger(chunk.id)||typeof chunk.text!=='string'||!chunk.text.trim())throw Error('Invalid Hebrew source span');
  return {parts:[await renderSpan(chunk.text,onFirstPcm)],sampleRate:profile.sampleRate,completedChunkId:chunk.id};
}
async function dispose() {
  for(const session of [acoustic,renikud])if(session)await session.release();
  acoustic=renikud=null;try{py?.globals?.destroy?.();}catch{}py=null;
  profile=ortRuntime=prepare=decodeWindow=acousticPlan=planSentences=planShorter=null;backend=activeFixture=activeLanguage=null;cacheStore=null;gpuName=null;assetCacheStats={hits:0,misses:0,verifiedBytes:0};
}
self.onmessage = async ({data: {id, action, options, chunk}}) => {
  try {
    let value;
    switch (action) {
      case 'initialize': value = await initialize(options); break;
      case 'generate': value = await generate(chunk, () => self.postMessage({id, event: 'first-pcm'})); break;
      case 'diagnostic':
        if (options?.auditTexts) value = await auditFixture(options.auditTexts);
        else if (options?.control) value = await controls(options.control);
        else throw Error('Unknown Tiny Voca Hebrew diagnostic');
        break;
      case 'dispose': await dispose(); value = null; break;
      default: throw Error('Unknown Tiny Voca Hebrew action');
    }
    self.postMessage({id, value}, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (action === 'initialize') {
      try { await dispose(); } catch {}
    }
    self.postMessage({id, error: String(error?.message ?? error)});
  }
};
