#!/usr/bin/env node
/**
 * Deterministically finish the Blue-Buff generated asset pins after the
 * reference-machine receipts exist. This script refuses incomplete, mismatched
 * or unverified artifacts and writes nothing until every check passes.
 *
 * The source directory must contain the blue-build export proof, independent
 * plan receipts, direct acoustic control, and frontend source receipts.
 * Pass it explicitly; this reusable script has no machine-specific default.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLUE_BUFF as profile } from '../web/adapters/blue-buff-profile.mjs';
import { BLUE_BUFF_UPSTREAM as upstream, blueBuffSupportSources } from '../web/adapters/blue-buff-upstream.mjs';
import { setBlueBuffBuildDeclaration } from './blue-buff-profile-marker.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const arg = process.argv.indexOf('--source-dir');
if (arg < 0 || !process.argv[arg + 1]) throw new Error('Required: --source-dir PATH');
const source = resolve(process.argv[arg + 1]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const inside = (base, path) => resolve(base, path).startsWith(resolve(base) + '/');
const proofPath = join(source, 'blue-build/proof.json');
const nativePath = join(source, 'blue-native-plans.json');
const browserPath = join(source, 'blue-browser-plans.json');
const referenceInputPath = join(source, 'blue-reference-input.json');
const directPath = join(source, 'blue-direct-acoustic-control.json');
const frontendAssetsPath = join(source, 'browser-frontend-assets.json');
const frontendNoticeManifestPath = join(source, 'frontend-notices/manifest.json');

const [proof, native, browser, referenceInput, direct, frontendAssets, frontendNoticeManifest, lock] = await Promise.all([
  readJson(proofPath), readJson(nativePath), readJson(browserPath), readJson(referenceInputPath), readJson(directPath),
  readJson(frontendAssetsPath), readJson(frontendNoticeManifestPath), readJson(join(root, 'assets.lock.json')),
]);
const baseProfilePath = join(root, 'web/adapters/blue-buff-profile.mjs');
const originalLock = structuredClone(lock);
const profileSource = await readFile(baseProfilePath, 'utf8');
const pinned = {
  id: 'tiny-voca-zh-blue-buff', modelId: upstream.model.id, modelRevision: upstream.model.revision,
  sourceId: upstream.source.id, sourceRevision: upstream.source.revision,
  checkpointSha256: '862293aaf5e97fdc8ed01d9d774603dc21e03d3642f188f651e20a92fbeef722',
  fixtureSha256: 'e3d2cc5e084b4eaca45a17e5856f3eb6b8225a60c31a19395512cb51b3db0336',
  parameters: 4545355, voice: 'F', sampleRate: 24000, hop: 256, maxFrames: 3000,
};
assert.equal(proof.sourceCheckpoint, pinned.checkpointSha256);
assert.equal(proof.parameters, pinned.parameters);
assert.equal(proof.graph, 'mandarin-f-external-noise.onnx');
assert.equal(native.spanCount, 30);
assert.equal(native.candidate?.method, profile.framePlan.policy);
assert.equal(native.candidate?.policyVersion, profile.framePlan.policyVersion);
assert.equal(native.candidate?.policySha256, referenceInput.splitPolicySha256);
assert.equal(native.candidate?.tokenTarget, profile.framePlan.tokenTarget);
assert.equal(native.candidate?.spans?.length, 30);
assert.equal(native.candidate?.utterances, native.candidate.spans.flat().length);
assert.ok(native.candidate?.maximumTokens <= profile.framePlan.tokenTarget);
assert.equal(native.splitPolicySha256, referenceInput.splitPolicySha256);
assert.equal(native.candidate?.allPlanSha256, referenceInput.allPlanSha256);
assert.equal(native.candidate.spans.flat().reduce((sum, row) => sum + row.unknown.length, 0), 0);
assert.equal(browser.headless, false, 'browser frontend receipt must be from headed Chrome');
assert.equal(native.frontendFingerprint, browser.frontendFingerprint);
for (const key of Object.keys(native)) assert.deepEqual(browser[key], native[key], `browser frontend receipt differs at ${key}`);
assert.equal(proof.nativePlansSha256, digest(await readFile(nativePath)));
assert.equal(referenceInput.fixtureSha256, pinned.fixtureSha256);
assert.equal(referenceInput.nativePlansSha256, proof.nativePlansSha256);
assert.equal(referenceInput.allSpanCount, 30);
assert.equal(referenceInput.checkedUtterances, native.candidate.utterances);
assert.equal(referenceInput.splitPolicy, profile.framePlan.policy);
assert.equal(referenceInput.tokenTarget, profile.framePlan.tokenTarget);
assert.equal(proof.framePlan?.policy_sha256, referenceInput.splitPolicySha256);
assert.equal(proof.framePlan?.all_plan_sha256, referenceInput.allPlanSha256);
assert.equal(proof.framePlan?.internal_piece_count, referenceInput.checkedUtterances);
assert.equal(proof.framePlan?.noise_reset, 'per-outer-span');
assert.equal(proof.noiseReset, 'per-outer-span');
assert.match(referenceInput.allPlanSha256, /^[a-f0-9]{64}$/);
assert.equal(direct.qualification, true);
assert.equal(direct.headless, false);
assert.equal(direct.provider, 'wasm');
assert.equal(direct.voice, pinned.voice);
assert.equal(direct.fixtureSha256, pinned.fixtureSha256);
assert.equal(direct.sourceFrontend, proof.nativePlansSha256);
assert.equal(direct.rows?.length, 3);
assert.equal(frontendNoticeManifest.frontendArchiveSha256, frontendAssets.find(row => row.path === 'mandarin-frontend.zip')?.sha256);
assert.equal(frontendNoticeManifest.framePlanPolicy?.id, profile.framePlan.policy);
assert.equal(frontendNoticeManifest.framePlanPolicy?.sha256, referenceInput.splitPolicySha256);
assert.equal(frontendNoticeManifest.framePlanPolicy?.module, profile.framePlan.policyModule);
assert.equal(frontendNoticeManifest.sourceNoticeSha256, 'a8e403b17a5591b61ebcc382440b6853828dd76642eb6ea404511fcdf785e68b');

async function verified(path, expectedSha, expectedBytes, base = root) {
  assert.ok(inside(base, path), `artifact escapes its source directory: ${path}`);
  const bytes = await readFile(join(base, path));
  assert.equal(bytes.length, expectedBytes, `${path} byte count mismatch`);
  assert.equal(digest(bytes), expectedSha, `${path} SHA-256 mismatch`);
  return bytes;
}
const graphBytes = await verified(`blue-build/${proof.graph}`, proof.sha256, proof.bytes, source);
const configBytes = await readFile(join(source, 'blue-build/config.json'));
assert.equal(digest(configBytes), proof.configSha256, 'blue-build/config.json SHA-256 mismatch');
const config = JSON.parse(configBytes.toString('utf8'));
assert.equal(config.sample_rate, pinned.sampleRate);
assert.equal(config.hop, pinned.hop);
assert.equal(config.frontend, 'zh-v1');
assert.deepEqual(config.inputs, ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'noise']);
assert.deepEqual(config.outputs, ['audio', 'durations']);
assert.deepEqual(config.voices, ['F', 'M']);
assert.equal(config.frontend_fingerprint, native.frontendFingerprint);
assert.deepEqual(config.frame_plan, proof.framePlan);
assert.equal(proof.noise?.length, native.candidate.maximumPiecesPerSpan);
for (let i = 0; i < proof.noise.length; i++) {
  const row = proof.noise[i];
  assert.equal(row.seed, i, 'noise seeds must be contiguous and begin at zero');
  assert.equal(row.file, `noise-${i}.f32le`);
  await verified(`blue-build/${row.file}`, row.sha256, row.bytes, source);
}
assert.equal(frontendAssets.find(row => row.path === 'mandarin-frontend.zip')?.sha256, frontendNoticeManifest.frontendArchiveSha256);
for (const item of frontendAssets) await verified(`browser-site/web/${item.path}`, item.sha256, item.bytes, source);

const expectedNoticeFiles = ['NOTICE.md', 'frontend-notices/manifest.json', ...frontendNoticeManifest.dependencies.map(row => `frontend-notices/${row.file}`)];
assert.equal(expectedNoticeFiles.length, 6);
const notices = {};
const runtimeNoticePins = {
  'runtime-notices/pyodide-LICENSE': 'mach-boom-pyodide-license',
  'runtime-notices/python-LICENSE': 'mach-boom-python-license',
};
for (const [path, id] of Object.entries(runtimeNoticePins)) {
  const sourceAsset = lock.models['mach-boom'].assets.find(asset => asset.id === id);
  assert.ok(sourceAsset, `pinned runtime license missing from source lock: ${id}`);
  assert.equal(sourceAsset.kind, 'license');
  const expected = profile.runtimeNotices[path];
  assert.ok(expected, `runtime notice is not pinned in profile: ${path}`);
  assert.equal(sourceAsset.bytes, expected[0]);
  assert.equal(sourceAsset.sha256, expected[1]);
  const bytes = await readFile(join(root, `web/tiny-voca-zh-blue-buff/notices/${basename(path)}`));
  assert.equal(bytes.length, sourceAsset.bytes);
  assert.equal(digest(bytes), sourceAsset.sha256, `tracked runtime license mismatch: ${path}`);
  notices[path] = { path, bytes: bytes.length, sha256: digest(bytes), url: sourceAsset.url };
}
const sourceLicenseBytes = await readFile(join(source, 'blue-source', profile.modelLicense.path));
assert.equal(sourceLicenseBytes.length, profile.modelLicense.bytes);
assert.equal(digest(sourceLicenseBytes), profile.modelLicense.sha256, 'pinned Blue-Buff source LICENSE mismatch');
const checkedOutLicenseBytes = await readFile(join(root, 'web/tiny-voca-zh-blue-buff/LICENSE'));
assert.equal(digest(checkedOutLicenseBytes), profile.modelLicense.sha256, 'tracked Blue-Buff source LICENSE mismatch');
for (const path of expectedNoticeFiles) {
  const bytes = await readFile(join(source, path === 'NOTICE.md' ? 'blue-source/NOTICE.md' : path));
  const expectedSha = path === 'NOTICE.md' ? frontendNoticeManifest.sourceNoticeSha256 :
    path === 'frontend-notices/manifest.json' ? digest(await readFile(frontendNoticeManifestPath)) :
    frontendNoticeManifest.dependencies.find(row => `frontend-notices/${row.file}` === path).licenseFileSha256;
  notices[path] = { path, bytes: bytes.length, sha256: digest(bytes) };
  assert.equal(notices[path].sha256, expectedSha, `notice mismatch: ${path}`);
  const trackedPath = `web/tiny-voca-zh-blue-buff/notices/${basename(path)}`;
  assert.equal(digest(await readFile(join(root, trackedPath))), notices[path].sha256, `tracked notice mismatch: ${path}`);
}

const maxFrames = 3000, hop = 256;
const maxNoiseBytes = maxFrames * hop * 4;
assert.ok(proof.noise.length > 0 && proof.noise.every(row => row.bytes === maxNoiseBytes));
const build = {
  graph: proof.graph, bytes: proof.bytes, sha256: proof.sha256,
  sourceCheckpoint: proof.sourceCheckpoint, parameters: proof.parameters,
  config: { path: 'config.json', bytes: configBytes.length, sha256: proof.configSha256 },
  noise: proof.noise.map(row => ({ file: row.file, seed: row.seed, bytes: row.bytes, sha256: row.sha256 })),
  frontend: { path: 'mandarin-frontend.zip', bytes: frontendAssets.find(row => row.path === 'mandarin-frontend.zip').bytes, sha256: frontendNoticeManifest.frontendArchiveSha256 },
  notices: Object.fromEntries(Object.entries(notices).map(([name, spec]) => [name, { bytes: spec.bytes, sha256: spec.sha256 }])),
  framePlan: { policy: proof.framePlan.policy, policyVersion: proof.framePlan.policy_version, policySha256: proof.framePlan.policy_sha256,
    tokenTarget: proof.framePlan.token_target, allPlanSha256: proof.framePlan.all_plan_sha256, internalPieceCount: proof.framePlan.internal_piece_count,
    maximumPiecesPerSpan: proof.framePlan.maximum_pieces_per_span, noiseReset: proof.framePlan.noise_reset },
  frontendOracle: {
    spanCount: native.spanCount, utterances: native.candidate.utterances,
    maximumTokens: native.candidate.maximumTokens,
    unknownTokens: native.candidate.spans.flat().reduce((sum, row) => sum + row.unknown.length, 0),
    frontendFingerprint: native.frontendFingerprint, allPlanSha256: referenceInput.allPlanSha256, splitPolicy: referenceInput.splitPolicy,
    splitPolicySha256: referenceInput.splitPolicySha256, tokenTarget: referenceInput.tokenTarget, maximumPiecesPerSpan: native.candidate.maximumPiecesPerSpan,
  },
};
assert.equal(build.frontendOracle.unknownTokens, 0);
assert.equal(build.frontendOracle.utterances, native.candidate.spans.reduce((n, row) => n + row.length, 0));
assert.equal(build.framePlan.policySha256, native.splitPolicySha256);

const modelAssets = [];
function addAsset(name, filePath, bytes, sha256, kind, extra = {}) {
  const safe = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const asset = { id: `${pinned.id}-${safe}`, target: `models/${pinned.id}/${pinned.modelRevision}/${pinned.sourceRevision}/${filePath}`, bytes, sha256, kind, ...extra };
  modelAssets.push(asset);
}
const generatedBuild = 'Generated by tools/build-blue-buff/build.py from blue-source/tiny-voca-zh.pt and blue-source/src/tiny_voca/export.py, using the verified native plan receipt, FP32 and ONNX opset 17 with external seeded noise.';
addAsset('mandarin-f-external-noise', proof.graph, proof.bytes, proof.sha256, 'model-weights', { generated: { artifactPath: proof.graph, build: generatedBuild } });
addAsset('mandarin-config', 'config.json', configBytes.length, proof.configSha256, 'model-config', { generated: { artifactPath: 'config.json', build: generatedBuild } });
for (const row of proof.noise) addAsset(`noise-${row.seed}`, row.file, row.bytes, row.sha256, 'model-input', { generated: { artifactPath: row.file, build: 'Generated by tools/build-blue-buff/build.py using the recorded per-span utterance seed; see blue-build/proof.json.' } });
addAsset('mandarin-frontend', 'mandarin-frontend.zip', build.frontend.bytes, build.frontend.sha256, 'text-frontend', { generated: { artifactPath: 'mandarin-frontend.zip', build: 'Built by tools/build-blue-buff/build.py using pinned source, wheels, and plan receipts; package and source receipts are checked before import.' } });
addAsset('source-license', profile.modelLicense.path, profile.modelLicense.bytes, profile.modelLicense.sha256, 'license-notice', { sourcePath: 'web/tiny-voca-zh-blue-buff/LICENSE' });
for (const [path, spec] of Object.entries(notices)) addAsset(path, path, spec.bytes, spec.sha256, 'license-notice', {
  sourcePath: `web/tiny-voca-zh-blue-buff/notices/${basename(path)}`,
  ...(spec.url ? { url: spec.url } : {}),
});
for (const [name, [bytes, sha256]] of Object.entries(profile.pyodideAssets)) {
  addAsset(`pyodide-${name}`, name, bytes, sha256, 'runtime', {
    target: `${profile.pyodideRoot.replace(/^\//, '')}${name}`,
    url: `https://cdn.jsdelivr.net/pyodide/v${profile.pyodideVersion}/full/${name}`,
  });
}

const runtime = structuredClone(lock.models['tiny-voca-lg'].runtime);
for (const file of runtime.files) file.id = `${pinned.id}-runtime-${basename(file.target).replace(/[^a-z0-9]/gi, '-')}`.toLowerCase();
const modelEntry = {
  displayName: 'Blue-Buff Tiny Voca Mandarin F', modelRevision: pinned.modelRevision,
  sourceId: pinned.sourceId, sourceRevision: pinned.sourceRevision,
  parameterCount: pinned.parameters, frontendFingerprint: native.frontendFingerprint,
  runtime,
  license: {
    model: 'Apache-2.0 per the pinned Blue-Buff source LICENSE and pyproject.toml.',
    trainingData: 'The pinned project NOTICE says the training data preparation and final Chinese model were created for this project; no separate training-data license is stated in the supplied pinned material.',
    frontend: 'Pinned Blue-Buff zh_text.py plus pypinyin 0.55.0, cn2an 0.5.24, jieba 0.42.1 and proces 0.1.7; each bundled component notice is hash-checked and staged with the model assets.',
    inferenceSource: 'Benchmark adapter and integration under the repository MIT license.',
    runtime: 'MIT ONNX Runtime Web 1.31.1 with retained third-party notices.',
    requiresAcceptance: false,
  },
  backends: ['cpu', 'webgpu'],
  support: {
    voiceCount: 2, bundledVoiceCount: 2, languageCount: 1, languages: ['zh-Hans'],
    scope: 'Pinned Blue-Buff tiny-voca-zh FP32 checkpoint bundles voices F and M; this qualified browser profile selects F at graph index 0 for Simplified Chinese, 24 kHz mono.',
    sources: blueBuffSupportSources(),
    notes: 'The browser frontend uses the pinned per-span Pyodide phonemizer and checked dictionary/dependency notices. Native and browser plans must match the independent frontend receipts. The direct acoustic control qualifies only three spans and does not establish a benchmark result or listening quality.',
  },
  assets: modelAssets,
};
const existingModel = lock.models[pinned.id];
if (existingModel) assert.deepEqual(existingModel, modelEntry, 'existing Blue-Buff lock entry differs; refusing to overwrite it');
else lock.models[pinned.id] = modelEntry;
const updatedProfile = setBlueBuffBuildDeclaration(profileSource, build);
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + '\n');
const profileBytes = Buffer.from(updatedProfile);
// Re-read source files so a concurrent or unrelated edit is never overwritten.
assert.deepEqual(await readJson(join(root, 'assets.lock.json')), originalLock, 'assets.lock.json changed during finalization; refusing to overwrite it');
assert.equal((await readFile(baseProfilePath, 'utf8')), profileSource, 'Blue-Buff profile changed during finalization; refusing to overwrite it');
if (!lockBytes.equals(await readFile(join(root, 'assets.lock.json')))) await writeFile(join(root, 'assets.lock.json'), lockBytes);
if (!profileBytes.equals(await readFile(baseProfilePath))) await writeFile(baseProfilePath, profileBytes);
console.log(JSON.stringify({ model: pinned.id, graphSha256: digest(graphBytes), configSha256: proof.configSha256,
  nativePlansSha256: proof.nativePlansSha256, frontendFingerprint: native.frontendFingerprint, framePlan: proof.framePlan,
  noiseSeeds: proof.noise.length, assets: modelAssets.length, lockSha256: digest(lockBytes) }, null, 2));
