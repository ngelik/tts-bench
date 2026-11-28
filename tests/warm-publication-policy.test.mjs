import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {renderCampaignOverview} from '../tools/campaign-report.mjs';
import {getAssetLock} from '../lib/catalog.mjs';
import {pairedWarm} from '../tools/result-selection.mjs';
import {validateResult} from '../tools/results.mjs';
import {committedManifest, verifySource} from '../tools/provenance.mjs';

const load = async id => JSON.parse(await readFile(new URL(`../results/${id}/result.json`, import.meta.url)));
const audioId = '2026-11-11t07-33-16-967z-lfm3-audio-2b-gguf-webgpu-warm-b42e4073';
const omniId = '2026-11-11t08-11-31-864z-lfm3-omni-2b-gguf-webgpu-warm-0e07e4f7';

// Simulate the new protocol shape in memory for tests. The archived files keep all five trials.
function oneScoredArticle(source) {
  const result = structuredClone(source);
  result.protocol.repetitions = 1;
  result.cells[0].trials = [{...result.cells[0].trials.at(-1), index: 1}];
  return result;
}
async function scoringRevision(t, parameterEvidence) {
  const directory = await mkdtemp(join(tmpdir(), 'tts-warm-provenance-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd: directory, encoding: 'utf8'}).trim();
  git('init', '-q');
  await writeFile(join(directory, 'assets.lock.json'), JSON.stringify(getAssetLock()));
  if (parameterEvidence) {
    await mkdir(join(directory, 'lib'));
    await writeFile(join(directory, 'lib/model-parameters.json'), JSON.stringify(parameterEvidence));
  }
  git('add', '.');
  git('-c','user.name=Benchmark test','-c','user.email=benchmark@example.test','commit','-qm','Scoring fixture');
  const gitCommit=git('rev-parse','HEAD');
  return {directory, source:{gitCommit,dirty:false,manifestSha256:committedManifest(gitCommit,directory)}};
}
const catalog=JSON.parse(await readFile(new URL('../lib/model-parameters.json',import.meta.url)));

test('a legacy five-trial warm receipt cannot be hand-shortened using current model metadata', async t => {
  const original=await load(audioId);
  const one=oneScoredArticle(original);
  // The genuine published scoring revision predates the parameter catalog.
  const currentCache=new Map([[original.source.gitCommit,original.source.manifestSha256]]);
  assert.throws(() => verifySource(one,process.cwd(),currentCache), /recorded scoring revision lacks/);
  assert.doesNotThrow(() => verifySource(original,process.cwd(),currentCache));

  const old=await scoringRevision(t,null);
  one.source=old.source;
  assert.throws(() => verifySource(one,old.directory), /recorded scoring revision lacks/);
  const id=original.cells[0].model;
  const below=await scoringRevision(t,{[id]:{...catalog[id],parameterCount:1_000_000_000}});
  one.source=below.source;
  assert.throws(() => verifySource(one,below.directory), /does not establish more than one billion/);

  const eligible=await scoringRevision(t,{[id]:catalog[id]});
  one.source=eligible.source;
  verifySource(one,eligible.directory);
  one.assets=one.assets.filter(asset=>asset.id!==getAssetLock().models[id].assets.find(a=>a.kind==='model-weights').id);
  assert.throws(() => verifySource(one,eligible.directory), /differs from the model weights/);
});

test('Warm v3 verifies scoring revision weights without a model-size exception', async t => {
  const registration = await scoringRevision(t, null);
  const receipt = oneScoredArticle(await load('2026-11-09t04-55-36-509z-paradee-cpu-warm-244b2a2f'));
  receipt.protocol.id = 'browser-tts-warm-v3';
  receipt.source = registration.source;
  assert.doesNotThrow(() => verifySource(receipt, registration.directory));

  const model = receipt.cells[0].model;
  const firstWeight = getAssetLock().models[model].assets.find(asset => asset.kind === 'model-weights');
  receipt.assets = receipt.assets.filter(asset => asset.id !== firstWeight.id);
  assert.throws(() => verifySource(receipt, registration.directory), /differs from the model weights/);
});

test('publication validates one full article for an eligible model and preserves the five actual archived trials', async () => {
  const original = await load(audioId);
  const one = oneScoredArticle(original);
  validateResult(one, {publication: true});
  validateResult(original, {publication: true});
  assert.equal(original.cells[0].trials.length, 5);

  for (const repetitions of [2, 3, 4]) {
    const invalid = structuredClone(original);
    invalid.protocol.repetitions = repetitions;
    invalid.cells[0].trials.length = repetitions;
    assert.throws(() => validateResult(invalid, {publication: true}), /scored repetitions/);
  }

  const mixed = structuredClone(one);
  mixed.cells.push({...structuredClone(one.cells[0]), model:'paradee'});
  assert.throws(() => validateResult(mixed, {publication: true}), /scored repetitions/);

  const twoWarmups = structuredClone(one);
  twoWarmups.protocol.warmupRuns = 2;
  twoWarmups.cells[0].warmup.push({...twoWarmups.cells[0].warmup[0], index:2});
  assert.throws(() => validateResult(twoWarmups, {publication:true}), /warm-up/);
});

test('native warm v2 requires exactly three scored rounds or an existing single-round exception', async () => {
  const original=await load(audioId);
  const v2=structuredClone(original);
  v2.protocol.id='browser-tts-warm-v2';
  v2.cells[0].model='tiny-voca';
  v2.protocol.repetitions=3;
  v2.cells[0].trials=v2.cells[0].trials.slice(0,3);
  assert.doesNotThrow(()=>validateResult(v2,{publication:true}));

  const largeThree=structuredClone(original);
  largeThree.protocol.id='browser-tts-warm-v2';
  largeThree.protocol.repetitions=3;
  largeThree.cells[0].trials=largeThree.cells[0].trials.slice(0,3);
  assert.throws(()=>validateResult(largeThree,{publication:true}),/warm v2.*three|scored repetitions/i,
    'eligible greater-than-one-billion models must retain their one-score exception under v2');

  for(const repetitions of [1,2,4,5]) {
    const invalid=structuredClone(original);
    invalid.protocol.id='browser-tts-warm-v2';
    invalid.protocol.repetitions=repetitions;
    invalid.cells[0].model='tiny-voca';
    invalid.cells[0].trials=original.cells[0].trials.slice(0,repetitions);
    assert.throws(()=>validateResult(invalid,{publication:true}),/warm v2.*three|scored repetitions/i);
  }
  const v1three=structuredClone(v2);
  v1three.protocol.id='browser-tts-warm-v1';
  assert.throws(()=>validateResult(v1three,{publication:true}),/at least five scored repetitions/);
  const twoWarmups=structuredClone(v2);
  twoWarmups.protocol.warmupRuns=2;
  assert.throws(()=>validateResult(twoWarmups,{publication:true}),/exactly one excluded/);
  const cachedV2=structuredClone(v2);
  cachedV2.protocol.scenario='cached';
  assert.throws(()=>validateResult(cachedV2,{publication:true}),/only valid for full native warm/);
  const bandwidthV2=structuredClone(v2);
  bandwidthV2.protocol.networkMbps=1;
  assert.throws(()=>validateResult(bandwidthV2,{publication:true}),/warm v2.*networkMbps/i);

  const eligibleOriginal=await load('2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e');
  const eligible=structuredClone(eligibleOriginal);
  eligible.protocol.id='browser-tts-warm-v2';
  eligible.protocol.repetitions=1;
  eligible.cells[0].trials=eligible.cells[0].trials.slice(0,1);
  assert.doesNotThrow(()=>validateResult(eligible,{publication:true}));
});

test('campaign tables and charts show observed counts per model and preserve timing protocol checks', async t => {
  const one=oneScoredArticle(await load(audioId));
  const five=await load(omniId);
  const scoring=await scoringRevision(t,catalog);
  one.source=scoring.source;
  five.source=scoring.source;
  const make = () => renderCampaignOverview([{data:one}, {data:five}], {
    cwd:scoring.directory,reportDir:join(scoring.directory,'reports/check'),
  });
  const {overviewMd,overviewSvg}=make();
  assert.match(overviewMd, /n=1\)/);
  assert.match(overviewMd, /n=5\)/);
  assert.match(overviewMd, /one excluded 20,000-character article/);
  assert.match(overviewSvg, /seconds · n=1/);
  assert.match(overviewSvg, /seconds · n=5/);
  five.protocol.timingBoundary += ' A different timing boundary.';
  assert.throws(make,/timing boundaries differ/);
});

test('unequal native CPU and GPU sample counts do not qualify for a paired speedup', async () => {
  const five=await load(audioId), one=oneScoredArticle(five);
  const cpu=structuredClone(five.cells[0]);
  cpu.backendRequested='cpu';cpu.backendEffective='cpu';cpu.settings.executionProviders=['cpu'];
  assert.equal(pairedWarm({result:five,cell:cpu},{result:one,cell:one.cells[0]},getAssetLock().models[cpu.model]),false);

  const legacySingle=structuredClone(five);
  legacySingle.protocol.repetitions=1;
  legacySingle.cells[0].trials=legacySingle.cells[0].trials.slice(0,1);
  const eligibleCpu=structuredClone(legacySingle.cells[0]);
  eligibleCpu.backendRequested='cpu';eligibleCpu.backendEffective='cpu';eligibleCpu.settings.executionProviders=['wasm'];
  const v2Single=structuredClone(legacySingle);
  v2Single.protocol.id='browser-tts-warm-v2';
  const gpu=structuredClone(v2Single.cells[0]);
  gpu.backendRequested='webgpu';gpu.backendEffective='webgpu+wasm';gpu.settings.executionProviders=['webgpu','wasm'];
  assert.equal(pairedWarm({result:legacySingle,cell:eligibleCpu},{result:v2Single,cell:gpu},getAssetLock().models[cpu.model]),false,
    'a one-observation v1 CPU run cannot pair with a v2 WebGPU run even when counts match');
});
