/* SPDX-License-Identifier: Apache-2.0
 * Local browser port of the pinned tiny-voca-ru Space worker.
 * See ../tiny-voca-ru/LICENSE, NOTICE and LICENSE-ruaccent.
 */
let profile, pyodide, ortRuntime, waveform, accent, omograph, config;
let phonemize, unknownWords, learnStress, homographQueries, accentuateSentence;
let fixtureId = null, language = null, backend = null, gpuLabel = null, cacheEnabled = true;

const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_ROOT = '/models/tiny-voca-ru/';
const ORACLE_FIXTURE = 'ru-article-v1';
const MAX_PEAK = 0.99;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');

function routeFor(id, lang) {
  if (id !== ORACLE_FIXTURE || lang !== 'ru') {
    throw new Error('Tiny Voca Russian accepts only ru-article-v1 with language ru.');
  }
  return { fixtureId: id, language: lang, voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex };
}

async function pinnedBytes(path, table, root, label = path) {
  const expected = table?.[path];
  if (!Array.isArray(expected) || expected.length !== 2 || !Number.isSafeInteger(expected[0]) || !/^[a-f0-9]{64}$/.test(expected[1])) {
    throw new Error('Unpinned Tiny Voca Russian asset: ' + path);
  }
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
    throw new Error(label + ' must be a same-origin model/runtime asset.');
  }
  const key = new Request(url.href, { method: 'GET' });
  let store = null;
  if (cacheEnabled && self.caches) {
    try {
      store = await caches.open('tiny-voca-ru-' + profile.modelRevision + '-' + profile.spaceRevision);
      const hit = await store.match(key);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (bytes.byteLength === expected[0] && await sha256(bytes) === expected[1]) return bytes;
        await store.delete(key);
      }
    } catch { store = null; }
  }
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw new Error(label + ' failed: HTTP ' + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected[0] || await sha256(bytes) !== expected[1]) throw new Error(label + ' SHA-256 or byte count mismatch');
  if (store) store.put(key, new Response(bytes.slice())).catch(() => {});
  return bytes;
}

const modelAsset = path => pinnedBytes(path, profile.assetDigests, MODEL_ROOT + profile.modelRevision + '/' + profile.spaceRevision + '/');
const pyodideAsset = path => pinnedBytes(path, profile.pyodideDigests, PYODIDE_ROOT, 'Pyodide ' + path);
const runtimeAsset = path => pinnedBytes(path, profile.runtimeDigests, ORT_ROOT, 'ONNX Runtime Web ' + path);

// Keep this sentence and terminal-punctuation behavior in sync with the pinned Space.
const ABBREVIATIONS = /(?:(?<![\p{L}\p{N}_])(?:тыс|млн|млрд|руб|коп|долл|ул|пр|просп|пер|наб|пл|обл|кв|корп|стр|рис|табл|см|ср|напр|проф|акад|доц|им|св|гр|тел|др|т\.е|т\.д|т\.п|т\.к|т\.н)|(?<![\p{L}\p{N}_])[A-ZА-ЯЁ])\.$/iu;
function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]\u00bb“]?)\s+(?=["'(\[«„]?[A-ZА-ЯЁ0-9])/u)) {
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
  const marked = /[\p{L}\p{N}]/u.test(last) ? /[.!?…,;:]["'”’)\]»]*$/.test(last) : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : body + '.';
}

function toIntTensor(values) {
  const data = BigInt64Array.from(values, BigInt);
  return new ortRuntime.Tensor('int64', data, [1, values.length]);
}
function disposeOutputs(outputs) {
  if (outputs) for (const value of Object.values(outputs)) value?.dispose?.();
}

function validateSession(session, expectedInputs, expectedOutputs, label) {
  if ([...session.inputNames].sort().join(',') !== [...expectedInputs].sort().join(',') ||
      [...session.outputNames].sort().join(',') !== [...expectedOutputs].sort().join(',')) {
    throw new Error(label + ' ONNX input/output names differ from the pinned Space ABI');
  }
}

async function loadPyodideFrontend(archive) {
  for (const name of Object.keys(profile.pyodideDigests)) await pyodideAsset(name);
  self.importScripts(PYODIDE_ROOT + 'pyodide.js');
  if (typeof self.loadPyodide !== 'function') throw new Error('Pinned Pyodide loader did not initialize');
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== profile.pyodideVersion) throw new Error('Unexpected Pyodide version ' + pyodide.version);
  pyodide.unpackArchive(archive.slice().buffer, 'zip', { extractDir: '/phonemizer' });
  pyodide.runPython(`
import json, sys
sys.path.insert(0, '/phonemizer')
from tiny_voca_ru import frontend
provider = frontend.stress_provider()
def phonemize_json(sentence, stressed=False):
    try:
        result = frontend.phonemize(sentence, stressed=stressed)
    except frontend.NothingToPronounce:
        return 'null'
    return json.dumps({'ids': list(result.ids), 'stress': list(result.stress), 'unknown': list(result.unknown)}, ensure_ascii=False)
def unknown_json(raw):
    return json.dumps([[word, frontend.accent_input_ids(word)] for word in frontend.unknown_words(raw, provider)], ensure_ascii=False)
def learn_stress(word, logits):
    provider.extra[word] = frontend.stress_from_logits(word, json.loads(logits))
def homographs_json(sentence):
    normalized = frontend.normalize(sentence)
    queries = [[start, end, candidates, frontend.omograph_input_ids(normalized, start, end, candidates)]
               for start, end, candidates in provider.homographs(normalized)]
    return json.dumps({'text': normalized, 'queries': queries}, ensure_ascii=False)
def accentuate_json(normalized, resolved_json):
    overrides = {(int(start), int(end)): reading for start, end, reading in json.loads(resolved_json)}
    return provider.accentuate_with(normalized, overrides)
json.dumps({'warmup': frontend.phonemize('Разминка.', stressed=True).ids})
`);
  phonemize = pyodide.globals.get('phonemize_json');
  unknownWords = pyodide.globals.get('unknown_json');
  learnStress = pyodide.globals.get('learn_stress');
  homographQueries = pyodide.globals.get('homographs_json');
  accentuateSentence = pyodide.globals.get('accentuate_json');
}

async function initOrtRuntime(webgpu) {
  const runtimeNames = webgpu
    ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  for (const name of runtimeNames) await runtimeAsset(name);
  self.importScripts(ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  ortRuntime = self.ort;
  if (!ortRuntime?.InferenceSession || !ortRuntime?.Tensor) throw new Error('Pinned ONNX Runtime Web failed to initialize');
  ortRuntime.env.wasm.numThreads = 1;
  ortRuntime.env.wasm.proxy = false;
  ortRuntime.env.wasm.wasmPaths = new URL(ORT_ROOT, self.location.href).href;
  ortRuntime.env.logLevel = 'error';
}

async function makeSession(bytes, providers, label) {
  return await ortRuntime.InferenceSession.create(bytes, { executionProviders: providers, graphOptimizationLevel: 'all' });
}

async function stressUnknownWords(text, counter = null) {
  for (const [word, ids] of JSON.parse(unknownWords(text))) {
    const inputs = {
      input_ids: toIntTensor(ids),
      attention_mask: toIntTensor(ids.map(() => 1)),
      token_type_ids: toIntTensor(ids.map(() => 0)),
    };
    let outputs;
    try {
      outputs = await accent.run(inputs);
      const flat = Array.from(outputs.logits.data, Number);
      if (!flat.length || flat.length % 3 !== 0 || flat.some(value => !Number.isFinite(value))) throw new Error('Russian OOV accent model returned invalid logits');
      const rows = ids.map((_, index) => flat.slice(3 * index, 3 * index + 3));
      if (rows.some(row => row.length !== 3)) throw new Error('Russian OOV accent output shape differs from its input');
      learnStress(word, JSON.stringify(rows));
      if (counter) counter.oovAccentRequests++;
    } finally {
      for (const tensor of Object.values(inputs)) tensor.dispose();
      disposeOutputs(outputs);
    }
  }
}

async function resolveHomographs(sentence, counter = null) {
  const { text, queries } = JSON.parse(homographQueries(sentence));
  if (counter) counter.homographQueries += queries.length;
  if (!queries.length) return accentuateSentence(text, '[]');
  const chosen = [];
  for (const [start, end, candidates, sequences] of queries) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < sequences.length; index++) {
      const ids = sequences[index];
      const inputs = { input_ids: toIntTensor(ids), attention_mask: toIntTensor(ids.map(() => 1)) };
      let outputs;
      try {
        outputs = await omograph.run(inputs);
        const logits = outputs.logits.data;
        if (!logits || logits.length < 2 || !Number.isFinite(logits[0]) || !Number.isFinite(logits[1])) throw new Error('Russian homograph model returned invalid logits');
        const score = Number(logits[1]) - Number(logits[0]);
        if (score > bestScore) { bestScore = score; bestIndex = index; }
      } finally {
        for (const tensor of Object.values(inputs)) tensor.dispose();
        disposeOutputs(outputs);
      }
    }
    chosen.push([start, end, candidates[bestIndex]]);
  }
  return accentuateSentence(text, JSON.stringify(chosen));
}

function fit(sentence) {
  const result = JSON.parse(phonemize(sentence, true));
  if (result === null) throw new Error('Russian frontend produced no phonemes for a nonempty source sentence; refusing to drop it');
  if (!Array.isArray(result.ids) || !Array.isArray(result.stress) || result.ids.length === 0 || result.ids.length !== result.stress.length) {
    throw new Error('Russian frontend returned invalid token/stress arrays');
  }
  if (result.unknown?.length) throw new Error('Russian frontend emitted unknown phonemes: ' + result.unknown.join(', '));
  const budget = config.model.max_tokens - 12;
  if (result.ids.length <= budget) return [result];
  const pieces = sentence.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces.flatMap(fit);
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single Russian word exceeds the pinned token budget; refusing to drop text');
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' ')), ...fit(words.slice(half).join(' '))];
}

async function prepare(text, counter = null) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Tiny Voca Russian requires nonempty source text');
  // Match the official Space route: first-seen OOV accent requests precede all
  // sentence-level contextual homograph resolution and token fitting.
  await stressUnknownWords(text, counter);
  const parts = [];
  for (const sentence of sentences(finished(text))) {
    const resolved = await resolveHomographs(sentence, counter);
    parts.push(...fit(resolved));
  }
  if (!parts.length) throw new Error('Russian frontend produced no utterances for a nonempty source span');
  return parts;
}

function limitPeak(samples) {
  let peak = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) throw new Error('Tiny Voca Russian returned non-finite PCM');
    peak = Math.max(peak, Math.abs(sample));
  }
  if (!samples.length || peak === 0) throw new Error('Tiny Voca Russian returned empty or silent PCM');
  if (peak > MAX_PEAK) for (let i = 0; i < samples.length; i++) samples[i] *= MAX_PEAK / peak;
}

async function synthesize(phones) {
  const count = phones.ids.length;
  const inputs = {
    tokens: toIntTensor(phones.ids),
    stress: toIntTensor(phones.stress),
    voice: new ortRuntime.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ortRuntime.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ortRuntime.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ortRuntime.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  let outputs;
  try {
    outputs = await waveform.run(inputs);
    if (!outputs.audio?.data || !outputs.durations?.data) throw new Error('Waveform graph omitted audio or duration outputs');
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== count || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Waveform graph returned invalid duration frames');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > config.model.max_frames) throw new Error('Waveform graph exceeded the pinned frame budget');
    const pcm = Float32Array.from(outputs.audio.data);
    if (pcm.length !== frames * config.hop) throw new Error('Waveform length differs from predicted duration frames');
    if (!pcm.length || !pcm.some(value => value !== 0)) throw new Error('Waveform graph returned empty or silent PCM');
    for (const sample of pcm) if (!Number.isFinite(sample)) throw new Error('Waveform graph returned non-finite PCM');
    return pcm;
  } finally {
    for (const tensor of Object.values(inputs)) tensor.dispose();
    disposeOutputs(outputs);
  }
}

async function generatePrepared(text, onFirstPcm, counter = null) {
  const plan = await prepare(text, counter);
  const parts = [];
  for (const phones of plan) {
    const pcm = await synthesize(phones);
    parts.push(pcm);
    if (parts.length === 1) onFirstPcm?.();
  }
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Float32Array(length);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  // Match the Space's one 0.99 peak cap over each source-span waveform.
  limitPeak(joined);
  return { parts: [joined], plan };
}

async function verifySmokeOracle(texts, route) {
  const oracle = profile.fixtureOracle[route.fixtureId];
  if (!Array.isArray(texts) || texts.length !== oracle.spans) throw new Error('Russian smoke oracle requires all 95 exact fixture spans');
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  const counts = { oovAccentRequests: 0, homographQueries: 0 };
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Invalid Russian smoke oracle span at ' + id);
    const plan = await prepare(item.text, counts);
    const tokens = [];
    for (const phones of plan) {
      utterances++;
      maximumTokens = Math.max(maximumTokens, phones.ids.length);
      unknownPhones += phones.ids.filter(id => id === 4).length;
      tokens.push([phones.ids, phones.stress]);
    }
    rows.push([id, tokens]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = { spans: rows.length, utterances, maximumTokens, unknownPhones,
    firstSeenOovAccentRequests: counts.oovAccentRequests, homographQueries: counts.homographQueries, tokenStressSha256: digest };
  if (actual.spans !== oracle.spans || utterances !== oracle.utterances || maximumTokens !== oracle.maximumTokens ||
      unknownPhones !== oracle.unknownPhones || counts.oovAccentRequests !== oracle.firstSeenOovAccentRequests ||
      counts.homographQueries !== oracle.homographQueries || digest !== oracle.tokenStressSha256) {
    throw new Error('Russian smoke frontend oracle mismatch: ' + JSON.stringify(actual));
  }
  return { fixtureId: route.fixtureId, fixtureSha256: oracle.fixtureSha256, status: 'matched', ...actual };
}

async function initialize(options = {}) {
  profile = options.modelConfig;
  if (!profile || profile.id !== 'tiny-voca-ru' || !/^[a-f0-9]{40}$/.test(profile.modelRevision) || profile.modelRevision !== '2723b0e71fea216001bd4f6caf0866eb06879339' ||
      profile.sourceRevision !== 'aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784' || profile.spaceRevision !== 'bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e' ||
      profile.sampleRate !== 24000 || profile.defaultVoice !== 'M' || profile.defaultVoiceIndex !== 1) {
    throw new Error('Tiny Voca Russian requires the exact pinned model/source/Space profile and default M voice');
  }
  const route = routeFor(options.fixtureId, options.language);
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Russian requires explicit cpu or webgpu backend');
  const webgpu = options.backend === 'webgpu';
  cacheEnabled = options.cache !== false;
  gpuLabel = webgpu ? await hardwareGpu() : null;
  if (webgpu && !gpuLabel) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');

  const [configBytes, waveformBytes, phonemizerBytes, accentBytes, omographBytes] = await Promise.all([
    modelAsset('assets/config.json'), modelAsset('assets/model.onnx'), modelAsset('assets/phonemizer.zip'),
    modelAsset('assets/accent.onnx'), modelAsset('assets/omograph.onnx'),
  ]);
  config = JSON.parse(new TextDecoder().decode(configBytes));
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.max_tokens !== profile.maxTokens ||
      config.max_frames !== profile.maxFrames || config.voices?.join(',') !== 'F,M' || config.model?.max_tokens !== profile.maxTokens ||
      config.model?.max_frames !== profile.maxFrames || config.inputs?.join(',') !== 'tokens,stress,voice,speed,pitch_shift,pitch_range' ||
      config.outputs?.join(',') !== 'audio,durations') throw new Error('Pinned Russian waveform config differs from the profile');

  // Critical qualified ordering: create and await the waveform session first.
  // Concurrent session creation caused ORT WebGPU to silently lose its GPU EP.
  await initOrtRuntime(webgpu);
  waveform = await makeSession(waveformBytes, webgpu ? ['webgpu', 'wasm'] : ['wasm'], 'waveform');
  validateSession(waveform, config.inputs, config.outputs, 'Waveform');

  // The accent and contextual homograph graphs are always single-thread WASM.
  // They are not started until the requested waveform provider is established.
  accent = await makeSession(accentBytes, ['wasm'], 'OOV accent');
  validateSession(accent, ['input_ids', 'attention_mask', 'token_type_ids'], ['logits'], 'OOV accent');
  omograph = await makeSession(omographBytes, ['wasm'], 'Contextual homograph');
  validateSession(omograph, ['input_ids', 'attention_mask'], ['logits'], 'Contextual homograph');

  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device;
    const adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await disposeSessions(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuLabel = device?.adapterInfo?.description || adapter?.info?.description || gpuLabel;
  }
  await loadPyodideFrontend(phonemizerBytes);

  let frontendAudit = null;
  if (options.auditTexts?.length) frontendAudit = await verifySmokeOracle(options.auditTexts, route);
  let dispatches = 0;
  if (options.probe) {
    const probeText = typeof options.probeText === 'string' && options.probeText.trim() ? options.probeText : 'Разминка.';
    const hook = webgpu ? dispatchProbe() : null;
    try { await generatePrepared(probeText); }
    finally { dispatches = hook?.stop() ?? 0; }
    if (webgpu && dispatches <= 0) { await disposeSessions(); return unsupported('No real WebGPU waveform dispatch was observed during the capability probe'); }
  }
  fixtureId = route.fixtureId; language = route.language; backend = options.backend;
  const settings = {
    modelId: profile.modelId, modelRevision: profile.modelRevision,
    sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
    spaceId: profile.spaceId, spaceRevision: profile.spaceRevision,
    fixtureId: route.fixtureId, fixtureSha256: profile.fixtureOracle[route.fixtureId].fixtureSha256,
    language: route.language, locale: route.language,
    voice: route.voice, voiceIndex: route.voiceIndex, precision: profile.precision,
    speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
    sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames,
    frontend: 'Pinned tiny-voca-ru full contextual route: Pyodide lexical stress + first-seen OOV accent.onnx + contextual INT8 omograph.onnx; sentence and token-fit order follows the pinned Space.',
    runtimeVersions: { onnxruntimeWeb: profile.ortVersion, pyodide: pyodide.version },
    waveformExecutionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'],
    stressExecutionProviders: ['wasm'], stressThreads: 1,
    ...(frontendAudit ? { fixtureAudit: frontendAudit } : {}),
  };
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: route.voice, precision: profile.precision, gpu: gpuLabel,
    settings,
    capability: { gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? (options.probe ? `Waveform provider order is WebGPU then WASM; OOV accent and contextual homograph graphs use single-thread WASM. ${dispatches} dispatches observed in the untimed waveform probe.` :
        'Waveform provider order is WebGPU then WASM; OOV accent and contextual homograph graphs use single-thread WASM. Dispatch proof is recorded by the separate capability initialization.') :
        'Waveform, OOV accent and contextual homograph graphs use explicit single-thread WASM; local Pyodide handles Russian normalization and G2P.' },
  };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: profile?.defaultVoice || 'M', precision: profile?.precision || 'FP32', settings: {},
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function generate(chunk, onFirstPcm) {
  if (!waveform || !accent || !omograph || !fixtureId || !language || !backend) throw new Error('Tiny Voca Russian is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string') throw new Error('Invalid Tiny Voca Russian source chunk');
  routeFor(fixtureId, language);
  const result = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: result.parts, sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function disposeSessions() {
  let firstError = null;
  for (const name of ['waveform', 'accent', 'omograph']) {
    const current = ({ waveform, accent, omograph })[name];
    if (name === 'waveform') waveform = null;
    else if (name === 'accent') accent = null;
    else omograph = null;
    if (current) {
      try { await current.release(); }
      catch (error) { firstError ??= error; }
    }
  }
  if (firstError) throw firstError;
}

async function dispose() {
  let firstError = null;
  try { await disposeSessions(); } catch (error) { firstError = error; }
  for (const handle of [phonemize, unknownWords, learnStress, homographQueries, accentuateSentence]) {
    try { handle?.destroy?.(); } catch {}
  }
  try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = unknownWords = learnStress = homographQueries = accentuateSentence = null;
  pyodide = null; ortRuntime = null; config = null; profile = null;
  fixtureId = language = backend = gpuLabel = null;
  if (firstError) throw firstError;
}

function dispatchProbe() {
  const proto = self.GPUComputePassEncoder?.prototype;
  if (!proto) throw new Error('WebGPU compute dispatch instrumentation is unavailable');
  const originals = [];
  for (const name of ['dispatchWorkgroups', 'dispatchWorkgroupsIndirect']) if (typeof proto[name] === 'function') originals.push([name, proto[name]]);
  if (!originals.length) throw new Error('WebGPU dispatch methods cannot be instrumented');
  let count = 0, stopped = false;
  for (const [name, original] of originals) proto[name] = function (...args) { count++; return original.apply(this, args); };
  return { stop() { if (!stopped) { for (const [name, original] of originals) proto[name] = original; stopped = true; } return count; } };
}
async function hardwareGpu() {
  if (!self.navigator?.gpu) return null;
  const adapter = await self.navigator.gpu.requestAdapter();
  if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return null;
  const info = adapter.info || {};
  return [info.description, info.vendor, info.architecture].filter(Boolean).join(' / ') || 'Hardware WebGPU adapter';
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Tiny Voca Russian action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
