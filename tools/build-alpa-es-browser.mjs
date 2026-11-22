#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { getModel } from '../lib/catalog.mjs';
import { prepareAssets, runtimeReceiptId } from '../lib/assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ID = 'alpa-es';
const PUBLIC = resolve(ROOT, '.cache/public');
const SOURCE_REVISION = 'de2bf894bdd9eb768ae03fc6b385176a0ff505d1';
const args = process.argv.slice(2);
const acceptLicense = args.includes('--accept-license');
if (args.some(arg => arg !== '--accept-license')) throw new Error('Usage: node tools/build-alpa-es-browser.mjs [--accept-license]');
const model = getModel(MODEL_ID);
if (model.modelRevision !== SOURCE_REVISION || model.sourceRevision !== SOURCE_REVISION) throw new Error('Alpa-es source pin changed; review the builder before continuing.');
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('The verified exporter lock requires macOS arm64.');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePrefix = `models/${MODEL_ID}/${SOURCE_REVISION}/${SOURCE_REVISION}/source/`;
const work = await mkdtemp(join(tmpdir(), 'tts-bench-alpa-es-build-'));
const run = (command, commandArgs, env = process.env) => {
  const result = spawnSync(command, commandArgs, { cwd: ROOT, env, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} exited ${result.status}`);
};

try {
  const sourceRoot = resolve(work, 'source');
  const outputRoot = resolve(work, 'output');
  await mkdir(resolve(sourceRoot, 'alpa'), { recursive: true });
  await mkdir(outputRoot, { recursive: true });
  const assetMap = Object.create(null);
  const sourceFiles = Object.create(null);

  async function pinnedBytes(asset, cachedPath) {
    let bytes;
    try { bytes = await readFile(cachedPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bytes && bytes.byteLength === asset.bytes && sha256(bytes) === asset.sha256) return bytes;
    if (!asset.url) throw new Error(`No verified local copy or immutable URL exists for ${asset.id ?? asset.path}`);
    const response = await fetch(asset.url, { redirect: 'follow', signal: AbortSignal.timeout(30 * 60_000) });
    if (!response.ok) throw new Error(`Pinned source fetch failed for ${asset.id ?? asset.path}: HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== asset.bytes || sha256(bytes) !== asset.sha256) throw new Error(`Fetched source failed size/SHA-256 verification: ${asset.id ?? asset.path}`);
    return bytes;
  }

  for (const asset of model.runtime.files.filter(item => item.url && !item.sourcePath)) {
    const bytes = await pinnedBytes(asset, resolve(PUBLIC, asset.target));
    const destination = resolve(work, 'runtime', asset.path.split('/').at(-1));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    assetMap[runtimeReceiptId(model, asset)] = destination;
  }

  for (const asset of model.assets.filter(item => !item.generated && item.target.startsWith(sourcePrefix))) {
    const relativePath = asset.target.slice(sourcePrefix.length);
    if (!relativePath || isAbsolute(relativePath) || relativePath.split(/[\\/]+/u).some(part => part === '..')) {
      throw new Error(`Invalid locked Alpa source path: ${asset.target}`);
    }
    const destination = resolve(sourceRoot, relativePath);
    const rel = relative(sourceRoot, destination);
    if (rel === '..' || rel.startsWith('..' + sep)) throw new Error(`Alpa source escaped the temporary workspace: ${asset.id}`);
    await mkdir(dirname(destination), { recursive: true });
    const bytes = await pinnedBytes(asset, resolve(PUBLIC, asset.target));
    await writeFile(destination, bytes);
    assetMap[asset.id] = destination;
    sourceFiles[relativePath] = { bytes: asset.bytes, sha256: asset.sha256 };
  }

  const exporter = resolve(sourceRoot, 'alpa/export.py');
  const original = await readFile(exporter, 'utf8');
  const originalAsset = model.assets.find(asset => asset.id === 'alpa-es-source-alpa-export-py');
  if (!originalAsset || Buffer.byteLength(original) !== originalAsset.bytes || sha256(Buffer.from(original)) !== originalAsset.sha256) {
    throw new Error('Pinned upstream export.py source digest mismatch');
  }
  const pinnedExporter = resolve(work, 'pinned-export.py');
  await writeFile(pinnedExporter, original);
  assetMap[originalAsset.id] = pinnedExporter;
  const oldPadding = 'padding=self.treble.shape[-1] // 2';
  if (original.split(oldPadding).length !== 2) throw new Error('Expected exactly one static treble convolution padding expression.');
  await writeFile(exporter, original.replace(oldPadding, 'padding=int(self.treble.shape[-1]) // 2'));

  const python = resolve(work, 'venv/bin/python');
  run('uv', ['venv', '--python', 'python3.12', resolve(work, 'venv')]);
  run('uv', ['pip', 'sync', '--python', python, '--no-cache', '--only-binary', ':all:', '--require-hashes', 'tools/tiny-voca-gr/export-requirements.txt']);
  const pythonEnv = { ...process.env, PYTHONPATH: sourceRoot, PYTHONDONTWRITEBYTECODE: '1' };
  run(python, ['tools/alpa-es/export-browser.py', sourceRoot, outputRoot], pythonEnv);

  const generated = model.assets.filter(asset => asset.generated);
  for (const asset of generated) {
    const artifact = resolve(outputRoot, asset.generated.artifactPath);
    const bytes = await readFile(artifact);
    if (bytes.byteLength !== asset.bytes || sha256(bytes) !== asset.sha256) throw new Error(`Generated output differs from its asset lock: ${asset.id}`);
    assetMap[asset.id] = artifact;
  }

  await prepareAssets(MODEL_ID, { mode: 'import', source: assetMap, acceptLicense });
  await prepareAssets(MODEL_ID, { mode: 'verify', acceptLicense });
  console.log(JSON.stringify({
    modelId: MODEL_ID, modelRevision: SOURCE_REVISION, sourceFiles,
    exporterPatch: { file: 'alpa/export.py', from: oldPadding, to: 'padding=int(self.treble.shape[-1]) // 2' },
    generated: generated.map(asset => ({ path: asset.generated.artifactPath, bytes: asset.bytes, sha256: asset.sha256 })),
  }, null, 2));
  console.log(`Verified and staged Alpa Spanish browser export from ${SOURCE_REVISION}.`);
} finally {
  await rm(work, { recursive: true, force: true });
}
