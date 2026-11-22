import { TINY_VOCA_JA_TSUKUYOMI_CHAN as profile } from '../adapters/tiny-voca-ja-tsukuyomi-chan-profile.mjs';
import { fitJapanesePiece, japaneseFinished, japaneseSentences, visitJapanesePieces } from '../tiny-voca-ja-tsukuyomi-chan/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.browserSourceRevision}/`;
const pyodideRoot = '/runtimes/pyodide/314.0.8/';
const ortRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
const info = {
  voice: 'Tsukuyomi-chan (つくよみちゃん)',
  precision: 'Original FP32 ONNX; float64 CPU phase retained',
  settings: {
    language: 'ja', locale: 'ja-JP', voice: profile.voice, voiceIndex: profile.voiceIndex,
    speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate,
    frontend: `pyopenjtalk-plus 0.4.1.post10 / SudachiPy 0.7.0 / SudachiDict-core 20261015; ${profile.frontendFingerprint}`,
    runtimeRelease: 'Pyodide 314.0.8; ONNX Runtime Web 1.31.1',
    waveform: 'Original duration and waveform ONNX graphs with shared external weights; whole-span peak cap 0.99.',
    offlineScenario: profile.offlineSupport.status,
  },
};

const byteCache = new Map();
let pyodide, pythonPhonemizer, ort, durationSession, waveformSession, metadata, activeFixture, activeLanguage;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');

async function checkedBytes(url, expected, label) {
  let response;
  try { response = await fetch(url); } catch (error) { throw new Error(`${label} fetch failed: ${error.message}`); }
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!expected || (expected[0] !== null && bytes.byteLength !== expected[0]) || await sha256(bytes) !== expected[1]) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

async function modelAsset(name) {
  if (byteCache.has(name)) return byteCache.get(name);
  const expected = profile.assetDigests[name];
  if (!expected) throw new Error('Unpinned Tsukuyomi-chan model asset: ' + name);
  const url = new URL(modelRoot + name, self.location.href);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) throw new Error('Tsukuyomi-chan assets must be same-origin model files.');
  const bytes = await checkedBytes(url.href, expected, 'Tsukuyomi-chan asset ' + name);
  byteCache.set(name, bytes);
  return bytes;
}

async function verifiedModelAsset(name, retain = true) {
  if (retain) return modelAsset(name);
  const expected = profile.assetDigests[name] ?? profile.frontendWheelDigests[name];
  if (!expected) throw new Error('Unpinned Tsukuyomi-chan model/runtime wheel: ' + name);
  const url = new URL(modelRoot + name, self.location.href);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) throw new Error('Tsukuyomi-chan assets must be same-origin model files.');
  return checkedBytes(url.href, expected, 'Tsukuyomi-chan frontend wheel ' + name);
}

async function frontendSource(name) {
  const expected = profile.frontendSourceDigests[name];
  if (!expected) throw new Error('Unpinned Japanese frontend source: ' + name);
  const url = new URL('../tiny-voca-ja-tsukuyomi-chan/' + name, import.meta.url);
  const bytes = await checkedBytes(url, expected, 'Japanese frontend source ' + name);
  if (expected[0] !== null && bytes.byteLength !== expected[0]) throw new Error('Japanese frontend source length mismatch: ' + name);
  return bytes;
}

async function runtimeAsset(name) {
  const spec = profile.runtimeAssetDigests[name];
  if (!spec) throw new Error('Tsukuyomi-chan runtime asset lock is incomplete: ' + name);
  return checkedBytes(ortRoot + name, spec, 'ONNX Runtime Web ' + name);
}

async function pyodideAsset(name) {
  const spec = profile.pyodideAssetDigests[name];
  if (!spec) throw new Error('Tsukuyomi-chan Pyodide asset lock is incomplete: ' + name);
  return checkedBytes(pyodideRoot + name, spec, 'Pyodide ' + name);
}

function tensor(type, values, dims) {
  if (type === 'int64') return new ort.Tensor(type, BigInt64Array.from(values, BigInt), dims);
  return new ort.Tensor(type, Float32Array.from(values), dims);
}

function makeInputs(phones, waveform = false) {
  const count = phones.ids.length;
  const inputs = {
    tokens: tensor('int64', phones.ids, [1, count]),
    accent: tensor('int64', phones.accent.flat(), [1, count, 3]),
    phrase_boundary: tensor('int64', phones.phraseBoundary, [1, count]),
    voice: tensor('int64', [profile.voiceIndex], [1]),
    speed: tensor('float32', [1], [1]),
  };
  if (waveform) {
    inputs.pitch_shift = tensor('float32', [0], [1]);
    inputs.pitch_range = tensor('float32', [1], [1]);
  }
  return inputs;
}

async function durationGuard(phones) {
  if (phones.ids.length > profile.maxTokens - 12) throw new Error('Japanese duration guard received an over-budget token sequence.');
  const inputs = makeInputs(phones);
  let outputs;
  try {
    outputs = await durationSession.run(inputs, ['durations']);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Japanese duration graph returned invalid durations.');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (!Number.isSafeInteger(frames) || frames <= 0) throw new Error('Japanese duration graph predicted no frames.');
    return durations;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function synthesize(plan) {
  const inputs = makeInputs(plan.phones, true);
  let outputs;
  try {
    outputs = await waveformSession.run(inputs);
    const actualDurations = Array.from(outputs.durations.data, Number);
    const pcm = Float32Array.from(outputs.audio.data);
    if (actualDurations.length !== plan.durations.length || actualDurations.some((value, index) => value !== plan.durations[index]) ||
        pcm.length !== plan.frames * profile.hop || !pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Original Japanese waveform graph returned invalid or duration-mismatched PCM.');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

const PYTHON_FRONTEND = `
import json
import re, pyopenjtalk
def bench_phonemize(text):
    labels = pyopenjtalk.extract_fullcontext(japanese.normalize(text), **japanese.OPTIONS)
    phones = [match.group(1) for label in labels if (match := re.search(r'-(.*?)\\+.*?/A:', label))]
    if not any(phone not in ('sil', 'pau') for phone in phones):
        return None
    spoken = japanese.from_labels(labels)
    return json.dumps(dict(ids=list(spoken.ids), accent=[list(v) for v in spoken.accent],
                           phraseBoundary=list(spoken.phrase_boundary), unknown=list(spoken.unknown)))
`;

function phonemizeJapanese(text) {
  const json = pythonPhonemizer(text);
  return json === null ? null : JSON.parse(json);
}

async function auditFixture(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error('Tsukuyomi-chan fixture audit needs all Japanese source spans.');
  const rows = [];
  let utterances = 0, maximumTokens = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Tsukuyomi-chan fixture audit received an invalid or reordered source span.');
    const planned = [];
    for (const sentence of japaneseSentences(japaneseFinished(item.text))) {
      planned.push(...await fitJapanesePiece(sentence, phonemizeJapanese, durationGuard));
    }
    if (!planned.length) throw new Error('Tsukuyomi-chan fixture audit found an empty source span.');
    const tuples = planned.map(({ phones }) => {
      if (phones.ids.length > profile.maxTokens - 12 || phones.ids.some(id => !Number.isInteger(id) || id < 0 || id >= metadata.symbols.length) ||
          phones.accent.some(row => row.length !== 3 || row.some(value => !Number.isInteger(value))) ||
          phones.phraseBoundary.some(value => value !== 0 && value !== 1) || phones.unknown.length) {
        throw new Error('Tsukuyomi-chan frontend violated its token/accent/boundary contract.');
      }
      maximumTokens = Math.max(maximumTokens, phones.ids.length);
      utterances++;
      return [phones.ids, phones.accent, phones.phraseBoundary];
    });
    rows.push([item.id, tuples]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || digest !== expected.tokenAccentBoundarySha256) {
    throw new Error(`Tsukuyomi-chan full-fixture frontend parity failed: ${JSON.stringify({ utterances, maximumTokens, digest })}`);
  }
  return { ...expected, tokenAccentBoundarySha256: digest };
}

function unsupported(reason) {
  return { ...info, status: 'unsupported', backendEffective: 'none', reason,
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function loadFrontend(frontendFiles, wheelNames) {
  const { loadPyodide } = await import(pyodideRoot + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: new URL(pyodideRoot, self.location.href).href, fullStdLib: false });
  try {
    await pyodide.loadPackage(['numpy', 'pydantic']);
    await pyodide.loadPackage(wheelNames.map(name => new URL(modelRoot + name, self.location.href).href));
  } catch (error) { throw new Error('Pyodide frontend package load failed: ' + error.message); }
  pyodide.FS.mkdirTree('/frontend');
  for (const [name, bytes] of frontendFiles) pyodide.FS.writeFile('/frontend/' + name, bytes);
  const dictRoot = pyodide.runPython(`
import os, sysconfig
_dict_root = os.path.join(sysconfig.get_paths()['purelib'], 'pyopenjtalk', 'dictionary')
assert os.path.isdir(_dict_root)
_dict_root
`);
  const manifest = JSON.parse(new TextDecoder().decode(await modelAsset('dictionary-assets.json')));
  if (!Array.isArray(manifest.dictionary) || !manifest.assets_base64 || typeof manifest.assets_base64 !== 'object') throw new Error('Invalid pinned Japanese dictionary supplement manifest.');
  const expectedFiles = new Map(manifest.dictionary.map(item => [item.name, item.sha256]));
  const entries = Object.entries(manifest.assets_base64);
  if (entries.length !== 5) throw new Error('Japanese dictionary supplement manifest must contain exactly five files.');
  for (const [name, value] of entries) {
    const expected = expectedFiles.get(name);
    if (!expected || !/^[a-z0-9._-]+$/i.test(name) || typeof value !== 'string') throw new Error('Invalid Japanese dictionary supplement entry.');
    const bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0));
    if (await sha256(bytes) !== expected) throw new Error('Japanese dictionary supplement checksum mismatch: ' + name);
    pyodide.FS.writeFile(dictRoot + '/' + name, bytes);
  }
  pyodide.runPython(`import sys; sys.path.insert(0, '/frontend'); import japanese`);
  pyodide.runPython(PYTHON_FRONTEND);
  pythonPhonemizer = pyodide.globals.get('bench_phonemize');
  if (typeof pythonPhonemizer !== 'function') throw new Error('Japanese Pyodide frontend callable did not initialize.');
  const identity = JSON.parse(pyodide.runPython('import json; json.dumps(japanese.frontend_identity(), ensure_ascii=False)'));
  const fingerprint = pyodide.runPython('japanese.frontend_fingerprint()');
  if (fingerprint !== profile.frontendFingerprint) throw new Error('Japanese WASM frontend fingerprint differs from the pinned native identity.');
  const dependencies = identity.dependencies ?? {};
  if (dependencies.sudachipy !== '0.7.0' || dependencies['sudachidict-core'] !== '20261015' || identity.phonemizer !== 'pyopenjtalk-plus' || identity.version !== '0.4.1.post10') {
    throw new Error('Japanese WASM frontend dependency identity differs from the pinned release.');
  }
  return identity;
}

async function initialize({ backend, probe, probeText, fixtureId, language, auditTexts = [] }) {
  if (fixtureId !== profile.fixtureOracle.fixtureId || language !== 'ja') throw new Error('Tsukuyomi-chan requires ja-article-v1 and Japanese frontend routing.');
  activeFixture = fixtureId; activeLanguage = language;
  if (backend !== 'cpu') return unsupported('The original P1 graph pair is qualified only on the pinned ONNX Runtime Web CPU/WASM route; WebGPU provider assignment fails at /Cast_9.');
  const wheelNames = Object.keys(profile.frontendWheelDigests);
  const [durationBytes, metadataBytes, waveformBytes, weights, frontendPython, frontendText] = await Promise.all([
    modelAsset('model.duration.onnx'), modelAsset('model.json'), modelAsset('model.onnx'), modelAsset('model.weights.bin'),
    frontendSource('japanese.py'), frontendSource('japanese_text.py'),
  ]);
  await Promise.all(wheelNames.map(name => verifiedModelAsset(name, false)));
  await Promise.all(['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip'].map(pyodideAsset));
  await Promise.all(['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'].map(runtimeAsset));
  metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  if (metadata.language !== 'ja' || JSON.stringify(metadata.symbols) !== JSON.stringify(profile.symbols) ||
      metadata.sample_rate !== profile.sampleRate || metadata.hop !== profile.hop || metadata.max_tokens !== profile.maxTokens ||
      metadata.max_frames !== profile.maxFrames || metadata.voices?.[profile.voiceIndex] !== profile.voice ||
      metadata.model_sha256 !== profile.assetDigests['model.onnx'][1] ||
      metadata.duration_model?.file !== 'model.duration.onnx' ||
      metadata.duration_model?.sha256 !== profile.assetDigests['model.duration.onnx'][1] ||
      !Array.isArray(metadata.external_data) || metadata.external_data.length !== 1 ||
      metadata.external_data[0]?.file !== 'model.weights.bin' ||
      metadata.external_data[0]?.bytes !== profile.assetDigests['model.weights.bin'][0] ||
      metadata.external_data[0]?.sha256 !== profile.assetDigests['model.weights.bin'][1]) {
    throw new Error('Tsukuyomi-chan graph metadata differs from the pinned profile.');
  }
  const identity = await loadFrontend([['japanese.py', frontendPython], ['japanese_text.py', frontendText]], wheelNames);
  ort = await import(ortRoot + 'ort.wasm.min.mjs');
  ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.wasm.wasmPaths = ortRoot; ort.env.logLevel = 'error';
  const externalData = [{ path: 'model.weights.bin', data: weights }];
  const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all', externalData };
  durationSession = await ort.InferenceSession.create(durationBytes, options);
  waveformSession = await ort.InferenceSession.create(waveformBytes, options);
  const durationInputs = durationSession.inputNames.slice().sort();
  const waveformInputs = waveformSession.inputNames.slice().sort();
  if (JSON.stringify(durationInputs) !== JSON.stringify(['accent', 'phrase_boundary', 'speed', 'tokens', 'voice']) ||
      JSON.stringify(waveformInputs) !== JSON.stringify(['accent', 'phrase_boundary', 'pitch_range', 'pitch_shift', 'speed', 'tokens', 'voice']) ||
      JSON.stringify(durationSession.outputNames) !== JSON.stringify(['durations']) ||
      JSON.stringify(waveformSession.outputNames) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tsukuyomi-chan original graph input/output contract differs from the pinned P1 release.');
  }
  const fixtureAudit = auditTexts.length ? await auditFixture(auditTexts) : undefined;
  if (probe) {
    const planned = await (async () => {
      const output = [];
      for (const sentence of japaneseSentences(japaneseFinished(probeText || 'これは音声合成の確認です。'))) output.push(...await fitJapanesePiece(sentence, phonemizeJapanese, durationGuard));
      return output;
    })();
    await synthesize(planned[0]);
  }
  byteCache.clear();
  return { ...info, status: 'measured', backendEffective: 'cpu/wasm', settings: {
    ...info.settings, fixtureId, frontendFingerprint: profile.frontendFingerprint,
    frontendIdentity: identity, graphOptimizationLevel: 'all', executionProviders: ['wasm'], threads: 1,
    ...(fixtureAudit ? { fixtureAudit } : {}),
  }, capability: { gpuDispatchVerified: null, description: 'Original FP32 P1 graphs and shared external weights on single-thread ONNX Runtime Web 1.31.1 WASM. The graph retains a float64 phase; WebGPU is unavailable for this original release.' } };
}

async function generate(chunk, onFirst) {
  if (!durationSession || !waveformSession || activeFixture !== profile.fixtureOracle.fixtureId || activeLanguage !== 'ja') throw new Error('Tsukuyomi-chan is not initialized for the Japanese fixture.');
  const parts = [];
  for (const sentence of japaneseSentences(japaneseFinished(chunk.text))) {
    await visitJapanesePieces(sentence, phonemizeJapanese, durationGuard, async plan => {
      parts.push(await synthesize(plan));
    });
  }
  if (!parts.length) throw new Error('Tsukuyomi-chan received a source span with no speakable Japanese text.');
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const wave = new Float32Array(total);
  let offset = 0, loudest = 0;
  for (const part of parts) { wave.set(part, offset); offset += part.length; for (const value of part) loudest = Math.max(loudest, Math.abs(value)); }
  if (!wave.length || !Number.isFinite(loudest) || !wave.every(Number.isFinite)) throw new Error('Tsukuyomi-chan produced invalid PCM.');
  if (loudest > 0.99) for (let i = 0; i < wave.length; i++) wave[i] *= 0.99 / loudest;
  onFirst?.();
  return { parts: [wave], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  await Promise.all([durationSession?.release(), waveformSession?.release()]);
  pythonPhonemizer?.destroy?.();
  pythonPhonemizer = null; durationSession = null; waveformSession = null; ort = null; metadata = null; pyodide = null; activeFixture = null; activeLanguage = null;
  byteCache.clear();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tsukuyomi-chan action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
