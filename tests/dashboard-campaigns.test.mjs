import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveCampaignCell, validateCampaignCell } from '../lib/campaign-plan.mjs';
import { getAssetLock } from '../lib/catalog.mjs';
import { assembleDashboardData, readCampaignCells } from '../tools/dashboard-data.mjs';

test('discovers every published schedule and only current, memory-sampling cells count', async () => {
  const models = getAssetLock().models;
  const id = 'tiny-voca';
  const cells = await readCampaignCells(models);
  assert.ok(cells.some(cell => cell.model === 'fun-cosyvoice3-0.5b-2512'));
  const planned = cells.filter(cell => cell.model === id);
  assert.deepEqual(planned.map(c => [c.backend, c.scenario, c.repetitions, c.resources, c.timeoutMinutes]), [
    ['cpu', 'cached', 1, true, 1440], ['webgpu', 'cached', 1, true, 1440],
    ['cpu', 'warm', 5, false, 1440], ['webgpu', 'warm', 5, false, 1440],
  ]);
  const rows = assembleDashboardData({ models: { [id]: models[id] }, results: [], campaignCells: cells }).models;
  for (const backend of ['cpu', 'webgpu']) {
    assert.equal(rows[0].warm[backend].displayStatus, 'Awaiting warm result');
    assert.equal(rows[0].memory[backend].displayStatus, 'Awaiting memory result');
    assert.equal(rows[0].memory[backend].meanMB, null);
  }
  const revised = structuredClone(models[id]);
  revised.runtime.files[0].sha256 = '0'.repeat(64);
  const oldPlans = await readCampaignCells({ [id]: revised });
  assert.ok(!oldPlans.some(cell => cell.model === id));
});

test('unplanned, timing-only, and unsupported backends retain distinct states', () => {
  const model = getAssetLock().models['ming-3.0-tts-0.5b-fusor-mix-cpu'];
  const cells = [
    { model: 'example', backend: 'cpu', scenario: 'cached', resources: false },
    { model: 'example', backend: 'cpu', scenario: 'cold', resources: true },
    { model: 'example', backend: 'webgpu', scenario: 'warm' },
    { model: 'example', backend: 'webgpu', scenario: 'cached', resources: true },
  ];
  const [row] = assembleDashboardData({ models: { example: model }, results: [], campaignCells: cells }).models;
  assert.equal(row.warm.cpu.displayStatus, 'No warm score');
  assert.equal(row.memory.cpu.displayStatus, 'No memory run');
  assert.equal(row.warm.webgpu.displayStatus, 'CPU only');
  assert.equal(row.memory.webgpu.displayStatus, 'CPU only');
});

test('smoke diagnostics leave the scheduled full articles pending', () => {
  const id = 'tiny-voca';
  const model = getAssetLock().models[id];
  const results = ['warm', 'cached'].map(scenario => ({
    origin: 'native', protocol: { scenario, smoke: true, id: 'browser-tts-cached-v1-resources' },
    assets: [], cells: [{ model: id, backendRequested: 'cpu', status: 'measured' }],
  }));
  const campaignCells = [
    { model: id, backend: 'cpu', scenario: 'cached', repetitions: 1, resources: true },
    { model: id, backend: 'cpu', scenario: 'warm', repetitions: 5, resources: false },
  ];
  const [row] = assembleDashboardData({ models: { [id]: model }, results, campaignCells }).models;
  assert.equal(row.memory.cpu.displayStatus, 'Awaiting memory result');
  assert.equal(row.warm.cpu.displayStatus, 'Awaiting warm result');
});

test('an archived error remains linked alongside a pending current memory result', () => {
  const id = 'tiny-voca';
  const model = getAssetLock().models[id];
  const result = {
    id: 'test-archived-error', origin: 'native', createdAt: '2026-11-14T00:00:00Z',
    source: { gitCommit: 'previous-source', manifestSha256: 'previous-signature' },
    protocol: { scenario: 'cached', smoke: false, id: 'browser-tts-cached-v1-resources' },
    environment: {}, fixture: {}, assets: [],
    cells: [{ model: id, backendRequested: 'cpu', status: 'error', reason: 'previous runtime error' }],
  };
  const campaignCells = [{ model: id, backend: 'cpu', scenario: 'cached', repetitions: 1, resources: true }];
  const [row] = assembleDashboardData({ models: { [id]: model }, results: [result], campaignCells }).models;
  assert.equal(row.memory.cpu.status, 'error');
  assert.equal(row.memory.cpu.reason, 'previous runtime error');
  assert.equal(row.memory.cpu.resultId, result.id);
  assert.equal(row.memory.cpu.registration, 'archived');
  assert.equal(row.memory.cpu.pendingCurrent, 'Awaiting memory result for the current registration.');
});

test('the dashboard and campaign runner reject smoke plans and under-repeated warm plans', () => {
  const cell = { model: 'tiny-voca', backend: 'cpu', scenario: 'warm', repetitions: 5 };
  assert.throws(() => validateCampaignCell({ ...cell, smoke: true }), /full article/);
  assert.throws(() => validateCampaignCell({ ...cell, repetitions: 1 }), /campaign repetitions/);
  assert.throws(() => validateCampaignCell({ ...cell, resources: 'true' }), /resources flag/);
});

test('CosyVoice3 warm campaign requests normalize to one while other models retain their counts', () => {
  const cosy = { model: 'fun-cosyvoice3-0.5b-2512', backend: 'cpu', scenario: 'warm', repetitions: 5 };
  assert.doesNotThrow(() => validateCampaignCell(cosy));
  assert.equal(effectiveCampaignCell(cosy).repetitions, 1);
  assert.equal(effectiveCampaignCell({ ...cosy, repetitions: 2 }).repetitions, 1);
  const other = { ...cosy, model: 'tiny-voca' };
  assert.equal(effectiveCampaignCell(other).repetitions, 5);
  assert.throws(() => validateCampaignCell({ ...other, repetitions: 1 }), /campaign repetitions/);
});
