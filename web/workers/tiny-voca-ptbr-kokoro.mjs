import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_PTBR_KOKORO as profile } from '../adapters/tiny-voca-ptbr-kokoro-profile.mjs';
import { SYMBOLS, frontendFingerprint, phonemize } from '../tiny-voca-ptbr-kokoro/frontend.mjs';
import { createVoice, planText, TRAINED_ESPEAK_RELEASE } from '../tiny-voca-ptbr-kokoro/voice.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
let ort, session, voiceEngine, metadata, activeVoice, activeFixture, activeLanguage, backend, gpuName, espeakModule;

function sameOriginUrl(root, path, requiredPrefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(requiredPrefix)) throw new Error('Tiny Voca pt-BR Kokoro assets must be same-origin pinned files');
  return url;
}
async function checkedBytes(url, spec, label) {
  const response = await fetchModelAsset(url, profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = name => checkedBytes(sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `Tiny Voca pt-BR Kokoro ${name}`);
const espeakAsset = name => checkedBytes(sameOriginUrl(profile.espeakRoot, name, '/runtimes/espeak-ng/'), profile.espeakAssets[name], `eSpeak NG 1.51 ${name}`);
const ortAsset = name => checkedBytes(sameOriginUrl(profile.runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), profile.runtimeFiles[name], `ONNX Runtime Web ${name}`);

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || value.step !== profile.step || value.frontend !== 'espeak' ||
      value.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(value.voices) !== JSON.stringify(['F', 'M']) ||
      JSON.stringify(value.symbols) !== JSON.stringify(SYMBOLS) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tiny Voca pt-BR Kokoro metadata differs from the pinned checkpoint profile');
  }
}
function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice, precision: profile.precision,
    settings: { language: profile.language, locale: profile.locale, supportedLanguages: [profile.language] },
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function auditFixture(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error(`Tiny Voca pt-BR Kokoro audit requires ${expected.spans} ordered fixture spans`);
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  const phonemizeText = piece => phonemize(piece, rawEspeak);
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid or reordered Tiny Voca pt-BR Kokoro fixture span ${id}`);
    const plans = await planText(item.text, { maxTokens: profile.maxTokens, phonemizeText });
    if (!plans.length) throw new Error(`Tiny Voca pt-BR Kokoro front end returned no utterance for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= metadata.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) throw new Error(`Invalid token/stress output in fixture span ${id}`);
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownTokens += plan.ids.filter(value => value === 4).length;
      return [plan.ids, plan.stress];
    });
    rows.push([id, tuples]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || unknownTokens !== expected.unknownTokens || tokenStressSha256 !== expected.tokenStressSha256) {
    throw new Error('Tiny Voca pt-BR Kokoro frontend parity mismatch: ' + JSON.stringify({ spans: rows.length, utterances, maximumTokens, unknownTokens, tokenStressSha256 }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, utterances, maximumTokens, unknownTokens, tokenStressSha256 };
}

function rawEspeak(input) {
  if (!espeakModule) throw new Error('eSpeak NG 1.51 is not initialized');
  return espeakModule.ccall('bench_espeak_trace', 'string', ['string'], [input.replace(/\n+$/u, '') + '\n']);
}
async function initializeEspeak() {
  const url = sameOriginUrl(profile.espeakRoot, 'espeak-quiet.mjs', '/runtimes/espeak-ng/');
  const initialized = await (await import(url.href)).default({ locateFile: name => sameOriginUrl(profile.espeakRoot, name, '/runtimes/espeak-ng/').href });
  const result = initialized.ccall('bench_espeak_init', 'number', ['string'], ['/data']);
  if (result !== 0) throw new Error(`Unable to initialize eSpeak NG (${result})`);
  const version = initialized.ccall('bench_espeak_version', 'string', [], []);
  if (version !== TRAINED_ESPEAK_RELEASE) {
    initialized.ccall('bench_espeak_dispose', null, [], []);
    throw new Error(`Tiny Voca pt-BR Kokoro requires eSpeak NG ${TRAINED_ESPEAK_RELEASE}; browser runtime reported ${version}`);
  }
  espeakModule = initialized;
  return version;
}
async function probe(text) {
  const result = await voiceEngine.speak(text);
  if (!result.audio.length || !result.audio.some(sample => sample !== 0)) throw new Error('Tiny Voca pt-BR Kokoro probe returned no PCM');
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca pt-BR Kokoro requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) return unsupported('Tiny Voca pt-BR Kokoro supports only the pt-br-article-v1 fixture in pt-BR.');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = profile.voices.find(voice => voice.id === (options.voice || profile.defaultVoice));
  if (!activeVoice) throw new Error(`Unsupported Tiny Voca pt-BR Kokoro voice: ${options.voice}`);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }

  const runtimeNames = webgpu
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, voicesBytes] = await Promise.all([
    modelAsset('models/tiny-voca-ptbr.onnx'), modelAsset('models/tiny-voca-ptbr.json'), modelAsset('models/voices.json'),
    ...Object.keys(profile.espeakAssets).map(espeakAsset), ...runtimeNames.map(ortAsset),
  ]);
  const version = await initializeEspeak();
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(metadata);
  const voices = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(voicesBytes));
  if (JSON.stringify(voices) !== JSON.stringify({ F: { teacher: 'kokoro', voice: 'pf_dora*0.7+af_heart*0.3' }, M: { teacher: 'kokoro', voice: 'pm_santa' } })) throw new Error('Tiny Voca pt-BR Kokoro voice metadata differs from the pinned release');
  if (await frontendFingerprint() !== profile.frontendFingerprint) throw new Error('Tiny Voca pt-BR Kokoro frontend fingerprint mismatch');

  const runtimeUrl = new URL(profile.runtimeRoot, self.location.origin).href;
  ort = await import(new URL(webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs', runtimeUrl).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = webgpu
    ? { mjs: new URL('ort-wasm-simd-threaded.asyncify.mjs', runtimeUrl).href, wasm: new URL('ort-wasm-simd-threaded.asyncify.wasm', runtimeUrl).href }
    : runtimeUrl;
  ort.env.logLevel = 'error';
  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(modelBytes, { executionProviders });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) throw new Error('Tiny Voca pt-BR Kokoro graph names differ from pinned metadata');
  if (webgpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  voiceEngine = createVoice({ ort, session, espeakRawIpa: rawEspeak, metadata });
  const audit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (options.probe) await probe(options.probeText || 'Olá.');
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Voca pt-BR Kokoro probe');
  }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id,
    precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: activeLanguage, supportedLanguages: [profile.language],
      voice: activeVoice.id, voiceIndex: activeVoice.index, teacherVoice: activeVoice.teacher,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames, precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      trainedEspeakRelease: profile.trainedEspeakRelease, espeakRuntimeVersion: version,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders, waveformExecutionProviders: executionProviders, wasmThreads: 1,
      graphOptimization: 'ONNX Runtime Web default', waveform: 'Released FP32 graph; utterance PCM concatenated in source order without inserted audio, then one whole-span peak cap at 0.99.',
      languageSupportNote: 'This pinned checkpoint/frontend supports pt-BR only. English trace output is a pronunciation diagnostic, not a supported benchmark language.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches in an untimed probe; ONNX Runtime Web may use internal WASM kernels for unsupported operators.` : 'The session requests WebGPU with WASM fallback for unsupported operators; run a probe to confirm hardware dispatch.')
        : 'Explicit ONNX Runtime Web 1.31.1 single-thread WASM provider.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !voiceEngine || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca pt-BR Kokoro adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Voca pt-BR Kokoro source chunk');
  const result = await voiceEngine.speak(chunk.text, { voice: activeVoice.id, onFirstPcm });
  return { parts: [result.audio], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  if (espeakModule) {
    try { espeakModule.ccall('bench_espeak_dispose', null, [], []); } finally { espeakModule = null; }
  }
  voiceEngine = metadata = ort = activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca pt-BR Kokoro worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch { /* Preserve the original initialization error. */ } }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
