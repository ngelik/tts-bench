/* SPDX-License-Identifier: Apache-2.0
 * Pinned Oddadmix Tiny Voca Arabic + browser CATT v2 pipeline.
 */
let profile, pyodide, bridge, catt, ortRuntime, acousticSession, cattEncoderSession, cattDecoderSession;
let phonemize, expandNumbers, config, activeFixture = null, activeLanguage = null, backend = null, gpuName = null, cacheEnabled = true;
const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_ROOT = '/models/tiny-voca-arabic/e529f716965142f51835adc9e5661f224c3fa103/64e3e2ae08f7553c38f280a58f05b955a0c296f4/';
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');

async function checkedBytes(root, path, spec, label) {
  if (!spec || !Number.isSafeInteger(spec.bytes) || spec.bytes < 1 || !/^[a-f0-9]{64}$/.test(spec.sha256)) throw new Error('Unpinned Tiny Voca Arabic asset: ' + path);
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) throw new Error(label + ' must be a same-origin pinned asset');
  const request = new Request(url.href); let store = null;
  if (cacheEnabled && self.caches) {
    try {
      store = await caches.open('tiny-voca-arabic-' + profile.modelRevision + '-' + profile.sourceRevision);
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
  if (store) await store.put(request, new Response(bytes.slice()));
  return bytes;
}
const modelAsset = path => checkedBytes(MODEL_ROOT, path, profile.assets[path], 'Tiny Voca Arabic ' + path);
const pyodideAsset = name => checkedBytes(PYODIDE_ROOT, name, { bytes: profile.pyodideDigests[name]?.[0], sha256: profile.pyodideDigests[name]?.[1] }, 'Pyodide ' + name);
const runtimeAsset = name => checkedBytes(ORT_ROOT, name, { bytes: profile.runtimeDigests[name]?.[0], sha256: profile.runtimeDigests[name]?.[1] }, 'ONNX Runtime Web ' + name);

function sentences(text) {
  return text.split(/(?<=[.!?؟…])\s+(?=\S)/u);
}
function preparedSource(text) {
  const clipped = Array.from((text || '').trim()).slice(0, 3000).join('');
  if (!clipped) return '';
  const finished = /[.!?؟…]$/.test(clipped) ? clipped : clipped + '.';
  return expandNumbers(finished);
}
async function phonemizeJson(text) {
  await catt.populateTextCache(text);
  return JSON.parse(phonemize(text));
}
async function fit(sentence) {
  const result = await phonemizeJson(sentence);
  if (result === null) return [];
  if (!result || !Array.isArray(result.ids) || !Array.isArray(result.stress) || !Array.isArray(result.unknown) ||
      !Array.isArray(result.diacritized) || !result.ids.length || result.ids.length !== result.stress.length) throw new Error('Arabic frontend returned invalid token/stress arrays');
  if (result.ids.length <= profile.tokenLimit) return [result];
  const clauses = sentence.split(/(?<=[،,;؛:])\s+/u).filter(part => part.trim());
  if (clauses.length > 1) { const out = []; for (const part of clauses) out.push(...await fit(part)); return out; }
  const words = sentence.split(/\s+/u);
  if (words.length < 2) return [];
  const half = Math.floor(words.length / 2);
  return [...await fit(words.slice(0, half).join(' ')), ...await fit(words.slice(half).join(' '))];
}
async function auditFixture(texts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(texts) || ![3, expected.spans].includes(texts.length)) throw new Error('Arabic fixture audit requires three smoke spans or all ordered source spans');
  const rows = []; let utterances = 0, maximumTokens = 0, unknownTokens = 0, unknownWords = 0;
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Invalid/reordered Arabic fixture span ' + id);
    const planned = [];
    for (const sentence of sentences(preparedSource(item.text))) {
      for (const tokens of await fit(sentence)) {
        if (tokens.ids.some(value => !Number.isInteger(value) || value < 0 || value >= config.symbols.length) ||
            tokens.stress.some(value => !Number.isInteger(value) || value < 0 || value > 1)) throw new Error('Invalid Arabic tokens in fixture span ' + id);
        utterances++; maximumTokens = Math.max(maximumTokens, tokens.ids.length);
        unknownTokens += tokens.ids.filter(value => value === 4).length; unknownWords += tokens.unknown.length;
        planned.push([tokens.ids, tokens.stress]);
      }
    }
    if (!planned.length) throw new Error('Arabic fixture span produced zero utterances: ' + id);
    rows.push([id, planned]);
  }
  const actual = { spans: rows.length, utterances, maximumTokens, unknownTokens, unknownWords,
    tokenStressSha256: await sha256(new TextEncoder().encode(JSON.stringify(rows))) };
  const oracle = texts.length === expected.spans ? expected : profile.smokeOracle;
  for (const key of Object.keys(oracle)) if (actual[key] !== oracle[key]) throw new Error('Arabic fixture oracle mismatch: ' + JSON.stringify(actual));
  if (unknownTokens || unknownWords) throw new Error('Arabic fixture has unknown tokens or words');
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256,
    status: texts.length === expected.spans ? 'matched' : 'partial', ...actual, cattCounters: catt.stats() };
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
function tensor(type, values, dims) { return new ortRuntime.Tensor(type, values, dims); }
function intTensor(values, dims) { return tensor('int64', BigInt64Array.from(values, BigInt), dims); }
async function synthesize(tokens, onFirstPcm) {
  const inputs = {
    tokens: intTensor(tokens.ids, [1, tokens.ids.length]), stress: intTensor(tokens.stress, [1, tokens.stress.length]),
    voice: tensor('int64', BigInt64Array.of(0n), [1]), speed: tensor('float32', Float32Array.of(1), [1]),
    pitch_shift: tensor('float32', Float32Array.of(0), [1]), pitch_range: tensor('float32', Float32Array.of(1), [1]),
  };
  let output;
  try {
    output = await acousticSession.run(inputs);
    const durations = Array.from(await output.durations.getData(), Number);
    const audio = await output.audio.getData();
    if (durations.length !== tokens.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Arabic graph returned invalid durations');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const pcm = Float32Array.from(audio);
    if (frames > profile.maxFrames || pcm.length !== frames * profile.hop || !pcm.length || !pcm.some(value => value !== 0) || !pcm.every(Number.isFinite)) throw new Error('Arabic graph returned invalid PCM');
    onFirstPcm?.();
    return pcm;
  } finally {
    Object.values(inputs).forEach(value => value.dispose?.());
    if (output) Object.values(output).forEach(value => value?.dispose?.());
  }
}
function applyPeak(parts) {
  const joined = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0, peak = 0;
  for (const part of parts) { joined.set(part, at); at += part.length; }
  for (const value of joined) { if (!Number.isFinite(value)) throw new Error('Arabic graph returned non-finite PCM'); peak = Math.max(peak, Math.abs(value)); }
  if (!joined.length || !peak) throw new Error('Arabic graph returned empty or silent PCM');
  if (peak > profile.peak) { const scale = profile.peak / peak; for (let i = 0; i < joined.length; i++) joined[i] *= scale; }
  return joined;
}
async function generatePrepared(sourceText, onFirstPcm) {
  if (typeof sourceText !== 'string' || !sourceText.trim()) throw new Error('Arabic model requires nonempty source text');
  const expanded = preparedSource(sourceText);
  const phrases = [];
  for (const sentence of sentences(expanded)) {
    for (const tokens of await fit(sentence)) phrases.push(await synthesize(tokens, phrases.length === 0 ? onFirstPcm : null));
  }
  if (!phrases.length) throw new Error('There is no Arabic text to read.');
  const gap = new Float32Array(profile.interUtteranceGapSamples);
  const pieces = [];
  phrases.forEach((pcm, index) => { pieces.push(pcm); if (index !== phrases.length - 1) pieces.push(gap); });
  return applyPeak(pieces);
}
function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: 'a000', precision: profile?.precision || 'FP32 ONNX checkpoint',
    settings: { language: 'ar', locale: 'ar', supportedLanguages: ['ar'] }, capability: { gpuDispatchVerified: false, description: reason } };
}
async function initialize(options = {}) {
  profile = options.modelConfig;
  if (profile?.id !== 'tiny-voca-arabic' || profile.modelRevision !== 'e529f716965142f51835adc9e5661f224c3fa103' ||
      profile.sourceRevision !== '64e3e2ae08f7553c38f280a58f05b955a0c296f4' || profile.defaultVoice !== 'a000' || profile.defaultVoiceIndex !== 0) throw new Error('Tiny Voca Arabic requires the exact pinned profile and synthetic voice a000');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) return unsupported('This adapter supports only ar-article-v1 in Arabic.');
  if (options.voice && options.voice !== 'a000') return unsupported('This checkpoint has only the synthetic a000 voice.');
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Arabic requires explicit cpu or webgpu backend');
  activeFixture = profile.fixtureId; activeLanguage = profile.language; backend = options.backend; cacheEnabled = options.cache !== false;
  const webgpu = backend === 'webgpu';
  if (webgpu) { gpuName = await hardwareGpu(); if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available'); }
  const runtimes = webgpu ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'] : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const keys = Object.keys(profile.assets);
  const loaded = await Promise.all([...keys.map(modelAsset), ...Object.keys(profile.pyodideDigests).map(pyodideAsset), ...runtimes.map(runtimeAsset)]);
  const byPath = Object.fromEntries(keys.map((path, index) => [path, loaded[index]]));
  const configBytes = byPath['assets/config.json']; config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.max_tokens !== profile.maxTokens || config.max_frames !== profile.maxFrames ||
      config.step !== profile.step || config.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(config.voices) !== JSON.stringify(['a000']) ||
      JSON.stringify(config.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) || JSON.stringify(config.outputs) !== JSON.stringify(['audio', 'durations']) || config.symbols.length !== 49) throw new Error('Arabic metadata differs from the pinned checkpoint profile');
  const [numpyWheel, modelBytes, encoderBytes, decoderBytes] = [byPath['assets/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl'], byPath['assets/model.onnx'], byPath['assets/catt/encoder.onnx'], byPath['assets/catt/decoder.onnx']];
  importScripts(ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  ortRuntime = self.ort || globalThis.ort;
  ortRuntime.env.wasm.numThreads = 1; ortRuntime.env.wasm.proxy = false; ortRuntime.env.wasm.wasmPaths = webgpu
    ? { mjs: new URL(ORT_ROOT + 'ort-wasm-simd-threaded.jsep.mjs', self.location.href).href, wasm: new URL(ORT_ROOT + 'ort-wasm-simd-threaded.jsep.wasm', self.location.href).href }
    : new URL(ORT_ROOT, self.location.href).href;
  ortRuntime.env.logLevel = 'error';
  acousticSession = await ortRuntime.InferenceSession.create(modelBytes, { executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all' });
  const required = ['tokens','stress','voice','speed','pitch_shift','pitch_range'];
  if ([...acousticSession.inputNames].sort().join(',') !== [...required].sort().join(',') || [...acousticSession.outputNames].sort().join(',') !== 'audio,durations') throw new Error('Arabic acoustic ONNX ABI differs from pinned config');
  cattEncoderSession = await ortRuntime.InferenceSession.create(encoderBytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  cattDecoderSession = await ortRuntime.InferenceSession.create(decoderBytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  if ([...cattEncoderSession.inputNames].sort().join(',') !== 'src,src_mask' || [...cattEncoderSession.outputNames].join(',') !== 'encoder_output' ||
      [...cattDecoderSession.inputNames].sort().join(',') !== 'enc_src,src_trg_mask,trg,trg_mask' || [...cattDecoderSession.outputNames].join(',') !== 'decoder_output') throw new Error('CATT v2 ONNX ABI mismatch');
  for (const name of Object.keys(profile.pyodideDigests)) await pyodideAsset(name);
  importScripts(PYODIDE_ROOT + 'pyodide.js');
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== profile.pyodideVersion) throw new Error('Unexpected Pyodide version: ' + pyodide.version);
  const wheelUrl = new URL(MODEL_ROOT + profile.numpyWheel, self.location.href).href;
  await pyodide.loadPackage(wheelUrl);
  pyodide.FS.mkdirTree('/frontend/tiny_voca_ar'); pyodide.FS.mkdirTree('/frontend/catt_tashkeel');
  for (const [path, bytes] of Object.entries(byPath)) {
    const local = path.slice('assets/'.length);
    if (local.endsWith('.py') && (local.startsWith('tiny_voca_ar/') || local.startsWith('catt_tashkeel/'))) pyodide.FS.writeFile('/frontend/' + local, bytes);
    else if (local === 'catt_bridge.py') pyodide.FS.writeFile('/frontend/catt_bridge.py', bytes);
  }
  pyodide.runPython('import sys\nsys.path.insert(0, "/frontend")\nimport tiny_voca_ar.text as frontend\nimport tiny_voca_ar.arabic_frontend as af\nimport tiny_voca_ar.numbers as numbers\nimport catt_tashkeel.tokenizer');
  pyodide.runPython('import json\ndef expand_numbers_json(text): return numbers.expand_numbers(text)\ndef _phonemize_json(source):\n    try: result=frontend.phonemize(source)\n    except frontend.NothingToPronounce: return "null"\n    return json.dumps({"ids":list(result.ids),"stress":list(result.stress),"unknown":list(result.unknown),"diacritized":list(result.diacritized)},ensure_ascii=False)');
  // Bridge functions are defined by the pinned Python code and reset the phrase cache empty.
  pyodide.runPython(new TextDecoder().decode(byPath['assets/catt_bridge.py']));
  pyodide.runPython('reset_text_cache()');
  phonemize = pyodide.globals.get('_phonemize_json'); expandNumbers = pyodide.globals.get('expand_numbers_json');
  const { createCattEdOrchestrator, createPyodideCattBridge } = await import(new URL('./tiny-voca-arabic-catt.mjs', self.location.href).href);
  bridge = createPyodideCattBridge(pyodide);
  catt = createCattEdOrchestrator({ ort: ortRuntime, encoderSession: cattEncoderSession, decoderSession: cattDecoderSession, bridge, batchSize: 32 });
  if (pyodide.runPython('frontend.frontend_fingerprint()') !== profile.frontendFingerprint || JSON.stringify(JSON.parse(pyodide.runPython('json.dumps(list(frontend.SYMBOLS),ensure_ascii=False)'))) !== JSON.stringify(config.symbols)) throw new Error('Arabic frontend fingerprint or symbol list mismatch');
  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device, adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) { await dispose(); return unsupported('ONNX Runtime Web selected software WebGPU'); }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  const audit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : null;
  let dispatches = 0;
  if (options.probe) {
    const hook = webgpu ? dispatchProbe() : null;
    try { await generatePrepared(options.probeText || 'مَرْحَبًا بِكَ.'); }
    finally { dispatches = hook?.stop() ?? 0; }
    if (webgpu && dispatches < 1) { await dispose(); return unsupported('No hardware WebGPU dispatch observed'); }
  }
  return { status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: 'a000', precision: profile.precision, gpu: gpuName,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, language: 'ar', locale: 'ar', supportedLanguages: ['ar'], voice: 'a000', voiceIndex: 0,
      speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames, step: profile.step, parameterCount: profile.parameterCount, precision: profile.precision, frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint, catt: { modelRevision: profile.cattModelRevision, encoderBytes: 40049261, decoderBytes: 52699358, runtime: 'CATT v2 ED ONNX, CPU/WASM' },
      runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version, numpy: '1.26.4' }, executionProviders: webgpu ? ['webgpu','wasm'] : ['wasm'],
      cattExecutionProviders: ['wasm'], wasmThreads: 1, waveform: 'Stock Tiny Voca source-filter output; one 120 ms silence between utterances and one 0.99 peak cap per source span.',
      ...(audit ? { fixtureAudit: audit } : {}) },
    capability: { gpuDispatchVerified: webgpu && options.probe ? dispatches > 0 : null, ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? (options.probe ? `Observed ${dispatches} hardware WebGPU acoustic graph dispatches; CATT remains CPU/WASM and frontend/readback work is CPU-side.` : 'Acoustic WebGPU and WASM providers configured; CATT runs on CPU/WASM.') : 'Acoustic and CATT inference use explicit single-thread CPU/WASM.' } };
}
async function generate(chunk, onFirstPcm) {
  if (!acousticSession || activeFixture !== profile.fixtureId || activeLanguage !== profile.language || !backend) throw new Error('Tiny Voca Arabic adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Arabic source chunk');
  const pcm = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const sessions = [acousticSession, cattEncoderSession, cattDecoderSession]; acousticSession = cattEncoderSession = cattDecoderSession = null;
  for (const session of sessions) if (session) await session.release();
  try { bridge?.dispose?.(); phonemize?.destroy?.(); pyodide?.globals?.destroy?.(); } catch {}
  bridge = catt = phonemize = expandNumbers = pyodide = ortRuntime = config = null; activeFixture = activeLanguage = backend = gpuName = null;
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
