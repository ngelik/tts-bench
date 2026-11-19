import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const revision = 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6';
const expectedSource = process.env.INFLECT_MINI_SOURCE_COMMIT;
assert.match(expectedSource ?? '', /^[0-9a-f]{40}$/, 'export source commit is pinned');

const lock = JSON.parse(await readFile(resolve(root, 'tools/inflect-mini-v3-conversion.lock.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
const model = catalog.models['inflect-mini-v3-browser-port'];
assert.ok(model, 'browser-port model is registered');
assert.equal(lock.modelRevision, revision);
assert.equal(model.modelRevision, revision);
const output = resolve(process.env.INFLECT_MINI_EXPORT_DIR || resolve(root, '.cache/inflect-mini-v3-onnx'));
const manifest = JSON.parse(await readFile(resolve(output, 'BUILD-MANIFEST.json'), 'utf8'));
const parity = JSON.parse(await readFile(resolve(output, 'PARITY-DIAGNOSTIC.json'), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

assert.equal(manifest.format, 'inflect-mini-v3-browser-port-onnx-v1');
assert.equal(manifest.configuration, 'inflect-mini-v3-browser-port');
assert.equal(manifest.projectSourceCommit, expectedSource, 'graph bundle is tied to this exact source commit');
assert.equal(manifest.model, lock.model);
assert.equal(manifest.modelRevision, revision);
assert.equal(manifest.sourceCheckpoint?.path, lock.checkpoint.path);
assert.equal(manifest.sourceCheckpoint?.bytes, lock.checkpoint.bytes);
assert.equal(manifest.sourceCheckpoint?.sha256, lock.checkpoint.sha256);
assert.equal(manifest.parameterCount, 34_310_790);
assert.equal(manifest.sampleRate, 24_000);

const expectedAssets = model.assets.filter(asset => asset.generated);
assert.equal(expectedAssets.length, 6, 'the registered conversion has the expected six generated files');
const expectedByPath = new Map(expectedAssets.map(asset => [asset.generated.artifactPath, asset]));
const generatedByPath = new Map(manifest.files.map(file => [file.path, file]));
assert.equal(generatedByPath.size, expectedByPath.size, 'the generated file list is complete and has no extras');
assert.deepEqual([...generatedByPath.keys()].sort(), [...expectedByPath.keys()].sort(),
  'the exported file paths exactly match the registered generated asset set');
for (const [path, expected] of expectedByPath) {
  const generated = generatedByPath.get(path);
  assert.equal(generated.bytes, expected.bytes, `${path} length matches assets.lock.json`);
  assert.equal(generated.sha256, expected.sha256, `${path} digest matches assets.lock.json`);
  const bytes = await readFile(resolve(output, path));
  assert.equal(bytes.length, expected.bytes, `${path} was actually emitted`);
  assert.equal(sha256(bytes), expected.sha256, `${path} bytes match the registered digest`);
}

assert.equal(parity.schema, 'inflect-mini-v3-waveform-parity-diagnostic-v1');
assert.equal(parity.sourceCommit, expectedSource, 'parity evidence is tied to this exact source commit');
assert.equal(parity.model, lock.model);
assert.equal(parity.modelRevision, revision);
assert.equal(parity.checkpoint?.bytes, lock.checkpoint.bytes);
assert.equal(parity.checkpoint?.sha256, lock.checkpoint.sha256);
const thresholds = { maxAbs: 2e-3, rms: 2e-4 };
assert.deepEqual(parity.strictThresholds, thresholds, 'strict native thresholds remain unchanged');
assert.equal(parity.cases.length, 2, 'both fixed-length native parity cases must be present');
const expectedCases = new Map([
  ['base-hello', { frames: 53, tokenCount: 9, samples: 31_800 }],
  ['dynamic-24-vowel', { frames: 78, tokenCount: 26, samples: 46_800 }],
]);
const seen = new Set();
for (const testCase of parity.cases) {
  const expectation = expectedCases.get(testCase.id);
  assert.ok(expectation, `unexpected parity case ${testCase.id}`);
  assert.ok(!seen.has(testCase.id), `duplicate parity case ${testCase.id}`);
  seen.add(testCase.id);
  assert.equal(testCase.frames, expectation.frames);
  assert.equal(testCase.tokenCount, expectation.tokenCount);
  assert.equal(testCase.sampleRate, 24_000);
  assert.equal(testCase.referenceSamples, expectation.samples);
  assert.equal(testCase.portSamples, expectation.samples);
  assert.equal(testCase.frames * 600, expectation.samples, 'sample count matches the locked frame clock');
  assert.ok(Number.isFinite(testCase.maxAbs) && testCase.maxAbs >= 0);
  assert.ok(Number.isFinite(testCase.rms) && testCase.rms >= 0);
  const computedStrictPass = testCase.maxAbs <= thresholds.maxAbs && testCase.rms <= thresholds.rms;
  assert.equal(testCase.strictPassed, computedStrictPass, `${testCase.id} verdict matches unmodified thresholds`);
  for (const [name, value] of Object.entries(testCase.quality ?? {})) {
    assert.ok(Number.isFinite(value), `${testCase.id} quality.${name} is finite`);
  }
}
assert.deepEqual([...seen].sort(), [...expectedCases.keys()].sort());
const computedOverall = parity.cases.every(testCase => testCase.strictPassed);
assert.equal(parity.strictParityPassed, computedOverall, 'overall strict verdict matches the two complete cases');
const manifestParity = manifest.nativeWaveformParity;
assert.ok(manifestParity, 'build manifest retains the strict native parity outcome');
assert.deepEqual(manifestParity.thresholds, thresholds);
assert.equal(manifestParity.strictPassed, computedOverall);
assert.deepEqual(manifestParity.cases.map(({ id, frames, maxAbs, rms, strictPassed }) =>
  ({ id, frames, maxAbs, rms, strictPassed })),
parity.cases.map(({ id, frames, maxAbs, rms, strictPassed }) =>
  ({ id, frames, maxAbs, rms, strictPassed })));

console.log(JSON.stringify({
  status: 'verified',
  configuration: manifest.configuration,
  sourceCommit: expectedSource,
  modelRevision: revision,
  generatedAssetCount: expectedAssets.length,
  nativeParityEvidence: 'complete',
  strictNativeParityPassed: computedOverall,
  thresholds,
  cases: parity.cases.map(({ id, maxAbs, rms, strictPassed }) => ({ id, maxAbs, rms, strictPassed })),
}, null, 2));
