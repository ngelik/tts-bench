import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateResult, sha256 } from './results.mjs';

export const COSY_WARM_SELECTION_PATH = 'docs/campaigns/nov14-english/cosy-cpu-warm-selection.json';
export const COSY_MODEL_ID = 'fun-cosyvoice3-0.5b-2512';
export const COSY_WARM_SELECTION_RESULT_ID = '2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e';
const fail = message => { throw new Error(`Invalid reviewed warm selection: ${message}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function validateSelectionShape(selection, spec) {
  const keys = ['schemaVersion', 'kind', 'resultId', 'receiptSha256', 'modelId', 'backend', 'scenario',
    'sourceCommit', 'originalPlannedRepetitions', 'warmupCompleted', 'selectedScoredTrialIndexes',
    'stopReason', 'warmupCheckpoint', 'pairedCachedResultId'];
  if (!selection || typeof selection !== 'object' || Array.isArray(selection) || !same(Object.keys(selection).sort(), [...keys].sort())) fail('unexpected fields');
  if (selection.schemaVersion !== 1 || selection.kind !== 'operator-shortened-warm-selection' ||
      selection.modelId !== spec.modelId || selection.resultId !== spec.resultId || selection.backend !== 'cpu' || selection.scenario !== 'warm' ||
      !/^[a-z0-9][a-z0-9._-]{0,119}$/.test(selection.resultId ?? '') ||
      !/^[a-f0-9]{64}$/.test(selection.receiptSha256 ?? '') || !/^[a-f0-9]{40}$/.test(selection.sourceCommit ?? '') ||
      (spec.cachedResultId && selection.pairedCachedResultId !== spec.cachedResultId) || selection.originalPlannedRepetitions !== 5 || selection.warmupCompleted !== true ||
      !same(selection.selectedScoredTrialIndexes, spec.indexes) || typeof selection.stopReason !== 'string' || !selection.stopReason.trim() ||
      !/^[a-z0-9][a-z0-9._-]{0,119}$/.test(selection.pairedCachedResultId ?? '')) fail('field values do not match the reviewed selection');
  if (!selection.warmupCheckpoint || !same(Object.keys(selection.warmupCheckpoint).sort(), ['resultId', 'trialIndex']) ||
      selection.warmupCheckpoint.resultId !== selection.resultId || selection.warmupCheckpoint.trialIndex !== 1) fail('warm-up checkpoint does not match the source receipt');
  return selection;
}

function selectedView(selection, receipt, receiptSha256, selectionSha256, spec) {
  const cell = receipt.cells[0];
  if (receipt.id !== selection.resultId || receipt.origin !== 'native' || receipt.source.dirty !== false ||
      receipt.source.gitCommit !== selection.sourceCommit || receipt.protocol.scenario !== 'warm' || receipt.protocol.smoke !== false ||
      receipt.protocol.warmupRuns !== 1 || receipt.protocol.repetitions !== selection.originalPlannedRepetitions ||
      receipt.cells.length !== 1 || cell.model !== selection.modelId || cell.backendRequested !== selection.backend ||
      cell.status !== 'error' || !cell.reason || cell.warmup.length !== 1 || cell.trials.length !== spec.indexes.length ||
      (spec.sourceCommit && (receipt.source.gitCommit !== spec.sourceCommit || cell.backendEffective !== 'cpu/wasm' || cell.settings.providerPolicyVersion !== 2)) ||
      !same(cell.trials.map(trial => trial.index), selection.selectedScoredTrialIndexes)) fail('source receipt does not match the recorded operator stop');
  if (!cell.warmup[0] || cell.warmup[0].index !== selection.warmupCheckpoint.trialIndex) fail('warm-up checkpoint is missing');
  return {
    selectionPath: spec.path,
    selectionReportPath: spec.reportPath,
    selectionSha256,
    resultId: selection.resultId,
    modelId: selection.modelId,
    backend: selection.backend,
    scenario: selection.scenario,
    sourceCommit: selection.sourceCommit,
    receiptSha256,
    originalPlannedRepetitions: selection.originalPlannedRepetitions,
    selectedScoredTrialIndexes: [...selection.selectedScoredTrialIndexes],
    warmupCompleted: selection.warmupCompleted,
    stopReason: selection.stopReason,
    rawReceiptStatus: cell.status,
    rawReceiptReason: cell.reason,
    pairedCachedResultId: selection.pairedCachedResultId,
    cell: { ...cell, status: 'measured', reason: null, trials: selection.selectedScoredTrialIndexes.map(index => cell.trials[index - 1]) },
  };
}

/** Load the exact reviewed sidecar and bind it to the original receipt bytes. */
async function loadSelection(results, spec, { cwd = process.cwd() } = {}) {
  const selectionBytes = await readFile(resolve(cwd, spec.path));
  let rawSelection;
  try { rawSelection = JSON.parse(selectionBytes); } catch { fail('sidecar is not valid JSON'); }
  const selection = validateSelectionShape(rawSelection, spec);
  const receiptPath = join(cwd, 'results', selection.resultId, 'result.json');
  const receiptBytes = await readFile(receiptPath);
  const receiptSha256 = sha256(receiptBytes);
  if (receiptSha256 !== selection.receiptSha256) fail('source receipt digest changed');
  let rawReceipt;
  try { rawReceipt = JSON.parse(receiptBytes); } catch { fail('source receipt is not valid JSON'); }
  const receipt = validateResult(rawReceipt, { publication: true });
  const suppliedReceipt = results.find(result => result.id === selection.resultId);
  if (!suppliedReceipt || JSON.stringify(suppliedReceipt) !== JSON.stringify(receipt)) {
    fail('source receipt is absent from the loaded result set');
  }
  const cachedBytes = await readFile(join(cwd, 'results', selection.pairedCachedResultId, 'result.json'));
  let rawCached;
  try { rawCached = JSON.parse(cachedBytes); } catch { fail('paired cached receipt is not valid JSON'); }
  const cached = validateResult(rawCached, { publication: true });
  const suppliedCached = results.find(result => result.id === selection.pairedCachedResultId);
  if (suppliedCached && JSON.stringify(suppliedCached) !== JSON.stringify(cached)) fail('paired cached receipt differs from its public bytes');
  const warmCell = receipt.cells[0];
  const cachedCell = cached?.cells?.length === 1 ? cached.cells[0] : null;
  const assetSet = value => value.assets.map(asset => [asset.id, asset.sha256, asset.bytes]).sort(([a], [b]) => a.localeCompare(b));
  if (!cached || cached.origin !== 'native' || cached.source.gitCommit !== receipt.source.gitCommit ||
      cached.source.manifestSha256 !== receipt.source.manifestSha256 || cached.protocol.scenario !== 'cached' ||
      cached.protocol.smoke !== false || cached.protocol.warmupRuns !== 0 || cached.protocol.repetitions !== 1 ||
      !same(cached.fixture, receipt.fixture) || !same(cached.environment, receipt.environment) ||
      !same(assetSet(cached), assetSet(receipt)) || !cachedCell || cachedCell.model !== selection.modelId ||
      cachedCell.backendRequested !== selection.backend || cachedCell.backendEffective !== warmCell.backendEffective || cachedCell.status !== 'measured' || cachedCell.trials.length !== 1 ||
      cachedCell.voice !== warmCell.voice || cachedCell.precision !== warmCell.precision || !same(cachedCell.settings, warmCell.settings)) {
    fail('the separately recorded cached receipt does not match the sidecar provenance');
  }
  const view = selectedView(selection, receipt, receiptSha256, sha256(selectionBytes), spec);
  const scored = view.cell.trials.at(-1);
  const separate = cachedCell.trials[0];
  return { ...view, cachedAudioMatchesSelectedPcm: scored.pcmSha256 === separate.pcmSha256 &&
    scored.samples === separate.samples && scored.sampleRate === separate.sampleRate };
}

export function selectedCellFor(entry, selection) {
  if (!selection || entry.data.id !== selection.resultId || entry.cell.model !== selection.modelId ||
      entry.cell.backendRequested !== selection.backend || entry.data.protocol.scenario !== selection.scenario) return null;
  if (entry.cell.status !== selection.rawReceiptStatus || entry.cell.reason !== selection.rawReceiptReason ||
      !same(entry.cell, { ...selection.cell, status: selection.rawReceiptStatus, reason: selection.rawReceiptReason })) fail('campaign input differs from the hash-bound source receipt');
  return { ...entry, cell: selection.cell, selection };
}

export const AUDIO8_WARM_SELECTION_PATH = 'docs/campaigns/audio8-codec-repair/cpu-warm-selection.json';
export const AUDIO8_WARM_SELECTION_RESULT_ID = '2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb';
const COSY = Object.freeze({
  path: COSY_WARM_SELECTION_PATH, modelId: COSY_MODEL_ID, resultId: COSY_WARM_SELECTION_RESULT_ID, indexes: [1, 2],
  reportPath: 'reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection',
});
const AUDIO8 = Object.freeze({
  path: AUDIO8_WARM_SELECTION_PATH, modelId: 'audio8-realistic-0.6b-int4', resultId: AUDIO8_WARM_SELECTION_RESULT_ID, indexes: [1],
  sourceCommit: '9c7d880199e87a15a3959ae94b632f9d9cdd40da',
  cachedResultId: '2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a',
  reportPath: 'docs/campaigns/audio8-codec-repair/cpu-warm-selection.md',
});
export const loadCosyWarmSelection = (results, options) => loadSelection(results, COSY, options);
export const loadAudio8WarmSelection = (results, options) => loadSelection(results, AUDIO8, options);

/** Only reviewed, explicitly registered operator selections may alter the display. */
export async function loadWarmSelections(results, options = {}) {
  const selections = [];
  for (const spec of [COSY, AUDIO8]) {
    // Reports may contain only a subset; never load an unrelated selection.
    if (!results.some(result => result.id === spec.resultId)) continue;
    try { await readFile(resolve(options.cwd ?? process.cwd(), spec.path)); }
    catch (error) {
      // The Audio8 hook can land before its actual stopped receipt/sidecar.
      if (spec === AUDIO8 && error.code === 'ENOENT') continue;
      throw error;
    }
    selections.push(await loadSelection(results, spec, options));
  }
  return selections;
}
