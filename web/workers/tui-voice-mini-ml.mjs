import { fetchModelAsset } from '../cache-model-asset.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { TUI_VOICE_MINI_ML as profile } from '../adapters/tui-voice-mini-ml-profile.mjs';
import { auditFixture, createFrontend, frontendFingerprint, FRONTEND_FINGERPRINT, sha256 } from '../tui-voice-mini-ml/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
let ort, session, frontend, espeakModule, config, vocabPlan;
let activeFixture, activeLanguage, activeVoice, requestedBackend, gpuName;
let assetCacheStats = { verifiedBytes: 0, assets: 0 };

function sameOriginUrl(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('Malayalam TTS assets must be same-origin pinned files');
  return url;
}

async function checkedBytes(url, spec, label, revision = profile.sourceRevision) {
  const response = await fetchModelAsset(url, revision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  assetCacheStats.verifiedBytes += bytes.byteLength;
  assetCacheStats.assets++;
  return bytes;
}
const modelAsset = name => checkedBytes(
  sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `Malayalam model asset ${name}`,
);
const espeakAsset = name => checkedBytes(
  sameOriginUrl(profile.espeakRoot, name, '/runtimes/espeak-ng/'), profile.espeakAssets[name], `eSpeak NG 1.51 ${name}`,
);
const runtimeAsset = name => checkedBytes(
  sameOriginUrl(profile.runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), profile.runtimeFiles[name], `ONNX Runtime Web ${name}`,
);

function unsupported(reason) {
  return {
    status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice ?? profile.defaultVoice,
    precision: profile.precision,
    settings: { language: profile.language, locale: profile.locale, supportedLanguages: [profile.language] },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function validateMetadata(value) {
  const model = value?.model;
  const inputNames = ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'];
  const outputNames = ['audio', 'durations'];
  if (!model || value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      model.sample_rate !== profile.sampleRate || model.hop !== profile.hop || model.max_tokens !== profile.maxTokens ||
      model.max_frames !== profile.maxFrames || value.step !== profile.step ||
      JSON.stringify(value.voices) !== JSON.stringify(['F2', 'M2']) ||
      value.speaker_info?.F2 !== 'AI4Bharat Rasa Malayalam Female' ||
      JSON.stringify(value.onnx?.inputs) !== JSON.stringify(inputNames) ||
      JSON.stringify(value.onnx?.outputs) !== JSON.stringify(outputNames) ||
      value.phonemizer?.name !== profile.configFrontendName || value.phonemizer?.fingerprint !== profile.configFrontendFingerprint) {
    throw new Error('Malayalam config differs from its pinned release metadata');
  }
  if (model.vocab_size !== 76) throw new Error('Malayalam graph config does not declare 76 token slots');
}

function rawEspeak(text, options) {
  if (!espeakModule) throw new Error('eSpeak NG 1.51 is not initialized');
  if (options?.voice !== 'ml' || options?.separator !== '_') throw new Error('Malayalam eSpeak requires voice ml and underscore phone separators');
  if (!text.endsWith('\n')) throw new Error('Malayalam eSpeak requests must include the publisher-required trailing LF');
  return espeakModule.ccall('bench_espeak_trace', 'string', ['string'], [text.replace(/\n+$/u, '') + '\n']);
}

async function initializeEspeak() {
  const root = profile.espeakRoot;
  const jsUrl = sameOriginUrl(root, 'espeak-quiet.mjs', '/runtimes/espeak-ng/');
  const [, wasmBytes, dataBytes] = await Promise.all([
    espeakAsset('espeak-quiet.mjs'), espeakAsset('espeak-quiet.wasm'), espeakAsset('espeak-quiet.data'),
  ]);
  const { default: createModule } = await import(jsUrl.href);
  if (typeof createModule !== 'function') throw new Error('Pinned eSpeak NG factory is unavailable');
  const binary = wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength);
  const data = dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength);
  const initialized = await createModule({
    wasmBinary: binary,
    getPreloadedPackage: (name, size) => {
      if (!String(name).endsWith('espeak-quiet.data') || size !== data.byteLength) throw new Error('Unexpected eSpeak NG data package');
      return data;
    },
    locateFile(name) {
      if (name === 'espeak-quiet.wasm') return sameOriginUrl(root, name, '/runtimes/espeak-ng/').href;
      if (name === 'espeak-quiet.data') return sameOriginUrl(root, name, '/runtimes/espeak-ng/').href;
      throw new Error(`Unexpected eSpeak NG runtime dependency: ${name}`);
    },
  });
  const result = initialized.ccall('bench_espeak_init', 'number', ['string'], ['/data']);
  if (result !== 0) throw new Error(`Unable to initialize Malayalam eSpeak NG (${result})`);
  const version = initialized.ccall('bench_espeak_version', 'string', [], []);
  if (version !== profile.espeakCompatibilityVersion) {
    initialized.ccall('bench_espeak_dispose', null, [], []);
    throw new Error(`Malayalam profile requires eSpeak NG ${profile.espeakCompatibilityVersion}; runtime reports ${version}`);
  }
  espeakModule = initialized;
  return version;
}

async function validateAssets(backend) {
  assetCacheStats = { verifiedBytes: 0, assets: 0 };
  const [graphBytes, configBytes, planBytes] = await Promise.all([
    modelAsset('onnx/tui-voice-mini-ml.onnx'), modelAsset('config.json'), modelAsset('vocab_plan.json'),
  ]);
  const runtimeNames = backend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeNames.map(runtimeAsset));
  const graph = graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  vocabPlan = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(planBytes));
  validateMetadata(config);
  frontend = createFrontend(config, vocabPlan);
  if (await frontendFingerprint() !== FRONTEND_FINGERPRINT || FRONTEND_FINGERPRINT !== profile.frontendFingerprint) {
    throw new Error('Malayalam frontend identity fingerprint mismatch');
  }
  return { graph, config, vocabPlan };
}

function makeRuntime(backend) {
  const runtimeUrl = new URL(profile.runtimeRoot, self.location.origin).href;
  const webgpu = backend === 'webgpu';
  const modulePath = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  return import(new URL(modulePath, runtimeUrl).href).then(module => {
    module.env.wasm.numThreads = 1;
    module.env.wasm.proxy = false;
    module.env.wasm.wasmPaths = webgpu
      ? {
          mjs: new URL('ort-wasm-simd-threaded.asyncify.mjs', runtimeUrl).href,
          wasm: new URL('ort-wasm-simd-threaded.asyncify.wasm', runtimeUrl).href,
        }
      : {
          mjs: new URL('ort-wasm-simd-threaded.mjs', runtimeUrl).href,
          wasm: new URL('ort-wasm-simd-threaded.wasm', runtimeUrl).href,
        };
    module.env.logLevel = 'error';
    return module;
  });
}

async function runGraph(ids, stress, dispatchHook = false) {
  const idData = BigInt64Array.from(ids, BigInt);
  const stressData = BigInt64Array.from(stress, BigInt);
  const feeds = {
    tokens: new ort.Tensor('int64', idData, [1, idData.length]),
    stress: new ort.Tensor('int64', stressData, [1, stressData.length]),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  let outputs, hook = dispatchHook && requestedBackend === 'webgpu' ? dispatchProbe() : null;
  try {
    outputs = await session.run(feeds);
    const [audio, durations] = await Promise.all([outputs.audio.getData(), outputs.durations.getData()]);
    const frames = Array.from(durations, Number);
    if (frames.length !== ids.length || frames.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Malayalam graph returned invalid frame durations');
    }
    const frameCount = frames.reduce((sum, value) => sum + value, 0);
    const samples = Float32Array.from(audio);
    if (!Number.isSafeInteger(frameCount * profile.hop) || frameCount < 1 || frameCount > profile.maxFrames ||
        samples.length !== frameCount * profile.hop || !samples.some(value => value !== 0) ||
        !samples.every(Number.isFinite)) {
      throw new Error('Malayalam graph PCM is invalid or differs from duration × hop');
    }
    const dispatches = hook?.stop() ?? 0;
    hook = null;
    if (requestedBackend === 'webgpu' && dispatchHook && dispatches < 1) throw new Error('Malayalam WebGPU span had no observed hardware dispatch');
    return { audio: samples, frameCount, dispatches };
  } finally {
    hook?.stop();
    for (const tensor of Object.values(feeds)) tensor.dispose?.();
    for (const output of Object.values(outputs ?? {})) output.dispose?.();
  }
}

async function probe(text) {
  const result = await frontend.phonemize(text, rawEspeak, 'probe');
  return runGraph(result.ids, result.stress, true);
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tui Voice Mini Malayalam requires explicit cpu or webgpu backend');
  if (options.voice && options.voice !== profile.defaultVoice) return unsupported('This Malayalam profile currently qualifies only the F2 voice.');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    return unsupported('Tui Voice Mini Malayalam supports only ml-article-v1 in Malayalam (ml).');
  }
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('Malayalam fixture hash differs from the pinned 105-span frontend oracle');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = profile.defaultVoice;
  requestedBackend = options.backend;
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable; select the CPU/WASM route.');
  }
  const { graph } = await validateAssets(requestedBackend);
  await initializeEspeak();
  ort = await makeRuntime(requestedBackend);
  const providers = requestedBackend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graph, { executionProviders: providers });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.onnx.inputs) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(config.onnx.outputs)) {
    throw new Error('Malayalam graph tensor names differ from pinned config');
  }
  if (requestedBackend === 'webgpu') {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  let fixtureAudit;
  if (options.auditTexts?.length) fixtureAudit = await auditFixture(options.auditTexts, frontend, rawEspeak, profile.fixtureOracle);
  let probeDispatches = 0;
  if (options.probe) {
    const result = await probe(options.probeText || 'മലയാളം ശബ്ദ പരിശോധന.');
    probeDispatches = result.dispatches;
    if (requestedBackend === 'webgpu' && probeDispatches < 1) {
      await dispose();
      return unsupported('No WebGPU hardware dispatch was observed in the Malayalam synthesis probe');
    }
  }
  return {
    status: 'measured', backendEffective: requestedBackend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice, precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: activeLanguage, supportedLanguages: [profile.language],
      voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      configFrontendName: profile.configFrontendName, configFrontendFingerprint: profile.configFrontendFingerprint,
      frontendCompatibilityNote: 'Config records a Dizione fingerprint. This benchmark selects the separately documented eSpeak ml frontend and pinned phone map; see the model support notes for scope.',
      documentedEspeakCompatibility: profile.espeakCompatibilityVersion, espeakRuntimeVersion: profile.espeakCompatibilityVersion,
      modelAssets: profile.modelAssets, espeakAssets: profile.espeakAssets,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders: providers, wasmThreads: 1, waveform: 'One fixed source span per FP32 graph call; raw graph PCM returned in source order without inserted gaps or amplitude normalization.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: {
      gpuDispatchVerified: requestedBackend === 'webgpu' ? (options.probe ? probeDispatches > 0 : null) : null,
      ...(requestedBackend === 'webgpu' && options.probe ? { dispatches: probeDispatches } : {}),
      description: requestedBackend === 'webgpu'
        ? `Observed ${probeDispatches} WebGPU compute dispatches during the mandatory untimed graph probe. ONNX Runtime Web may use WASM for unsupported operators.`
        : 'Explicit ONNX Runtime Web 1.31.1 single-thread WASM provider.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !frontend || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tui Voice Mini Malayalam adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Malayalam source span');
  const result = await frontend.phonemize(chunk.text, rawEspeak, chunk.id);
  if (result.ids.length > profile.maxTokens) throw new Error(`Malayalam source span ${chunk.id} exceeds the fixed graph token limit`);
  const generated = await runGraph(result.ids, result.stress, false);
  onFirstPcm?.();
  return {
    parts: [generated.audio], sampleRate: profile.sampleRate, completedChunkId: chunk.id,
  };
}

async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  if (espeakModule) {
    try { espeakModule.ccall('bench_espeak_dispose', null, [], []); } finally { espeakModule = null; }
  }
  frontend = config = vocabPlan = ort = activeFixture = activeLanguage = activeVoice = requestedBackend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tui Voice Mini Malayalam worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch { /* Keep the initialization failure. */ } }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
