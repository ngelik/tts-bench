import { fetchModelAsset } from '../cache-model-asset.mjs';
import { assetDigests, defaultVoice, defaultVoiceIndex, fixtureOracle, frontendFingerprint, frontendRevision, hop, modelRevision, sampleRate, validateMetadata } from '../clarvia-tts-tiny/profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const modelRoot = `/models/clarvia-tts-tiny/${modelRevision}/`;
const frontendRoot = `/models/clarvia-phonemizer/${frontendRevision}/`;
const runtimeRoot = modelRoot + 'runtime/';
const pyodideRoot = '/runtimes/pyodide/314.0.8/';
const settingsBase = {
  language: 'tr', locale: 'tr-TR', voiceId: defaultVoice, voiceIndex: defaultVoiceIndex,
  speed: 1, pitchShift: 0, pitchRange: 1, sampleRate, threads: 1,
  frontend: `Clarvia phonemizer 0.1.0 at ${frontendRevision}; upstream sentence and 500-token fitting policy`,
  runtimeRelease: 'onnxruntime-web@1.20.1; Pyodide 314.0.8 / CPython 3.14.2',
  waveform: 'Unseeded ONNX noise; peak is reduced to 0.99 only when exceeded.',
};
const info = { voice: 'female_1 (synthetic)', precision: 'FP32', settings: settingsBase };
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

let ort, session, config, py, gpuName, pythonVersion;

const frontendAssets = Object.freeze({
  'frontend-init.py': 'clarvia_phonemizer/__init__.py',
  'frontend-main.py': 'clarvia_phonemizer/__main__.py',
  'frontend-engine.py': 'clarvia_phonemizer/engine.py',
  'frontend-g2p.py': 'clarvia_phonemizer/g2p.py',
  'frontend-rules.py': 'clarvia_phonemizer/rules.py',
  'frontend-stress.py': 'clarvia_phonemizer/stress.py',
  'frontend-symbols.py': 'clarvia_phonemizer/symbols.py',
  'frontend-tables.py': 'clarvia_phonemizer/tables.py',
  'frontend-turkish.py': 'clarvia_phonemizer/turkish.py',
  'exceptions.txt': 'clarvia_phonemizer/data/exceptions.txt',
  'function_words.txt': 'clarvia_phonemizer/data/function_words.txt',
  'places.txt': 'clarvia_phonemizer/data/places.txt',
});

async function verifiedAsset(name, base, revision, assetPath = name) {
  const spec = assetDigests[name];
  if (!spec) throw new Error('Unpinned Clarvia asset: ' + name);
  const response = await fetchModelAsset(base + assetPath, revision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error('Clarvia asset checksum mismatch: ' + name);
  return bytes;
}

async function loadFrontend() {
  let [configBytes, graph, ...sourceAndRuntimeFiles] = await Promise.all([
    verifiedAsset('config.json', modelRoot, modelRevision),
    verifiedAsset('model.onnx', modelRoot + 'onnx/', modelRevision),
    ...Object.entries(frontendAssets).map(([key, path]) => verifiedAsset(key, frontendRoot, frontendRevision, path)),
    ...['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
      .map(name => verifiedAsset(name, pyodideRoot, modelRevision)),
  ]);
  config = validateMetadata(JSON.parse(new TextDecoder().decode(configBytes)));
  const sourceFiles = sourceAndRuntimeFiles.slice(0, Object.keys(frontendAssets).length);
  // The remaining five local runtime files have all passed their locked hashes
  // before this ESM import evaluates the Pyodide loader.
  let pyodideRuntimeFiles = sourceAndRuntimeFiles.slice(Object.keys(frontendAssets).length);
  if (pyodideRuntimeFiles.length !== 5) throw new Error('Clarvia Pyodide asset set is incomplete.');
  pyodideRuntimeFiles = null;
  sourceAndRuntimeFiles = null;
  const { loadPyodide } = await import(pyodideRoot + 'pyodide.mjs');
  py = await loadPyodide({ indexURL: new URL(pyodideRoot, self.location.href).href, fullStdLib: false });
  if (py.version !== '314.0.8') throw new Error('Clarvia expected Pyodide 314.0.8, got ' + py.version);
  pythonVersion = String(py.runPython('import sys; sys.version'));
  if (!pythonVersion.startsWith('3.14.2 ')) throw new Error('Clarvia expected CPython 3.14.2, got ' + pythonVersion);
  py.FS.mkdirTree('/clarvia_phonemizer/data');
  const entries = Object.entries(frontendAssets);
  for (let index = 0; index < entries.length; index++) {
    const [, path] = entries[index];
    py.FS.writeFile('/' + path, sourceFiles[index]);
  }
  py.FS.mkdirTree('/clarvia_frontend');
  const planner = await (await fetch(new URL('../clarvia-tts-tiny/reference-planner.py', import.meta.url))).text();
  py.FS.writeFile('/clarvia_frontend/reference_planner.py', planner);
  py.globals.set('config_json', JSON.stringify(config));
  py.runPython("import json, sys; sys.path.insert(0, '/'); sys.path.insert(0, '/clarvia_frontend'); import clarvia_phonemizer; import reference_planner; reference_planner.configure(json.loads(config_json))");
  const identity = JSON.parse(py.runPython('import json; json.dumps(clarvia_phonemizer.identity(), ensure_ascii=False)'));
  if (identity.fingerprint !== fixtureOracle.identityFingerprint || JSON.stringify(identity.symbols) !== JSON.stringify(config.symbols)) {
    throw new Error('Clarvia frontend identity or token inventory does not match the pinned audit.');
  }
  return graph;
}

function sentenceTensor(values) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
}

async function synthesize(plan) {
  const inputs = {
    tokens: sentenceTensor(plan.ids), stress: sentenceTensor(plan.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(1), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(0), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(1), [1]),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const audio = Float32Array.from(outputs.audio.data);
    const durations = Array.from(outputs.durations.data, Number);
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (!audio.length || durations.some(value => !Number.isSafeInteger(value) || value < 0) ||
        !Number.isSafeInteger(frames) || frames < 1 || frames > config.max_frames || audio.length !== frames * hop ||
        !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
      throw new Error('Clarvia TTS Tiny returned invalid or duration-mismatched PCM.');
    }
    return audio;
  } finally {
    for (const tensor of Object.values(inputs)) tensor.dispose?.();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose?.();
  }
}

async function planAudit(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== fixtureOracle.spans) throw new Error('Clarvia smoke audit received the wrong Turkish source span count.');
  const rows = [];
  let utterances = 0, maximumTokens = 0;
  const unknowns = [];
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Clarvia smoke audit received an invalid or reordered source span.');
    py.globals.set('audit_text', item.text);
    const plans = JSON.parse(py.runPython('reference_planner.audit_json(audit_text)'));
    if (!plans.length) throw new Error('Clarvia smoke audit found a source span without a speech plan.');
    for (const plan of plans) {
      if (plan.ids.length !== plan.stress.length || plan.ids.length > config.max_tokens - 12 ||
          plan.ids.some(id => !Number.isInteger(id) || id < 0 || id >= config.symbols.length) ||
          plan.stress.some(level => !Number.isInteger(level) || level < 0 || level > 2)) throw new Error('Clarvia frontend exceeded its token/stress contract.');
      if (plan.unknown.length) unknowns.push({ span: item.id, symbols: plan.unknown });
    }
    utterances += plans.length;
    maximumTokens = Math.max(maximumTokens, ...plans.map(plan => plan.ids.length));
    rows.push([item.id, plans.map(({ ids, stress }) => [ids, stress])]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== fixtureOracle.utterances || maximumTokens !== fixtureOracle.maximumTokens || digest !== fixtureOracle.tokenStressSha256 || unknowns.length) {
    throw new Error(`Clarvia Turkish frontend audit failed (digest ${digest}, ${utterances} plans, max ${maximumTokens}, ${unknowns.length} unknowns).`);
  }
  return { fixtureId: fixtureOracle.fixtureId, sourceSha256: fixtureOracle.sourceSha256, spans: auditTexts.length,
    utterances, maximumTokens, tokenStressSha256: digest, unknowns };
}

async function generate(chunk, onFirst) {
  py.globals.set('input_text', chunk.text);
  py.runPython('reference_planner.begin_text(input_text)');
  const parts = [];
  let firstReported = false;
  while (true) {
    const encoded = py.runPython('reference_planner.next_json()');
    if (!encoded) break;
    const plan = JSON.parse(encoded);
    if (plan.unknown.length || !plan.ids.length || plan.ids.length > config.max_tokens - 12 ||
        plan.ids.length !== plan.stress.length || plan.ids.some(id => !Number.isInteger(id) || id < 0 || id >= config.symbols.length) ||
        plan.stress.some(level => !Number.isInteger(level) || level < 0 || level > 2)) {
      throw new Error('Clarvia phonemizer violated the token/stress contract for source span ' + chunk.id);
    }
    const pcm = await synthesize(plan);
    if (!firstReported && pcm.length) { firstReported = true; onFirst?.(); }
    parts.push(pcm);
  }
  if (!parts.length) throw new Error('Clarvia TTS Tiny received a source span with no speakable Turkish text.');
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const audio = new Float32Array(length);
  let offset = 0, peak = 0;
  for (const part of parts) { audio.set(part, offset); offset += part.length; }
  for (const value of audio) peak = Math.max(peak, Math.abs(value));
  if (!peak || !Number.isFinite(peak)) throw new Error('Clarvia TTS Tiny returned empty or invalid source-span PCM.');
  if (peak > 0.99) { const scale = 0.99 / peak; for (let index = 0; index < audio.length; index++) audio[index] *= scale; }
  return { parts: [audio], sampleRate, completedChunkId: chunk.id };
}

const unsupported = reason => ({ ...info, status: 'unsupported', backendEffective: 'none', reason,
  capability: { gpuDispatchVerified: false, description: reason } });

async function initialize({ backend, probe, probeText, fixtureId, language = 'tr', auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Clarvia TTS Tiny supports CPU/WASM or WebGPU with WASM fallback.');
  if (fixtureId !== fixtureOracle.fixtureId || language !== 'tr') throw new Error('Clarvia TTS Tiny requires tr-article-v1 and the Turkish frontend.');
  const gpuMode = backend === 'webgpu';
  gpuName = gpuMode ? await hardwareGpu() : null;
  if (gpuMode && !gpuName) return unsupported('A non-fallback hardware WebGPU adapter is unavailable.');
  const graph = await loadFrontend();
  const ortFiles = gpuMode
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(ortFiles.map(name => verifiedAsset(name, runtimeRoot, modelRevision)));
  ort = await import(runtimeRoot + (gpuMode ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeRoot;
  ort.env.logLevel = 'error';
  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graph, { executionProviders });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(config.outputs)) {
    throw new Error('Clarvia ONNX graph input/output names do not match the pinned model config.');
  }
  const fixtureAudit = auditTexts.length ? await planAudit(auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) await generate({ id: 'probe', text: probeText || 'Kısa bir Türkçe ses denemesi.' });
  } finally { dispatches = hook?.stop() ?? 0; }
  if (gpuMode && probe && !dispatches) return unsupported('No WebGPU compute dispatch was observed during Clarvia synthesis.');
  const adapter = gpuMode ? await ort.env.webgpu.adapter : null;
  const device = gpuMode ? await ort.env.webgpu.device : null;
  if (gpuMode && (adapter?.info?.isFallbackAdapter || adapter?.isFallbackAdapter || device?.adapterInfo?.isFallbackAdapter)) return unsupported('ORT selected a software WebGPU adapter.');
  const gpu = gpuMode ? device?.adapterInfo?.description || adapter?.info?.vendor || gpuName : null;
  return { ...info, status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu,
    settings: { ...settingsBase, executionProviders, modelRevision, frontendRevision, frontendFingerprint,
      graphSha256: assetDigests['model.onnx'][1], fixtureId, pyodideVersion: py.version, pythonVersion,
      ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null,
      description: gpuMode ? `Observed ${dispatches} WebGPU compute dispatches during an untimed probe; unsupported operators may use explicit WASM fallback.` :
        'ONNX Runtime Web 1.20.1 uses the explicit single-thread SIMD WASM route; Turkish phonemization runs locally in Pyodide.' } };
}

async function dispose() {
  await session?.release();
  session = null; ort = null; config = null; gpuName = null; pythonVersion = null;
  py?.globals?.destroy?.();
  py = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Clarvia TTS Tiny action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.stack ?? error) });
  }
};
