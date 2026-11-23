/* SPDX-License-Identifier: Apache-2.0
 * Pinned Abdullah Tiny Voca Arabic M2 browser worker.
 * The pinned Python frontend runs unchanged; the browser worker leaves source text untouched.
 */
let profile, pyodide, phonemize, ortRuntime, session, config;
let activeFixture = null, activeLanguage = null, backend = null, gpuName = null, cacheEnabled = true;
const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_ROOT = '/models/tiny-voca-ar/dcdf56c10c536d4df74576f036b512c0d212e17f/dcdf56c10c536d4df74576f036b512c0d212e17f/';
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');

async function checkedBytes(root, path, spec, label) {
  if (!spec || !Number.isSafeInteger(spec.bytes) || spec.bytes < 1 || !/^[a-f0-9]{64}$/.test(spec.sha256)) throw new Error('Unpinned Tiny Voca Arabic asset: ' + path);
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) throw new Error(label + ' must be a same-origin pinned asset');
  const request = new Request(url.href);
  let store = null;
  if (cacheEnabled && self.caches) {
    try {
      store = await caches.open('tiny-voca-ar-' + profile.modelRevision + '-' + profile.sourceRevision);
      const hit = await store.match(request);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (bytes.byteLength === spec.bytes && await sha256(bytes) === spec.sha256) return bytes;
        await store.delete(request);
      }
    } catch { store = null; }
  }
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(label + ' size or SHA-256 mismatch');
  if (store) store.put(request, new Response(bytes.slice())).catch(() => {});
  return bytes;
}
const modelAsset = path => checkedBytes(MODEL_ROOT, path, profile.assets[path], 'Tiny Voca Arabic ' + path);
const pyodideAsset = name => checkedBytes(PYODIDE_ROOT, name, { bytes: profile.pyodideDigests[name]?.[0], sha256: profile.pyodideDigests[name]?.[1] }, 'Pyodide ' + name);
const runtimeAsset = name => checkedBytes(ORT_ROOT, name, { bytes: profile.runtimeDigests[name]?.[0], sha256: profile.runtimeDigests[name]?.[1] }, 'ONNX Runtime Web ' + name);

async function loadFrontend(source) {
  for (const name of Object.keys(profile.pyodideDigests)) await pyodideAsset(name);
  self.importScripts(PYODIDE_ROOT + 'pyodide.js');
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== profile.pyodideVersion) throw new Error('Unexpected Pyodide version: ' + pyodide.version);
  pyodide.FS.mkdirTree('/frontend');
  pyodide.FS.writeFile('/frontend/tiny_voca_text.py', source);
  pyodide.runPython(
    'import json, sys\nsys.path.insert(0, "/frontend")\nimport tiny_voca_text as frontend\n' +
    'def phonemize_json(source):\n    try:\n        result = frontend.phonemize(source)\n    except frontend.NothingToPronounce:\n        return "null"\n    return json.dumps({"ids": list(result.ids), "stress": list(result.stress), "unknown": list(result.unknown), "text": " ".join(result.symbols)}, ensure_ascii=False)\n' +
    'phonemize_json("مَرْحَبًا.")'
  );
  phonemize = pyodide.globals.get('phonemize_json');
  if (pyodide.runPython('frontend.frontend_fingerprint()') !== profile.frontendFingerprint) throw new Error('Arabic Python frontend fingerprint differs from the pinned config');
  const pythonSymbols = JSON.parse(pyodide.runPython('json.dumps(list(frontend.SYMBOLS), ensure_ascii=False)'));
  if (JSON.stringify(pythonSymbols) !== JSON.stringify(config.symbols)) throw new Error('Arabic Python symbol inventory differs from model config');
}

// Keep this English path byte-for-byte aligned with the stock demo. Arabic text uses the Arabic clause marks
// and needs neither a following capital letter nor an English abbreviation table.
const ABBREVIATIONS = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
function sentences(text) {
  const parts = []; let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…؟]["')\]»]?)\s+(?=["'(\[«]?[A-Z0-9\u0621-\u064A\u0660-\u0669])/)) {
    current = current ? current + ' ' + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}
function finished(text) {
  const body = text.replace(/\s+$/, '');
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last) ? /[.!?…,;:؟،؛]["'”’\)\]»]*$/.test(last) : /[.!?…؟]/.test(last) || /^[,;:،؛]$/.test(last);
  return marked ? text : body + '.';
}
function fit(sentence) {
  const result = JSON.parse(phonemize(sentence));
  if (result === null) return [];
  if (!result || !Array.isArray(result.ids) || !Array.isArray(result.stress) || !Array.isArray(result.unknown) || typeof result.text !== 'string' ||
      !result.ids.length || result.ids.length !== result.stress.length) throw new Error('Arabic frontend returned invalid token/stress arrays');
  const maxTokens = config.model?.max_tokens ?? config.max_tokens ?? 512;
  if (result.ids.length <= maxTokens - 12) return [result];
  const pieces = sentence.split(/(?<=[,;:—،؛])\s+/u);
  if (pieces.length > 1) return pieces.flatMap(fit);
  const words = sentence.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' ')), ...fit(words.slice(half).join(' '))];
}
async function auditFixture(texts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(texts) || texts.length !== expected.spans) throw new Error('Arabic fixture audit requires all ordered source spans');
  const rows = []; let utterances = 0, maximumTokens = 0, unknownTokens = 0, unknownWords = 0;
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Invalid or reordered Arabic fixture span ' + id);
    const planned = [];
    for (const sentence of sentences(finished(item.text))) {
      const plans = fit(sentence);
      if (!plans.length) throw new Error('Arabic frontend returned no plan for fixture span ' + id);
      for (const tokens of plans) {
        if (tokens.ids.some(value => !Number.isInteger(value) || value < 0 || value >= config.symbols.length) ||
            tokens.stress.some(value => !Number.isInteger(value) || value < 0 || value > 1)) throw new Error('Invalid Arabic token/stress values in span ' + id);
        utterances++;
        maximumTokens = Math.max(maximumTokens, tokens.ids.length);
        unknownTokens += tokens.ids.filter(value => value === 4).length;
        unknownWords += tokens.unknown.length;
        planned.push([tokens.ids, tokens.stress]);
      }
    }
    if (!planned.length) throw new Error('Arabic fixture span produced zero utterances: ' + id);
    rows.push([id, planned]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = { spans: rows.length, utterances, maximumTokens, unknownTokens, unknownWords, tokenStressSha256 };
  for (const key of ['spans', 'utterances', 'maximumTokens', 'unknownTokens', 'unknownWords', 'tokenStressSha256']) {
    if (actual[key] !== expected[key]) throw new Error('Arabic fixture oracle mismatch: ' + JSON.stringify(actual));
  }
  if (unknownTokens || unknownWords) throw new Error('Reviewed Arabic fixture must have zero unknown IDs and words');
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
  if ([...session.inputNames].sort().join(',') !== [...config.inputs].sort().join(',') ||
      [...session.outputNames].sort().join(',') !== [...config.outputs].sort().join(',')) throw new Error('Arabic ONNX input/output ABI differs from the pinned config');
}
const tensor = values => new ortRuntime.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
async function synthesize(tokens) {
  const count = tokens.ids.length;
  const inputs = {
    tokens: tensor(tokens.ids), stress: tensor(tokens.stress), voice: new ortRuntime.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ortRuntime.Tensor('float32', Float32Array.of(1), [1]),
    pitch_shift: new ortRuntime.Tensor('float32', Float32Array.of(0), [1]), pitch_range: new ortRuntime.Tensor('float32', Float32Array.of(1), [1]),
  };
  let output;
  try {
    output = await session.run(inputs);
    if (!output.audio || !output.durations) throw new Error('Arabic graph omitted audio/durations');
    const durationData = typeof output.durations.getData === 'function' ? await output.durations.getData() : output.durations.data;
    const audioData = typeof output.audio.getData === 'function' ? await output.audio.getData() : output.audio.data;
    if (!audioData || !durationData) throw new Error('Arabic graph returned empty audio/durations tensors');
    const durations = Array.from(durationData, Number);
    if (durations.length !== count || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Arabic graph returned invalid durations');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > profile.maxFrames) throw new Error('Arabic graph exceeded its frame limit');
    const pcm = Float32Array.from(audioData);
    if (pcm.length !== frames * profile.hop || !pcm.length || !pcm.some(value => value !== 0) || !pcm.every(Number.isFinite)) throw new Error('Arabic graph returned invalid PCM');
    return pcm;
  } finally {
    for (const value of Object.values(inputs)) value.dispose?.();
    if (output) for (const value of Object.values(output)) value?.dispose?.();
  }
}
function limitPeak(samples) {
  let peak = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) throw new Error('Arabic model returned non-finite PCM');
    peak = Math.max(peak, Math.abs(sample));
  }
  if (!samples.length || peak === 0) throw new Error('Arabic model returned empty or silent PCM');
  const cappedPeak = Math.min(peak, profile.peak);
  if (peak > profile.peak) for (let i = 0; i < samples.length; i++) samples[i] *= profile.peak / peak;
  return { rawPeak: peak, cappedPeak };
}
async function generatePrepared(text, onFirstPcm) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Arabic model requires nonempty vocalized source text');
  const list = sentences(finished(text));
  if (!list.length) throw new Error('Arabic source text produced no speech plan');
  const parts = [];
  for (const sentence of list) {
    const plans = fit(sentence);
    for (const tokens of plans) {
      const pcm = await synthesize(tokens);
      parts.push(pcm);
      if (parts.length === 1) onFirstPcm?.();
    }
  }
  const joined = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  limitPeak(joined);
  return joined;
}
function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: profile?.defaultVoice || 'M2', precision: profile?.precision || 'FP32',
    settings: { language: profile?.language, locale: profile?.locale, supportedLanguages: [profile?.language].filter(Boolean) },
    capability: { gpuDispatchVerified: false, description: reason } };
}
async function initialize(options = {}) {
  profile = options.modelConfig;
  if (profile?.id !== 'tiny-voca-ar' || profile.modelRevision !== 'dcdf56c10c536d4df74576f036b512c0d212e17f' ||
      profile.sourceRevision !== 'dcdf56c10c536d4df74576f036b512c0d212e17f' || profile.defaultVoice !== 'M2' || profile.defaultVoiceIndex !== 1) {
    throw new Error('Tiny Voca Arabic requires the exact pinned checkpoint/source profile and trained M2 voice');
  }
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) return unsupported('This adapter supports only ar-article-v1 in Arabic.');
  if (options.voice && options.voice !== 'M2') return unsupported('This checkpoint has only the trained M2 voice.');
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Arabic requires an explicit cpu or webgpu backend');
  activeFixture = profile.fixtureId; activeLanguage = profile.language; backend = options.backend; cacheEnabled = options.cache !== false;
  const webgpu = backend === 'webgpu';
  if (webgpu) { gpuName = await hardwareGpu(); if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available'); }
  const runtimes = webgpu ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'] : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [configBytes, modelBytes, frontendBytes] = await Promise.all([
    modelAsset('assets/config.json'), modelAsset('assets/model.onnx'), modelAsset('assets/text.py'),
    ...runtimes.map(runtimeAsset),
  ]);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.model?.max_tokens !== profile.maxTokens ||
      config.model?.max_frames !== profile.maxFrames || config.step !== profile.step || config.frontend !== 'rules' ||
      config.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(config.voices) !== JSON.stringify(['F2', 'M2']) ||
      JSON.stringify(config.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(config.outputs) !== JSON.stringify(['audio', 'durations']) || config.symbols.length !== 79) {
    throw new Error('Arabic metadata differs from the pinned checkpoint profile');
  }
  self.importScripts(ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  ortRuntime = self.ort; ortRuntime.env.wasm.numThreads = 1; ortRuntime.env.wasm.proxy = false;
  ortRuntime.env.wasm.wasmPaths = webgpu
    ? { mjs: new URL(ORT_ROOT + 'ort-wasm-simd-threaded.jsep.mjs', self.location.href).href, wasm: new URL(ORT_ROOT + 'ort-wasm-simd-threaded.jsep.wasm', self.location.href).href }
    : new URL(ORT_ROOT, self.location.href).href; ortRuntime.env.logLevel = 'error';
  session = await ortRuntime.InferenceSession.create(modelBytes, { executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all' });
  validateSession();
  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device, adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) { await dispose(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter'); }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  await loadFrontend(frontendBytes);
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : null;
  let dispatches = 0;
  if (options.probe) {
    const hook = webgpu ? dispatchProbe() : null;
    try { await generatePrepared(options.probeText || 'مَرْحَبًا بِكَ.', null); }
    finally { dispatches = hook?.stop() ?? 0; }
    if (webgpu && dispatches < 1) { await dispose(); return unsupported('No hardware WebGPU dispatch observed'); }
  }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: 'M2', precision: profile.precision, gpu: gpuName,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, language: 'ar', locale: 'ar', supportedLanguages: ['ar'],
      voice: 'M2', voiceIndex: 1, speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit, maxFrames: profile.maxFrames, step: profile.step, parameterCount: profile.parameterCount,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      runtimeVersion: '1.20.1', runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version }, executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], waveformExecutionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], wasmThreads: 1,
      waveform: 'Pinned FP32 graph. Utterances concatenate in source order with no inserted audio; apply one 0.99 peak cap to each completed source span.', ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: webgpu && options.probe ? dispatches > 0 : null, ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? (options.probe ? `Observed ${dispatches} hardware WebGPU dispatches in an untimed probe. WASM handles unsupported operators; frontend work and output readback are CPU-side.` : 'WebGPU and WASM providers are configured; a separate probe must prove hardware dispatch.') : 'Explicit single-thread WASM provider; Arabic G2P uses local pinned Pyodide.' },
  };
}
async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language || !backend) throw new Error('Tiny Voca Arabic adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Arabic source chunk');
  const pcm = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const old = session; session = null;
  if (old) await old.release();
  try { phonemize?.destroy?.(); } catch {}
  try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = null; pyodide = null; ortRuntime = null; config = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Tiny Voca Arabic action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
