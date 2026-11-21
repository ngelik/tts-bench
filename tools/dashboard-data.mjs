import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateCampaignCell } from '../lib/campaign-plan.mjs';
import { defaultFixtureForModel, listBenchmarkFixtures } from '../lib/benchmark-fixtures.mjs';
import { getAssetLock } from '../lib/catalog.mjs';
import { readResult, resultPaths, sha256, median } from './results.mjs';
import { verifySource } from './provenance.mjs';
import { checkAudio } from './audio.mjs';
import { affectedTrials, waveformFinding, waveformReport } from '../audio/waveform-integrity.mjs';
import { outputLengthNotes } from './output-notes.mjs';
import { loadWarmSelections } from './warm-selection.mjs';

import { ENVIRONMENT_COHORT_FIELDS, stable, pairedWarm, preferredAttempts, sameCampaignRegistration } from './result-selection.mjs';

const BACKENDS = ['cpu', 'webgpu'];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const latestOrder = (a, b) => a.result.createdAt.localeCompare(b.result.createdAt) || a.result.id.localeCompare(b.result.id);
const receiptUrl = id => `https://github.com/ngelik/tts-bench/blob/main/results/${id}/summary.md`;
const missingMetric = (reason, fields) => ({
  status: 'unavailable', reason, resultId: null, reportUrl: null, origin: null,
  createdAt: null, protocolId: null, sourceCommit: null, sourceFingerprint: null,
  environment: null, cohortKey: null, registration: null, ...fields,
});

function cohortKey(result) {
  return sha256(stable({
    // Comparison cohorts omit environment.gpu so CPU null and the compatible
    // WebGPU adapter observation still group together.
    environment: Object.fromEntries(ENVIRONMENT_COHORT_FIELDS.map(key => [key, result.environment[key]])),
    sourceCommit: result.source.gitCommit,
    sourceFingerprint: result.source.manifestSha256,
    protocol: result.protocol,
    fixture: result.fixture,
  }));
}

function metricBase({ result, cell, current, selection }) {
  const affected = affectedTrials(cell);
  return {
    ...(affected.length ? { waveform: { finding: waveformFinding, url: waveformReport,
      diagnosticSeconds: affected.map(trial => trial.generationMs / 1000) } } : {}),
    status: cell.status,
    reason: cell.reason,
    resultId: result.id,
    reportUrl: receiptUrl(result.id),
    registration: current ? 'current' : 'archived',
    origin: result.origin,
    scenario: result.protocol.scenario,
    createdAt: result.createdAt,
    protocolId: result.protocol.id,
    sourceCommit: result.source.gitCommit,
    sourceFingerprint: result.source.manifestSha256,
    environment: structuredClone(result.environment),
    cohortKey: cohortKey(result),
    ...(selection ? {
      selectionKind: 'operator-shortened-warm-selection',
      selectionPath: selection.selectionPath,
      selectionSha256: selection.selectionSha256,
      selectedTrialIndexes: selection.selectedScoredTrialIndexes,
      originalPlannedRepetitions: selection.originalPlannedRepetitions,
      stopReason: selection.stopReason,
      receiptStatus: selection.rawReceiptStatus,
      receiptReason: selection.rawReceiptReason,
      pairedCachedResultId: selection.pairedCachedResultId,
      cachedAudioMatchesSelectedPcm: selection.cachedAudioMatchesSelectedPcm,
      selectionReportUrl: `https://github.com/ngelik/tts-bench/blob/main/${selection.selectionReportPath}`,
    } : {}),
  };
}

/**
 * Pick the preferred measured attempt (native before historical), unless a
 * later non-measured attempt exists. This keeps native evidence preferred
 * without hiding a later unsupported/error result.
 */
export function selectLatestAttempt(candidates) {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort(latestOrder);
  const measured = sorted.filter(candidate => candidate.cell.status === 'measured');
  const preferred = [...measured].reverse().find(candidate => candidate.result.origin === 'native') ?? measured.at(-1) ?? null;
  const latestFailure = [...sorted].reverse().find(candidate => candidate.cell.status !== 'measured') ?? null;
  if (!preferred) return latestFailure ?? sorted.at(-1);
  if (latestFailure && latestOrder(latestFailure, preferred) > 0) return latestFailure;
  return preferred;
}

function collectByModelBackend(results, models, predicate) {
  const grouped = new Map();
  for (const attempt of preferredAttempts(results, models, predicate)) {
    const key = `${attempt.cell.model}/${attempt.cell.backendRequested}`;
    const entries = grouped.get(key) ?? [];
    entries.push(attempt);
    grouped.set(key, entries);
  }
  return grouped;
}

function createWarmMetric(candidate) {
  if (!candidate) return missingMetric('No warm result has been submitted.', {
    medianSeconds: null, minSeconds: null, maxSeconds: null, n: null,
    firstPcmMs: null, rtf: null, audioSeconds: null,
  });
  const { cell } = candidate;
  const base = metricBase(candidate);
  if (cell.status !== 'measured' || base.waveform) return {
    ...base, ...(cell.status === 'measured' ? { status: 'unavailable', evidenceStatus: 'measured', displayStatus: 'Diagnostic PCM', reason: waveformFinding } : {}), medianSeconds: null, minSeconds: null, maxSeconds: null, n: null,
    firstPcmMs: null, rtf: null, audioSeconds: null,
  };
  const trials = cell.trials;
  const generationMs = trials.map(trial => trial.generationMs);
  const firstPcm = trials.map(trial => trial.metrics?.firstPcmMs).filter(finite);
  const rtfs = trials.map(trial => trial.generationMs / (trial.samples / trial.sampleRate * 1000));
  const durations = trials.map(trial => trial.samples / trial.sampleRate);
  const outputNotes = outputLengthNotes(cell);
  return {
    ...base,
    ...(outputNotes ? { outputNotes } : {}),
    medianSeconds: median(generationMs) / 1000,
    minSeconds: Math.min(...generationMs) / 1000,
    maxSeconds: Math.max(...generationMs) / 1000,
    n: trials.length,
    firstPcmMs: firstPcm.length ? median(firstPcm) : null,
    rtf: median(rtfs),
    audioSeconds: median(durations),
  };
}

export function summarizeMemoryTrials(trials) {
  const means = [];
  let peakRss = 0;
  let sampleCount = 0;
  for (const trial of trials) {
    if (trial.memory?.availability !== 'measured' || !finite(trial.metrics?.generationMeanRssBytes)) return null;
    means.push(trial.metrics.generationMeanRssBytes);
    const start = trial.memory.generationStartedAtEpochMs;
    const end = trial.memory.finalPcmAtEpochMs;
    for (const [at, rss] of trial.memory.samples) {
      if (at >= start && at <= end) {
        peakRss = Math.max(peakRss, rss);
        sampleCount++;
      }
    }
  }
  if (!means.length || !sampleCount) return null;
  return {
    meanMB: mean(means) / 1_000_000,
    peakMB: peakRss / 1_000_000,
    n: means.length,
    sampleCount,
  };
}

function createMemoryMetric(candidate) {
  if (!candidate) return missingMetric('No native cached resource result has been submitted.', {
    meanMB: null, peakMB: null, n: null, sampleCount: null, generationSeconds: null, audioSeconds: null,
  });
  const { cell } = candidate;
  const base = metricBase(candidate);
  if (cell.status !== 'measured') return {
    ...base, meanMB: null, peakMB: null, n: null, sampleCount: null, generationSeconds: null, audioSeconds: null,
  };
  const summary = summarizeMemoryTrials(cell.trials);
  if (!summary) return {
    ...base, status: 'unavailable', reason: 'Generation RSS evidence is missing, unmeasured, or has no in-window samples.',
    evidenceStatus: cell.status, meanMB: null, peakMB: null, n: null, sampleCount: null, generationSeconds: null, audioSeconds: null,
  };
  return {
    ...base,
    ...summary,
    generationSeconds: median(cell.trials.map(trial => trial.generationMs / 1000)),
    audioSeconds: median(cell.trials.map(trial => trial.samples / trial.sampleRate)),
  };
}

function describeMissingScore(metric, model, backend, scenario, resource, scheduled = false, modelId = null) {
  if (metric.resultId) {
    if (scheduled && metric.registration === 'archived' && model.backends.includes(backend)) {
      return { ...metric, pendingCurrent: `Awaiting ${scenario} result for the current registration.` };
    }
    return metric;
  }
  if (!model.backends.includes(backend)) {
    const onlyBackend = model.backends.length === 1 && model.backends[0];
    const label = onlyBackend === 'cpu' ? 'CPU only' : onlyBackend === 'webgpu' ? 'WebGPU only' : 'No backend';
    return { ...metric, displayStatus: label, reason: 'The registered configuration supports ' +
      model.backends.map(b => b === 'cpu' ? 'CPU' : 'WebGPU').join(' and ') + '.' };
  }
  if (scenario === 'warm') {
    const scoreLabel = modelId === 'fun-cosyvoice3-0.5b-2512' ? 'single scored warm generation result' : 'repeated warm generation score';
    const reason = resource.status === 'measured'
      ? `A full-article memory run is available in the model details. The ${scoreLabel} has not been published.`
      : `No ${scoreLabel} has been published for this configuration and backend.`;
    return {
      ...metric,
      displayStatus: scheduled ? 'Awaiting warm result' : 'No warm score',
      reason: scheduled ? 'This backend is in the published warm benchmark schedule. ' + reason : reason,
    };
  }
  if (scheduled) return {
    ...metric, displayStatus: 'Awaiting memory result',
    reason: 'A full-article cached run with Chrome memory sampling is in the published benchmark schedule.',
  };
  return { ...metric, displayStatus: 'No memory run' };
}

function verifiedModelMB(model, candidates) {
  const weights = model.assets.filter(asset => asset.kind === 'model-weights');
  if (!weights.length) return null;
  const qualifying = candidates.filter(candidate => candidate?.result.origin === 'native');
  const hasVerifiedSet = qualifying.some(({ result }) => weights.every(weight =>
    result.assets.some(asset => asset.id === weight.id && asset.sha256 === weight.sha256 && asset.bytes === weight.bytes)));
  return hasVerifiedSet ? weights.reduce((sum, asset) => sum + asset.bytes, 0) / 1_000_000 : null;
}

function officialSourceUrl(model) {
  const source = model.support.sources.find(url => typeof url === 'string' && url.startsWith('https://huggingface.co/')) ?? model.support.sources[0];
  if (!source) return null;
  const match = source.match(/^(https:\/\/huggingface\.co\/[^/]+\/[^/]+)(?:\/(?:blob|tree|resolve|raw)\/[^/]+(?:\/.*)?)?$/);
  return match?.[1] ?? source;
}

function enrichAudio(entries, resultsById, selectedWarm, selectedMemory) {
  return entries.map(entry => {
    const result = resultsById.get(entry.resultId);
    if (!result) throw new Error(`Audio manifest refers to missing result ${entry.resultId}`);
    const key = `${entry.model}/${entry.backend}`;
    return {
      ...structuredClone(entry),
      scenario: result.protocol.scenario,
      sourceCreatedAt: result.createdAt,
      sourceOrigin: result.origin,
      matchesSelectedWarm: selectedWarm.get(key)?.result.id === entry.resultId,
      matchesSelectedMemory: selectedMemory.get(key)?.result.id === entry.resultId,
      reportUrl: receiptUrl(entry.resultId),
    };
  });
}

function hasEligibleFullFixtureResult(results, fixtureId, selectedWarmResultIds) {
  return results.some(result => {
    if (result.fixture?.id !== fixtureId || result.protocol.smoke) return false;
    if (selectedWarmResultIds.has(result.id)) return true;
    return result.cells.some(cell => {
      if (cell.status !== 'measured' || !cell.trials?.length || affectedTrials(cell).length) return false;
      if (result.protocol.scenario === 'warm') return true;
      return result.origin === 'native' && result.protocol.scenario === 'cached' &&
        result.protocol.id.endsWith('-resources') && summarizeMemoryTrials(cell.trials) !== null;
    });
  });
}

/** Pure assembly helper. Inputs must already be validated receipts and audio entries. */
export function assembleDashboardData(input) {
  const { results, models, audioEntries = [], campaignCells = [], fixtureRegistry = listBenchmarkFixtures() } = input;
  const receiptModels = new Set(results.filter(result => !result.protocol.smoke).flatMap(result => result.cells.map(cell => cell.model)));
  const fixturesByLanguage = new Map();
  for (const fixture of fixtureRegistry) {
    const editions = fixturesByLanguage.get(fixture.language) ?? [];
    editions.push(fixture);
    fixturesByLanguage.set(fixture.language, editions);
  }
  const selectedWarmResultIds = new Set([...(input.warmSelections ?? []), input.warmSelection].filter(Boolean).map(selection => selection.resultId));
  // A registry-only edition must not hide the most recently measured edition.
  // Promote a newer version only after it has a usable full-article result.
  const editions = new Map([...fixturesByLanguage].map(([language, fixtures]) => {
    const newest = fixtures.at(-1);
    const displayed = [...fixtures].reverse().find(fixture => hasEligibleFullFixtureResult(results, fixture.id, selectedWarmResultIds)) ?? newest;
    return [language, displayed];
  }));
  const languages = [...editions.keys()].map(id => {
    const name = new Intl.DisplayNames([id], {type: 'language'}).of(id);
    return {id, label: name[0].toLocaleUpperCase(id) + name.slice(1)};
  });
  const byLanguage = {};
  for (const {id} of languages) {
    const fixture = editions.get(id);
    const localResults = results.filter(result => result.fixture.id === fixture.id);
    const localIds = new Set(localResults.map(result => result.id));
    const tested = new Set(localResults.flatMap(result => result.cells.map(cell => cell.model)));
    const localSchedule = campaignCells.filter(cell => (cell.fixtureId ?? 'english-20k-v1') === fixture.id);
    const scheduled = new Set(localSchedule.map(cell => cell.model));
    // Keep registered, untested configurations discoverable without treating
    // advertised language coverage as a measurement.
    const localModels = Object.fromEntries(Object.entries(models).filter(([key, model]) =>
      tested.has(key) || scheduled.has(key) || (!receiptModels.has(key) && defaultFixtureForModel(key) === fixture.id)));
    const localAudio = audioEntries.filter(entry => localIds.has(entry.resultId));
    byLanguage[id] = {...assembleLanguageData({...input, models: localModels, results: localResults,
      audioEntries: localAudio, campaignCells: localSchedule}), fixture: {
        id: fixture.id, language: id, articleFile: fixture.articleFile,
        characters: fixture.unicodeCodePoints, chunks: fixture.chunks,
      }};

  }
  const {en, ...translations} = byLanguage;
  const activeModels = [...(en?.models ?? []), ...Object.values(translations).flatMap(group => group.models ?? [])];
  const resultsById = new Map(results.map(result => [result.id, result]));
  const activeAudioByPath = new Map(activeModels.flatMap(model => model.audio ?? []).map(entry => [entry.clip.path, entry]));
  const recordings = enrichAudio(audioEntries, resultsById, new Map(), new Map()).map(entry => {
    const current = activeAudioByPath.get(entry.clip.path);
    return {...(current ?? entry), name:models[entry.model]?.displayName ?? entry.name ?? entry.model};
  });
  return {...en, languages, byLanguage: translations, recordings};
}

function assembleLanguageData({ results, models, audioEntries = [], campaignCells = [], warmSelection = null, warmSelections = [] }) {
  const scheduledWarm = new Set(campaignCells.filter(cell => cell.scenario === 'warm')
    .map(cell => `${cell.model}/${cell.backend}`));
  const scheduledMemory = new Set(campaignCells.filter(cell => cell.scenario === 'cached' && cell.resources === true)
    .map(cell => `${cell.model}/${cell.backend}`));
  const warmCandidates = collectByModelBackend(results, models, result => !result.protocol.smoke && result.protocol.scenario === 'warm');
  for (const selection of [...warmSelections, warmSelection].filter(Boolean)) {
    for (const candidates of warmCandidates.values()) for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      if (candidate.result.id === selection.resultId) {
        if (candidate.cell.status !== selection.rawReceiptStatus || candidate.cell.reason !== selection.rawReceiptReason) {
          throw new Error('Reviewed warm selection no longer matches the displayed source receipt.');
        }
        candidates[index] = { ...candidate, cell: selection.cell, selection };
      }
    }
  }
  const memoryCandidates = collectByModelBackend(results, models, result =>
    !result.protocol.smoke && result.origin === 'native' && result.protocol.scenario === 'cached' && result.protocol.id.endsWith('-resources'));
  const selectedWarm = new Map();
  const selectedMemory = new Map();
  for (const [id, model] of Object.entries(models)) {
    for (const backend of BACKENDS) {
      const key = `${id}/${backend}`;
      selectedWarm.set(key, selectLatestAttempt((warmCandidates.get(key) ?? []).filter(x => x.cell.backendRequested === backend)));
      selectedMemory.set(key, selectLatestAttempt((memoryCandidates.get(key) ?? []).filter(x => x.cell.backendRequested === backend)));
    }
  }
  const resultsById = new Map(results.map(result => [result.id, result]));
  const audio = enrichAudio(audioEntries, resultsById, selectedWarm, selectedMemory);
  const byModelAudio = new Map();
  for (const entry of audio) {
    const list = byModelAudio.get(entry.model) ?? [];
    list.push(entry);
    byModelAudio.set(entry.model, list);
  }
  for (const list of byModelAudio.values()) list.sort((a, b) =>
    b.sourceCreatedAt.localeCompare(a.sourceCreatedAt) || b.resultId.localeCompare(a.resultId) || a.backend.localeCompare(b.backend));

  const outputModels = Object.entries(models).sort(([a], [b]) => a.localeCompare(b)).map(([id, model]) => {
    const warm = Object.fromEntries(BACKENDS.map(backend => [backend, createWarmMetric(selectedWarm.get(`${id}/${backend}`))]));
    const memory = Object.fromEntries(BACKENDS.map(backend => [backend, createMemoryMetric(selectedMemory.get(`${id}/${backend}`))]));
    for (const backend of BACKENDS) {
      warm[backend] = describeMissingScore(warm[backend], model, backend, 'warm', memory[backend],
        scheduledWarm.has(`${id}/${backend}`), id);
      memory[backend] = describeMissingScore(memory[backend], model, backend, 'memory', null,
        scheduledMemory.has(`${id}/${backend}`));
    }
    const selectedWarmCandidates = BACKENDS.map(backend => selectedWarm.get(`${id}/${backend}`));
    const preferredAudio = Object.fromEntries(BACKENDS.map(backend => [
      backend,
      (byModelAudio.get(id) ?? []).find(entry => entry.backend === backend && entry.matchesSelectedWarm) ?? null,
    ]));
    const playbackAudio = Object.fromEntries(BACKENDS.map(backend => {
      const examples = (byModelAudio.get(id) ?? []).filter(entry => entry.backend === backend);
      const currentWarm = warm[backend].registration === 'current' && preferredAudio[backend];
      const currentMemory = memory[backend].registration === 'current' && examples.find(entry => entry.matchesSelectedMemory);
      const selected = currentWarm || currentMemory || preferredAudio[backend] || examples[0] || null;
      return [backend, selected];
    }));
    return {
      id,
      name: model.displayName,
      modelMB: verifiedModelMB(model, [...selectedWarmCandidates, ...BACKENDS.map(backend => selectedMemory.get(`${id}/${backend}`))]),
      license: { model: model.license.model, code: model.license.runtime ?? model.license.frontend ?? null },
      support: structuredClone(model.support),
      sourceUrl: officialSourceUrl(model),
      warm,
      memory,
      pairedWarm: !warm.cpu.waveform && !warm.webgpu.waveform && pairedWarm(selectedWarm.get(`${id}/cpu`), selectedWarm.get(`${id}/webgpu`), model),
      audio: byModelAudio.get(id) ?? [],
      preferredAudio,
      playbackAudio,
    };
  });
  const retainedDates = [];
  for (const candidate of [...selectedWarm.values(), ...selectedMemory.values()]) {
    if (candidate) retainedDates.push(candidate.result.createdAt);
  }
  return {
    schemaVersion: 1,
    updatedAt: retainedDates.length ? retainedDates.sort().at(-1) : null,
    models: outputModels,
  };
}

export function verifySourcesOnce(results, cwd = process.cwd(), verifier = verifySource) {
  const seen = new Set();
  const cache = new Map();
  for (const result of results) {
    if (result.origin !== 'native') continue;
    // Call for each receipt so its claimed fingerprint is checked; the shared
    // cache still computes the committed source manifest only once per commit.
    verifier(result, cwd, cache);
    seen.add(result.source.gitCommit);
  }
  return seen.size;
}

// Only pinned, published schedules under docs/campaigns/<name>/plan.json describe
// dashboard work. A model ID can survive a change to its weights or runtime.
export async function readCampaignCells(models, directory = 'docs/campaigns') {
  const entries = await readdir(directory, { withFileTypes: true });
  const cells = [];
  const catalogs = new Map();
  for (const name of entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
    const path = join(directory, name, 'plan.json');
    let raw;
    try {
      raw = await readFile(path, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const plan = JSON.parse(raw);
    if (plan.schemaVersion !== 1 || !Array.isArray(plan.cells) || !plan.cells.length ||
        !/^[a-f0-9]{40}$/.test(plan.sourceCommit ?? '')) throw new Error(`Invalid pinned dashboard campaign: ${path}`);
    if (!catalogs.has(plan.sourceCommit)) {
      const pinned = execFileSync('git', ['show', `${plan.sourceCommit}:assets.lock.json`], { encoding: 'utf8', maxBuffer: 8_000_000 });
      catalogs.set(plan.sourceCommit, JSON.parse(pinned).models);
    }
    const pinnedModels = catalogs.get(plan.sourceCommit);
    const fixtureId = plan.fixtureId ?? defaultFixtureForModel(plan.cells[0].model);
    for (const cell of plan.cells) {
      validateCampaignCell(cell);
      if (!pinnedModels[cell.model]) throw new Error(`Unknown model ${cell.model} in ${path}`);
      if (sameCampaignRegistration(cell.model, models[cell.model], pinnedModels[cell.model], cell.backend)) {
        cells.push({...cell, fixtureId});
      }
    }
  }
  return cells;
}

export async function buildDashboardData() {
  const lock = getAssetLock();
  const paths = await resultPaths('results');
  const results = await Promise.all(paths.map(path => readResult(path, { publication: true })));
  const resultIds = new Set();
  for (const result of results) {
    if (resultIds.has(result.id)) throw new Error(`Duplicate result id: ${result.id}`);
    resultIds.add(result.id);
  }
  const audioManifest = JSON.parse(await readFile('audio/manifest.json', 'utf8'));
  if (audioManifest.schemaVersion !== 1 || !Array.isArray(audioManifest.entries)) throw new Error('Invalid audio manifest');
  // Existing audio validation also verifies every clip, its manifest provenance,
  // attribution and the source receipt. Reuse it rather than duplicating those rules.
  await checkAudio();
  verifySourcesOnce(results);
  const campaignCells = await readCampaignCells(lock.models);
  const warmSelections = await loadWarmSelections(results);
  return assembleDashboardData({ results, models: lock.models, audioEntries: audioManifest.entries, campaignCells, warmSelections });
}
