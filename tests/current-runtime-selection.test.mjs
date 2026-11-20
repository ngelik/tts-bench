import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAssetLock } from '../lib/catalog.mjs';
import { assembleDashboardData } from '../tools/dashboard-data.mjs';
import { referenceBlock, ramChart, ramReferenceBlock } from '../tools/reference.mjs';
import { pairedWarm, preferredAttempts, sameCampaignRegistration } from '../tools/result-selection.mjs';

const oldId = '2026-11-14t15-39-16-252z-ming-3.0-tts-0.5b-gguf-webgpu-cached-680f3a63';
const old = JSON.parse(await readFile(new URL(`../results/${oldId}/result.json`, import.meta.url)));
const id = old.cells[0].model;
const wasmId = 'ming-audio-cpp-bench-browser-wasm';
const model = structuredClone(getAssetLock().models[id]);
const v2 = { sha256: '16810776993fce4e5f43e16ccee98fbd1f3349917002ac875f1d37c80b1db0c3', bytes: 6249852 };
Object.assign(model.assets.find(asset => asset.id === wasmId), v2);
const models = { [id]: model };

// Controlled presentations of the archived v1 receipt, never submitted as runs.
function attempt({version, order, scenario = 'warm', status = 'measured', backend = 'cpu'}) {
  const result = structuredClone(old);
  result.id = `selection-v${version}-${order}-${backend}-${scenario}-${status}`;
  result.createdAt = new Date(Date.UTC(2030, 0, order)).toISOString();
  if (scenario === 'warm') result.protocol = { ...result.protocol, id: 'browser-tts-warm-v1', scenario };
  if (version === 2) Object.assign(result.assets.find(asset => asset.id === wasmId), v2);
  const cell = result.cells[0];
  cell.backendRequested = backend;
  cell.backendEffective = backend;
  cell.settings.executionProviders = [backend];
  cell.status = status;
  if (status !== 'measured') {
    cell.trials = [];
    cell.reason = 'Test failure';
  }
  return result;
}
const view = results => assembleDashboardData({results, models}).models[0];
const speedTable = results => referenceBlock(results, models).split('Each native warm score')[0];

for (const scenario of ['warm','cached']) {
  test(`${scenario} chooses the registered runtime before recency, including errors`, () => {
    const current = attempt({version: 2, order: 1, scenario});
    const laterSuccess = attempt({version: 1, order: 2, scenario});
    const laterError = attempt({version: 1, order: 4, scenario, status: 'error'});
    const currentError = attempt({version: 2, order: 3, scenario, status: 'error'});
    const field = scenario === 'warm' ? 'warm' : 'memory';
    const render = scenario === 'warm' ? speedTable : results => ramReferenceBlock(results, models);
    for (const [expected, others] of [[current,[laterSuccess,laterError]], [currentError,[current,laterSuccess,laterError]]]) {
      const results = [expected,...others].sort((a,b) => a.createdAt.localeCompare(b.createdAt));
      assert.equal(view(results)[field].cpu.resultId, expected.id);
      assert.equal(view(results)[field].cpu.status, expected.cells[0].status);
      const table = render(results);
      assert.ok(table.includes(`results/${expected.id}/summary.md`));
      assert.ok(!table.includes(laterSuccess.id));
      assert.ok(!table.includes(laterError.id));
      if (scenario === 'cached' && expected === currentError) {
        assert.match(ramChart(results, models), />error</);
      }
      const archive = referenceBlock(results, models).split('<summary>All submitted results')[1];
      for (const result of results) assert.ok(archive.includes(result.id));
    }
    assert.equal(view([laterError,laterSuccess])[field].cpu.resultId, laterError.id);
  });
}

test('a current error stays visible when an older runtime succeeds later', () => {
  const currentFailure = attempt({version: 2, order: 1, status: 'error'});
  const oldSuccess = attempt({version: 1, order: 2});
  assert.equal(view([oldSuccess,currentFailure]).warm.cpu.resultId, currentFailure.id);
  assert.ok(speedTable([oldSuccess,currentFailure]).includes(`[error](results/${currentFailure.id}/summary.md)`));
});

test('model and runtime hashes and sizes determine priority, independent of notices and receipt names', () => {
  const current = attempt({version: 2, order: 1});
  const later = attempt({version: 2, order: 2});
  const last = () => view([current,later]).warm.cpu.resultId;
  for (const key of ['ming-gguf-weights', 'ming-audio-cpp-bench-browser-js', wasmId]) {
    const asset = later.assets.find(value => value.id === key);
    const original = {...asset};
    for (const change of [{sha256:'0'.repeat(64)},{bytes:0}]) {
      Object.assign(asset, change);
      assert.equal(last(),current.id);
      Object.assign(asset, original);
    }
  }
  later.assets = later.assets.filter(asset => !['ming-gguf-card','ming-gguf-license','ming-audio-cpp-runtime-notices'].includes(asset.id));
  assert.equal(last(),later.id);
  later.origin='historical-import';
  assert.equal(last(),current.id);
  later.origin='native';
  later.assets=later.assets.filter(asset => asset.id !== wasmId);
  assert.equal(last(),current.id);
});

test('memory and warm candidates keep independent backend and environment fallbacks', () => {
  const current = attempt({version:2,order:1});
  const oldGpu = attempt({version:1,order:2,backend:'webgpu'});
  const oldMemory = attempt({version:1,order:3,scenario:'cached'});
  const other = attempt({version:1,order:4});
  other.environment.machineLabel='Different machine';
  const results = [current, oldGpu, oldMemory, other];
  assert.equal(view(results).warm.webgpu.resultId, oldGpu.id);
  assert.equal(view(results).memory.cpu.resultId, oldMemory.id);
  for(const result of [current, oldGpu, other]) assert.ok(speedTable(results).includes(result.id));
});

test('warm comparisons and preferred clips follow complete compatible evidence', () => {
  const cpu = attempt({version:2,order:1});
  const gpu = attempt({version:2,order:2,backend:'webgpu'});
  const oldGpu = attempt({version:1,order:3,backend:'webgpu'});
  const audioEntries=[gpu,oldGpu].map(r=>({resultId:r.id,model:id,backend:'webgpu'}));
  const row = assembleDashboardData({results:[cpu,gpu,oldGpu],models,audioEntries}).models[0];
  assert.equal(row.pairedWarm,true);
  assert.equal(row.audio.length,2);
  assert.equal(row.preferredAudio.webgpu.resultId,gpu.id);
  assert.equal(view([cpu,oldGpu]).pairedWarm,false);
  assert.ok(!speedTable([cpu,oldGpu]).includes('matched configuration'));
  gpu.assets=[]; cpu.assets=[];
  assert.equal(view([cpu,gpu]).pairedWarm,false);
});

test('npm runtime files use the stage receipt identity, and configuration and voice assets participate', () => {
  const shell=attempt({version:2,order:1});
  const runtime={package:'engine',files:[{target:'runtime/engine.js',path:'dist/engine.js',sha256:'c'.repeat(64),bytes:17}]};
  const assets=['model-config','voice','model-weights'].map((kind,i)=>({kind,id:kind,target:'model/'+kind,sha256:'a'.repeat(64),bytes:1+i}));
  const catalog={[id]:{assets,runtime}};
  shell.assets=[...assets,{id:`runtime:${id}:engine:dist/engine.js`,...runtime.files[0]}];
  const short=structuredClone(shell);
  for(const asset of shell.assets){
    short.assets=shell.assets.filter(row=>row.id!==asset.id);
    const selected=preferredAttempts([shell,short], catalog, ()=>true);
    assert.deepEqual(selected.map(entry=>entry.result),[shell]);
  }
});

test('legacy Paradee runtime IDs prove the same files only with matching digests and sizes', async () => {
  const ids = [
    '2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f',
    '2026-11-09t05-06-08-477z-paradee-webgpu-warm-c3836dc0',
  ];
  const results = await Promise.all(ids.map(async id => JSON.parse(await readFile(new URL(`../results/${id}/result.json`,import.meta.url)))));
  const models = {paradee:getAssetLock().models.paradee};
  const output = () => assembleDashboardData({results,models}).models[0];
  assert.equal(output().pairedWarm,true);
  assert.equal(output().warm.cpu.registration,'current');
  results[0].assets.find(a=>a.id.endsWith('dist/phonemizer.js')).bytes++;
  assert.equal(output().pairedWarm,false);
  assert.equal(output().warm.cpu.registration,'archived');
});

test('ZONOS backend-scoped CPU WASM updates preserve the verified WebGPU profile', async () => {
  const gpuId = '2026-11-19t05-59-40-287z-zonos3-mini-webgpu-warm-091d4772';
  const gpu = JSON.parse(await readFile(new URL(`../results/${gpuId}/result.json`, import.meta.url)));
  const zonos = getAssetLock().models['zonos3-mini'];
  const zonosModels = {'zonos3-mini': zonos};
  const selectedGpu = preferredAttempts([gpu], zonosModels, () => true);
  assert.equal(gpu.cells[0].backendEffective, 'webgpu+cpu-codec-host', 'the tested WebGPU adapter includes its pinned CPU codec stage');
  assert.equal(selectedGpu.length, 1);
  assert.equal(selectedGpu[0].current, true);
  const gpuView = assembleDashboardData({results: [gpu], models: zonosModels}).models.find(value => value.id === 'zonos3-mini');
  assert.equal(gpuView.warm.webgpu.registration, 'current');
  assert.equal(gpuView.pairedWarm, false);

  const preResetCpu = structuredClone(gpu);
  preResetCpu.id += '-cpu-v3-before-session-reset';
  preResetCpu.cells[0].backendRequested = 'cpu';
  preResetCpu.cells[0].backendEffective = 'cpu/wasm';
  assert.equal(preferredAttempts([preResetCpu], zonosModels, () => true)[0].current, false,
    'the prior CPU v3 registration without the pinned reset policy is archived');

  const v2Cpu = structuredClone(gpu);
  v2Cpu.id += '-cpu-v2-fixture';
  v2Cpu.cells[0].backendRequested = 'cpu';
  const oldWasm = v2Cpu.assets.find(asset => asset.id === 'zonos3-cpu-runtime-wasm');
  Object.assign(oldWasm, {bytes: 4231507, sha256: '690469b7955ad0742538257769520a14a4766f2cedc4212fdfd91fe150dd4a17'});
  assert.equal(preferredAttempts([v2Cpu], zonosModels, () => true)[0].current, false,
    'the previous CPU runtime remains ineligible under the v3 CPU profile');

  const missingGpuRuntime = structuredClone(gpu);
  missingGpuRuntime.assets = missingGpuRuntime.assets.filter(asset => !asset.id.endsWith(':worker.js'));
  assert.equal(preferredAttempts([missingGpuRuntime], zonosModels, () => true)[0].current, false,
    'the backend-scoped filter still requires the actual WebGPU runtime');

  const changedSharedAsset = structuredClone(gpu);
  changedSharedAsset.assets.find(asset => asset.id === 'zonos3-web-backbone-manifest-json').sha256 = '0'.repeat(64);
  assert.equal(preferredAttempts([changedSharedAsset], zonosModels, () => true)[0].current, false,
    'untagged shared model assets remain required');

  assert.equal(sameCampaignRegistration('zonos3-mini', zonos,
    {...structuredClone(zonos), assets: zonos.assets.map(asset => asset.id === 'zonos3-cpu-runtime-wasm'
      ? {...asset, bytes: 4231507, sha256: '690469b7955ad0742538257769520a14a4766f2cedc4212fdfd91fe150dd4a17'} : asset)}, 'webgpu'), true);
  assert.equal(sameCampaignRegistration('zonos3-mini', zonos,
    {...structuredClone(zonos), assets: zonos.assets.map(asset => asset.id === 'zonos3-cpu-runtime-wasm'
      ? {...asset, bytes: 4231507, sha256: '690469b7955ad0742538257769520a14a4766f2cedc4212fdfd91fe150dd4a17'} : asset)}, 'cpu'), false);

  const otherRevisionCpu = structuredClone(gpu);
  otherRevisionCpu.source.manifestSha256 = 'f'.repeat(64);
  otherRevisionCpu.cells[0].backendRequested = 'cpu';
  assert.equal(pairedWarm({result: otherRevisionCpu, cell: otherRevisionCpu.cells[0]},
    {result: gpu, cell: gpu.cells[0]}, zonos), false,
  'cross-source evidence cannot be labeled as a matched CPU/WebGPU pair');

  const invalidScope = structuredClone(zonos);
  invalidScope.assets.find(asset => asset.id === 'zonos3-cpu-runtime-wasm').backends = ['webgpu', 'cuda'];
  assert.throws(() => preferredAttempts([gpu], {'zonos3-mini': invalidScope}, () => true), /Invalid backend scope/);
});

test('playback prefers the selected current warm clip, then current cached clip, even with later archived audio', () => {
  const warm = attempt({version:2, order:1});
  const cached = attempt({version:2, order:2, scenario:'cached'});
  const staleWarm = attempt({version:1, order:3});
  const staleCached = attempt({version:1, order:4, scenario:'cached'});
  const results = [warm,cached,staleWarm,staleCached];
  const clips = results.map(result=>({resultId:result.id,model:id,backend:'cpu'}));
  const row = (results,audioEntries) => assembleDashboardData({results,models,audioEntries}).models[0];
  assert.equal(row(results,clips).playbackAudio.cpu.resultId,warm.id);
  const withoutWarm = row(results,clips.slice(1));
  assert.equal(withoutWarm.playbackAudio.cpu.resultId,cached.id);
  assert.equal(withoutWarm.playbackAudio.cpu.matchesSelectedMemory,true);
  assert.equal(withoutWarm.audio.length,3);
  assert.equal(row(results.slice(1),clips.slice(1)).playbackAudio.cpu.resultId,cached.id);
});
