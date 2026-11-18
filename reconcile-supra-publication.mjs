import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const expectedMain = 'e97b22f1c9314bbdedae55cd770089e94a88258c';
const expectedSource = '62346509d66344b0d95bca4cb1a21587fe5ff5d8';
const supra = new Map([
  ['2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76', {
    backend: 'cpu',
    sha256: '89f0a0099081407778e7e4ec4200fcd9de3f9171bb24693313d8877f3966cc1e'
  }],
  ['2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6', {
    backend: 'webgpu',
    sha256: '5c1503c288c0307ebf3b28ef3bc35ccffdf2842cf5e9a2db9573993b7b0bc4f4'
  }]
]);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();
assert.equal(git('rev-parse', 'origin/main'), expectedMain, 'main changed; reconcile must be reviewed against the new tip');
assert.equal(git('rev-parse', 'HEAD'), expectedSource, 'result source branch changed; reconcile must be reviewed against the new head');
const mainManifest = JSON.parse(git('show', 'origin/main:audio/manifest.json'));
const manifestPath = path.resolve('audio/manifest.json');
const currentManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(currentManifest.schemaVersion, mainManifest.schemaVersion);
assert.equal(currentManifest.entries.length, mainManifest.entries.length + 2, 'audio manifest must equal main plus exactly two Supra clips');
const stableKey = entry => entry.clip?.path;
const mainByKey = new Map(mainManifest.entries.map(entry => [stableKey(entry), entry]));
const currentByKey = new Map(currentManifest.entries.map(entry => [stableKey(entry), entry]));
assert.ok([...mainByKey.keys()].every(Boolean), 'main audio entries need stable clip paths');
assert.equal(mainByKey.size, mainManifest.entries.length, 'main audio manifest has duplicate clip paths');
assert.equal(currentByKey.size, currentManifest.entries.length, 'result audio manifest has duplicate clip paths');
for (const [key, entry] of mainByKey) {
  assert.deepEqual(currentByKey.get(key), entry, `main audio entry changed: ${entry.resultId} / ${key}`);
}
const additions = currentManifest.entries.filter(entry => !mainByKey.has(stableKey(entry)));
assert.equal(currentManifest.entries.length, mainManifest.entries.length + 2, 'audio manifest must equal main plus exactly two Supra clips');
assert.equal(additions.length, supra.size);
for (const entry of additions) {
  const expected = supra.get(entry.resultId);
  assert.ok(expected, `unexpected added audio entry ${entry.resultId}`);
  assert.equal(entry.model, 'supratts-1.0-preview');
  assert.equal(entry.backend, expected.backend);
  assert.equal(entry.trialIndex, 5, 'only scored warm trial 5 may be published');
  assert.equal(entry.full?.sha256, expected.sha256, 'full WAV digest mismatch');
  assert.equal(entry.full?.bytes, 61_639_148, 'full WAV size mismatch');
  assert.equal(entry.clip?.bytes, 1_440_044, 'clip size mismatch');
  assert.equal(entry.clip?.samples, 720_000, 'clip sample count mismatch');
}
assert.deepEqual(new Set(additions.map(entry => entry.resultId)), new Set(supra.keys()));
const reconciled = { ...mainManifest, entries: [...mainManifest.entries, ...additions] };
fs.writeFileSync(manifestPath, `${JSON.stringify(reconciled, null, 2)}\n`);
console.log(`PASS: preserved ${mainManifest.entries.length} main audio rows and appended exactly 2 scored Supra warm rows.`);

const mainAudioReadme = git('show', 'origin/main:audio/README.md');
const audioReadmePath = path.resolve('audio/README.md');
const audioReadme = fs.readFileSync(audioReadmePath, 'utf8');
const supraAttribution = '- SupraTTS 1.0 Preview: SupraLabs, fixed single English voice. The pinned model/runtime are MIT; bundled G2P dictionary and OOV fallback data are Apache-2.0. ONNX Runtime Web, Pyodide, CPython and NumPy retain their own terms and notices. The pinned card does not separately identify a voice performer or grant voice/output rights.\n';
assert.equal(audioReadme.split(supraAttribution).length - 1, 1, 'expected one Supra attribution');
const audioReadmeWithoutSupra = audioReadme.replace(supraAttribution, '');
assert.equal(audioReadmeWithoutSupra.endsWith('\n') ? audioReadmeWithoutSupra.slice(0, -1) : audioReadmeWithoutSupra, mainAudioReadme, 'audio README changed beyond the reviewed Supra attribution and its final newline');
console.log('PASS: audio README is byte-identical to main after removing the single Supra attribution line.');

if (process.argv.includes('--reference')) {
  const readme = fs.readFileSync(path.resolve('README.md'), 'utf8');
  const mainResultFiles = git('ls-tree', '-r', '--name-only', 'origin/main', '--', 'results')
    .split('\n').filter(name => name.endsWith('/result.json'));
  const expectedIds = new Set();
  for (const file of mainResultFiles) {
    const result = JSON.parse(git('show', `origin/main:${file}`));
    if (result.id) expectedIds.add(result.id);
  }
  for (const entry of fs.readdirSync(path.resolve('results'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const resultPath = path.resolve('results', entry.name, 'result.json');
    if (!fs.existsSync(resultPath)) continue;
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    if (result.id) expectedIds.add(result.id);
  }
  const missing = [...expectedIds].filter(id => !readme.includes(id));
  assert.deepEqual(missing, [], 'generated Reference section omitted result IDs');
  console.log(`PASS: generated README Reference includes all ${expectedIds.size} main and Supra result IDs.`);
}
