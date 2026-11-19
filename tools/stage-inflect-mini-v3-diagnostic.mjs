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

const modelRoot = resolve(root, '.cache/public/models/inflect-mini-v3', revision);
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

const diagnostic = {
  schemaVersion: 1,
  purpose: 'Hosted Chrome runtime/frontend diagnostic only; never score eligible.',
  sourceCommit,
  exporterOutcome: exportOutcome,
  model: lock.model,
  modelRevision: revision,
  checkpoint: lock.checkpoint,
  files: staged,
};
await mkdir(resolve(root, '.cache/inflect-mini-v3-browser-diagnostic'), { recursive: true });
await writeFile(
  resolve(root, '.cache/inflect-mini-v3-browser-diagnostic/staged-model.json'),
  JSON.stringify(diagnostic, null, 2) + '\n',
);
console.log(JSON.stringify({ modelRoot: `.cache/public/models/inflect-mini-v3/${revision}`, fileCount: staged.length, exportOutcome }, null, 2));
