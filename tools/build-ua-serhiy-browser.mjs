import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModel } from '../lib/catalog.mjs';
import { prepareAssets } from '../lib/assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ID = 'ua-serhiy-0p58m';
const PUBLIC = resolve(ROOT, '.cache/public');
const UPSTREAM = resolve(ROOT, '.cache/ua-serhiy-upstream');
const PYTHON_TOOLS = resolve(ROOT, '.cache/ua-serhiy-tools');
const BUILD = resolve(ROOT, '.cache/ua-serhiy-build');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function requireLicenseAcknowledgement(args) {
  if (!args.includes('--accept-license')) {
    throw new Error('Review docs/LICENSING.md and upstream terms, then pass --accept-license to use this GPL-3.0 model.');
  }
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, env, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
}

function addPythonToolsPath() {
  const existing = process.env.PYTHONPATH;
  return { ...process.env, PYTHONPATH: existing ? `${PYTHON_TOOLS}:${existing}` : PYTHON_TOOLS };
}

async function verifyPath(path, asset) {
  const bytes = await readFile(path);
  if (bytes.byteLength !== asset.bytes || sha256(bytes) !== asset.sha256) {
    throw new Error(`Pinned source asset ${asset.id} failed its byte or SHA-256 check.`);
  }
  return bytes;
}

async function ensureExporterDeps() {
  const probe = spawnSync('python3', ['-c', 'import numpy, onnx; assert numpy.__version__ == "2.5.5" and onnx.__version__ == "1.17.0"'], {
    cwd: ROOT, env: addPythonToolsPath(), encoding: 'utf8', stdio: 'ignore',
  });
  if (!probe.error && probe.status === 0) return;
  run('python3', ['-m', 'pip', 'install', '--target', '.cache/ua-serhiy-tools', '-r', 'tools/ua-serhiy-export-requirements.txt']);
  const check = spawnSync('python3', ['-c', 'import numpy, onnx; assert numpy.__version__ == "2.5.5" and onnx.__version__ == "1.17.0"'], {
    cwd: ROOT, env: addPythonToolsPath(), encoding: 'utf8', stdio: 'ignore',
  });
  if (check.error || check.status !== 0) throw new Error('Pinned ONNX exporter dependencies did not install correctly.');
}

requireLicenseAcknowledgement(process.argv.slice(2));
const model = getModel(MODEL_ID);
if (model.modelRevision !== '1abd585d725a787b405c28a59ce1cbdfd34780bb') {
  throw new Error('The Ukrainian Serhiy asset lock no longer matches the exporter pin.');
}

// The ordinary fetch stages every URL-backed source/runtime asset and then
// stops at generated ONNX files. Catch only that expected generated-asset
// boundary; every upstream network/checksum error remains fatal.
try {
  await prepareAssets(MODEL_ID, { mode: 'fetch', acceptLicense: true });
} catch (error) {
  const expected = model.assets.find(asset => asset.generated);
  if (!expected || !String(error?.message ?? error).startsWith(`Asset ${expected.id} is generated from pinned source`)) throw error;
}

await mkdir(UPSTREAM, { recursive: true });
for (const asset of model.assets.filter(item => !item.generated && item.target.startsWith(`models/${MODEL_ID}/`))) {
  const bytes = await verifyPath(resolve(PUBLIC, asset.target), asset);
  const destination = resolve(UPSTREAM, asset.target.slice(`models/${MODEL_ID}/${model.modelRevision}/`.length));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}

await ensureExporterDeps();
await mkdir(BUILD, { recursive: true });
run('python3', [
  'tools/export-ua-serhiy-graphs.py',
  '--model-dir', '.cache/ua-serhiy-upstream',
  '--out-dir', '.cache/ua-serhiy-build',
], addPythonToolsPath());

const generated = model.assets.filter(asset => asset.generated);
const manifest = JSON.parse(await readFile(resolve(BUILD, 'BUILD-MANIFEST.json'), 'utf8'));
for (const asset of generated) {
  const built = manifest.graphs?.[asset.generated.artifactPath];
  if (!built || built.bytes !== asset.bytes || built.sha256 !== asset.sha256) {
    throw new Error(`Generated ${asset.id} differs from its immutable lock entry.`);
  }
}

const source = Object.create(null);
for (const asset of model.assets) {
  if (asset.sourcePath) continue;
  source[asset.id] = asset.generated
    ? resolve(BUILD, asset.generated.artifactPath)
    : resolve(PUBLIC, asset.target);
}
await prepareAssets(MODEL_ID, { mode: 'import', source, acceptLicense: true });
await prepareAssets(MODEL_ID, { mode: 'verify', acceptLicense: true });
console.log(`Verified and staged ${generated.length} Ukrainian Serhiy ONNX graphs from ${model.modelRevision}.`);
