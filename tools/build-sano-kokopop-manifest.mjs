import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function arg(name) {
  const index = process.argv.indexOf('--' + name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing --' + name);
  return resolve(process.argv[index + 1]);
}
function value(name) {
  const index = process.argv.indexOf('--' + name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing --' + name);
  return process.argv[index + 1];
}
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = arg('source');
const build = arg('build');
const sdk = arg('sdk');
const modelPath = arg('model');
const out = arg('out');
const stage = arg('stage');
const patch = arg('patch');
const projectRoot = arg('project-root');
const modelRevision = value('model-revision');
const emscriptenVersion = value('emscripten-version');
const sourcePin = '73ed5710cb37ca0384bc4bfdd7138d13605c9a88';
const expectedModelRevision = '4a8194aa1dd958033ee449b3ad30c37e536b216e';
if (git(source, 'rev-parse', 'HEAD') !== sourcePin) throw new Error('Kokopop source checkout is not the reviewed immutable commit.');
if (modelRevision !== expectedModelRevision) throw new Error('Heartnano artifact revision differs from Supra’s pinned official Q8 blobs.');
const dist = resolve(build, 'web/dist');
const files = ['kokopop-runtime.js', 'kokopop-runtime.wasm', 'kokopop-runtime.data', 'LICENSE', 'LICENSE.espeak-ng', 'LICENSE.ggml', 'LICENSE.yyjson'];
const runtimeFiles = [];
const licenseFiles = [];
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await mkdir(stage, { recursive: true });
for (const filename of files) {
  const path = resolve(dist, filename);
  const bytes = await readFile(path);
  const sha256 = hash(bytes);
  const target = filename.startsWith('LICENSE') ? 'licenses/kokopop-sano-heartnano-v1/' + filename : 'runtimes/kokopop-sano-heartnano-v1/' + filename;
  const destination = filename.startsWith('LICENSE') ? resolve(projectRoot, '.cache/public', target) : resolve(stage, filename);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(path, destination);
  if (!filename.startsWith('LICENSE')) await copyFile(path, resolve(out, filename));
  const entry = { filename, target, bytes: bytes.length, sha256, ...(filename === 'kokopop-runtime.data' ? { license: 'GPL-3.0-or-later eSpeak NG language data' } : {}) };
  if (filename.startsWith('LICENSE')) licenseFiles.push(entry);
  else runtimeFiles.push(entry);
}
const model = await readFile(modelPath);
const modelInfo = { filename: basename(modelPath), bytes: model.length, sha256: hash(model), source: 'Ampixa/sanoTTS heartnano Q8 sources, expanded by the pinned Kokopop converter to F32', artifactRevision: modelRevision };
await copyFile(modelPath, resolve(out, modelInfo.filename));
const patchBytes = await readFile(patch);
const ggml = git(resolve(build, '_deps/ggml-src'), 'rev-parse', 'HEAD');
const espeak = git(resolve(build, '_deps/espeak-src'), 'rev-parse', 'HEAD');
const yyjson = git(resolve(build, '_deps/yyjson-src'), 'rev-parse', 'HEAD');
const projectSourcePaths = [
  '.github/workflows/sano-kokopop-smoke.yml',
  'tests/sano-kokopop-adapter.test.mjs',
  'tools/build-sano-kokopop-manifest.mjs',
  'tools/build-sano-kokopop-webgpu.sh',
  'tools/sano-kokopop-browser-smoke.mjs',
  'web/adapters/sano-kokopop.mjs',
  'web/sano-kokopop/runtime.js',
  'web/sano-kokopop/patches/kokopop-browser.patch',
  'web/workers/sano-kokopop.mjs',
];
const projectFiles = [];
for (const path of projectSourcePaths) {
  const bytes = await readFile(resolve(projectRoot, path));
  projectFiles.push({ path, bytes: bytes.length, sha256: hash(bytes) });
}
const projectCommit = git(projectRoot, 'rev-parse', 'HEAD');
const notices = [
  'Kokopop SanoTTS heart-nano F32 browser runtime notices',
  '',
  'Kokopop and the benchmark integration: MIT. See LICENSE.',
  'ggml: MIT. See LICENSE.ggml.',
  'yyjson: MIT. See LICENSE.yyjson.',
  'eSpeak NG and bundled English dictionary data: GPL-3.0-or-later. See LICENSE.espeak-ng.',
  'The upstream Ampixa project repository is GPL-3.0-or-later; its LICENSE.MIT covers only specifically listed inference/runtime source files, not its G2P layer.',
  'The Ampixa heartnano weight package is in the GPL-3.0-tagged repository. The heartnano metadata does not declare a separate voice-package license; the README states weights are derived from Apache-2.0 and MIT teachers. Retain that provenance and do not label the weights MIT-only.',
  'This browser runtime uses the Kokopop C++ inference path and bundled eSpeak NG; it is not the official Ampixa browser runtime.',
  '',
].join('\n');
await writeFile(resolve(out, 'THIRD-PARTY-NOTICES.txt'), notices);
const noticeBytes = Buffer.from(notices);
const manifest = {
  schemaVersion: 1,
  source: {
    repository: 'https://github.com/tterrasson/kokopop',
    commit: sourcePin,
    patchSha256: hash(patchBytes),
    patchFile: 'web/sano-kokopop/patches/kokopop-browser.patch',
  },
  projectSource: { repository: 'https://github.com/ngelik/tts-bench', commit: projectCommit, files: projectFiles },
  dependencies: { ggml: { commit: ggml, tag: 'v0.28.0' }, espeakNg: { commit: espeak }, yyjson: { commit: yyjson, tag: '0.13.0' } },
  build: {
    emsdkCommit: git(sdk, 'rev-parse', 'HEAD'),
    emscriptenVersion,
    target: 'browser wasm32 with Emdawnwebgpu, JSPI, SIMD; English eSpeak data only',
    command: 'tools/build-sano-kokopop-webgpu.sh',
  },
  model: {
    ...modelInfo,
    upstream: 'https://huggingface.co/ampixa/sanoTTS/tree/' + modelRevision + '/heartnano',
    frontQ8: { filename: 'front_q8.bin', bytes: 109296, sha256: '5553ae5abf37c18d31c0b64ea791785b30e7a08cc32c07bff8bb2ab4aae0b94b' },
    decoderQ8: { filename: 'model_q8.bin', bytes: 235936, sha256: '4a6cdf0d0bf1996aa2c056298265ea8dd0c200c9025cba4a9b04e0e987bea88c' },
    originalWeightProfile: 'heartnano int8 Q8 source blobs; Kokopop converter expands each quantized row to F32 using its per-output scale and preserves source hashes/revisions in GGUF metadata',
    params: 294279,
    voice: 'heartnano',
    sampleRate: 24000,
  },
  runtimeFiles,
  licenseFiles,
  notices: { filename: 'THIRD-PARTY-NOTICES.txt', bytes: noticeBytes.length, sha256: hash(noticeBytes) },
  excluded: ['training checkpoints', 'unused voices', 'official Ampixa browser package', 'reference fixture files'],
};
await writeFile(resolve(out, 'BUILD-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit: sourcePin, ggmlCommit: ggml, model: modelInfo, runtimeFiles, licenseFiles, notices: manifest.notices }, null, 2));
