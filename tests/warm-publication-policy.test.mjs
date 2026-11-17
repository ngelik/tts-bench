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
});
