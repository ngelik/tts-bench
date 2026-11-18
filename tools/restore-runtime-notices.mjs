import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, realpath, lstat, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mirrors = [
  'docs/runtime-notices/onnxruntime-web-1.31.1/LICENSE.txt',
  'docs/runtime-notices/onnxruntime-web-1.31.1/ThirdPartyNotices.txt',
  'docs/runtime-notices/onnxruntime-web-legacy/ThirdPartyNotices.txt',
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, path) => path === root || (!relative(root, path).startsWith('..' + sep) && relative(root, path) !== '..');

/** Restore notice bytes to a historical checkout's ignored cache, using its own pinned asset lock. */
export async function restoreRuntimeNotices(checkout, modelId) {
  const root = await realpath(checkout);
  const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
  const model = Object.hasOwn(lock.models, modelId) ? lock.models[modelId] : null;
  if (!model) throw new Error('Model is absent from the historical source asset lock');
  const known = new Map();
  for (const file of mirrors) {
    const bytes = await readFile(resolve(repository, file));
    known.set(sha256(bytes), bytes);
  }
  const notices = model.runtime.files.filter(asset => /^licenses\/onnxruntime-web-[a-zA-Z0-9.-]+\/(LICENSE|ThirdPartyNotices.txt)$/.test(asset.target));
  if (!notices.length) throw new Error('No supported ONNX Runtime notice assets in this model');
  const restored = [];
  for (const asset of notices) {
    const bytes = known.get(asset.sha256);
    if (!bytes || bytes.length !== asset.bytes) throw new Error('No byte-identical mirror for ' + asset.target);
    const path = resolve(root, '.cache/public', asset.target);
    let ancestor = dirname(path);
    for (;;) {
      try {
        if (!inside(root, await realpath(ancestor))) throw new Error('Historical cache resolves outside its checkout');
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        ancestor = dirname(ancestor);
      }
    }
    await mkdir(dirname(path), { recursive: true });
    if (!inside(root, await realpath(dirname(path)))) throw new Error('Historical cache resolves outside its checkout');
    let existing;
    try { existing = await lstat(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing) {
      if (!existing.isFile() || existing.isSymbolicLink()) throw new Error('Unsafe existing notice target');
      const current = await readFile(path);
      if (current.length !== bytes.length || sha256(current) !== asset.sha256) throw new Error('Existing notice differs from its pinned bytes');
    } else {
      const temporary = path + '.' + randomUUID() + '.partial';
      try {
        await writeFile(temporary, bytes, { flag: 'wx' });
        await rename(temporary, path);
      } finally { await rm(temporary, { force: true }); }
    }
    restored.push({ target: asset.target, bytes: bytes.length, sha256: asset.sha256 });
  }
  return restored;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [checkoutFlag, checkout, modelFlag, model, ...extra] = process.argv.slice(2);
  if (checkoutFlag !== '--checkout' || modelFlag !== '--model' || !checkout || !model || extra.length) {
    throw new Error('Usage: node tools/restore-runtime-notices.mjs --checkout ../tts-score --model MODEL');
  }
  console.log(JSON.stringify(await restoreRuntimeNotices(checkout, model), null, 2));
}
