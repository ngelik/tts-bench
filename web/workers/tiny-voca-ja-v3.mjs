import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { TINY_VOCA_JA_V3 as profile } from '../adapters/tiny-voca-ja-v3-profile.mjs';
import { fitEnglishPiece, visitJapanesePieces, englishFinished, englishSentences, loadJapaneseBoundaries } from '../tiny-voca-ja-v3/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.browserSourceRevision}/`;
const pyodideRoot = '/runtimes/pyodide/314.0.8/';
const ortRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
const espeakRoot = '/runtimes/espeak-ng/tiny-voca-ja-1.52.0/';
const info = {
  voice: 'F2 (Japanese and American English)', precision: profile.precision,
  settings: { language: 'ja', voice: profile.voice, voiceIndex: profile.voiceIndex,
    speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate,
    frontend: `pyopenjtalk-plus 0.4.1.post10 (ja) / ${profile.englishFrontendVersion} ${profile.englishVoice} (en); ${profile.releasedFrontend.fingerprint}`,
    runtimeRelease: 'Pyodide 314.0.8; ONNX Runtime Web 1.31.1',
    waveform: 'Original FP32 graph; graph output length must equal duration frames × 256; one peak cap is applied to the complete source span; no seed input.',
    optionalNaniPredictor: 'ONNX Runtime was unavailable in the native parity environment and is not included in this browser profile; pyopenjtalk-plus g2p_prosody uses its package fallback (including for 何).',
    releasedFingerprintDisclosure: profile.releasedFrontend.note,
  },
};

let pyodide, pyJapanese, pyEnglish, espeak, espeakCallbackRegistered = false, ort, session, metadata, gpuName, activeLanguage;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function checkedBytes(url, spec, label) {
  let response;
  try { response = await fetch(url); } catch (error) { throw new Error(`${label} fetch failed: ${error.message}`); }
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}

async function localBytes(path, spec, label) {
  const url = new URL(path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
    throw new Error(`${label} must be fetched from the same-origin pinned asset tree.`);
  }
  return checkedBytes(url.href, spec, label);
}

async function modelAsset(name) {
  const expected = profile.assets[name];
  if (!expected) throw new Error('Unpinned Tiny Voca Japanese v3 model asset: ' + name);
  return localBytes(modelRoot + name, expected, 'Tiny Voca Japanese v3 asset ' + name);
}

async function modelWheel(name) {
  const spec = profile.frontendWheelDigests[name];
  if (!spec) throw new Error('Unpinned Tiny Voca Japanese v3 frontend wheel: ' + name);
  return localBytes(modelRoot + name, spec, 'Tiny Voca Japanese v3 frontend wheel ' + name);
}

async function sourceFile(name) {
  const spec = profile.frontendSourceDigests[name];
  if (!spec) throw new Error('Unpinned Tiny Voca v3 frontend source: ' + name);
  const url = new URL('../tiny-voca-ja-v3/' + name, import.meta.url);
  return checkedBytes(url, spec, 'Tiny Voca v3 frontend source ' + name);
}

async function pyodideFile(name) {
  return localBytes(pyodideRoot + name, profile.pyodideAssets[name], 'Pyodide ' + name);
}

async function runtimeFile(name, expected, root = ortRoot) {
  return localBytes(root + name, expected, 'Tiny Voca v3 runtime ' + name);
}

async function loadEspeak() {
  const pins = profile.espeakAssets;
  const [moduleBytes, wasmBinary, data] = await Promise.all([
    runtimeFile('espeak-quiet.mjs', pins['espeak-quiet.mjs'], espeakRoot),
    runtimeFile('espeak-quiet.wasm', pins['espeak-quiet.wasm'], espeakRoot),
    runtimeFile('espeak-quiet.data', pins['espeak-quiet.data'], espeakRoot),
  ]);
  const moduleUrl = new URL(espeakRoot + 'espeak-quiet.mjs', self.location.href).href;
  const createEspeak = (await import(moduleUrl)).default;
  if (typeof createEspeak !== 'function') throw new Error('Pinned eSpeak NG ESM factory is unavailable.');
  espeak = await createEspeak({ wasmBinary, getPreloadedPackage: () => data.buffer });
  const initialized = espeak.ccall('bench_espeak_init', 'number', ['string'], ['/data']);
  if (initialized !== 0) throw new Error('Pinned eSpeak NG en-us frontend failed to initialize.');
  const version = espeak.ccall('bench_espeak_version', 'string', [], []);
  if (!String(version).includes('1.52.0')) throw new Error('eSpeak NG runtime version differs from pinned 1.52.0.');
  if (!moduleBytes.length) throw new Error('Pinned eSpeak NG runtime module is empty.');
}

async function loadFrontend(wheelNames, sourceFiles) {
  const { loadPyodide } = await import(pyodideRoot + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: new URL(pyodideRoot, self.location.href).href, fullStdLib: false });
  if (wheelNames.length) {
    const packageUrls = wheelNames.map(name => new URL(modelRoot + name, self.location.href).href);
    try {
      await pyodide.loadPackage(['numpy', 'pydantic']);
      await pyodide.loadPackage(packageUrls);
    } catch (error) { throw new Error('Tiny Voca v3 Japanese Pyodide frontend packages failed to load: ' + error.message); }
  }
  pyodide.FS.mkdirTree('/frontend/experiments/frontend-swap');
  pyodide.FS.mkdirTree('/frontend/src/tiny_voca');
  if (wheelNames.length) pyodide.FS.writeFile('/frontend/experiments/frontend-swap/oj_frontend.py', sourceFiles.get('oj_frontend.py'));
  pyodide.FS.writeFile('/frontend/src/tiny_voca/text.py', sourceFiles.get('text.py'));
  pyodide.FS.writeFile('/frontend/src/tiny_voca/__init__.py', '');
  pyodide.runPython("import sys; sys.path[:0] = ['/frontend/src', '/frontend/experiments/frontend-swap']; import tiny_voca.text as tiny_text");
  if (wheelNames.length) pyodide.runPython('import oj_frontend');
  else await loadEspeak();
  if (espeak) {
    pyodide.globals.set('bench_espeak_trace', text => espeak.ccall('bench_espeak_trace', 'string', ['string'], [text]));
    espeakCallbackRegistered = true;
  }
  const japanesePython = `
import json
def _bench_phonemize_ja(text):
    value = oj_frontend.phonemize_oj(text)
    return json.dumps(dict(ids=list(value.ids), stress=list(value.stress), unknown=list(value.unknown)), ensure_ascii=False)
`;
  const englishPython = `
import json

def _bench_phonemize_en(text):
    pieces = []
    for punctuation, piece in tiny_text.chunks(tiny_text.normalize_text(text)):
        if punctuation:
            pieces.append((True, piece))
        else:
            trace = bench_espeak_trace(piece)
            if trace is None:
                raise RuntimeError('eSpeak NG returned no phoneme trace')
            pieces.append((False, tiny_text.parse_espeak(trace)))
    try:
        value = tiny_text.tokenize(pieces)
    except tiny_text.NothingToPronounce:
        return None
    return json.dumps(dict(ids=list(value.ids), stress=list(value.stress), unknown=list(value.unknown)), ensure_ascii=False)
`;
  pyodide.runPython(wheelNames.length ? japanesePython : englishPython);
  if (wheelNames.length) {
    pyJapanese = pyodide.globals.get('_bench_phonemize_ja');
    const wheelVersion = pyodide.runPython("import importlib.metadata; importlib.metadata.version('pyopenjtalk-plus')");
    if (wheelVersion !== '0.4.1.post10') throw new Error('Tiny Voca v3 requires pyopenjtalk-plus 0.4.1.post10.');
  } else pyEnglish = pyodide.globals.get('_bench_phonemize_en');
}

function phonemize(language, text) {
  if (language !== activeLanguage) throw new Error(`Tiny Voca v3 fixture language changed from ${activeLanguage} to ${language}.`);
  const frontend = language === 'ja' ? pyJapanese : pyEnglish;
  if (typeof frontend !== 'function') throw new Error(`Tiny Voca v3 ${language} frontend was not initialized.`);
  const result = frontend(text);
  return result === null ? null : JSON.parse(result);
}

function idsTensor(values) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
}
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

async function synthesize(plan) {
  const inputs = {
    tokens: idsTensor(plan.phones.ids), stress: idsTensor(plan.phones.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.voiceIndex)), [1]),
    speed: scalar(1), pitch_shift: scalar(0), pitch_range: scalar(1),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== plan.phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Voca v3 graph returned invalid duration values.');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const samples = frames * profile.hop;
    const source = outputs.audio.data;
    if (!Number.isSafeInteger(samples) || samples < 1 || frames > profile.maxFrames || source.length < samples) {
      throw new Error('Tiny Voca v3 graph returned output outside the pinned duration/frame bounds.');
    }
    if (source.length !== samples) throw new Error('Tiny Voca v3 graph output length differs from its duration tensor.');
    const pcm = Float32Array.from(source);
    if (pcm.length !== samples || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) throw new Error('Tiny Voca v3 graph returned invalid or silent PCM.');
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function collectPlans(language, text) {
  const plans = [];
  const accept = plan => plans.push(plan);
  if (language === 'ja') {
    const { japaneseFinished, japaneseSentences } = await loadJapaneseBoundaries();
    for (const sentence of japaneseSentences(japaneseFinished(text))) {
      await visitJapanesePieces(sentence, part => phonemize('ja', part), accept, { maxTokens: profile.maxTokens - 12 });
    }
  } else {
    for (const sentence of englishSentences(englishFinished(text))) {
      await fitEnglishPiece(sentence, part => phonemize('en', part), accept, { maxTokens: profile.maxTokens - 12 });
    }
  }
  return plans;
}

async function auditFixture(language, auditTexts) {
  const expected = language === 'ja' ? profile.fixtureOracle : profile.englishFixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error(`Tiny Voca v3 ${language} fixture audit received the wrong number of source spans.`);
  const rows = [];
  const unknown = [];
  let utterances = 0, maximumTokens = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Tiny Voca v3 fixture audit received invalid or reordered source text.');
    const plans = await collectPlans(language, item.text);
    if (!plans.length) throw new Error(`Tiny Voca v3 ${language} frontend returned no utterances for fixture span ${item.id}.`);
    const tuples = plans.map(({ phones }) => {
      if (phones.ids.length !== phones.stress.length || phones.ids.length < 3 ||
          phones.ids.some(id => !Number.isInteger(id) || id < 0 || id >= metadata.symbols.length) ||
          phones.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Tiny Voca v3 ${language} frontend violated the graph token/stress contract.`);
      }
      maximumTokens = Math.max(maximumTokens, phones.ids.length);
      utterances++;
      return [phones.ids, phones.stress];
    });
    const badPhones = plans.flatMap(({ phones }) => phones.unknown ?? []);
    if (badPhones.length) unknown.push({ id: item.id, phones: badPhones });
    rows.push([item.id, tuples]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const expectedUnknown = expected.unknown.map(({ id, phones }) => ({ id, phones: [...phones] }));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || digest !== expected.tokenStressSha256 ||
      JSON.stringify(unknown) !== JSON.stringify(expectedUnknown)) {
    throw new Error(`Tiny Voca v3 ${language} native frontend parity mismatch: ${JSON.stringify({ utterances, maximumTokens, digest, unknown })}`);
  }
  return { fixtureId: expected.fixtureId, spans: rows.length, utterances, maximumTokens, tokenStressSha256: digest, unknown };
}

async function generate(chunk, onFirst) {
  const language = activeLanguage;
  if (!['ja', 'en'].includes(language)) throw new Error('Tiny Voca Japanese v3 supports only ja and en fixture routing.');
  const parts = [];
  const accept = async plan => parts.push(await synthesize(plan));
  if (language === 'ja') {
    const { japaneseFinished, japaneseSentences } = await loadJapaneseBoundaries();
    for (const sentence of japaneseSentences(japaneseFinished(chunk.text))) {
      await visitJapanesePieces(sentence, piece => phonemize('ja', piece), accept, { maxTokens: profile.maxTokens - 12 });
    }
  } else {
    for (const sentence of englishSentences(englishFinished(chunk.text))) {
      await fitEnglishPiece(sentence, piece => phonemize('en', piece), accept, { maxTokens: profile.maxTokens - 12 });
    }
  }
  if (!parts.length) throw new Error('Tiny Voca v3 returned no audio for source span ' + chunk.id);
  const samples = parts.reduce((sum, part) => sum + part.length, 0);
  const pcm = new Float32Array(samples);
  let offset = 0, peak = 0;
  for (const part of parts) {
    pcm.set(part, offset);
    offset += part.length;
    for (const value of part) peak = Math.max(peak, Math.abs(value));
  }
  if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) throw new Error('Tiny Voca v3 returned empty, nonfinite or silent source-span PCM.');
  if (peak > 0.99) {
    const gain = 0.99 / peak;
    for (let index = 0; index < pcm.length; index++) pcm[index] *= gain;
  }
  onFirst?.();
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

function unsupported(reason) {
  return { ...info, status: 'unsupported', backendEffective: 'none', reason,
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize({ backend, probe, probeText, fixtureId, language, auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Tiny Voca Japanese v3 supports CPU/WASM or WebGPU/WASM.');
  const languageForFixture = fixtureId === 'ja-article-v1' ? 'ja' : fixtureId === 'english-20k-v1' ? 'en' : null;
  if (!languageForFixture || language !== languageForFixture) throw new Error('Tiny Voca Japanese v3 requires ja-article-v1 or english-20k-v1 with matching language routing.');
  activeLanguage = languageForFixture;
  const gpuMode = backend === 'webgpu';
  if (gpuMode) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable; software fallback adapters are excluded.');
  }
  const wheelNames = languageForFixture === 'ja' ? Object.keys(profile.frontendWheelDigests) : [];
  const pyodideRuntimeNames = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip'];
  const pyodidePackageNames = languageForFixture === 'ja'
    ? ['numpy-2.4.6-cp314-cp314-pyemscripten_2026_0_wasm32.whl', 'pydantic-2.12.5-py3-none-any.whl',
      'pydantic_core-2.41.5-cp314-cp314-pyemscripten_2026_0_wasm32.whl', 'annotated_types-0.7.0-py3-none-any.whl',
      'typing_extensions-4.15.0-py3-none-any.whl', 'typing_inspection-0.4.2-py3-none-any.whl'] : [];
  const ortNames = gpuMode
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, configBytes, sourceFrontend, sourceText] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('model.json'), modelAsset('config.json'),
    ...(languageForFixture === 'ja' ? [sourceFile('oj_frontend.py')] : [Promise.resolve(new Uint8Array())]), sourceFile('text.py'),
    ...wheelNames.map(modelWheel),
    ...pyodideRuntimeNames.map(pyodideFile),
    ...pyodidePackageNames.map(pyodideFile),
    ...ortNames.map(name => runtimeFile(name, profile.runtimeAssets[name])),
  ]);
  metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  const config = JSON.parse(new TextDecoder().decode(configBytes));
  if (metadata.frontend !== profile.releasedFrontend.version || metadata.frontend_fingerprint !== profile.releasedFrontend.fingerprint ||
      metadata.sample_rate !== profile.sampleRate || metadata.hop !== profile.hop || metadata.max_tokens !== profile.maxTokens ||
      metadata.max_frames !== profile.maxFrames || metadata.voices?.[profile.voiceIndex] !== profile.voice ||
      JSON.stringify(metadata.symbols) !== JSON.stringify(profile.symbols) ||
      JSON.stringify(metadata.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(metadata.outputs) !== JSON.stringify(['audio', 'durations']) ||
      config.frontend?.fingerprint !== profile.releasedFrontend.fingerprint || config.step !== 134000) {
    throw new Error('Tiny Voca v3 model metadata does not match the pinned model and frontend identity.');
  }
  await loadFrontend(wheelNames, new Map([['oj_frontend.py', sourceFrontend], ['text.py', sourceText]]));
  ort = await import(ortRoot + ortNames[0]);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = gpuMode ? {
    mjs: ortRoot + 'ort-wasm-simd-threaded.asyncify.mjs',
    wasm: ortRoot + 'ort-wasm-simd-threaded.asyncify.wasm',
  } : ortRoot;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, { executionProviders: gpuMode ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all' });
  const fixtureAudit = auditTexts.length ? await auditFixture(languageForFixture, auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const sample = await generate({ id: 'probe', language: languageForFixture, text: probeText || (languageForFixture === 'ja' ? '短い音声テストです。' : 'A short speech test.') });
      if (!sample.parts.length) throw new Error('Tiny Voca v3 capability probe returned no audio.');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (gpuMode && probe && !dispatches) return unsupported('No WebGPU compute dispatch was observed during original graph synthesis.');
  return { ...info, status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...info.settings, language: languageForFixture, fixtureId, executionProviders: gpuMode ? ['webgpu', 'wasm'] : ['wasm'], ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null,
      description: gpuMode ? `Observed ${dispatches} WebGPU compute dispatches during untimed original graph synthesis; unsupported operators may run through WASM.` : 'Original FP32 ONNX graph with explicit single-thread WASM inference.' } };
}

async function dispose() {
  await session?.release();
  session = null;
  pyJapanese?.destroy?.(); pyJapanese = null;
  pyEnglish?.destroy?.(); pyEnglish = null;
  if (espeakCallbackRegistered) pyodide?.globals?.delete?.('bench_espeak_trace');
  espeakCallbackRegistered = false;
  espeak?._bench_espeak_dispose?.();
  espeak = null; pyodide = null; ort = null; metadata = null; gpuName = null; activeLanguage = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Japanese v3 action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
