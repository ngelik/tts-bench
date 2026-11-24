import { BLUE_BUFF as base, BLUE_BUFF_BUILD } from '../adapters/blue-buff-profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const modelRoot = `/models/${base.id}/${base.modelRevision}/${base.sourceRevision}/`;
let ort, session, pyodide, phonemize, modelConfig;
let activeFixture, activeLanguage, requestedBackend, gpuName, cacheEnabled = true, noiseStreams;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
function assetUrl(root, path, prefix) {
  if (typeof path !== 'string' || path.startsWith('/') || path.split('/').includes('..')) throw new Error('Unsafe Blue-Buff asset path');
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('Blue-Buff assets must resolve to the local origin');
  return url;
}
async function checkedBytes(root, path, spec, label, prefix) {
  if (!spec || !Number.isSafeInteger(spec.bytes) || !/^[a-f0-9]{64}$/.test(spec.sha256)) throw new Error(`Unpinned ${label}`);
  const response = await fetch(assetUrl(root, path, prefix), { cache: cacheEnabled ? 'default' : 'no-store' });
  if (!response.ok) throw new Error(`${label} fetch failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = (path, spec) => checkedBytes(modelRoot, path, spec, `Blue-Buff ${path}`, '/models/');
const runtimeAsset = (path, spec) => checkedBytes(base.runtimeRoot, path, { bytes: spec[0], sha256: spec[1] }, `ONNX Runtime ${path}`, '/runtimes/');
const pyodideAsset = path => checkedBytes(base.pyodideRoot, path, { bytes: base.pyodideAssets[path][0], sha256: base.pyodideAssets[path][1] }, `Pyodide ${path}`, '/runtimes/');
function requireBuild(value) {
  const expectedNotices = { ...base.frontendNotices, ...base.runtimeNotices };
  if (!value?.framePlan || value.framePlan.policy !== base.framePlan.policy || value.framePlan.policyVersion !== base.framePlan.policyVersion ||
      value.framePlan.tokenTarget !== base.framePlan.tokenTarget || value.framePlan.noiseReset !== base.framePlan.noiseReset || !/^[a-f0-9]{64}$/.test(value.framePlan.policySha256 ?? '') ||
      !Number.isSafeInteger(value.framePlan.internalPieceCount) || value.framePlan.internalPieceCount < 1 || !/^[a-f0-9]{64}$/.test(value.framePlan.allPlanSha256 ?? '')) throw new Error('Blue-Buff build proof lacks the pinned source-preserving frame plan');
  if (!value || value.sourceCheckpoint !== base.checkpointSha256 || value.parameters !== base.parameterCount ||
      value.graph !== 'mandarin-f-external-noise.onnx' || !Number.isSafeInteger(value.bytes) || !/^[a-f0-9]{64}$/.test(value.sha256) ||
      value.config?.path !== 'config.json' || !Number.isSafeInteger(value.config.bytes) || !/^[a-f0-9]{64}$/.test(value.config.sha256) ||
      value.frontend?.path !== base.frontendZip.path || value.frontend.bytes !== base.frontendZip.bytes || value.frontend.sha256 !== base.frontendZip.sha256 ||
      !value.notices || Object.keys(expectedNotices).length !== Object.keys(value.notices).length ||
      Object.entries(expectedNotices).some(([path, [bytes, digest]]) => value.notices[path]?.bytes !== bytes || value.notices[path]?.sha256 !== digest) ||
      !Array.isArray(value.noise) || value.noise.length < 1 || value.noise.some((row, index) => row.seed !== index || row.file !== `noise-${index}.f32le` || row.bytes !== base.maxFrames * base.hop * 4 || !/^[a-f0-9]{64}$/.test(row.sha256))) {
    throw new Error('Blue-Buff requires a hash-verified external-noise build proof; no placeholder graph or noise pins are accepted.');
  }
  return value;
}
function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: base.voice, precision: base.precision,
    settings: { modelId: base.modelId, modelRevision: base.modelRevision, sourceId: base.sourceId, sourceRevision: base.sourceRevision,
      fixtureId: base.fixtureId, fixtureSha256: base.fixtureSha256, language: base.language, locale: base.locale, voice: base.voice, voiceIndex: base.voiceIndex },
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function loadFrontend(build) {
  const names = Object.keys(base.pyodideAssets);
  await Promise.all(names.map(pyodideAsset));
  const files = await Promise.all([
    modelAsset(build.frontend.path, build.frontend),
    ...Object.entries(build.notices).map(([path, spec]) => modelAsset(path, spec)),
  ]);
  const [archive, ...noticeFiles] = files;
  if (!archive) throw new Error('Pinned Mandarin frontend files were not loaded');
  const manifestName = 'frontend-notices/manifest.json';
  const manifestIndex = Object.keys(build.notices).indexOf(manifestName);
  if (manifestIndex < 0) throw new Error('Pinned frontend component notice manifest is required');
  const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(noticeFiles[manifestIndex]));
  if (manifest.frontendArchiveSha256 !== base.frontendZip.sha256 || manifest.sourceNoticeSha256 !== base.frontendNotices['NOTICE.md'][1] ||
      !Array.isArray(manifest.dependencies) || manifest.dependencies.length !== 4 ||
      manifest.dependencies.some(row => !['pypinyin', 'cn2an', 'proces', 'jieba'].includes(row.project) || !row.licenseFileSha256)) {
    throw new Error('Mandarin frontend component notices do not match the pinned package archive and notice set');
  }
  const { loadPyodide } = await import(base.pyodideRoot + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: new URL(base.pyodideRoot, self.location.href).href });
  if (pyodide.version !== base.pyodideVersion) throw new Error(`Unexpected Pyodide ${pyodide.version}`);
  pyodide.unpackArchive(archive.slice().buffer, 'zip', { extractDir: '/blue-frontend' });
  pyodide.runPython(`
import os, sys
os.environ['TINY_VOCA_FRONTEND'] = 'zh'
sys.path.insert(0, '/blue-frontend')
import tiny_voca.text as text
from tiny_voca import zh_text
`);
  const observed = pyodide.runPython('text.frontend_fingerprint()');
  if (typeof observed !== 'string' || !observed) throw new Error('Pinned Blue-Buff frontend did not report its source fingerprint');
  // The same reviewed policy module ships in the portable frontend archive and
  // is used by the native plan recipe. Runtime planning is deterministic and
  // source preserving; live synthesis never chooses a new split from durations.
  pyodide.runPython(`
import json, jieba
from tiny_voca import frame_plan_policy as frame_policy
from tiny_voca.text import phonemize

def blue_plan_json(source):
    return json.dumps(frame_policy.plan_piece(source, phonemize, jieba, frame_policy.DEFAULT_TOKEN_TARGET), ensure_ascii=False, separators=(',', ':'))
blue_plan_json('中文校验。')
`);
  phonemize = pyodide.globals.get('blue_plan_json');
  return observed;
}

function planText(text) {
  const rows = JSON.parse(phonemize(text));
  if (!Array.isArray(rows) || !rows.length || rows.map(row => row.text).join('') !== text) throw new Error('Blue-Buff policy did not preserve the exact source span');
  return rows.map(row => {
    const { ids, stress, text: sourceText, sourceStart, sourceEnd } = row;
    if (!Array.isArray(ids) || !Array.isArray(stress) || ids.length !== stress.length || ids.length < 3 || ids.length > base.framePlan.tokenTarget ||
        typeof sourceText !== 'string' || !sourceText || !Number.isSafeInteger(sourceStart) || !Number.isSafeInteger(sourceEnd) || sourceEnd - sourceStart !== sourceText.length ||
        ids.some(id => !Number.isInteger(id) || id < 0 || id >= 115) || stress.some(value => !Number.isInteger(value) || value < 0 || value > 5)) {
      throw new Error('Blue-Buff frontend violated the pinned token/tone ABI or source provenance');
    }
    return { ids, stress, sourceText, sourceStart, sourceEnd };
  });
}
async function auditFixture(auditTexts, expected, fingerprint) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== 30 || expected?.spanCount !== 30) throw new Error('Blue-Buff audit requires all 30 ordered zh-hans-article-v1 spans');
  const rows = []; let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid Mandarin source span ${id}`);
    if (item.sha256 && await sha256(new TextEncoder().encode(item.text)) !== item.sha256) throw new Error(`Mandarin source span ${id} SHA-256 mismatch`);
    const plans = planText(item.text);
    if (plans.map(plan => plan.sourceText).join('') !== item.text) throw new Error(`Mandarin policy failed source reconstruction for span ${id}`);
    for (const plan of plans) {
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownTokens += plan.ids.filter(token => token === 4).length;
    }
    rows.push([id, plans.map(plan => [plan.ids, plan.stress])]);
  }
  const frontendFingerprint = fingerprint;
  const actual = { spans: auditTexts.length, utterances, maximumTokens, unknownTokens, frontendFingerprint, splitPolicy: base.framePlan.policy, splitPolicySha256: modelConfig.framePlan.policySha256 };
  for (const key of ['utterances', 'maximumTokens', 'unknownTokens', 'frontendFingerprint', 'splitPolicy', 'splitPolicySha256']) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) throw new Error(`Blue-Buff fixture frontend mismatch for ${key}: got ${actual[key]}, expected ${expected[key]}`);
  }
  const planSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (expected.allPlanSha256 !== planSha256) throw new Error(`Blue-Buff fixture frontend mismatch for allPlanSha256: got ${planSha256}, expected ${expected.allPlanSha256}`);
  return { fixtureId: base.fixtureId, fixtureSha256: base.fixtureSha256, splitPolicy: base.framePlan.policy, splitPolicySha256: modelConfig.framePlan.policySha256, status: 'matched', ...actual, planSha256 };
}
function tensor(ortModule, values) { return new ortModule.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]); }
async function runGraph(plan, seed) {
  if (!session || !noiseStreams || seed < 0 || seed >= noiseStreams.length) throw new Error(`Missing checked seed ${seed} for Mandarin utterance`);
  const noise = noiseStreams[seed];
  const inputs = {
    tokens: tensor(ort, plan.ids), stress: tensor(ort, plan.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(0n), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(1), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(0), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(1), [1]),
    noise: new ort.Tensor('float32', noise, [1, noise.length]),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const audioData = typeof outputs.audio.getData === 'function' ? await outputs.audio.getData() : outputs.audio.data;
    const durations = Array.from(typeof outputs.durations.getData === 'function' ? await outputs.durations.getData() : outputs.durations.data, Number);
    if (durations.length !== plan.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Mandarin graph returned invalid duration frames');
    const frames = durations.reduce((sum, value) => sum + value, 0), samples = Float32Array.from(audioData);
    if (!Number.isSafeInteger(frames) || frames < 1 || samples.length !== frames * base.hop || !samples.length ||
        !samples.every(Number.isFinite) || !samples.some(value => value !== 0)) throw new Error('Mandarin graph returned invalid raw PCM');
    return { samples, frames };
  } finally {
    for (const value of [...Object.values(inputs), ...Object.values(outputs ?? {})]) value.dispose?.();
  }
}
function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Float32Array(length); let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  let peak = 0;
  for (const value of output) peak = Math.max(peak, Math.abs(value));
  if (peak > base.peak) for (let i = 0; i < output.length; i++) output[i] *= base.peak / peak;
  return output;
}
async function synthesizeSourceSpan(text, firstPcm) {
  const plans = planText(text);
  if (plans.map(plan => plan.sourceText).join('') !== text) throw new Error('Mandarin policy failed exact source reconstruction');
  const output = [];
  for (let seed = 0; seed < plans.length; seed++) {
    const result = await runGraph(plans[seed], seed);
    if (result.frames > base.maxFrames) throw new Error(`Mandarin planned piece exceeded ${base.maxFrames} frames; refusing runtime resplit`);
    output.push(result.samples);
    if (output.length === 1) firstPcm?.();
  }
  if (!output.length) throw new Error('Blue-Buff returned no utterance audio');
  return concat(output);
}
async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Blue-Buff requires an explicit cpu or webgpu backend');
  if (options.fixtureId !== base.fixtureId || options.language !== base.language) return unsupported('This profile supports only zh-hans-article-v1 (zh-Hans).');
  if (options.voice && options.voice !== base.voice) return unsupported('This profile is qualified only for voice F at index 0.');
  if (options.sourceSha256 && options.sourceSha256 !== base.fixtureSha256) throw new Error('Mandarin article hash differs from the pinned fixture identity');
  const config = BLUE_BUFF_BUILD;
  modelConfig = requireBuild(config);
  requestedBackend = options.backend; activeFixture = options.fixtureId; activeLanguage = options.language; cacheEnabled = options.cache !== false;
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or the selected adapter is software; CPU/WASM remains available.');
  }
  const gpu = requestedBackend === 'webgpu';
  const runtimeNames = gpu ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'] : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [graphBytes, configBytes] = await Promise.all([
    modelAsset(config.graph, config), modelAsset(config.config.path, config.config),
    ...runtimeNames.map(name => runtimeAsset(name, base.runtimeAssets[name])),
  ]);
  const metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  if (metadata.sample_rate !== base.sampleRate || metadata.hop !== base.hop || metadata.max_tokens !== base.maxTokens || metadata.max_frames !== base.maxFrames ||
      metadata.frame_plan?.policy !== base.framePlan.policy || metadata.frame_plan?.policy_sha256 !== modelConfig.framePlan.policySha256 ||
      metadata.frame_plan?.all_plan_sha256 !== modelConfig.framePlan.allPlanSha256 || metadata.frame_plan?.token_target !== base.framePlan.tokenTarget ||
      metadata.voices?.[base.voiceIndex] !== base.voice || JSON.stringify(metadata.inputs) !== JSON.stringify(['tokens','stress','voice','speed','pitch_shift','pitch_range','noise']) ||
      JSON.stringify(metadata.outputs) !== JSON.stringify(['audio','durations']) || metadata.frontend !== 'zh-v1') {
    throw new Error('Blue-Buff graph metadata differs from its pinned checkpoint/frontend ABI');
  }
  const frontend = await loadFrontend(modelConfig);
  if (metadata.frontend_fingerprint !== frontend) throw new Error('Blue-Buff config frontend fingerprint differs from the runtime phonemizer');
  ort = await import(base.runtimeRoot + runtimeNames[0]);
  ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.logLevel = 'error';
  ort.env.wasm.wasmPaths = gpu ? { mjs: base.runtimeRoot + runtimeNames[1], wasm: base.runtimeRoot + runtimeNames[2] } : base.runtimeRoot;
  const providers = gpu ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graphBytes, { executionProviders: providers, graphOptimizationLevel: 'all' });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) throw new Error('Blue-Buff ONNX graph input/output ABI mismatch');
  // Verify and convert the external streams once during initialization. Reuse
  // the typed arrays for every utterance so measured inference excludes asset
  // fetch, hashing and JS byte conversion work.
  noiseStreams = await Promise.all(modelConfig.noise.map(async noiseSpec => {
    const bytes = await modelAsset(noiseSpec.file, noiseSpec);
    if (bytes.byteLength % 4 !== 0) throw new Error(`Misaligned Mandarin noise stream seed ${noiseSpec.seed}`);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const values = new Float32Array(bytes.byteLength / 4);
    for (let index = 0; index < values.length; index++) values[index] = view.getFloat32(index * 4, true);
    if (!values.every(Number.isFinite) || values.length !== base.maxFrames * base.hop) throw new Error(`Invalid Mandarin noise stream seed ${noiseSpec.seed}`);
    return values;
  }));
  if (gpu) {
    const device = await ort.env.webgpu.device, adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.info?.isFallbackAdapter || adapter?.isFallbackAdapter) { await dispose(); return unsupported('ONNX Runtime selected a software WebGPU adapter.'); }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  const fixtureAudit = await auditFixture(options.auditTexts, modelConfig.frontendOracle, frontend);
  let dispatches = 0;
  if (options.probe) {
    const hook = gpu ? dispatchProbe() : null;
    try { await synthesizeSourceSpan(options.probeText || '普通话测试。'); }
    finally { dispatches = hook?.stop() ?? 0; }
    if (gpu && dispatches < 1) { await dispose(); return unsupported('No hardware WebGPU compute dispatch was observed in the separate capability synthesis.'); }
  }
  return { status: 'measured', backendEffective: gpu ? 'webgpu+wasm' : 'cpu/wasm', voice: base.voice, precision: base.precision, gpu: gpuName,
    settings: { modelId: base.modelId, modelRevision: base.modelRevision, sourceId: base.sourceId, sourceRevision: base.sourceRevision, parameterCount: base.parameterCount,
      fixtureId: base.fixtureId, fixtureSha256: base.fixtureSha256, language: base.language, locale: base.locale, supportedLanguages: [base.language],
      voice: base.voice, voiceIndex: base.voiceIndex, sampleRate: base.sampleRate, hop: base.hop, maxTokens: base.maxTokens, maxFrames: base.maxFrames,
      speed: base.speed, pitchShift: base.pitchShift, pitchRange: base.pitchRange, peak: base.peak, precision: base.precision,
      frontend: 'Pinned Blue-Buff zh-v1 text.py/zh_text.py in Pyodide 0.29.3; pinned cn2an, jieba, pypinyin and proces wheels',
      frontendFingerprint: frontend, runtimeVersions: { onnxruntimeWeb: base.runtimeVersion, pyodide: base.pyodideVersion },
      executionProviders: providers, wasmThreads: 1, noiseSeeds: modelConfig.noise.map(row => row.seed), framePlan: modelConfig.framePlan, fixtureAudit },
    capability: { gpuDispatchVerified: gpu ? Boolean(options.probe && dispatches > 0) : null, ...(gpu && options.probe ? { dispatches } : {}),
      description: gpu ? `Observed ${dispatches} dispatch(es) in a separate WebGPU capability synthesis; WASM remains an explicit fallback for unsupported operators.` :
        'Explicit one-thread ONNX Runtime WASM provider; Mandarin normalization, segmentation and phonemization execute locally in Pyodide.' } };
}
async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== base.fixtureId || activeLanguage !== base.language) throw new Error('Blue-Buff worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || chunk.id >= 30 || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Mandarin canonical source span');
  if (chunk.sha256 && await sha256(new TextEncoder().encode(chunk.text)) !== chunk.sha256) throw new Error(`Mandarin source span ${chunk.id} digest mismatch`);
  return { parts: [await synthesizeSourceSpan(chunk.text, onFirstPcm)], sampleRate: base.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const old = session; session = null;
  if (old) await old.release();
  try { phonemize?.destroy?.(); } catch {}
  try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = pyodide = ort = modelConfig = activeFixture = activeLanguage = requestedBackend = gpuName = noiseStreams = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Blue-Buff action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
