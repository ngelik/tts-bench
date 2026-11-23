import {fetchModelAsset} from '../cache-model-asset.mjs';
import {SOBBIE_TTS as profile} from '../adapters/sobbie-tts-profile.mjs';
import {loadSobbieDizione} from '../tiny-voca/sobbie-dizione.mjs';
import {finished, sentences, fit} from '../tiny-voca/sobbie-frontend.mjs';
import {dispatchProbe, hardwareGpu} from './gpu-probe.mjs';

const modelRoot = profile.modelRoot;
const runtimeRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
let ort, session, pyodide, phonemize, activeFixture, activeLanguage, activeVoice, requestedBackend, gpuName;
let dizioneIdentity, numpyVersion;

function sameOriginUrl(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('SobbieTTS assets must be same-origin pinned files');
  return url;
}
async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
}
async function checkedBytes(url, spec, label) {
  const response = await fetchModelAsset(url, profile.sourceRevision, {bufferBeforeCache: true});
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = name => checkedBytes(sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `SobbieTTS ${name}`);
const runtimeAsset = name => checkedBytes(sameOriginUrl(runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), profile.runtimeFiles[name], `ONNX Runtime Web ${name}`);
const pyodideAsset = name => checkedBytes(sameOriginUrl(profile.pyodideRoot, name, '/runtimes/pyodide/0.26.4/'), profile.pyodideFiles[name], `Pyodide ${name}`);

function unsupported(reason) {
  return {status: 'unsupported', reason, backendEffective: 'none', voice: profile.defaultVoice, precision: profile.precision,
    settings: {modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, language: profile.language, locale: profile.locale,
      supportedLanguages: [profile.language], voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex},
    capability: {gpuDispatchVerified: false, description: reason}};
}
function validateConfig(config, modelJson) {
  const model = config.model;
  const expectedInputs = ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'];
  const expectedOutputs = ['audio', 'durations'];
  const symbols = modelJson.symbols;
  if (!model || config.sample_rate !== profile.sampleRate || config.hop !== profile.hop ||
      model.sample_rate !== profile.sampleRate || model.hop !== profile.hop || model.max_tokens !== profile.maxTokens ||
      model.max_frames !== profile.maxFrames || config.step !== profile.configStep || modelJson.step !== profile.onnxMetadataStep ||
      JSON.stringify(config.voices) !== JSON.stringify(['F', 'M']) ||
      JSON.stringify(model.speakers) !== JSON.stringify(['F2', 'M2']) || model.vocab_size !== 76 ||
      symbols.length !== 76 ||
      JSON.stringify(config.phonemizer) !== JSON.stringify({name: 'dizione', version: 4, fingerprint: profile.dizioneConfigFingerprint}) ||
      JSON.stringify(modelJson.voices) !== JSON.stringify(config.voices) ||
      JSON.stringify(modelJson.symbols) !== JSON.stringify(symbols) || modelJson.max_tokens !== profile.maxTokens ||
      modelJson.max_frames !== profile.maxFrames || modelJson.frontend !== 'dizione' ||
      modelJson.frontend_fingerprint !== profile.dizioneConfigFingerprint ||
      JSON.stringify(modelJson.inputs) !== JSON.stringify(expectedInputs) || JSON.stringify(modelJson.outputs) !== JSON.stringify(expectedOutputs) ||
      JSON.stringify(config.onnx?.inputs) !== JSON.stringify(expectedInputs) || JSON.stringify(config.onnx?.outputs) !== JSON.stringify(expectedOutputs)) {
    throw new Error('SobbieTTS model config differs from the pinned release metadata');
  }
  if (JSON.stringify(symbols.slice(0, 17)) !== JSON.stringify(['<pad>', '<bos>', '<eos>', '<sp>', '<unk>', ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…'])) {
    throw new Error('SobbieTTS release symbol order differs from the checkpoint token contract');
  }
}
function phonemizeText(text) {
  const result = JSON.parse(phonemize(text));
  if (result === null) return null;
  if (!Array.isArray(result.ids) || !Array.isArray(result.stress) || result.ids.length !== result.stress.length ||
      result.ids.some(id => !Number.isSafeInteger(id) || id < 0 || id >= 76) ||
      result.stress.some(value => !Number.isSafeInteger(value) || value < 0 || value > 2)) {
    throw new Error('Pinned Dizione frontend returned invalid IDs or stress values');
  }
  return result;
}
function plansForText(text) {
  const complete = finished(text);
  const sentenceList = sentences(complete);
  let droppedSentences = 0;
  const plans = sentenceList.flatMap(sentence => {
    const fitted = fit(sentence, phonemizeText, profile.maxTokens);
    if (!fitted.length) droppedSentences++;
    return fitted;
  });
  return {plans, sentenceCount: sentenceList.length, droppedSentences};
}
function validatePlan(plan) {
  if (!plan || plan.ids.length < 2 || plan.ids.length > profile.tokenLimit || plan.ids.length !== plan.stress.length) {
    throw new Error('SobbieTTS fitted token/stress plan is outside the publisher limit');
  }
  if (plan.ids.includes(4)) throw new Error('SobbieTTS Dizione returned an unknown phone for the English fixture');
}
async function runGraph(plan, measureDispatch = false) {
  validatePlan(plan);
  const shape = [1, plan.ids.length];
  const feeds = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(plan.ids, BigInt), shape),
    stress: new ort.Tensor('int64', BigInt64Array.from(plan.stress, BigInt), shape),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  const hook = measureDispatch && requestedBackend === 'webgpu' ? dispatchProbe() : null;
  let outputs, dispatches = 0;
  try {
    outputs = await session.run(feeds);
    const [audioData, durationData] = await Promise.all([outputs.audio.getData(), outputs.durations.getData()]);
    const durations = Array.from(durationData, Number);
    if (durations.length !== plan.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('SobbieTTS graph returned invalid duration values');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    const samples = Float32Array.from(audioData);
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames || sampleCount !== samples.length ||
        !samples.length || !samples.some(value => value !== 0) || !samples.every(Number.isFinite)) {
      throw new Error('SobbieTTS graph returned invalid, empty, non-finite or duration-mismatched PCM');
    }
    dispatches = hook?.stop() ?? 0;
    return {samples, durations, frames, dispatches};
  } finally {
    hook?.stop();
    for (const tensor of [...Object.values(feeds), ...Object.values(outputs ?? {})]) tensor.dispose?.();
  }
}
async function renderSpan(text, onFirstPcm, measureDispatch = false) {
  const {plans, sentenceCount, droppedSentences} = plansForText(text);
  if (!plans.length) throw new Error('SobbieTTS received no fitted English utterance for this source span');
  const pieces = [];
  let dispatches = 0;
  for (const plan of plans) {
    const result = await runGraph(plan, measureDispatch);
    pieces.push(result.samples);
    dispatches += result.dispatches;
    onFirstPcm?.(); onFirstPcm = null;
  }
  const joined = new Float32Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  let offset = 0, peak = 0;
  for (const piece of pieces) { joined.set(piece, offset); offset += piece.length; }
  for (const sample of joined) {
    if (!Number.isFinite(sample)) throw new Error('SobbieTTS source-span PCM contains non-finite samples');
    peak = Math.max(peak, Math.abs(sample));
  }
  if (!joined.length || peak === 0) throw new Error('SobbieTTS source span returned empty or silent PCM');
  if (peak > profile.peak) {
    const scale = profile.peak / peak;
    for (let index = 0; index < joined.length; index++) joined[index] *= scale;
  }
  let peakAfterCap = 0;
  for (const sample of joined) peakAfterCap = Math.max(peakAfterCap, Math.abs(sample));
  return {pcm: joined, peak, peakAfterCap, sentenceCount, utterances: plans.length, droppedSentences, dispatches,
    tokenPlans: plans.map(({ids, stress}) => ({ids, stress}))};
}
async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== 93) throw new Error('SobbieTTS audit requires all 93 canonical English source spans');
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownTokens = 0, droppedSentences = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('SobbieTTS audit spans must be nonempty and in original order');
    const {plans, sentenceCount, droppedSentences: dropped} = plansForText(item.text);
    if (!plans.length && /[\p{L}\p{N}]/u.test(item.text)) throw new Error(`SobbieTTS fixture span ${index} produced no fitted utterance`);
    const phones = plans.map(plan => {
      validatePlan(plan);
      maximumTokens = Math.max(maximumTokens, plan.ids.length); utterances++;
      unknownTokens += plan.ids.filter(id => id === 4).length;
      return [plan.ids, plan.stress];
    });
    droppedSentences += dropped;
    rows.push([item.id, {sentenceCount, phones}]);
  }
  return {fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, utterances,
    maximumTokens, unknownTokens, droppedSentences,
    tokenStressSha256: await sha256(new TextEncoder().encode(JSON.stringify(rows)))};
}
function makeRuntime(backend) {
  const webgpu = backend === 'webgpu';
  const filename = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  return import(sameOriginUrl(runtimeRoot, filename, '/runtimes/onnxruntime-web-pocket/').href).then(module => {
    module.env.wasm.numThreads = 1;
    module.env.wasm.proxy = false;
    module.env.wasm.wasmPaths = webgpu ? {
      mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    } : {
      mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    };
    module.env.logLevel = 'error';
    return module;
  });
}
async function validatePyodideLock(bytes) {
  const lock = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  const numpy = lock.packages?.numpy;
  if (numpy?.version !== profile.numpyVersion || numpy.file_name !== 'numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl' ||
      numpy.sha256 !== profile.pyodideFiles[numpy.file_name]?.sha256) throw new Error('Pinned Pyodide lock does not select the required NumPy wheel');
}
async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('SobbieTTS requires an explicit CPU or WebGPU backend');
  if (options.fixtureId !== profile.fixtureId || (options.language !== undefined && options.language !== profile.language)) {
    return unsupported('SobbieTTS supports the canonical English fixture english-20k-v1.');
  }
  if (options.voice && options.voice !== profile.defaultVoice) return unsupported('This SobbieTTS route is pinned to publisher default voice F (index 0).');
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('English fixture hash differs from the pinned canonical identity');
  requestedBackend = options.backend;
  activeFixture = options.fixtureId; activeLanguage = profile.language; activeVoice = profile.defaultVoice;
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or a software fallback adapter was selected; choose the CPU/WASM route.');
  }
  const runtimeNames = requestedBackend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [graphBytes, configBytes, modelJsonBytes, lockBytes] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('config.json'), modelAsset('model.json'), pyodideAsset('pyodide-lock.json'),
    ...runtimeNames.map(runtimeAsset), ...Object.keys(profile.pyodideFiles).map(pyodideAsset),
  ]).then(([graph, config, modelJson, pyodideLock]) => [graph, config, modelJson, pyodideLock]);
  await validatePyodideLock(lockBytes);
  const config = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(configBytes));
  const modelJson = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(modelJsonBytes));
  validateConfig(config, modelJson);
  const loadedDizione = await loadSobbieDizione({profile, modelAsset, pyodideAsset});
  pyodide = loadedDizione.pyodide; phonemize = loadedDizione.phonemize;
  numpyVersion = loadedDizione.numpyVersion; dizioneIdentity = loadedDizione.identity;
  if (JSON.stringify(loadedDizione.symbols) !== JSON.stringify(modelJson.symbols)) throw new Error('Pinned Dizione and Sobbie release symbol inventories differ');
  const warmup = phonemizeText('Warm up.');
  if (!warmup || warmup.ids.length !== warmup.stress.length || warmup.ids.length > profile.tokenLimit || warmup.ids.includes(4)) {
    throw new Error('Pinned Dizione frontend warm-up failed its token contract');
  }
  const graph = graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength);
  ort = await makeRuntime(requestedBackend);
  const executionProviders = requestedBackend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graph, {executionProviders, graphOptimizationLevel: 'all'});
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.onnx.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(config.onnx.outputs)) {
    throw new Error('SobbieTTS graph tensor names differ from the pinned release contract');
  }
  if (requestedBackend === 'webgpu') {
    const device = await ort.env.webgpu.device, adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter.');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  let probeDispatches = 0;
  if (options.probe) {
    const probe = await renderSpan(options.probeText || 'Hello.', null, requestedBackend === 'webgpu');
    probeDispatches = probe.dispatches;
    if (requestedBackend === 'webgpu' && probeDispatches < 1) {
      await dispose();
      return unsupported('No hardware WebGPU compute dispatch was observed during the untimed SobbieTTS probe.');
    }
  }
  return {
    status: 'measured', backendEffective: requestedBackend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice, precision: profile.precision, gpu: gpuName,
    settings: {modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: profile.language, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit, maxFrames: profile.maxFrames,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange, peak: profile.peak,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      configFrontendFingerprint: profile.dizioneConfigFingerprint, dizioneRevision: profile.dizioneRevision,
      dizioneIdentity, runtimeVersions: {onnxruntimeWeb: profile.runtimeVersion, pyodide: profile.pyodideVersion, numpy: numpyVersion},
      runtimePackage: profile.runtimePackage, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders, wasmThreads: 1, graphOptimizationLevel: 'all',
      audio: 'Publisher sentence-at-a-time graph calls; direct source-order concatenation; one 0.99 peak cap on each complete source span.',
      ...(fixtureAudit ? {fixtureAudit} : {})},
    capability: {gpuDispatchVerified: requestedBackend === 'webgpu' ? (options.probe ? probeDispatches > 0 : null) : null,
      ...(requestedBackend === 'webgpu' && options.probe ? {dispatches: probeDispatches} : {}),
      description: requestedBackend === 'webgpu'
        ? `Observed ${probeDispatches} hardware WebGPU compute dispatches in an untimed probe; WASM remains the declared fallback for unsupported graph operators.`
        : 'Explicit one-thread ONNX Runtime Web 1.31.1 WASM CPU route; pinned Dizione frontend uses local Pyodide 0.26.4 and NumPy 1.26.4.'},
  };
}
async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('SobbieTTS worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid SobbieTTS source span');
  if (chunk.id < 0 || chunk.id >= 93) throw new Error('SobbieTTS source span ID is outside the canonical fixture');
  const result = await renderSpan(chunk.text, onFirstPcm);
  return {parts: [result.pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id};
}
async function diagnostic(options = {}) {
  if (!session) throw new Error('SobbieTTS worker is not initialized');
  if (typeof options.text !== 'string' || !options.text.trim()) throw new Error('SobbieTTS diagnostic needs nonempty English text');
  const result = await renderSpan(options.text);
  return {fixtureId: options.fixtureId ?? activeFixture, language: activeLanguage, voice: activeVoice,
    sampleRate: profile.sampleRate, samples: result.pcm.length, sentences: result.sentenceCount,
    utterances: result.utterances, droppedSentences: result.droppedSentences, peakAfterCap: result.peakAfterCap};
}
async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  try { phonemize?.destroy?.(); } catch {}
  try { pyodide?.globals?.destroy?.(); } catch {}
  ort = pyodide = phonemize = dizioneIdentity = numpyVersion = null;
  activeFixture = activeLanguage = activeVoice = requestedBackend = gpuName = null;
}
self.onmessage = async ({data}) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({id: data.id, event: 'first-pcm'}));
    else if (data.action === 'diagnostic') value = await diagnostic(data.options ?? {});
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown SobbieTTS worker action');
    self.postMessage({id: data.id, value}, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch { /* retain the initialization error */ } }
    self.postMessage({id: data.id, error: String(error?.message ?? error)});
  }
};
