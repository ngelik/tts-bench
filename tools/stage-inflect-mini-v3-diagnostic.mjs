import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const revision = 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6';
const sourceCommit = process.env.INFLECT_MINI_SOURCE_COMMIT;
const exportOutcome = process.env.INFLECT_MINI_EXPORT_OUTCOME;
assert.match(sourceCommit || '', /^[0-9a-f]{40}$/, 'workflow source commit is pinned');
assert.ok(['success', 'failure'].includes(exportOutcome), 'export step outcome is explicit');

const lock = JSON.parse(await readFile(resolve(root, 'tools/inflect-mini-v3-conversion.lock.json'), 'utf8'));
assert.equal(lock.modelRevision, revision);
const generatedRoot = resolve(root, '.cache/inflect-mini-v3-onnx');
const sourceRoot = resolve(root, '.cache/inflect-mini-v3-source');
const checkpointPath = resolve(sourceRoot, lock.checkpoint.path);
const checkpoint = await readFile(checkpointPath);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(checkpoint.length, lock.checkpoint.bytes, 'pinned checkpoint length is verified');
assert.equal(sha(checkpoint), lock.checkpoint.sha256, 'pinned checkpoint digest is verified');

const modelRoot = resolve(root, '.cache/public/models/inflect-mini-v3-browser-port', revision);
const onnxRoot = resolve(modelRoot, 'onnx');
await mkdir(onnxRoot, { recursive: true });
const files = [
  ['text-duration.onnx', 'onnx/text-duration.onnx'],
  ['text-bridge.onnx', 'onnx/text-bridge.onnx'],
  ['waveform-generator.onnx', 'onnx/waveform-generator.onnx'],
  ['cassidy-style-table.f32', 'cassidy-style-table.f32'],
  ['phoneme-vocab.json', 'phoneme-vocab.json'],
  ['source-linear-weights.f32', 'source-linear-weights.f32'],
];
const staged = [];
for (const [sourceName, targetName] of files) {
  const source = resolve(generatedRoot, sourceName);
  const target = resolve(modelRoot, targetName);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  const bytes = await readFile(target);
  staged.push({ path: targetName, bytes: bytes.length, sha256: sha(bytes) });
}
assert.equal(staged.find(file => file.path === 'source-linear-weights.f32')?.bytes, 40);

const manifestBytes = await readFile(resolve(generatedRoot, 'BUILD-MANIFEST.json'));
const buildManifest = JSON.parse(manifestBytes.toString('utf8'));
assert.equal(buildManifest.projectSourceCommit, sourceCommit, 'generated assets bind to this exact source commit');
assert.equal(buildManifest.modelRevision, revision, 'generated assets bind to the pinned model revision');
assert.equal(buildManifest.format, 'inflect-mini-v3-browser-port-onnx-v1');
const generatedByPath = new Map(buildManifest.files.map(file => [file.path, file]));
assert.equal(generatedByPath.size, staged.length, 'build manifest and staged file set have the same size');
for (const file of staged) {
  const generated = generatedByPath.get(file.path.split('/').at(-1));
  assert.ok(generated, `build manifest includes ${file.path}`);
  assert.equal(file.bytes, generated.bytes, `${file.path} size matches build manifest`);
  assert.equal(file.sha256, generated.sha256, `${file.path} hash matches build manifest`);
}
const manifestTarget = resolve(root, '.cache/inflect-mini-v3-browser-diagnostic/build-manifest.json');
await copyFile(resolve(generatedRoot, 'BUILD-MANIFEST.json'), manifestTarget);
const buildManifestSummary = {
  path: 'build-manifest.json',
  bytes: manifestBytes.length,
  sha256: sha(manifestBytes),
  nativeWaveformParity: buildManifest.nativeWaveformParity,
};

const paritySource = resolve(generatedRoot, 'PARITY-DIAGNOSTIC.json');
let parity = null;
try {
  const parityBytes = await readFile(paritySource);
  const parityReport = JSON.parse(parityBytes.toString('utf8'));
  assert.equal(parityReport.sourceCommit, sourceCommit, 'parity diagnostics use this source commit');
  assert.equal(parityReport.modelRevision, revision, 'parity diagnostics use the locked checkpoint revision');
  const parityTarget = resolve(root, '.cache/inflect-mini-v3-browser-diagnostic/parity-diagnostic.json');
  await copyFile(paritySource, parityTarget);
  parity = { path: 'parity-diagnostic.json', bytes: parityBytes.length, sha256: sha(parityBytes),
    strictParityPassed: parityReport.strictParityPassed };
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const diagnostic = {
  schemaVersion: 1,
  purpose: 'Hosted Chrome diagnostic for the separately named browser-port configuration; this is not native-waveform-equivalent and is never itself a score.',
  sourceCommit,
  exporterOutcome: exportOutcome,
  model: lock.model,
  modelRevision: revision,
  checkpoint: lock.checkpoint,
  files: staged,
  buildManifest: buildManifestSummary,
  parityDiagnostic: parity,
};
await mkdir(resolve(root, '.cache/inflect-mini-v3-browser-diagnostic'), { recursive: true });
await writeFile(
  resolve(root, '.cache/inflect-mini-v3-browser-diagnostic/staged-model.json'),
  JSON.stringify(diagnostic, null, 2) + '\n',
);
console.log(JSON.stringify({ modelRoot: `.cache/public/models/inflect-mini-v3-browser-port/${revision}`, fileCount: staged.length, exportOutcome, strictNativeParity: buildManifest.nativeWaveformParity }, null, 2));
