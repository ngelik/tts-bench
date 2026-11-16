import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { effectiveRepetitions, repetitionAdjustmentNotice, SINGLE_REPETITION_WARM_MODEL } from '../lib/benchmark-policy.mjs';
import { effectiveCampaignCell, validateCampaignCell } from '../lib/campaign-plan.mjs';
import { validateResult } from '../tools/results.mjs';

const cosy = SINGLE_REPETITION_WARM_MODEL;

test('new CosyVoice3 tests use one scored article in every scenario without changing other defaults', () => {
  assert.equal(effectiveRepetitions(cosy, 5), 1);
  assert.equal(effectiveRepetitions(cosy, 1), 1);
  assert.equal(effectiveRepetitions(cosy, 3), 1);
  assert.equal(repetitionAdjustmentNotice(cosy, 5, 1), 'Requested --repetitions 5; effective model policy ran 1 repetition.');
  assert.equal(repetitionAdjustmentNotice(cosy, 1, 1), null);
  assert.equal(repetitionAdjustmentNotice('tiny-voca', 5, 5), null);
  assert.equal(effectiveRepetitions('tiny-voca', 5), 5);
  assert.equal(effectiveCampaignCell({ model: cosy, backend: 'cpu', scenario: 'warm', repetitions: 5 }).repetitions, 1);
  assert.throws(() => validateCampaignCell({ model: 'tiny-voca', backend: 'cpu', scenario: 'warm', repetitions: 4 }), /campaign repetitions/);
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
  assert.throws(() => validateResult(unsupportedCount, { publication: true }), /one current or at least five historical/);

  const otherModel = structuredClone(current);
  otherModel.cells[0].model = 'tiny-voca';
  assert.throws(() => validateResult(otherModel, { publication: true }), /at least five scored repetitions/);

  const historicalMoreThanFive = structuredClone(original);
  historicalMoreThanFive.protocol.repetitions = 6;
  assert.doesNotThrow(() => validateResult(historicalMoreThanFive, { publication: true }));
});
