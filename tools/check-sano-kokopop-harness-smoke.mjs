import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { validateResult } from './results.mjs';

const outputPath = process.argv[2];
if (!outputPath || isAbsolute(outputPath)) throw new Error('Pass the relative path to the normal benchmark smoke command output.');
const root = process.cwd();
const run = JSON.parse(await readFile(resolve(root, outputPath), 'utf8'));
assert.equal(run.status, 'measured', 'Normal benchmark harness smoke must measure a result.');
assert.ok(run.reason === null || run.reason === undefined, 'A measured benchmark smoke cannot report a failure reason.');
assert.equal(typeof run.result, 'string');
const receiptPath = resolve(root, run.result);
const receiptRelative = relative(root, receiptPath);
if (receiptRelative === '..' || receiptRelative.startsWith('..' + sep)) throw new Error('Harness smoke receipt path escapes the checkout.');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
validateResult(receipt);

assert.equal(receipt.origin, 'native');
assert.equal(receipt.source.dirty, false, 'Harness smoke must use a clean committed checkout.');
assert.equal(receipt.cells.length, 1);
const [cell] = receipt.cells;
assert.equal(cell.model, 'sano-heart-nano-gguf-f32');
assert.equal(cell.backendRequested, 'webgpu');
assert.equal(cell.backendEffective, 'webgpu+wasm');
assert.equal(cell.status, 'measured');
assert.equal(cell.capability.gpuDispatchVerified, true);
assert.ok(cell.capability.dispatches > 0);
assert.ok(cell.capability.schedulerOperations.MUL_MAT >= 4);
assert.ok(cell.capability.hardwareAdapter.features.includes('shader-f16'));

console.log(JSON.stringify({
  status: 'measured',
  result: run.result,
  sourceCommit: receipt.source.gitCommit,
  manifestSha256: receipt.source.manifestSha256,
  backendEffective: cell.backendEffective,
  dispatches: cell.capability.dispatches,
  schedulerOperations: cell.capability.schedulerOperations,
  probeFrames: cell.capability.probeFrames,
  probeSampleRate: cell.capability.probeSampleRate,
  recordedSampleRate: cell.trials[0]?.sampleRate,
}, null, 2));
