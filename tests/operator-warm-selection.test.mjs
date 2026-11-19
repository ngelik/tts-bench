import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { sha256, validateResult } from '../tools/results.mjs';
import { getAssetLock } from '../lib/catalog.mjs';
import { loadAudio8WarmSelection, loadCosyWarmSelection, loadWarmSelections,
  AUDIO8_WARM_SELECTION_PATH, AUDIO8_WARM_SELECTION_RESULT_ID } from '../tools/warm-selection.mjs';
import { assembleDashboardData } from '../tools/dashboard-data.mjs';
import { referenceBlock } from '../tools/reference.mjs';
import { renderCampaignOverview } from '../tools/campaign-report.mjs';

const cachedId = '2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a';
const trackedFiles = new Map();
const tracked = path => {
  if (!trackedFiles.has(path)) trackedFiles.set(path, execFileSync('git', ['show', `HEAD:${path}`], { maxBuffer: 20_000_000 }));
  return trackedFiles.get(path);
};
async function put(cwd, path, data) {
  await mkdir(dirname(join(cwd, path)), { recursive: true });
  await writeFile(join(cwd, path), Buffer.isBuffer(data) ? data : JSON.stringify(data));
}
async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'tts-selection-unit-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const cachedBytes = tracked(`results/${cachedId}/result.json`);
  const cached = JSON.parse(cachedBytes);
  // Synthetic unit fixture only: never emitted into results/ or represented as a measurement.
  const raw = structuredClone(cached);
  raw.id = AUDIO8_WARM_SELECTION_RESULT_ID;
  raw.protocol = { ...raw.protocol, id: 'browser-tts-warm-v1', scenario: 'warm', warmupRuns: 1, repetitions: 5 };
  const trial = raw.cells[0].trials[0];
  delete trial.memory;
  delete trial.audio;
  for (const key of Object.keys(trial.metrics)) if (/Rss|SampleCount/.test(key)) delete trial.metrics[key];
  raw.cells[0] = { ...raw.cells[0], status: 'error', reason: 'Synthetic unit fixture: operator stop after trial 1.', warmup: [structuredClone(trial)], trials: [trial] };
  validateResult(raw, { publication: true });
  const selection = { schemaVersion: 1, kind: 'operator-shortened-warm-selection', resultId: raw.id,
    receiptSha256: sha256(Buffer.from(JSON.stringify(raw))), modelId: raw.cells[0].model,
    backend: 'cpu', scenario: 'warm', sourceCommit: raw.source.gitCommit,
    originalPlannedRepetitions: 5, warmupCompleted: true, selectedScoredTrialIndexes: [1],
    stopReason: 'User requested retaining the first completed scored article only.',
    warmupCheckpoint: { resultId: raw.id, trialIndex: 1 }, pairedCachedResultId: cached.id };
  await put(cwd, `results/${cached.id}/result.json`, cachedBytes);
  const save = async () => {
    selection.receiptSha256 = sha256(Buffer.from(JSON.stringify(raw)));
    await put(cwd, `results/${raw.id}/result.json`, raw);
    await put(cwd, AUDIO8_WARM_SELECTION_PATH, selection);
  };
  await save();
  return { cwd, raw, cached, selection, save, load: () => loadAudio8WarmSelection([raw, cached], { cwd }) };
}

test('Audio8 n1 display preserves native error, n5 plan, cached lineage and visible count', async t => {
  const f = await fixture(t); const original = JSON.stringify(f.raw);
  const selection = await f.load();
  assert.equal(selection.cell.status, 'measured');
  assert.equal(selection.rawReceiptStatus, 'error');
  assert.equal(selection.cell.trials.length, 1);
  assert.equal(selection.originalPlannedRepetitions, 5);
  assert.equal(selection.cachedAudioMatchesSelectedPcm, true);
  assert.equal(JSON.stringify(f.raw), original);
  const models = getAssetLock().models;
  const data = assembleDashboardData({ results: [f.raw, f.cached], models, warmSelections: [selection] });
  const row = data.models.find(model => model.id === selection.modelId);
  assert.equal(row.warm.cpu.n, 1);
  assert.equal(row.warm.cpu.receiptStatus, 'error');
  assert.equal(row.pairedWarm, false);
  assert.ok(row.warm.cpu.selectionReportUrl.endsWith('/audio8-codec-repair/cpu-warm-selection.md'));
  const block = referenceBlock([f.raw, f.cached], models, [], [], [], [selection]);
  assert.match(block, /n=1 of 5 planned; selected/);
  assert.ok(block.includes(selection.selectionReportPath));
  assert.ok(block.includes(`results/${f.raw.id}/summary.md`));
  assert.doesNotMatch(block, /Reviewed CosyVoice3 CPU selection/);
  const report = renderCampaignOverview([{ data: f.raw, digest: selection.receiptSha256 }], {
    reportDir: join(f.cwd, 'reports', 'unit-only'), warmSelections: [selection],
    // Source authentication has its own tests; this unit exercises selection rendering.
    sourceCache: new Map([[f.raw.source.gitCommit, f.raw.source.manifestSha256]]),
  });
  assert.match(report.overviewMd, /n=1 of 5 planned/);
  assert.match(report.overviewMd, /n=1 is a single observation/);
  assert.match(report.overviewMd, /1 completed scored article selected/);
  assert.doesNotMatch(report.overviewMd, /All submitted cells are measured/);
  assert.match(report.overviewMd, /\| cpu \| Error \| Synthetic unit fixture/);
  assert.match(report.overviewSvg, /n=1 of 5 planned/);
  assert.doesNotMatch(report.overviewMd, /operator stopped during the next trial/i);

});

test('only explicitly reviewed native ID/source/count/backend can be selected', async t => {
  const f = await fixture(t);
  f.selection.selectedScoredTrialIndexes = [2]; await f.save();
  await assert.rejects(f.load, /field values/);
  f.selection.selectedScoredTrialIndexes = [1]; f.raw.source.gitCommit = 'a'.repeat(40); f.selection.sourceCommit = f.raw.source.gitCommit; await f.save();
  await assert.rejects(f.load, /provenance|operator stop/);
});

test('receipt digest and full per-span waveform are mandatory', async t => {
  const f = await fixture(t);
  f.selection.receiptSha256 = '0'.repeat(64); await put(f.cwd, AUDIO8_WARM_SELECTION_PATH, f.selection);
  await assert.rejects(f.load, /digest changed/);
  delete f.raw.cells[0].trials[0].validation.waveform; await f.save();
  await assert.rejects(f.load, /waveform/);
});

test('unearned second score and metadata-only backend substitution are rejected', async t => {
  const f = await fixture(t);
  f.raw.cells[0].trials.push({ ...structuredClone(f.raw.cells[0].trials[0]), index: 2 }); await f.save();
  await assert.rejects(f.load, /operator stop/);
  f.raw.cells[0].trials.pop(); f.raw.cells[0].backendEffective = 'webgpu+wasm'; await f.save();
  await assert.rejects(f.load, /provenance|operator stop/);
});

test('cached PCM mismatch stays explicitly separate and cannot claim audio identity', async t => {
  const f = await fixture(t);
  f.raw.cells[0].trials[0].pcmSha256 = '1'.repeat(64); await f.save();
  assert.equal((await f.load()).cachedAudioMatchesSelectedPcm, false);
});

test('unreviewed Audio8 error stays error, unrelated result sets need no sidecar', async t => {
  const f = await fixture(t);
  await rm(join(f.cwd, AUDIO8_WARM_SELECTION_PATH));
  assert.deepEqual(await loadWarmSelections([f.raw], { cwd: f.cwd }), []);
  assert.deepEqual(await loadWarmSelections([f.cached], { cwd: f.cwd }), []);
  const data = assembleDashboardData({ results: [f.raw, f.cached], models: getAssetLock().models });
  assert.equal(data.models.find(model => model.id === f.raw.cells[0].model).warm.cpu.status, 'error');
});

test('existing Cosy selection retains its exact two original trial objects and report', async t => {
  const cwd = await mkdtemp(join(tmpdir(), 'tts-cosy-selection-unit-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const path = 'docs/campaigns/nov14-english/cosy-cpu-warm-selection.json';
  const bytes = tracked(path); const sidecar = JSON.parse(bytes); await put(cwd, path, bytes);
  const results = [];
  for (const id of [sidecar.resultId, sidecar.pairedCachedResultId]) {
    const bytes = tracked(`results/${id}/result.json`); await put(cwd, `results/${id}/result.json`, bytes); results.push(JSON.parse(bytes));
  }
  const selected = await loadCosyWarmSelection(results, { cwd });
  assert.deepEqual(selected.cell.trials, results[0].cells[0].trials);
  assert.deepEqual(selected.selectedScoredTrialIndexes, [1, 2]);
  assert.equal(selected.selectionReportPath, 'reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection');
});
