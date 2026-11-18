import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'web/zonos3/upstream');
const webRoot = resolve(sourceRoot, 'servers/web');
const entry = resolve(webRoot, 'src/client.ts');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--verify-build')) {
  throw new Error('Usage: node tools/build-zonos3-runtime.mjs [--verify-build]');
}
const outDir = resolve(root, args.length ? '.cache/zonos3-web-runtime-build' : 'web/zonos3/runtime');
const sourceRevision = 'a50e14117d99181ba7f28047b451ba03ba1a09a9';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

await rm(outDir, { recursive: true, force: true });
await mkdir(dirname(outDir), { recursive: true });
await build({
  configFile: false,
  root: webRoot,
  base: './',
  logLevel: 'info',
  build: {
    outDir,
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    modulePreload: false,
    target: 'es2022',
    rollupOptions: {
      input: { engine: entry },
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: '[name].js', chunkFileNames: '[name].js', assetFileNames: '[name][extname]' },
    },
  },
  worker: {
    format: 'es',
    rollupOptions: { output: { entryFileNames: '[name].js', chunkFileNames: '[name].js' } },
  },
});

async function listFiles(dir, prefix = '') {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) files.push(...await listFiles(resolve(dir, item.name), rel));
    else files.push(rel);
  }
  return files.sort();
}

const files = [];
for (const path of await listFiles(outDir)) {
  const bytes = await readFile(resolve(outDir, path));
  files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
await writeFile(resolve(outDir, 'BUILD-MANIFEST.json'), JSON.stringify({
  schemaVersion: 1,
  source: {
    repository: 'https://github.com/Zyphra/ZONOS3-Mini',
    revision: sourceRevision,
    license: 'MIT',
    entry: 'servers/web/src/client.ts',
  },
  builder: { package: 'vite', version: '8.3.5', target: 'es2022' },
  files,
}, null, 2) + '\n');
