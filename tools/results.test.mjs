import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateResult, median } from './results.mjs';
import { renderReport } from './report.mjs';
const historical=JSON.parse(await readFile(new URL('../results/historical-2026-11-08-m1pro-gpu-warm/result.json',import.meta.url)));
const nativeReceipt=JSON.parse(await readFile(new URL('../results/2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f/result.json',import.meta.url)));
const zonosSupport=JSON.parse(await readFile(new URL('../assets.lock.json',import.meta.url))).models['zonos3-mini'].support;
const native=()=>structuredClone(nativeReceipt);
test('accepts the 101-character Linnet precision description and keeps the 150-character bound', () => {
  const receipt = native();
  const cell = receipt.cells[0];
  const linnetPrecision = 'FP16 weights widened to FP32; dense kernels run as FP32 WebGPU and remaining kernels use WASM SIMD128';
  assert.equal(linnetPrecision.length, 101);

  // The synthetic fixture is marked as a measured GPU cell so the full native
  // publication checks run with this backend-specific precision description.
  cell.backendRequested = 'webgpu';
  cell.backendEffective = 'webgpu+wasm';
  cell.capability.gpuDispatchVerified = true;
  cell.precision = linnetPrecision;
  assert.equal(validateResult(receipt, { publication: true }), receipt);

  cell.precision = 'x'.repeat(150);
  assert.doesNotThrow(() => validateResult(receipt, { publication: true }));

  cell.precision = 'x'.repeat(151);
  assert.throws(() => validateResult(receipt, { publication: true }), /Voice, precision and settings are required/);
});
test('historical provenance preserves all six measured GPU cells',()=>{assert.equal(validateResult(historical,{publication:true}).cells.length,6);});
test('smoke and dirty-source measurements cannot be published',()=>{for(const modify of[d=>d.protocol.smoke=true,d=>d.source.dirty=true]){const d=native();modify(d);assert.throws(()=>validateResult(d,{publication:true}));}});
test('native publication cannot change fixture ID, hash, length or chunk count to bypass the canonical check',()=>{const d=native();d.fixture={id:'alternate-article-v1',sha256:'b'.repeat(64),characters:19999,chunks:92};assert.throws(()=>validateResult(d,{publication:true}),/canonical fixture/);});
test('native audio-derived metrics reconcile when supplied',()=>{for(const [key,value] of [['audioSeconds',999],['realTimeFactor',999],['firstPcmMs',999999],['firstSourceChunkCompletedMs',999999]]){const d=native();d.cells[0].trials[0].metrics[key]=value;assert.throws(()=>validateResult(d),new RegExp(key));}const partial=native();delete partial.cells[0].trials[0].metrics.audioSeconds;delete partial.cells[0].trials[0].metrics.firstPcmMs;assert.doesNotThrow(()=>validateResult(partial));const missing=native();delete missing.cells[0].trials[0].metrics;assert.doesNotThrow(()=>validateResult(missing));});
test('ZONOS3 CPU receipts bind the cap, article-boundary reset and in-timer reset metrics',()=>{
  const d=native();
  d.protocol.repetitions=1;
  const cell=d.cells[0];
  cell.model='zonos3-mini';cell.support=structuredClone(zonosSupport);cell.voice='Imogen (English, British female)';
  cell.precision='audio.cpp Q4_0 routed experts / Q8_0 GDN and attention projections; remaining tensors F16/F32';
  cell.settings={threads:6,pthreadPoolSize:12,sessionResetCap:16,sessionResetPolicy:'Close and reopen before the next synthesis after 16 canonical spans.'};
  cell.trials=[cell.trials[0]];
  const spanBoundaries=[15,31,47,63,79].map(afterChunkId=>({afterChunkId,beforeChunkId:afterChunkId+1,reason:'span-cap',threads:6,pthreadPoolSize:12}));
  const articleBoundary={afterChunkId:92,beforeChunkId:0,reason:'article-boundary',threads:6,pthreadPoolSize:12};
  for(const [trial,index] of [[cell.warmup[0],0],[cell.trials[0],1]]){
    trial.sampleRate=44100;
    trial.metrics.audioSeconds=trial.samples/trial.sampleRate;
    trial.metrics.realTimeFactor=trial.generationMs/(trial.metrics.audioSeconds*1000);
    const boundaries=index?[articleBoundary,...spanBoundaries]:spanBoundaries;
    trial.validation.sessionResetBoundaries=structuredClone(boundaries);
    trial.metrics.sessionResetCount=boundaries.length;
    trial.metrics.sessionResetMs=1;
  }
  assert.doesNotThrow(()=>validateResult(d));
  const resetReport=renderReport(d).markdown;
  assert.match(resetReport,/before 0 \(article-boundary\)/);
  assert.match(resetReport,/CPU session reset time within generation/);
  const smoke=structuredClone(d);
  smoke.protocol.smoke=true;smoke.protocol.warmupRuns=0;smoke.protocol.repetitions=1;
  smoke.fixture={id:'english-20k-smoke-v1',sha256:'c'.repeat(64),characters:500,chunks:3};
  smoke.cells[0].warmup=[];
  const smokeTrial=smoke.cells[0].trials[0];
  smokeTrial.validation.chunkCount=3;smokeTrial.validation.sessionResetBoundaries=[];
  smokeTrial.metrics.sessionResetCount=0;smokeTrial.metrics.sessionResetMs=0;
  assert.doesNotThrow(()=>validateResult(smoke),'short smoke fixture does not reach the 16-span reset boundary');
  delete cell.trials[0].validation.sessionResetBoundaries;
  assert.throws(()=>validateResult(d),/must record their session-reset boundaries/);
  cell.trials[0].validation.sessionResetBoundaries=[articleBoundary,...spanBoundaries.slice(0,-1)];
  cell.trials[0].metrics.sessionResetCount=cell.trials[0].validation.sessionResetBoundaries.length;
  assert.throws(()=>validateResult(d),/boundary count/);
});
test('native download estimate reconciles with byte count when both are supplied',()=>{const d=native();for(const t of d.cells[0].trials){t.metrics.downloadBytes=1000;t.metrics.idealDownloadSecondsAt1Mbps=1000/125000;}assert.doesNotThrow(()=>validateResult(d));d.cells[0].trials[0].metrics.idealDownloadSecondsAt1Mbps=99;assert.throws(()=>validateResult(d),/idealDownloadSecondsAt1Mbps/);const fractional=native();fractional.cells[0].trials[0].metrics.downloadBytes=1.5;assert.throws(()=>validateResult(fractional),/downloadBytes/);const bytesOnly=native();bytesOnly.cells[0].trials[0].metrics.downloadBytes=1000;assert.doesNotThrow(()=>validateResult(bytesOnly));const nullEstimate=native();nullEstimate.cells[0].trials[0].metrics.idealDownloadSecondsAt1Mbps=null;assert.doesNotThrow(()=>validateResult(nullEstimate));const partial=native();partial.cells[0].trials[0].metrics.idealDownloadSecondsAt1Mbps=99;assert.throws(()=>validateResult(partial),/requires integer downloadBytes/);});
test('native measured backend labels must match the requested backend',()=>{for(const [requested,effective] of [['cpu','webgpu'],['webgpu','cpu/wasm']]){const d=native();d.cells[0].backendRequested=requested;d.cells[0].backendEffective=effective;assert.throws(()=>validateResult(d),/Effective backend/);}for(const [requested,effective] of [['webgpu','webgpu+wasm']]){const d=native();d.cells[0].backendRequested=requested;d.cells[0].backendEffective=effective;d.cells[0].capability.gpuDispatchVerified=true;assert.doesNotThrow(()=>validateResult(d));}});
test('historical imports retain their original metrics without native reconciliation rules',()=>{const d=structuredClone(historical);const t=d.cells.find(c=>c.status==='measured').trials[0];t.metrics={audioSeconds:999,realTimeFactor:999,firstPcmMs:999,firstSourceChunkCompletedMs:999,downloadBytes:100,idealDownloadSecondsAt1Mbps:999};assert.doesNotThrow(()=>validateResult(d));});
test('GPU interface availability cannot substitute for actual dispatch',()=>{const d=native();d.cells[0].backendRequested='webgpu';d.cells[0].backendEffective='webgpu+wasm';d.cells[0].capability.gpuDispatchVerified=false;assert.throws(()=>validateResult(d,{publication:true}),/dispatch/);});
test('incomplete full article and missing repetition cannot pass',()=>{for(const modify of[d=>d.cells[0].trials[0].validation.chunkCount=92,d=>d.cells[0].trials.pop(),d=>d.cells[0].warmup=[]]){const d=native();modify(d);assert.throws(()=>validateResult(d,{publication:true}));}});
test('empty, negative and nonfinite scores are rejected',()=>{for(const value of[0,-1,NaN,Infinity]){const d=native();d.cells[0].trials[0].generationMs=value;assert.throws(()=>validateResult(d));}});
test('unknown payloads and private paths are rejected',()=>{const d=native();d.environment.machineLabel=['','Users','private','machine'].join('/');assert.throws(()=>validateResult(d),/Private/);const e=native();e.credentials='hidden';assert.throws(()=>validateResult(e),/unexpected/);});
test('native trials cannot substitute a WAV hash for missing float PCM evidence',()=>{const d=native();d.cells[0].trials[0].pcmSha256=null;assert.throws(()=>validateResult(d));});
test('report is deterministic, escapes labels and never plots unsupported as zero',()=>{const d=structuredClone(historical);d.environment.machineLabel='<script>alert(1)</script>';d.cells[0].status='unsupported';d.cells[0].trials=[];d.cells[0].reason='Unavailable diagnostic';const a=renderReport(d);assert.deepEqual(a,renderReport(d));assert.ok(a.svg.includes('&lt;script&gt;'));assert.ok(!a.svg.includes('<script>'));assert.ok(a.svg.includes('unsupported — no score'));assert.equal(median([9,1,4,2,3]),3);});
test('chart truncates long model labels accessibly and preserves short labels exactly',()=>{
 const d=native();
 const short=renderReport(d).svg;
 assert.ok(short.includes('<text x="24" y="115" font-size="14">paradee</text>'));
 assert.ok(!short.includes('aria-label="paradee"'));
 const model='piper-en-gb-southern-english-female-low';
 d.cells[0].model=model;
 const svg=renderReport(d).svg;
 assert.ok(svg.includes(`aria-label="${model}"`));
 assert.ok(svg.includes(`<title>${model}</title>${model.slice(0,25)}…`));
});
test('overview CPU/GPU labels and medians reconcile with distinct historical protocols',async()=>{
 const overview=JSON.parse(await readFile(new URL('../docs/reference-data.json',import.meta.url)));
 const old=JSON.parse(await readFile(new URL('../results/historical-2026-11-08-m1pro-primary-warm/result.json',import.meta.url)));
 for(const row of overview.rows){const cpu=old.cells.find(c=>c.model===row.caseId&&c.backendRequested==='cpu');const gpu=historical.cells.find(c=>c.model===row.caseId&&c.backendRequested==='webgpu');if(cpu)assert.ok(Math.abs(row.cpuWarmSeconds-median(cpu.trials.map(t=>t.generationMs))/1000)<1e-6);else assert.equal(row.cpuWarmSeconds,null);assert.ok(Math.abs(row.gpuWarmSeconds-median(gpu.trials.map(t=>t.generationMs))/1000)<1e-6);}
});
