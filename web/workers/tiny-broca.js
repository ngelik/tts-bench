/* SPDX-License-Identifier: Apache-2.0
 * Local adapter of the pinned Tiny Broca demo worker. Model/frontend bytes and
 * browser runtimes are size/SHA-256 checked before use.
 */
let profile, pyodide, phonemize, ortRuntime, session, config, activeFixture, activeLanguage, backend, gpuName, activeVoice;
const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_ROOT = '/models/tiny-broca/0ea879d8f532ad0c6e7308017b45105a74f81a95/56d68b9fd3375c52030b3de053a26bfcc6e823c2/';
let cacheEnabled = true;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
async function checkedBytes(root, path, spec, label) {
  if (!spec || !Number.isSafeInteger(spec[0]) || !/^[a-f0-9]{64}$/.test(spec[1])) throw new Error('Unpinned Tiny Broca asset: ' + path);
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) throw new Error(label + ' must be a same-origin asset');
  const request = new Request(url.href);
  let store = null;
  if (cacheEnabled && self.caches) {
    try {
      store = await caches.open('tiny-broca-' + profile.modelRevision + '-' + profile.sourceRevision);
      const hit = await store.match(request);
      if (hit) { const bytes = new Uint8Array(await hit.arrayBuffer()); if (bytes.byteLength === spec[0] && await sha256(bytes) === spec[1]) return bytes; await store.delete(request); }
    } catch { store = null; }
  }
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(label + ' size or SHA-256 mismatch');
  if (store) store.put(request, new Response(bytes.slice())).catch(() => {});
  return bytes;
}
const modelAsset = path => { const asset = profile.assets[path]; return checkedBytes(MODEL_ROOT, path, asset && [asset.bytes, asset.sha256], 'Tiny Broca ' + path); };
const pyAsset = name => checkedBytes(PYODIDE_ROOT, name, profile.pyodideDigests[name], 'Pyodide ' + name);
const ortAsset = name => checkedBytes(ORT_ROOT, name, profile.runtimeDigests[name], 'ONNX Runtime Web ' + name);
function routeFor(id, language) {
  if (id !== profile.fixtureId || language !== profile.language) throw new Error('Tiny Broca accepts only pt-br-article-v1 with language pt-BR.');
  const voice = profile.voices.find(item => item.id === (activeVoice?.id || profile.defaultVoice));
  if (!voice) throw new Error('Unsupported Tiny Broca voice');
  return { fixtureId: id, language, voice: voice.id, voiceIndex: voice.index };
}
async function loadFrontend(source) {
  for (const name of Object.keys(profile.pyodideDigests)) await pyAsset(name);
  self.importScripts(PYODIDE_ROOT + 'pyodide.js');
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== '0.26.4') throw new Error('Unexpected Pyodide version: ' + pyodide.version);
  pyodide.runPython(new TextDecoder('utf-8', { fatal: true }).decode(source));
  if (pyodide.runPython('frontend_fingerprint()') !== profile.frontendFingerprint) {
    throw new Error('Tiny Broca Python frontend fingerprint differs from the pinned configuration');
  }
  pyodide.runPython(`
import json

def phonemize_json(source):
    result = phonemize(source)
    return json.dumps({'ids': list(result.ids), 'stress': list(result.stress)}, ensure_ascii=False)
phonemize_json('Olá.')
`);
  phonemize = pyodide.globals.get('phonemize_json');
}
const ABBREVIATIONS = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
function sentences(text) {
  const parts = []; let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/)) {
    current = current ? current + ' ' + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}
function fit(sentence) {
  const result = JSON.parse(phonemize(sentence));
  if (!result || !Array.isArray(result.ids) || !Array.isArray(result.stress) || !result.ids.length || result.ids.length !== result.stress.length) throw new Error('Tiny Broca frontend returned invalid token/stress arrays');
  if (result.ids.length <= profile.tokenLimit) return [result];
  const pieces = sentence.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces.flatMap(fit);
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single Tiny Broca source word exceeds the token limit');
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' ')), ...fit(words.slice(half).join(' '))];
}
async function auditFixture(texts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(texts) || texts.length !== expected.spans) throw new Error('Tiny Broca audit requires the complete ordered fixture.');
  const rows = []; let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id]; if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Invalid Tiny Broca fixture span ' + id);
    const planned = [];
    for (const sentence of sentences(item.text)) for (const tokens of fit(sentence)) {
      if (tokens.ids.length !== tokens.stress.length || tokens.ids.some(x => !Number.isInteger(x) || x < 0 || x >= 58) || tokens.stress.some(x => !Number.isInteger(x) || x < 0 || x > 1)) throw new Error('Invalid Tiny Broca tokens at span ' + id);
      utterances++; maximumTokens = Math.max(maximumTokens, tokens.ids.length); unknownTokens += tokens.ids.filter(x => x === 4).length;
      planned.push([tokens.ids, tokens.stress]);
    }
    if (!planned.length) throw new Error('Tiny Broca frontend returned no utterances for span ' + id);
    rows.push([id, planned]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = { spans: rows.length, utterances, maximumTokens, unknownTokens, tokenStressSha256 };
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || unknownTokens !== expected.unknownTokens || tokenStressSha256 !== expected.tokenStressSha256) throw new Error('Tiny Broca fixture frontend mismatch: ' + JSON.stringify(actual));
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, status: 'matched', ...actual };
}
function dispatchProbe() {
  const proto = self.GPUComputePassEncoder?.prototype;
  if (!proto || typeof proto.dispatchWorkgroups !== 'function') throw new Error('WebGPU dispatch instrumentation unavailable');
  const original = proto.dispatchWorkgroups; let count = 0;
  proto.dispatchWorkgroups = function (...args) { count++; return original.apply(this, args); };
  return { stop() { proto.dispatchWorkgroups = original; return count; } };
}
async function hardwareGpu() {
  if (!self.navigator?.gpu) return null;
  const adapter = await self.navigator.gpu.requestAdapter();
  if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return null;
  return adapter.info?.description || adapter.info?.vendor || 'Hardware WebGPU adapter';
}
function validateSession() {
  const inputs = [...session.inputNames].sort().join(','), outputs = [...session.outputNames].sort().join(',');
  if (inputs !== [...config.onnx.inputs].sort().join(',') || outputs !== [...config.onnx.outputs].sort().join(',')) throw new Error('Tiny Broca ONNX ABI differs from pinned config');
}
const tensor = values => new ortRuntime.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
async function synthesize(tokens) {
  const count = tokens.ids.length;
  const inputs = { tokens: tensor(tokens.ids), stress: tensor(tokens.stress), voice: new ortRuntime.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: new ortRuntime.Tensor('float32', Float32Array.of(profile.speed), [1]), pitch_shift: new ortRuntime.Tensor('float32', Float32Array.of(profile.pitchShift), [1]), pitch_range: new ortRuntime.Tensor('float32', Float32Array.of(profile.pitchRange), [1]) };
  let output;
  try {
    output = await session.run(inputs);
    if (!output.audio || !output.durations) throw new Error('Tiny Broca graph omitted audio/durations');
    const durationData = typeof output.durations.getData === 'function' ? await output.durations.getData() : output.durations.data;
    const audioData = typeof output.audio.getData === 'function' ? await output.audio.getData() : output.audio.data;
    if (!audioData || !durationData) throw new Error('Tiny Broca graph returned empty audio/durations tensors');
    const durations = Array.from(durationData, Number);
    if (durations.length !== count || durations.some(x => !Number.isSafeInteger(x) || x < 0)) throw new Error('Tiny Broca returned invalid duration frames');
    const frames = durations.reduce((sum, x) => sum + x, 0);
    if (frames > profile.maxFrames) throw new Error('Tiny Broca exceeded its frame limit');
    const pcm = Float32Array.from(audioData);
    if (pcm.length !== frames * profile.hop || !pcm.length || !pcm.some(x => x !== 0) || pcm.some(x => !Number.isFinite(x))) throw new Error('Tiny Broca returned invalid PCM');
    return pcm;
  } finally { for (const value of Object.values(inputs)) value.dispose(); if (output) for (const value of Object.values(output)) value?.dispose?.(); }
}
async function generatePrepared(text, onFirstPcm) {
  const list = sentences(text); if (!list.length) throw new Error('Tiny Broca produced no sentence for nonempty source text');
  const parts = [];
  for (const sentence of list) for (const tokens of fit(sentence)) { parts.push(await synthesize(tokens)); if (parts.length === 1) onFirstPcm?.(); }
  const size = parts.reduce((sum, x) => sum + x.length, 0), pcm = new Float32Array(size); let offset = 0;
  for (const part of parts) { pcm.set(part, offset); offset += part.length; }
  return [pcm];
}
async function initialize(options = {}) {
  profile = options.modelConfig;
  if (profile?.id !== 'tiny-broca' || profile.modelRevision !== '0ea879d8f532ad0c6e7308017b45105a74f81a95' || profile.sourceRevision !== '56d68b9fd3375c52030b3de053a26bfcc6e823c2') throw new Error('Tiny Broca requires the exact pinned checkpoint/source profile');
  activeVoice = profile.voices.find(item => item.id === (options.voice || profile.defaultVoice));
  if (!activeVoice) throw new Error('Unsupported Tiny Broca voice: ' + options.voice);
  const route = routeFor(options.fixtureId, options.language);
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Broca requires explicit cpu or webgpu backend');
  backend = options.backend; cacheEnabled = options.cache !== false;
  const webgpu = backend === 'webgpu'; if (webgpu) { gpuName = await hardwareGpu(); if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available'); }
  const runtimes = webgpu ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'] : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [configBytes, modelBytes, textBytes] = await Promise.all([modelAsset('assets/config.json'), modelAsset('assets/model.onnx'), modelAsset('assets/text.py'), ...runtimes.map(ortAsset)]);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.model.max_tokens !== profile.maxTokens || config.model.max_frames !== profile.maxFrames || config.phonemizer.fingerprint !== profile.frontendFingerprint || config.inputs || JSON.stringify(config.onnx.inputs) !== JSON.stringify(['tokens','stress','voice','speed','pitch_shift','pitch_range']) || JSON.stringify(config.onnx.outputs) !== JSON.stringify(['audio','durations']) || JSON.stringify(config.voices) !== JSON.stringify(['F1','M1'])) throw new Error('Tiny Broca config differs from the profile');
  self.importScripts(ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js')); ortRuntime = self.ort;
  ortRuntime.env.wasm.numThreads = 1; ortRuntime.env.wasm.proxy = false; ortRuntime.env.wasm.wasmPaths = new URL(ORT_ROOT, self.location.href).href; ortRuntime.env.logLevel = 'error';
  session = await ortRuntime.InferenceSession.create(modelBytes, { executionProviders: webgpu ? ['webgpu','wasm'] : ['wasm'], graphOptimizationLevel: 'all' });
  validateSession();
  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device, adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) { await dispose(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter'); }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  await loadFrontend(textBytes);
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : null;
  let dispatches = 0;
  if (options.probe) { const hook = webgpu ? dispatchProbe() : null; try { await generatePrepared(options.probeText || 'Olá, tudo bem?'); } finally { dispatches = hook?.stop() ?? 0; } if (webgpu && dispatches < 1) { await dispose(); return unsupported('No hardware WebGPU dispatch observed'); } }
  activeFixture = route.fixtureId; activeLanguage = route.language;
  return { status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: route.voice, precision: profile.precision, gpu: gpuName,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, language: route.language, locale: route.language, supportedLanguages: [route.language],
      voice: route.voice, voiceIndex: route.voiceIndex, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames,
      parameterCount: profile.parameterCount, precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version }, executionProviders: webgpu ? ['webgpu','wasm'] : ['wasm'], ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: {
      gpuDispatchVerified: webgpu && options.probe ? dispatches > 0 : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe
          ? `Observed ${dispatches} hardware WebGPU dispatches in an untimed probe. WASM handles unsupported operators.`
          : 'WebGPU and WASM providers are configured. The separate capability probe verifies hardware dispatch.')
        : 'Explicit single-thread WASM provider. Pyodide uses the local pinned runtime.',
    },
  };
}
function unsupported(reason) { return { status: 'unsupported', reason, backendEffective: 'none', voice: profile?.defaultVoice || 'F1', precision: profile?.precision || 'FP32', settings: { language: profile?.language, locale: profile?.locale }, capability: { gpuDispatchVerified: false, description: reason } }; }
async function generate(chunk, onFirstPcm) {
  if (!session || !activeFixture || !activeLanguage || !backend) throw new Error('Tiny Broca is not initialized');
  routeFor(activeFixture, activeLanguage);
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Broca source chunk');
  return { parts: await generatePrepared(chunk.text, onFirstPcm), sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const old = session; session = null;
  if (old) await old.release();
  try { phonemize?.destroy?.(); } catch {} try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = null; pyodide = null; ortRuntime = null; config = null; activeFixture = activeLanguage = backend = gpuName = activeVoice = null;
}
self.onmessage = async ({ data }) => {
  try { let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Tiny Broca action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) { if (data.action === 'initialize') { try { await dispose(); } catch {} } self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
