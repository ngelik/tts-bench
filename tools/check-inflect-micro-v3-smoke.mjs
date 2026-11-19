import assert from 'node:assert/strict';
import { copyFile, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { validateResult } from './results.mjs';

const [summaryPath, expectedBackend, expectedCommit] = process.argv.slice(2);
if (!summaryPath || isAbsolute(summaryPath) || !['cpu', 'webgpu'].includes(expectedBackend) || !/^[a-f0-9]{40}$/.test(expectedCommit ?? '')) {
  throw new Error('Usage: node tools/check-inflect-micro-v3-smoke.mjs RELATIVE_SUMMARY cpu|webgpu SOURCE_COMMIT');
}

const root = process.cwd();
const summaryAbsolute = resolve(root, summaryPath);
const summaryRelative = relative(root, summaryAbsolute);
if (summaryRelative === '..' || summaryRelative.startsWith(`..${sep}`) || isAbsolute(summaryRelative)) {
  throw new Error('Harness smoke summary path escapes the checkout.');
}
const summary = JSON.parse(await readFile(summaryAbsolute, 'utf8'));
assert.equal(typeof summary.result, 'string');
const receiptPath = resolve(root, summary.result);
const receiptRelative = relative(root, receiptPath);
if (receiptRelative === '..' || receiptRelative.startsWith(`..${sep}`) || isAbsolute(receiptRelative)) {
  throw new Error('Harness smoke receipt path escapes the checkout.');
}
await copyFile(receiptPath, `${summaryAbsolute}.result.json`);
assert.equal(summary.status, 'measured', `${expectedBackend} harness smoke did not measure: ${summary.reason ?? 'no reason recorded'}`);
assert.ok(summary.reason == null, 'A measured smoke cannot report a failure reason.');
assert.equal(typeof summary.id, 'string');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
validateResult(receipt);

assert.equal(receipt.origin, 'native');
assert.equal(receipt.id, summary.id);
assert.equal(receipt.source.gitCommit, expectedCommit);
assert.equal(receipt.source.dirty, false, 'Smoke must use the exact clean checked-out commit.');
assert.equal(receipt.protocol.scenario, 'offline');
assert.equal(receipt.protocol.smoke, true);
assert.equal(receipt.fixture.id, 'english-20k-smoke-v1');
assert.equal(receipt.fixture.characters, 690);
assert.equal(receipt.fixture.chunks, 3);

assert.equal(receipt.cells.length, 1);
const [cell] = receipt.cells;
assert.equal(cell.model, 'inflect-micro-v3');
assert.equal(cell.backendRequested, expectedBackend);
assert.equal(cell.status, 'measured');
assert.equal(cell.trials.length, 1);
const trial = cell.trials[0];
assert.equal(trial.sampleRate, 24_000);
assert.equal(trial.validation.finitePcm, true);
assert.equal(trial.validation.nonemptyChunks, true);
assert.equal(trial.validation.chunkCount, 3);

if (expectedBackend === 'cpu') {
  assert.equal(cell.backendEffective, 'cpu/wasm');
  assert.equal(cell.capability.gpuDispatchVerified, null);
} else {
  assert.equal(cell.backendEffective, 'webgpu+wasm');
  assert.equal(cell.capability.gpuDispatchVerified, true);
  assert.ok(cell.capability.dispatches > 0);
}

console.log(JSON.stringify({
  status: 'measured',
  id: receipt.id,
  backend: expectedBackend,
  backendEffective: cell.backendEffective,
  sourceCommit: receipt.source.gitCommit,
  fixtureChunks: receipt.fixture.chunks,
  sampleRate: trial.sampleRate,
  samples: trial.samples,
  dispatches: cell.capability.dispatches ?? null,
}, null, 2));
