/* SPDX-License-Identifier: Apache-2.0
 * Browser adapter for Damaon/slyszeglosy V1, source revision
 * 605a13f5d9994ad8c897dff3463ce1f339acfb5f. Upstream attribution and license
 * are in ../slyszeglosy-v1/. The pinned runtimes load through importScripts.
 */
let profile, pyodide, phonemize, ortRuntime, session, modelConfig;
let activeFixture = null, activeLanguage = null, activeBackend = null, gpuLabel = null;
let cacheEnabled = true;

const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_ROOT = '/models/slyszeglosy-v1/';
const EXPECTED_SOURCE = '605a13f5d9994ad8c897dff3463ce1f339acfb5f';
const EXPECTED_MODEL = '23b63ff12db5f19260985031e64c2f45b89cc609';
const EXPECTED_GRAPH = '6d2a81bcc47589f9235452011979f641395749015a3903aaadff4558784ab087';
const EXPECTED_FIXTURE = 'pl-article-v1';
const MAX_PEAK = 0.99;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function supportedRoute(fixtureId, language) {
  if (fixtureId !== EXPECTED_FIXTURE || language !== 'pl') {
    throw new Error('Słyszę Głosy V1 requires exactly pl-article-v1/pl. V2 is outside this adapter.');
  }
  return { fixtureId, language, voice: 'F', voiceIndex: 0 };
}

async function pinnedBytes(path, table, root, label = path) {
  const expected = table?.[path];
  if (!Array.isArray(expected) || expected.length !== 2 || !Number.isSafeInteger(expected[0]) || !/^[a-f0-9]{64}$/.test(expected[1])) {
    throw new Error('Unpinned Słyszę Głosy asset: ' + path);
  }
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin) throw new Error('Słyszę Głosy assets must stay on the local origin.');
  const key = new Request(url.href, { method: 'GET' });
  let cache = null;
  if (cacheEnabled && self.caches) {
    try {
      cache = await caches.open('slyszeglosy-' + profile.modelRevision + '-' + profile.sourceRevision);
      const hit = await cache.match(key);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (bytes.byteLength === expected[0] && await sha256(bytes) === expected[1]) return bytes;
        await cache.delete(key);
      }
    } catch { cache = null; }
  }
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected[0] || await sha256(bytes) !== expected[1]) throw new Error(`${label} checksum or byte size mismatch`);
  if (cache) cache.put(key, new Response(bytes.slice())).catch(() => {});
  return bytes;
}

const modelAsset = path => pinnedBytes(path, profile.assetDigests, MODEL_ROOT + profile.modelRevision + '/');
const pyodideAsset = path => pinnedBytes(path, profile.pyodideDigests, PYODIDE_ROOT, 'Pyodide ' + path);
const ortAsset = path => pinnedBytes(path, profile.runtimeDigests, ORT_ROOT, 'ONNX Runtime Web ' + path);

function sentences(text) {
  const parts = [];
  let current = '';
  text = text.replace(/\s+/g, space => space.includes('\n') ? '\n' : ' ').trim();
  for (const piece of text.split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-ZĄĆĘŁŃÓŚŹŻ0-9])/u)) {
    current = current ? current + ' ' + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

const ABBREVIATIONS = /(?:(?<![\p{L}\p{N}])(?:dr|prof|mgr|inż|hab|św|ks|np|m\.in|ul|al|pl|os|im|godz|tzw|ok|nr|ds|gen|kpt|płk|mjr|tel|str|woj|pow|gm|pt|por|zob|tj|tzn|tys|ws|wg)|(?<![\p{L}\p{N}])[A-ZĄĆĘŁŃÓŚŹŻ])\.$/iu;

function finished(text) {
  const body = text.replace(/\s+$/, '');
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last) ? /[.!?…,;:]["'”’)\]»]*$/.test(last) : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : body + '.';
}

function fit(sentence) {
  const result = JSON.parse(phonemize(sentence));
  if (result === null) return [];
  if (!Array.isArray(result.ids) || !Array.isArray(result.stress) || result.ids.length === 0 || result.ids.length !== result.stress.length) {
    throw new Error('Słyszę Głosy Polish frontend returned invalid token/stress arrays');
  }
  if (result.unknown?.length) throw new Error('Słyszę Głosy Polish frontend returned unknown phones');
  if (result.ids.length <= modelConfig.max_tokens - 12) return [result];
  const commaParts = sentence.split(/(?<=[,;:—])\s+/);
  if (commaParts.length > 1) return commaParts.flatMap(fit);
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single Polish word exceeds the pinned V1 token budget; refusing to drop text');
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' ')), ...fit(words.slice(half).join(' '))];
}

function prepare(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Słyszę Głosy requires a nonempty source span');
  const plan = [];
  for (const sentence of sentences(finished(text))) {
    for (const phones of fit(sentence)) plan.push({ sentence, phones });
  }
  if (!plan.length) throw new Error('Słyszę Głosy produced no speakable utterances for a nonempty Polish source span');
  return plan;
}

async function hardwareGpu() {
  if (!self.navigator?.gpu) return null;
  const adapter = await self.navigator.gpu.requestAdapter();
  if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return null;
  const info = adapter.info || {};
  return [info.description, info.vendor, info.architecture].filter(Boolean).join(' / ') || 'Hardware WebGPU adapter';
}

function dispatchProbe() {
  const proto = self.GPUComputePassEncoder?.prototype;
  if (!proto) throw new Error('WebGPU compute pass instrumentation is unavailable');
  const originals = [];
  for (const name of ['dispatchWorkgroups', 'dispatchWorkgroupsIndirect']) {
    if (typeof proto[name] === 'function') originals.push([name, proto[name]]);
  }
  if (!originals.length) throw new Error('WebGPU dispatch methods cannot be instrumented');
  let count = 0;
  for (const [name, original] of originals) proto[name] = function (...args) { count++; return original.apply(this, args); };
  let stopped = false;
  return {
    count: () => count,
    stop() {
      if (!stopped) { for (const [name, original] of originals) proto[name] = original; stopped = true; }
      return count;
    },
  };
}

function capPeak(pcm) {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    if (!Number.isFinite(pcm[i])) throw new Error('Słyszę Głosy returned non-finite PCM');
    peak = Math.max(peak, Math.abs(pcm[i]));
  }
  if (pcm.length === 0 || peak === 0) throw new Error('Słyszę Głosy returned empty or silent PCM');
  if (peak > MAX_PEAK) for (let i = 0; i < pcm.length; i++) pcm[i] *= MAX_PEAK / peak;
  return pcm;
}

async function synthesize(phones, voiceIndex) {
  const count = phones.ids.length;
  const tensors = {
    tokens: new ortRuntime.Tensor('int64', BigInt64Array.from(phones.ids, BigInt), [1, count]),
    stress: new ortRuntime.Tensor('int64', BigInt64Array.from(phones.stress, BigInt), [1, count]),
    voice: new ortRuntime.Tensor('int64', BigInt64Array.of(BigInt(voiceIndex)), [1]),
    speed: new ortRuntime.Tensor('float32', Float32Array.of(1), [1]),
    pitch_shift: new ortRuntime.Tensor('float32', Float32Array.of(0), [1]),
    pitch_range: new ortRuntime.Tensor('float32', Float32Array.of(1), [1]),
  };
  let output;
  try {
    output = await session.run(tensors);
    if (!output.audio?.data || !output.durations?.data) throw new Error('Słyszę Głosy graph omitted audio or durations');
    const durationFrames = Array.from(output.durations.data, Number);
    if (durationFrames.length !== count || durationFrames.some(value => !Number.isSafeInteger(value) || value < 0) || durationFrames.reduce((a, b) => a + b, 0) > modelConfig.max_frames) {
      throw new Error('Słyszę Głosy graph returned invalid or over-budget durations');
    }
    const pcm = Float32Array.from(output.audio.data);
    const expected = durationFrames.reduce((a, b) => a + b, 0) * profile.hop;
    if (pcm.length !== expected) throw new Error('Słyszę Głosy audio length differs from predicted duration frames');
    let peak = 0;
    for (const sample of pcm) {
      if (!Number.isFinite(sample)) throw new Error('Słyszę Głosy returned non-finite PCM');
      peak = Math.max(peak, Math.abs(sample));
    }
    if (!pcm.length || peak === 0) throw new Error('Słyszę Głosy returned empty or silent PCM');
    return pcm;
  } finally {
    for (const tensor of Object.values(tensors)) tensor.dispose();
    if (output) for (const tensor of Object.values(output)) tensor.dispose?.();
  }
}

async function generatePrepared(plan, route, onFirstPcm) {
  const parts = [];
  for (const item of plan) {
    const pcm = await synthesize(item.phones, route.voiceIndex);
    parts.push(pcm);
    if (parts.length === 1) onFirstPcm?.();
  }
  // Upstream returns a complete full-scale-limited clip per input. Harness
  // chunks are source spans, so apply its 0.99 limiter once across each span.
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Float32Array(length);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  capPeak(joined);
  return { parts: [joined], sampleRate: profile.sampleRate, plan };
}

async function verifyFullFixture(auditTexts, route) {
  const oracle = profile.fixtureOracle[route.fixtureId];
  if (!Array.isArray(auditTexts) || auditTexts.length !== oracle.spans) throw new Error('Słyszę Głosy audit requires all 98 exact fixture spans');
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownPhonemes = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid Słyszę Głosy fixture span at ${index}`);
    const plans = prepare(item.text);
    const tokenPlans = [];
    for (const { phones } of plans) {
      unknownPhonemes += phones.unknown?.length || 0;
      utterances++; maximumTokens = Math.max(maximumTokens, phones.ids.length);
      tokenPlans.push([phones.ids, phones.stress]);
    }
    rows.push([item.id, tokenPlans]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (unknownPhonemes !== oracle.unknownPhonemes || utterances !== oracle.utterances || maximumTokens !== oracle.maximumTokens || digest !== oracle.tokenStressSha256) {
    throw new Error('Słyszę Głosy fixture token/stress oracle mismatch: ' + JSON.stringify({ spans: rows.length, utterances, maximumTokens, unknownPhonemes, digest }));
  }
  return { fixtureId: route.fixtureId, spans: rows.length, utterances, maximumTokens, unknownPhonemes, tokenStressSha256: digest,
    fixtureSha256: oracle.fixtureSha256, status: 'matched' };
}

async function initialize(options = {}) {
  profile = options.modelConfig;
  if (!profile || profile.id !== 'slyszeglosy-v1' || profile.sourceRevision !== EXPECTED_SOURCE ||
      profile.modelRevision !== EXPECTED_MODEL || profile.graphSha256 !== EXPECTED_GRAPH || profile.sampleRate !== 24000 ||
      profile.frontendFingerprint !== '005545ca1a524e01a2c232dfadb64a9a4dd115bc6f6161a96689217e257929a5') {
    throw new Error('Słyszę Głosy worker requires its exact pinned V1 profile');
  }
  const route = supportedRoute(options.fixtureId, options.language);
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Słyszę Głosy requires explicit cpu or webgpu backend');
  const webgpu = options.backend === 'webgpu';
  cacheEnabled = options.cache !== false;
  gpuLabel = webgpu ? await hardwareGpu() : null;
  if (webgpu && !gpuLabel) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');

  const metadataBytes = await modelAsset('assets/onnx/model.json');
  modelConfig = JSON.parse(new TextDecoder().decode(metadataBytes));
  if (modelConfig.sample_rate !== profile.sampleRate || modelConfig.hop !== profile.hop || modelConfig.max_tokens !== profile.maxTokens ||
      modelConfig.max_frames !== profile.maxFrames || modelConfig.voices?.join(',') !== 'F,M') throw new Error('Pinned V1 graph metadata differs from profile');
  const graphBytes = await modelAsset('assets/onnx/model.onnx');
  if (graphBytes.byteLength !== profile.graphBytes || await sha256(graphBytes) !== profile.graphSha256) throw new Error('Słyszę Głosy V1 graph digest mismatch');

  for (const path of Object.keys(profile.pyodideDigests)) await pyodideAsset(path);
  const neededRuntime = webgpu
    ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  for (const path of neededRuntime) await ortAsset(path);
  const frontendFiles = await Promise.all(Object.keys(profile.assetDigests).filter(path => path.startsWith('assets/frontend/')).map(modelAsset));

  self.importScripts(PYODIDE_ROOT + 'pyodide.js', ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== '0.26.4') throw new Error('Unexpected Pyodide version');
  const pythonVersion = pyodide.runPython('import sys; sys.version.split()[0]');
  if (pythonVersion !== '3.12.1') throw new Error('Unexpected Pyodide Python version ' + pythonVersion);
  pyodide.FS.mkdirTree('/slyszeglosy/wymowa');
  const frontendPaths = Object.keys(profile.assetDigests).filter(path => path.startsWith('assets/frontend/'));
  frontendPaths.forEach((path, index) => {
    const relative = path.slice('assets/frontend/'.length);
    const parent = relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : '';
    if (parent) pyodide.FS.mkdirTree('/slyszeglosy/' + parent);
    pyodide.FS.writeFile('/slyszeglosy/' + relative, frontendFiles[index]);
  });
  pyodide.runPython(`
import json, sys
sys.path.insert(0, "/slyszeglosy")
import wymowa
import slyszeglosy_text as text

def phonemize_json(sentence):
    try:
        result = text.phonemize(sentence)
    except text.NothingToPronounce:
        return "null"
    return json.dumps({"ids": list(result.ids), "stress": list(result.stress),
                       "symbols": list(result.symbols), "unknown": list(result.unknown)}, ensure_ascii=False)
json.dumps({"frontend": text.frontend_fingerprint(), "rules": text.frontend_runtime()["phonemizer"]})
`);
  const frontendAbi = JSON.parse(pyodide.runPython('json.dumps({\"frontend\": text.frontend_fingerprint(), \"rules\": text.frontend_runtime()[\"phonemizer\"]})'));
  if (frontendAbi.frontend !== profile.frontendFingerprint || frontendAbi.rules !== profile.rulesFingerprint) throw new Error('Słyszę Głosy frontend ABI/rules fingerprint mismatch');
  phonemize = pyodide.globals.get('phonemize_json');
  ortRuntime = self.ort;
  if (!ortRuntime?.InferenceSession || !ortRuntime?.Tensor) throw new Error('Pinned ONNX Runtime Web did not initialize');
  ortRuntime.env.wasm.numThreads = 1;
  ortRuntime.env.wasm.proxy = false;
  ortRuntime.env.wasm.wasmPaths = new URL(ORT_ROOT, self.location.href).href;
  ortRuntime.env.logLevel = 'error';
  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ortRuntime.InferenceSession.create(graphBytes, { executionProviders, graphOptimizationLevel: 'all', enableCpuMemArena: true });
  const inputNames = [...session.inputNames].sort();
  const outputNames = [...session.outputNames].sort();
  if (inputNames.join(',') !== ['pitch_range', 'pitch_shift', 'speed', 'stress', 'tokens', 'voice'].sort().join(',') ||
      outputNames.join(',') !== ['audio', 'durations'].sort().join(',')) throw new Error('Słyszę Głosy graph input/output names differ from pinned browser evidence');
  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device;
    const adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await releaseSession(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuLabel = device?.adapterInfo?.description || adapter?.info?.description || gpuLabel;
  }

  const fixtureAudit = options.auditTexts?.length ? await verifyFullFixture(options.auditTexts, route) : null;
  let dispatches = 0;
  if (options.probe) {
    const probeText = typeof options.probeText === 'string' && options.probeText.trim() ? options.probeText : 'Dzień dobry.';
    const hook = webgpu ? dispatchProbe() : null;
    try { await generatePrepared(prepare(probeText), route); }
    finally { dispatches = hook?.stop() ?? 0; }
    if (webgpu && dispatches <= 0) { await releaseSession(); return unsupported('No real WebGPU compute dispatch was observed during synthesis probe'); }
  }
  activeFixture = route.fixtureId; activeLanguage = route.language; activeBackend = options.backend;
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: route.voice, precision: 'FP32', gpu: gpuLabel,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceRevision: profile.sourceRevision,
      graphSha256: profile.graphSha256, fixtureId: route.fixtureId, fixtureSha256: profile.fixtureOracle[route.fixtureId].fixtureSha256,
      language: route.language, locale: route.language, voice: route.voice, voiceIndex: route.voiceIndex,
      speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, threads: 1,
      frontendFingerprint: profile.frontendFingerprint, rulesFingerprint: profile.rulesFingerprint,
      runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version, python: pythonVersion },
      executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: { gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null, ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? `Observed ${dispatches} WebGPU compute dispatches on the synthesis probe; provider order is webgpu then wasm.` :
        'Pinned ONNX Runtime Web 1.20.1 with explicit single-thread WASM; Pyodide frontend runs locally.' },
  };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: 'unknown', precision: 'FP32', settings: {},
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !activeFixture || !activeLanguage || !activeBackend) throw new Error('Słyszę Głosy is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string') throw new Error('Invalid Słyszę Głosy chunk');
  const route = supportedRoute(activeFixture, activeLanguage);
  const generated = await generatePrepared(prepare(chunk.text), route, onFirstPcm);
  return { parts: generated.parts, sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function diagnostic(options = {}) {
  const route = supportedRoute(options.fixtureId, options.language);
  const plan = prepare(options.text);
  return { fixtureId: route.fixtureId, language: route.language, voice: route.voice, voiceIndex: route.voiceIndex,
    sampleRate: profile.sampleRate, utterances: plan.length,
    tokenPlans: plan.map(({ phones }) => ({ ids: phones.ids, stress: phones.stress, symbols: phones.symbols, unknown: phones.unknown })) };
}

async function releaseSession() {
  const current = session; session = null;
  if (current) await current.release();
}

async function dispose() {
  await releaseSession();
  try { phonemize?.destroy?.(); } catch {}
  try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = null; pyodide = null; ortRuntime = null; modelConfig = null;
  activeFixture = null; activeLanguage = null; activeBackend = null; gpuLabel = null; profile = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await diagnostic(data.options);
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Słyszę Głosy worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
