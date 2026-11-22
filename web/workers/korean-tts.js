/*
 * SPDX-License-Identifier: Apache-2.0
 * Local browser port of ooodev/korean-tts at c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c.
 * This is a classic worker because the pinned ONNX Runtime Web 1.20.1 browser
 * entry points are the publisher's `ort.*.min.js` scripts and use importScripts.
 */
let profile, cacheEnabled = true, pyodide, phonemize, ortRuntime, session, config, activeFixture, activeLanguage, activeRoute;
let gpuLabel = null;

const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.20.1/';
const MODEL_PREFIX = '/models/korean-tts/';
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');

function supportedRoute(fixtureId, language) {
  const expected = profile.fixtureOracle[fixtureId];
  const resolved = language === undefined && fixtureId === 'english-20k-v1' ? 'en' : language;
  if (!expected || resolved !== expected.language) {
    throw new Error('Korean TTS requires exactly ko-article-v1/ko or english-20k-v1/en.');
  }
  return resolved;
}

function voiceFor(language) {
  if (language === 'ko') return { name: 'KSS', index: 0, mode: 'ko-loan' };
  if (language === 'en') return { name: 'F2', index: 1, mode: 'own' };
  throw new Error('Korean TTS has no voice route for ' + language);
}

async function bytesAt(path, table, root, label) {
  const expected = table[path];
  if (!Array.isArray(expected) || expected.length !== 2) throw new Error('Unpinned Korean TTS asset: ' + path);
  const url = new URL(root + path, self.location.href);
  if (url.origin !== self.location.origin) throw new Error('Korean TTS assets must stay on the local origin.');
  const cacheKey = new Request(url.href, { method: 'GET' });
  let cache = null;
  if (cacheEnabled && self.caches) {
    try {
      cache = await caches.open('korean-tts-' + profile.sourceRevision);
      const hit = await cache.match(cacheKey);
      if (hit) {
        const candidate = new Uint8Array(await hit.arrayBuffer());
        if (candidate.byteLength === expected[0] && await sha256(candidate) === expected[1]) return candidate;
        await cache.delete(cacheKey);
      }
    } catch { cache = null; }
  }
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label || path} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected[0] || await sha256(bytes) !== expected[1]) {
    throw new Error(`${label || path} checksum or size mismatch`);
  }
  if (cache) cache.put(cacheKey, new Response(bytes.slice())).catch(() => {});
  return bytes;
}

async function modelAsset(path) {
  return bytesAt(path, profile.assetDigests, MODEL_PREFIX + profile.sourceRevision + '/', path);
}

async function pyodideAsset(path) {
  return bytesAt(path, profile.pyodideDigests, PYODIDE_ROOT, 'Pyodide ' + path);
}

async function ortAsset(path) {
  return bytesAt(path, profile.runtimeDigests, ORT_ROOT, 'ONNX Runtime Web ' + path);
}

function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/)) {
    if (!piece) continue;
    current = current ? current + ' ' + piece : piece;
    if (/[.!?…]$/.test(current) || current.length > 60) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

function fit(sentence, mode) {
  const result = JSON.parse(phonemize(sentence, mode));
  if (!Array.isArray(result.ids) || !result.ids.length || result.ids.length !== result.stress.length) {
    throw new Error('Korean TTS frontend returned invalid token/stress arrays');
  }
  if (result.ids.length <= config.max_tokens - 12) return [result];
  const pieces = sentence.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces.flatMap(piece => fit(piece, mode));
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single word exceeds the pinned Korean TTS token budget');
  const half = Math.ceil(words.length / 2);
  return [...fit(words.slice(0, half).join(' '), mode), ...fit(words.slice(half).join(' '), mode)];
}

function prepare(text, route) {
  const plan = [];
  for (const sentence of sentences(text)) {
    for (const phones of fit(sentence, route.mode)) plan.push({ sentence, phones });
  }
  if (!plan.length) throw new Error('Korean TTS produced no speakable utterances for a nonempty source span');
  return plan;
}

async function auditFixture(fixtureId, language, auditTexts) {
  const expected = profile.fixtureOracle[fixtureId];
  if (!expected || expected.language !== language || auditTexts.length !== expected.spans) {
    throw new Error('Korean TTS smoke audit requires the complete exact fixture span list');
  }
  const route = voiceFor(language);
  const rows = [];
  let utterances = 0;
  let maximumTokens = 0;
  let unknownPhonemes = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`Korean TTS full-fixture audit has an invalid span at index ${index}`);
    }
    const prepared = prepare(item.text, route);
    const tokenPlans = [];
    for (const { phones } of prepared) {
      if (phones.unknown?.length) unknownPhonemes += phones.unknown.length;
      utterances++;
      maximumTokens = Math.max(maximumTokens, phones.ids.length);
      tokenPlans.push([phones.ids, phones.stress]);
    }
    rows.push([item.id, tokenPlans]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (unknownPhonemes !== 0 || utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || digest !== expected.tokenStressSha256) {
    throw new Error(`Korean TTS ${language} frontend differs from its pinned oracle: ${JSON.stringify({ spans: rows.length, utterances, maximumTokens, unknownPhonemes, digest })}`);
  }
  return { fixtureId, language, spans: rows.length, utterances, maximumTokens, unknownPhonemes, tokenStressSha256: digest };
}

async function hardwareGpu() {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return null;
  const info = adapter.info || {};
  return [info.description, info.vendor, info.architecture].filter(Boolean).join(' / ') || 'Hardware WebGPU adapter';
}

function dispatchProbe() {
  const prototypes = [self.GPUComputePassEncoder?.prototype].filter(Boolean);
  const originals = [];
  for (const prototype of prototypes) {
    for (const name of ['dispatchWorkgroups', 'dispatchWorkgroupsIndirect']) {
      if (typeof prototype[name] === 'function') originals.push([prototype, name, prototype[name]]);
    }
  }
  if (!originals.length) return { stop: () => 0, count: () => 0 };
  let count = 0;
  for (const [prototype, name, original] of originals) {
    prototype[name] = function (...args) { count++; return original.apply(this, args); };
  }
  let stopped = false;
  return {
    count: () => count,
    stop() {
      if (!stopped) {
        for (const [prototype, name, original] of originals) prototype[name] = original;
        stopped = true;
      }
      return count;
    },
  };
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
    const expectedSamples = Array.from(output.durations.data, Number).reduce((sum, frames) => sum + frames, 0) * profile.hop;
    const pcm = Float32Array.from(output.audio.data);
    if (!pcm.length || pcm.length !== expectedSamples) throw new Error('Korean TTS audio length differs from predicted frame durations');
    for (let index = 0; index < pcm.length; index++) {
      if (!Number.isFinite(pcm[index])) throw new Error('Korean TTS returned a non-finite PCM sample');
    }
    if (!pcm.some(value => value !== 0)) throw new Error('Korean TTS returned silent PCM');
    return pcm;
  } finally {
    for (const tensor of Object.values(tensors)) tensor.dispose();
    if (output) for (const tensor of Object.values(output)) tensor.dispose();
  }
}

async function generateText(text, route, onFirstPcm) {
  const parts = [];
  const plan = [];
  for (const sentence of sentences(text)) {
    // The publisher interleaves frontend work and graph calls sentence by
    // sentence. Keep this order so diagnostics and generation match it.
    for (const phones of fit(sentence, route.mode)) {
      plan.push({ sentence, phones });
      const pcm = await synthesize(phones, route.index);
      parts.push(pcm);
      if (parts.length === 1) onFirstPcm?.();
    }
  }
  if (!plan.length) throw new Error('Korean TTS produced no speakable utterances for a nonempty source span');
  return { parts, sampleRate: profile.sampleRate, plan };
}

async function diagnose({ text, fixtureId, language }) {
  const resolvedLanguage = supportedRoute(fixtureId, language);
  const route = voiceFor(resolvedLanguage);
  let controlValidated = null;
  const control = profile.diagnosticControl;
  if (text === control.text) {
    if (fixtureId !== control.fixtureId || resolvedLanguage !== control.language || route.name !== control.voice || route.mode !== control.mode) {
      throw new Error('The bilingual Korean loanword control requires its exact KSS/ko-loan route');
    }
    const phones = JSON.parse(phonemize(control.text, control.mode));
    if (JSON.stringify(phones.ids) !== JSON.stringify(control.ids) || JSON.stringify(phones.stress) !== JSON.stringify(control.stress)) {
      throw new Error('The bilingual Korean loanword control differs from its pinned token/stress oracle');
    }
    controlValidated = { id: control.id, voice: control.voice, mode: control.mode, ids: phones.ids, stress: phones.stress, symbols: phones.symbols };
  }
  const { parts, sampleRate: rate, plan } = await generateText(text, route);
  const samples = parts.reduce((sum, part) => sum + part.length, 0);
  return {
    fixtureId, language: resolvedLanguage, voice: route.name, voiceIndex: route.index, mode: route.mode,
    sampleRate: rate, samples, utterances: plan.length,
    tokenPlans: plan.map(({ phones }) => ({ ids: phones.ids, stress: phones.stress, symbols: phones.symbols, unknown: phones.unknown ?? [] })),
    pcmFinite: parts.every(part => part.every(Number.isFinite)),
    ...(controlValidated ? { controlValidated } : {}),
  };
}

async function initialize(options = {}) {
  profile = options.modelConfig;
  if (!profile || profile.id !== 'korean-tts' || profile.sourceRevision !== 'c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c' ||
      profile.graphSha256 !== 'ad39049485cf43359e8b4c24d18e01eab510907befda4311e4929b00cb74a5ad') {
    throw new Error('Korean TTS worker requires its exact pinned model profile');
  }
  const language = supportedRoute(options.fixtureId, options.language);
  const route = voiceFor(language);
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Korean TTS supports only explicit CPU or WebGPU backends');
  const webgpu = options.backend === 'webgpu';
  cacheEnabled = options.cache !== false;
  gpuLabel = webgpu ? await hardwareGpu() : null;
  if (webgpu && !gpuLabel) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');

  // Verify all immutable inputs before a runtime consumes them. Pyodide's
  // Python package lock supplies the exact NumPy/NLTK/regex/sqlite versions.
  const configBytes = await modelAsset('assets/config.json');
  config = JSON.parse(new TextDecoder().decode(configBytes));
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.max_tokens !== profile.maxTokens ||
      config.max_frames !== profile.maxFrames || config.step !== profile.graphStep || config.voices.join(',') !== 'KSS,F2,M2' ||
      config.frontend_fingerprint !== profile.frontendFingerprint) throw new Error('Pinned Korean TTS graph config differs from its profile');
  const graphBytes = await modelAsset('assets/model.onnx');
  for (const path of Object.keys(profile.pyodideDigests)) await pyodideAsset(path);
  for (const path of Object.keys(profile.runtimeDigests)) await ortAsset(path);
  for (const path of Object.keys(profile.assetDigests)) if (path !== 'assets/config.json' && path !== 'assets/model.onnx') await modelAsset(path);

  self.importScripts(PYODIDE_ROOT + 'pyodide.js', ORT_ROOT + (webgpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== '0.26.4') throw new Error('Unexpected Pyodide version ' + pyodide.version);
  await pyodide.loadPackage(['numpy', 'nltk']);
  if (pyodide.runPython('import sys; sys.version.split()[0]') !== '3.12.1') throw new Error('Unexpected Pyodide Python version');
  const [front, dizione, dictionary, cmudict, ...phonemizerData] = await Promise.all([
    modelAsset('assets/pyfront.zip'), modelAsset('assets/dizione.zip'), modelAsset('assets/mecab-dict.json'),
    modelAsset('assets/phonemizer/cmudict.zip'),
    ...['lexicon.tsv', 'align.json', 'g2p.json', 'g2p.npz', 'homographs.json'].map(name => modelAsset('assets/phonemizer/' + name)),
  ]);
  pyodide.FS.mkdirTree('/dizione-data');
  ['lexicon.tsv', 'align.json', 'g2p.json', 'g2p.npz', 'homographs.json'].forEach((name, index) => {
    pyodide.FS.writeFile('/dizione-data/' + name, phonemizerData[index]);
  });
  pyodide.FS.mkdirTree('/nltk_data/corpora');
  pyodide.FS.writeFile('/nltk_data/corpora/cmudict.zip', cmudict);
  pyodide.unpackArchive(front.buffer, 'zip', { extractDir: '/pyfront' });
  pyodide.unpackArchive(dizione.buffer, 'zip', { extractDir: '/pyfront' });
  pyodide.FS.writeFile('/pyfront/mecab-dict.json', dictionary);
  pyodide.runPython(`
import json, os, sys
os.environ["DIZIONE_DATA"] = "/dizione-data"
os.environ["MECAB_DICT"] = "/pyfront/mecab-dict.json"
sys.path.insert(0, "/pyfront")
import nltk
nltk.data.path.insert(0, "/nltk_data")
from kofront import text as ktext

def phonemize_json(text, mode):
    ktext.set_frontend(mode)
    result = ktext.phonemize(text)
    return json.dumps({"ids": list(result.ids), "stress": list(result.stress),
                       "symbols": list(result.symbols), "unknown": list(result.unknown)})

phonemize_json("테스트 문장입니다.", "ko-loan")
`);
  phonemize = pyodide.globals.get('phonemize_json');
  ortRuntime = self.ort;
  if (!ortRuntime?.InferenceSession || !ortRuntime?.Tensor) throw new Error('Pinned ONNX Runtime Web did not initialize');
  ortRuntime.env.wasm.numThreads = 1;
  ortRuntime.env.wasm.proxy = false;
  ortRuntime.env.wasm.wasmPaths = new URL(ORT_ROOT, self.location.href).href;
  ortRuntime.env.logLevel = 'error';
  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ortRuntime.InferenceSession.create(graphBytes, { executionProviders, graphOptimizationLevel: 'all', enableCpuMemArena: true });
  if (webgpu) {
    const device = await ortRuntime.env.webgpu.device;
    const adapter = await ortRuntime.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await releaseSession();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuLabel = device?.adapterInfo?.description || adapter?.info?.description || gpuLabel;
  }
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.fixtureId, language, options.auditTexts) : null;
  let dispatchCount = 0;
  if (options.probe) {
    const hook = webgpu ? dispatchProbe() : null;
    try {
      const probe = await generateText(options.probeText || (language === 'ko' ? '안녕하세요.' : 'A short English speech check.'), route);
      const pcm = probe.parts;
      if (!pcm.length || !pcm.some(part => part.some(value => value !== 0))) throw new Error('Korean TTS capability probe returned no audible PCM');
      const probeSamples = pcm.reduce((sum, part) => sum + part.length, 0);
      if (options.probeText && probeSamples !== profile.fixtureOracle[options.fixtureId].firstSpanSamples) {
        throw new Error(`Korean TTS untimed first-span samples differ from the pinned oracle (${probeSamples} vs ${profile.fixtureOracle[options.fixtureId].firstSpanSamples})`);
      }
    } finally { dispatchCount = hook?.stop() ?? 0; }
    if (webgpu && !dispatchCount) {
      await releaseSession();
      return unsupported('No WebGPU compute dispatch was observed during speech synthesis');
    }
  }
  activeFixture = options.fixtureId;
  activeLanguage = language;
  activeRoute = route;
  return {
    status: 'measured',
    backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: route.name,
    precision: 'FP32',
    gpu: gpuLabel,
    settings: {
      modelId: profile.id, modelRevision: profile.sourceRevision, graphSha256: profile.graphSha256,
      fixtureId: options.fixtureId, language, locale: language, voice: route.name, voiceIndex: route.index,
      frontendMode: route.mode, frontendFingerprint: profile.frontendFingerprint,
      speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, threads: 1,
      runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version, python: '3.12.1', numpy: '1.26.4', nltk: '3.8.1' },
      executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: { gpuDispatchVerified: webgpu ? (options.probe ? dispatchCount > 0 : null) : null,
      ...(webgpu && options.probe && dispatchCount > 0 ? { dispatches: dispatchCount } : {}),
      description: webgpu ? `Observed ${dispatchCount} WebGPU dispatches in the untimed synthesis probe; unsupported operators may fall back to single-thread WASM.` :
        'Pinned ONNX Runtime Web 1.20.1 model inference on explicit single-thread WASM; Pyodide frontend runs locally on CPU.' },
  };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: 'unknown', precision: 'FP32',
    settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !activeFixture || !activeLanguage || !activeRoute) throw new Error('Korean TTS is not initialized');
  const expected = profile.fixtureOracle[activeFixture];
  const generated = await generateText(chunk.text, activeRoute, onFirstPcm);
  const samples = generated.parts.reduce((sum, part) => sum + part.length, 0);
  if (chunk.id === 0 && samples !== expected.firstSpanSamples) {
    throw new Error(`Korean TTS first-span samples differ from the pinned browser oracle (${samples} vs ${expected.firstSpanSamples})`);
  }
  return { parts: generated.parts, sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function releaseSession() {
  const current = session;
  session = null;
  if (current) await current.release();
}

async function dispose() {
  await releaseSession();
  try { phonemize?.destroy?.(); } catch {}
  try { pyodide?.globals?.destroy?.(); } catch {}
  phonemize = null;
  pyodide = null;
  ortRuntime = null;
  config = null;
  activeFixture = null;
  activeLanguage = null;
  activeRoute = null;
  gpuLabel = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await diagnose(data.options);
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Korean TTS worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
