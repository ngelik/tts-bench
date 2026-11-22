import { fetchModelAsset } from '../cache-model-asset.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { MINI_VOZ as profile } from '../adapters/mini-voz-profile.mjs';

const root = `/models/${profile.id}/${profile.sourceRevision}/`;
const runtimeRoot = root + 'runtime/';
const settingsBase = {
  modelId: profile.modelId,
  modelRevision: profile.modelRevision,
  sourceId: profile.sourceId,
  sourceRevision: profile.sourceRevision,
  fixtureId: profile.fixtureId,
  fixtureSha256: profile.fixtureSha256,
  language: profile.language,
  locale: profile.locale,
  voice: profile.defaultVoice,
  voiceIndex: profile.defaultVoiceIndex,
  speed: profile.speed,
  pitchShift: profile.pitchShift,
  pitchRange: profile.pitchRange,
  sampleRate: profile.sampleRate,
  hop: profile.hop,
  maxTokens: profile.maxTokens,
  maxFrames: profile.maxFrames,
  precision: profile.precision,
  frontend: profile.frontend,
  runtimeVersion: profile.runtimeVersion,
  runtimePackageIntegrity: profile.runtimePackageIntegrity,
  waveform: 'Stock FP32 graph generates waveform noise internally; each utterance is capped at peak 0.99 independently, with no seed input.',
  unknownPhonePolicy: 'Use the released Spanish inventory and eSpeak routing. Preserve unknown phones in the fixture audit; do not substitute another language.',
};

let ort, session, frontend, speaker, espeakModule, config, activeVoice, gpuName, currentBackend;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  return new URL(root + relative, self.location.origin).href;
}

async function checkedAsset(relative, spec, label) {
  let response;
  try { response = await fetchModelAsset(assetUrl(relative), profile.modelRevision, { bufferBeforeCache: true }); }
  catch (error) { throw new Error(`${label} could not be loaded from local cache/network: ${error?.message ?? error}`); }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

const modelAsset = name => checkedAsset(`models/${name}`, profile.assets[`models/${name}`], `Mini Voz ${name}`);
const siteAsset = name => checkedAsset(`site/${name}`, profile.assets[`site/${name}`], `Mini Voz upstream ${name}`);
const runtimeAsset = name => checkedAsset(`runtime/${name}`, profile.runtimeAssets[name], `ONNX Runtime Web ${name}`);

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames ||
      value.step !== 104000 || value.frontend !== 'espeak' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) ||
      !Array.isArray(value.symbols) || value.symbols.length !== 56 || new Set(value.symbols).size !== value.symbols.length) {
    throw new Error('Mini Voz metadata differs from the pinned stock checkpoint profile');
  }
}

function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Mini Voz voice profile: ${requested}`);
  return voice;
}

function planText(text) {
  const { sentences, finished, shorter, NothingToPronounce } = frontend;
  function fit(piece) {
    let phones;
    try { phones = frontend.phonemize(piece); }
    catch (error) {
      if (error instanceof NothingToPronounce) return [];
      throw error;
    }
    if (phones.ids.length <= config.max_tokens - 12) return [phones];
    return shorter(piece).flatMap(fit);
  }
  return sentences(finished(text)).flatMap(fit);
}

async function verifyFixtureAudit(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error(`Mini Voz fixture oracle requires all ${expected.spans} ordered Spanish source spans`);
  }
  const rows = [], unknown = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`Invalid or reordered Mini Voz fixture span ${id}`);
    }
    const plans = planText(item.text);
    if (!plans.length) throw new Error(`Mini Voz frontend returned no pronounceable text for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= config.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Invalid token/stress output in Mini Voz fixture span ${id}`);
      }
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.unknown.length;
      const phones = [...new Set(plan.unknown)].sort();
      if (phones.length) unknown.push({ id, phones });
      return [plan.ids, plan.stress];
    });
    rows.push([id, tuples]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens ||
      unknownPhones !== expected.unknownPhones || digest !== expected.tokenStressSha256) {
    throw new Error('Mini Voz stock frontend parity mismatch: ' + JSON.stringify({
      spans: rows.length, utterances, maximumTokens, unknownPhones, digest, unknown,
    }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length,
    utterances, maximumTokens, unknownPhones, tokenStressSha256: digest, unknown };
}

async function synthesize(phones) {
  const count = phones.ids.length;
  const inputs = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(phones.ids, BigInt), [1, count]),
    stress: new ort.Tensor('int64', BigInt64Array.from(phones.stress, BigInt), [1, count]),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== count || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Mini Voz returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames ||
        outputs.audio.data.length !== sampleCount) throw new Error('Mini Voz output shape differs from duration × hop');
    const pcm = Float32Array.from(outputs.audio.data);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Mini Voz returned empty, non-finite or silent audio');
    }
    let peak = 0;
    for (const sample of pcm) peak = Math.max(peak, Math.abs(sample));
    if (peak > profile.peak) {
      const gain = profile.peak / peak;
      for (let index = 0; index < pcm.length; index++) pcm[index] *= gain;
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function generateText(text, onFirstPcm) {
  const plans = planText(text);
  if (!plans.length) throw new Error('Mini Voz received a source span with no pronounceable text');
  const parts = [];
  for (const plan of plans) {
    const pcm = await synthesize(plan);
    parts.push(pcm);
    if (parts.length === 1) onFirstPcm?.();
  }
  return parts;
}

function unsupported(reason) {
  return { ...info, status: 'unsupported', backendEffective: 'none', reason,
    capability: { gpuDispatchVerified: false, description: reason } };
}

const info = { voice: profile.defaultVoice, precision: 'FP32', settings: settingsBase };

async function initialize({ backend, probe, probeText, fixtureId, language = profile.language, voice = profile.defaultVoice, auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Mini Voz supports CPU/WASM or hardware WebGPU with WASM fallback.');
  if (fixtureId !== profile.fixtureId || language !== profile.language) {
    throw new Error('Mini Voz requires the es-es-article-v1 fixture and the exact es-ES frontend profile.');
  }
  activeVoice = chooseVoice(voice);
  currentBackend = backend;
  gpuName = backend === 'webgpu' ? await hardwareGpu() : null;
  if (backend === 'webgpu' && !gpuName) return unsupported('A hardware WebGPU adapter is unavailable for Mini Voz.');

  const runtimeNames = backend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, frontendBytes, espeakBytes, dataBytes] = await Promise.all([
    modelAsset('mini-voz.onnx'), modelAsset('mini-voz.json'), siteAsset('tts/frontend.js'),
    siteAsset('vendor/espeak-ng.js'), siteAsset('vendor/espeak-ng.data'),
    ...runtimeNames.map(runtimeAsset),
  ]);
  config = JSON.parse(new TextDecoder().decode(metadataBytes));
  validateMetadata(config);

  const frontendUrl = assetUrl('site/tts/frontend.js');
  const frontendModule = await import(frontendUrl);
  const espeakUrl = assetUrl('site/vendor/espeak-ng.js');
  const espeakFactory = (await import(espeakUrl)).default;
  if (typeof espeakFactory !== 'function' || !frontendBytes.length || !espeakBytes.length) {
    throw new Error('Pinned Mini Voz or eSpeak NG browser ESM module is unavailable');
  }
  const vendorBase = new URL(root + 'site/vendor/', self.location.origin);
  espeakModule = await espeakFactory({
    locateFile: name => new URL(name, vendorBase).href,
    getPreloadedPackage: () => dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength),
  });
  speaker = new espeakModule.eSpeakNGWorker();
  speaker.set_voice('es', 'es');
  frontend = { ...frontendModule, ...frontendModule.makeFrontend(config.symbols, piece => {
    const result = speaker.synthesize_ipa(piece);
    if (result.code !== 0 || typeof result.ipa !== 'string') throw new Error('eSpeak NG Castilian phonemization failed');
    return result.ipa;
  }) };

  const fixtureAuditResult = auditTexts.length ? await verifyFixtureAudit(auditTexts) : undefined;
  const runtimeModule = backend === 'webgpu' ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  ort = await import(assetUrl(`runtime/${runtimeModule}`));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeRoot;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'],
    graphOptimizationLevel: 'all',
  });

  let dispatches = 0;
  const hook = backend === 'webgpu' && probe ? dispatchProbe() : null;
  try {
    if (backend === 'webgpu' && probe) await generateText(probeText || '¡Hola! ¿Qué tal?', null);
  } finally { dispatches = hook?.stop() ?? 0; }
  if (backend === 'webgpu' && probe && dispatches < 1) return unsupported('No WebGPU compute dispatch was observed during the Mini Voz probe.');

  const executionProviders = backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  return { ...info, voice: activeVoice.id, status: 'measured', backendEffective: backend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...settingsBase, voice: activeVoice.id, voiceIndex: activeVoice.index, executionProviders, wasmThreads: 1,
      ...(fixtureAuditResult ? { fixtureAudit: fixtureAuditResult } : {}), runtimeNpmIntegrity: profile.runtimePackageIntegrity },
    capability: { gpuDispatchVerified: backend === 'webgpu' ? (probe ? dispatches > 0 : null) : null,
      ...(backend === 'webgpu' && probe ? { dispatches } : {}),
      description: backend === 'webgpu'
        ? (probe ? `Observed ${dispatches} WebGPU compute dispatches; WASM fallback remains available.` :
          'Hardware WebGPU was selected; dispatch was not instrumented for this initialization. WASM fallback remains available.')
        : 'ONNX Runtime Web 1.20.1 uses explicit single-thread WASM; text normalization and Castilian eSpeak run locally.' } };
}

async function dispose() {
  await session?.release();
  session = null;
  try { speaker?.__destroy__?.(); } catch {}
  speaker = null;
  espeakModule = null;
  frontend = null;
  config = null;
  ort = null;
  activeVoice = null;
  gpuName = null;
  currentBackend = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      if (!session || !frontend || !speaker || currentBackend === null) throw new Error('Mini Voz worker is not initialized');
      const parts = await generateText(data.chunk.text, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
      value = { parts, sampleRate: profile.sampleRate, completedChunkId: data.chunk.id };
    } else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Mini Voz worker action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
