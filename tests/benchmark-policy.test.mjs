import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { getModelParameters } from '../lib/model-parameters.mjs';
import {
  effectiveRepetitions,
  effectiveWarmRepetitions,
  minimumWarmRepetitionsForParameterCount,
  minimumWarmRepetitions,
  repetitionAdjustmentNotice,
  receiptRepetitionEvidence,
  resolveProtocolId,
  resolveRepetitionPlan,
  requiresSingleWarmRepetition,
  SINGLE_REPETITION_WARM_MODEL,
} from '../lib/benchmark-policy.mjs';
import { effectiveCampaignCell, validateCampaignCell } from '../lib/campaign-plan.mjs';
import { validateResult } from '../tools/results.mjs';

const cosy = SINGLE_REPETITION_WARM_MODEL;

test('new CosyVoice3 tests use one scored article in every scenario without changing other defaults', () => {
  assert.equal(effectiveRepetitions(cosy, 5), 1);
  assert.equal(effectiveRepetitions(cosy, 1), 1);
  assert.equal(effectiveRepetitions(cosy, 3), 1);
  assert.equal(effectiveRepetitions(cosy, 3, 'cached'), 1);
  assert.equal(repetitionAdjustmentNotice(5, 1), 'Requested --repetitions 5; effective model policy ran 1 repetition.');
  assert.equal(repetitionAdjustmentNotice(5, 1, false), 'Default repetition count 5; effective model policy ran 1 repetition.');
  assert.equal(repetitionAdjustmentNotice(1, 1), null);
  assert.equal(repetitionAdjustmentNotice(5, 5), null);
  assert.equal(effectiveRepetitions('tiny-voca', 5), 5);
  assert.deepEqual(resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'cached' }), {
    requestedRepetitions: 3, effectiveRepetitions: 3, adjustment: null,
  });
  assert.equal(effectiveCampaignCell({ model: cosy, backend: 'cpu', scenario: 'warm', repetitions: 5 }).repetitions, 1);
  assert.throws(() => validateCampaignCell({ model: 'tiny-voca', backend: 'cpu', scenario: 'warm', repetitions: 4 }), /campaign repetitions/);
});

test('large-model warm threshold is strictly greater than one billion parameters', () => {
  assert.equal(requiresSingleWarmRepetition(1_000_000_001), true);
  assert.equal(requiresSingleWarmRepetition(1_000_000_000), false);
  assert.equal(requiresSingleWarmRepetition(999_999_999), false);
  assert.equal(minimumWarmRepetitionsForParameterCount(1_000_000_001), 1);
  assert.equal(minimumWarmRepetitionsForParameterCount(1_000_000_000), 5);
  assert.equal(minimumWarmRepetitionsForParameterCount(999_999_999), 5);
  assert.equal(effectiveWarmRepetitions(1_000_000_001, 5), 1);
  assert.equal(effectiveWarmRepetitions(1_000_000_000, 5), 5);
  assert.equal(effectiveWarmRepetitions(999_999_999, 5), 5);
  assert.equal(minimumWarmRepetitionsForParameterCount(undefined), 5, 'unknown parameter count retains the full warm minimum');
});

test('registered parameter counts drive only warm policy while the existing Cosy exception stays unchanged', () => {
  const largeModels = [
    'lfm3-audio-2b-gguf', 'lfm3-omni-2b-gguf',
    'lfm3-audio-2b-fusor-q7-cpu', 'lfm3-omni-2b-fusor-q7-cpu',
    'ming-3.0-tts-0.5b-gguf', 'ming-3.0-tts-0.5b-fusor-mix-cpu',
  ];
  for (const id of largeModels) {
    assert.ok(getModelParameters(id)?.parameterCount > 1_000_000_000, `${id} has sourced registration-specific parameter evidence`);
    assert.equal(minimumWarmRepetitions(id), 1);
    assert.equal(effectiveRepetitions(id, 5, 'warm'), 1);
    assert.equal(effectiveRepetitions(id, 3, 'cached'), 3, `${id} cached protocol is unchanged`);
  }
  for (const id of ['audio8-realistic-0.6b-int4', 'tiny-voca']) {
    assert.ok(getModelParameters(id)?.parameterCount < 1_000_000_000);
    assert.equal(minimumWarmRepetitions(id), 5);
    assert.equal(effectiveRepetitions(id, 5, 'warm'), 5);
  }

  const ming = largeModels.find(id => id === 'ming-3.0-tts-0.5b-fusor-mix-cpu');
  const absent = resolveRepetitionPlan({ modelId: ming, scenario: 'warm' });
  assert.deepEqual(absent, {
    requestedRepetitions: 5,
    effectiveRepetitions: 1,
    adjustment: 'Default repetition count 5; effective model policy ran 1 repetition.',
  });
  assert.deepEqual(receiptRepetitionEvidence(absent), {
    repetitions: 1,
    notes: ['Default repetition count 5; effective model policy ran 1 repetition.'],
  });

  const explicit = resolveRepetitionPlan({ modelId: ming, scenario: 'warm', requested: '5' });
  assert.equal(explicit.requestedRepetitions, 5);
  assert.equal(explicit.effectiveRepetitions, 1);
  assert.equal(explicit.adjustment, 'Requested --repetitions 5; effective model policy ran 1 repetition.');
  const cachedDefault = resolveRepetitionPlan({ modelId: ming, scenario: 'cached' });
  assert.deepEqual(cachedDefault, { requestedRepetitions: 3, effectiveRepetitions: 3, adjustment: null });
});

test('result validation accepts one current CosyVoice3 trial and five historical trials only', async () => {
  const id = '2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e';
  const original = validateResult(JSON.parse(await readFile(`results/${id}/result.json`, 'utf8')), { publication: true });
  assert.equal(original.protocol.repetitions, 5);
  assert.equal(original.cells[0].status, 'error');

  const current = structuredClone(original);
  current.id = 'cosyvoice3-single-trial-validator-fixture';
  current.protocol.repetitions = 1;
  current.cells[0].status = 'measured';
  current.cells[0].reason = null;
  current.cells[0].trials = current.cells[0].trials.slice(0, 1);
  assert.doesNotThrow(() => validateResult(current, { publication: true }));

  const unsupportedCount = structuredClone(current);
  unsupportedCount.protocol.repetitions = 2;
  unsupportedCount.cells[0].trials = original.cells[0].trials.slice(0, 2);
  assert.throws(() => validateResult(unsupportedCount, { publication: true }), /at least five scored repetitions/);

  const otherModel = structuredClone(current);
  otherModel.cells[0].model = 'tiny-voca';
  assert.throws(() => validateResult(otherModel, { publication: true }), /at least five scored repetitions/);

  const historicalMoreThanFive = structuredClone(original);
  historicalMoreThanFive.protocol.repetitions = 6;
  assert.doesNotThrow(() => validateResult(historicalMoreThanFive, { publication: true }));
});

test('warm v2 requests three articles and keeps eligible single-observation policies', () => {
  assert.equal(resolveProtocolId({ scenario: 'warm', warmProtocol: 'v2' }), 'browser-tts-warm-v2');
  assert.equal(resolveProtocolId({ scenario: 'warm' }), 'browser-tts-warm-v1');
  assert.equal(resolveProtocolId({ scenario: 'cached', resources: true }), 'browser-tts-cached-v1-resources');
  assert.deepEqual(resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'warm', warmProtocol: 'v2' }), {
    requestedRepetitions: 3, effectiveRepetitions: 3, adjustment: null,
  });
  assert.deepEqual(resolveRepetitionPlan({ modelId: 'ming-3.0-tts-0.5b-gguf', scenario: 'warm', warmProtocol: 'v2', requested: '3' }), {
    requestedRepetitions: 3, effectiveRepetitions: 1,
    adjustment: 'Requested --repetitions 3; effective model policy ran 1 repetition.',
  });
  assert.deepEqual(resolveRepetitionPlan({ modelId: cosy, scenario: 'warm', warmProtocol: 'v2', requested: '3' }), {
    requestedRepetitions: 3, effectiveRepetitions: 1,
    adjustment: 'Requested --repetitions 3; effective model policy ran 1 repetition.',
  });
  assert.equal(resolveRepetitionPlan({ modelId: 'parameter-count-not-registered', scenario: 'warm', warmProtocol: 'v2' }).effectiveRepetitions, 3);
  for (const requested of ['1', '2', '4', '5']) {
    assert.throws(() => resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'warm', warmProtocol: 'v2', requested }), /warm v2.*three/i);
  }
  assert.throws(() => resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'cached', warmProtocol: 'v2' }), /warm.*only/i);
  assert.throws(() => resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'warm', smoke: true, warmProtocol: 'v2' }), /smoke/i);
  assert.throws(() => resolveRepetitionPlan({ modelId: 'tiny-voca', scenario: 'warm', resources: true, warmProtocol: 'v2' }), /resources/i);
  const v2Cell = { model: 'tiny-voca', backend: 'cpu', scenario: 'warm', repetitions: 3, warmProtocol: 'v2' };
  assert.doesNotThrow(() => validateCampaignCell(v2Cell));
  assert.equal(effectiveCampaignCell(v2Cell).repetitions, 3);
  assert.equal(effectiveCampaignCell({ ...v2Cell, model: cosy }).repetitions, 1);
  assert.throws(() => validateCampaignCell({ ...v2Cell, repetitions: 4 }), /warm v2.*three/i);
  assert.throws(() => validateCampaignCell({ ...v2Cell, scenario: 'cached' }), /warm scenario/i);
  assert.throws(() => validateCampaignCell({ ...v2Cell, resources: true }), /resources/i);
});

test('CLI rejects invalid v2 combinations before creating a run or reaching Chrome', async () => {
  const { readdir } = await import('node:fs/promises');
  const before = await readdir(new URL('../runs', import.meta.url));
  const invalidArgs = [
    [['--scenario', 'warm', '--repetitions', '4'], /warm v2.*three/i],
    [['--scenario', 'cached'], /warm.*only/i],
    [['--scenario', 'warm', '--smoke'], /smoke/i],
    [['--scenario', 'warm', '--resources'], /resources/i],
  ];
  for (const [args, expected] of invalidArgs) {
    const run = spawnSync(process.execPath, ['bin/bench.mjs', 'run', '--model', 'tiny-voca', '--backend', 'cpu',
      '--fixture', 'english-20k-v1', ...args, '--warm-protocol', 'v2', '--chrome', '/bin/false'], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 10_000,
    });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, expected);
  }
  assert.deepEqual(await readdir(new URL('../runs', import.meta.url)), before);
});
