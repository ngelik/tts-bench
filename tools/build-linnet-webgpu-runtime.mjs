import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINNET_WEBGPU_RUNTIME } from '../web/linnet/runtime-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = resolve(root, '.cache/linnet-webgpu-build');
const upstreamRoot = resolve(buildRoot, 'upstream');
const wrapperRoot = resolve(buildRoot, 'runtime');
const assetPath = resolve(root, '.cache/public', LINNET_WEBGPU_RUNTIME.target);
const discoverDigest = process.argv.includes('--discover-digest');
const relativeTo = (base, path) => {
  const value = relative(base, path);
  if (value === '..' || value.startsWith('..' + sep) || value.startsWith(sep)) throw new Error('Build path escaped its controlled directory.');
  return value;
};
const git = (args, cwd = upstreamRoot) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8_000_000 }).trim();
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options });
const capture = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

await mkdir(buildRoot, { recursive: true });
relativeTo(resolve(root, '.cache'), upstreamRoot);
relativeTo(resolve(root, '.cache'), wrapperRoot);
try {
  await access(resolve(upstreamRoot, '.git'));
  const remote = git(['remote', 'get-url', 'origin']);
  if (!['https://github.com/VoxRT/LinnetTTS.git', 'https://github.com/VoxRT/LinnetTTS'].includes(remote)) {
    throw new Error('The ignored Linnet build cache has an unexpected upstream remote. Remove only .cache/linnet-webgpu-build/upstream to rebuild it.');
  }
} catch (error) {
  if (error.message.includes('unexpected upstream')) throw error;
  const existing = await stat(upstreamRoot).catch(() => null);
  if (existing) throw new Error('The ignored Linnet upstream build path exists but is not the expected Git checkout. Remove only .cache/linnet-webgpu-build/upstream to rebuild it.');
  run('git', ['init', upstreamRoot]);
  git(['remote', 'add', 'origin', LINNET_WEBGPU_RUNTIME.sourceRepository + '.git']);
}

git(['fetch', '--depth=1', 'origin', LINNET_WEBGPU_RUNTIME.sourceCommit]);
git(['checkout', '--detach', 'FETCH_HEAD']);
if (git(['rev-parse', 'HEAD']) !== LINNET_WEBGPU_RUNTIME.sourceCommit) throw new Error('Fetched Linnet runtime source did not match its pinned commit.');
git(['reset', '--hard', LINNET_WEBGPU_RUNTIME.sourceCommit]);
git(['clean', '-fdx']);

run(process.execPath, [resolve(root, 'tools/linnet-webgpu-runtime/prepare-upstream.mjs'), upstreamRoot]);
await rm(wrapperRoot, { recursive: true, force: true });
await cp(resolve(root, 'tools/linnet-webgpu-runtime'), wrapperRoot, { recursive: true });

const installed = capture('rustup', ['run', LINNET_WEBGPU_RUNTIME.rustToolchain, 'rustc', '--version']);
if (!installed.startsWith('rustc ' + LINNET_WEBGPU_RUNTIME.rustToolchain + ' ')) {
  throw new Error(`Linnet hybrid runtime requires rustc ${LINNET_WEBGPU_RUNTIME.rustToolchain}; found ${installed}.`);
}
const targetList = capture('rustup', ['target', 'list', '--toolchain', LINNET_WEBGPU_RUNTIME.rustToolchain, '--installed']);
if (!targetList.split(/\s+/).includes('wasm32-unknown-unknown')) {
  throw new Error(`Install the pinned target with: rustup target add --toolchain ${LINNET_WEBGPU_RUNTIME.rustToolchain} wasm32-unknown-unknown`);
}

run('rustup', ['run', LINNET_WEBGPU_RUNTIME.rustToolchain, 'cargo', 'build', '--manifest-path', resolve(wrapperRoot, 'Cargo.toml'), '--target', 'wasm32-unknown-unknown', '--release', '--locked'], {
  env: { ...process.env, RUSTFLAGS: '-C link-arg=--export-memory' },
});

const wasmPath = resolve(wrapperRoot, 'target/wasm32-unknown-unknown/release/linnet_webgpu_runtime.wasm');
const wasm = await readFile(wasmPath);
const sha256 = createHash('sha256').update(wasm).digest('hex');
const report = { sourceCommit: LINNET_WEBGPU_RUNTIME.sourceCommit, rustToolchain: LINNET_WEBGPU_RUNTIME.rustToolchain, sha256, bytes: wasm.length, target: LINNET_WEBGPU_RUNTIME.target };
console.log(JSON.stringify(report, null, 2));
if (!discoverDigest && (sha256 !== LINNET_WEBGPU_RUNTIME.sha256 || wasm.length !== LINNET_WEBGPU_RUNTIME.bytes)) {
  throw new Error('Built Linnet hybrid WASM differs from the digest-pinned runtime policy. Use --discover-digest only when intentionally updating that policy.');
}

await mkdir(dirname(assetPath), { recursive: true });
const stagedPath = assetPath + '.partial';
await rm(stagedPath, { force: true });
await writeFile(stagedPath, wasm, { flag: 'wx' });
await rename(stagedPath, assetPath);
