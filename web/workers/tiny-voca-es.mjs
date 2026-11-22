import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { TINY_VOCA_ES as profile } from '../adapters/tiny-voca-es-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const runtimeRoot = modelRoot + 'runtime/';
let ort, session, espeak, frontend, sentenceTools, metadata, activeVoice, activeFixture, activeLanguage, backend, gpuName;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  const url = new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) {
    throw new Error('Tiny Voca Spanish assets must use the same-origin pinned model tree');
  }
  return url;
}

async function checkedBytes(relative, label) {
  const spec = profile.assets[relative];
  if (!spec) throw new Error(`Tiny Voca Spanish asset is not pinned: ${relative}`);
  const response = await fetch(assetUrl(relative));
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

function modelAsset(name) { return checkedBytes(`models/${name}`, `Tiny Voca Spanish ${name}`); }
function runtimeAsset(name) { return checkedBytes(`runtime/${name}`, `ONNX Runtime Web ${name}`); }
function siteAsset(name) { return checkedBytes(`site/${name}`, `Tiny Voca Spanish source ${name}`); }

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames ||
      value.step !== profile.step || value.frontend !== 'espeak' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) ||
      JSON.stringify(value.noise_above) !== JSON.stringify(profile.noiseAbove) ||
      !Array.isArray(value.symbols) || value.symbols.length !== 61 || new Set(value.symbols).size !== value.symbols.length) {
    throw new Error('Tiny Voca Spanish metadata differs from the pinned checkpoint profile');
  }
}

function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Tiny Voca Spanish voice: ${requested}`);
  return voice;
}

function planPiece(piece) {
  function fit(value) {
    let phones;
    try { phones = frontend.phonemize(value, espeak.phonemize, { accent: profile.language }); }
    catch (error) {
      if (error instanceof frontend.NothingToPronounce) return [];
      throw error;
    }
    if (phones.ids.length <= metadata.max_tokens - 12) return [{ utterance: value, ...phones }];
    const pieces = sentenceTools.shorter(value);
    if (!pieces.length) throw new Error(`A Spanish word exceeds the token limit: ${value.slice(0, 40)}`);
    return pieces.flatMap(fit);
  }
  return fit(piece);
}

function planText(value) {
  return sentenceTools.sentences(sentenceTools.finished(value)).flatMap(planPiece);
}

async function verifyFixtureAudit(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error(`Tiny Voca Spanish smoke audit requires ${expected.spans} ordered fixture spans`);
  }
  const rows = [], unknown = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`Invalid or reordered Tiny Voca Spanish fixture span ${id}`);
    }
    const plans = planText(item.text);
    if (!plans.length) throw new Error(`Tiny Voca Spanish frontend returned no text for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= metadata.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Invalid token/stress output in Tiny Voca Spanish fixture span ${id}`);
      }
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.unknown.length;
      return [plan.ids, plan.stress];
    });
    const phones = [...new Set(plans.flatMap(plan => plan.unknown))].sort();
    if (phones.length) unknown.push({ id, phones });
    rows.push([id, tuples]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens ||
      unknownPhones !== expected.unknownPhones || tokenStressSha256 !== expected.tokenStressSha256 || unknown.length) {
    throw new Error('Tiny Voca Spanish frontend parity mismatch: ' + JSON.stringify({
      spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256, unknown,
    }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256,
    spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256, unknown };
}

class UtteranceTooLong extends Error {}

function idsTensor(values) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
}
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

async function synthesize(phones) {
  const inputs = {
    tokens: idsTensor(phones.ids),
    stress: idsTensor(phones.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift),
    pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Voca Spanish returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > metadata.max_frames) throw new UtteranceTooLong('Tiny Voca Spanish utterance exceeds the upstream frame limit');
    const sampleCount = frames * profile.hop;
    const source = outputs.audio.data;
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || source.length !== sampleCount) {
      throw new Error('Tiny Voca Spanish audio length differs from durations × hop');
    }
    const pcm = Float32Array.from(source);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Tiny Voca Spanish returned empty, non-finite or silent audio');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function generatePrepared(value, onFirstPcm) {
  const waves = [];
  let first = true;
  const addPiece = async piece => {
    const plans = planPiece(piece);
    for (const plan of plans) {
      try {
        const pcm = await synthesize(plan);
        waves.push(pcm);
        if (first) { first = false; onFirstPcm?.(); }
      } catch (error) {
        if (!(error instanceof UtteranceTooLong)) throw error;
        const pieces = sentenceTools.shorter(plan.utterance);
        if (!pieces.length) throw new Error(`A Spanish word exceeds the model frame limit: ${plan.utterance.slice(0, 40)}`);
        for (const part of pieces) await addPiece(part);
      }
    }
  };
  for (const sentence of sentenceTools.sentences(sentenceTools.finished(value))) await addPiece(sentence);
  if (!waves.length) throw new Error('Tiny Voca Spanish produced no pronounceable PCM for this source span');

  const length = waves.reduce((sum, wave) => sum + wave.length, 0);
  const pcm = new Float32Array(length);
  let offset = 0, peak = 0;
  for (const wave of waves) {
    pcm.set(wave, offset);
    offset += wave.length;
    for (const sample of wave) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > profile.peak) {
    const gain = profile.peak / peak;
    for (let index = 0; index < pcm.length; index++) pcm[index] *= gain;
  }
  return pcm;
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice,
    precision: profile.precision, settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Spanish requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    throw new Error('Tiny Voca Spanish requires es-es-article-v1 and the exact es-ES profile');
  }
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = chooseVoice(options.voice || profile.defaultVoice);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }

  const runtimeFiles = webgpu
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, frontendBytes, sentencesBytes, espeakJsBytes, espeakCoreBytes, espeakWasmBytes, espeakDataBytes] = await Promise.all([
    modelAsset('tiny-voca-es.onnx'), modelAsset('tiny-voca-es.json'), siteAsset('frontend.js'), siteAsset('sentences.js'),
    siteAsset('espeak/espeak.js'), siteAsset('espeak/espeak-ng-core.mjs'), siteAsset('espeak/espeak-ng-core.wasm'),
    siteAsset('espeak/espeak-ng-data.pack'), ...runtimeFiles.map(runtimeAsset),
  ]);
  void [frontendBytes, sentencesBytes, espeakJsBytes, espeakCoreBytes, espeakWasmBytes, espeakDataBytes];
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(metadata);

  const siteRoot = new URL(modelRoot + 'site/', self.location.origin);
  const [frontendModule, sentenceModule, espeakModule] = await Promise.all([
    import(new URL('frontend.js', siteRoot).href),
    import(new URL('sentences.js', siteRoot).href),
    import(new URL('espeak/espeak.js', siteRoot).href),
  ]);
  if (JSON.stringify(frontendModule.SYMBOLS) !== JSON.stringify(metadata.symbols)) {
    throw new Error('Tiny Voca Spanish frontend symbols do not match the checkpoint inventory');
  }
  const createEspeak = espeakModule.createEspeak;
  if (typeof createEspeak !== 'function') throw new Error('Pinned eSpeak NG 1.52.0 browser module is unavailable');
  espeak = await createEspeak(new URL('espeak/', siteRoot));
  if (espeak.version !== '1.52.0') throw new Error(`Tiny Voca Spanish requires eSpeak NG 1.52.0; got ${espeak.version}`);
  frontend = frontendModule;
  sentenceTools = sentenceModule;

  const audit = options.auditTexts?.length ? await verifyFixtureAudit(options.auditTexts) : undefined;
  const runtimeUrl = new URL(runtimeRoot, self.location.origin).href;
  const runtimeName = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  ort = await import(new URL(runtimeName, runtimeUrl).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeUrl;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'],
  });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) {
    throw new Error('Tiny Voca Spanish ONNX graph names differ from the pinned model metadata');
  }

  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (options.probe) {
      const pcm = await generatePrepared(options.probeText || '¿Qué tal?', null);
      if (!pcm.length) throw new Error('Tiny Voca Spanish capability probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Voca Spanish probe');
  }

  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id,
    precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId,
      sourceRevision: profile.sourceRevision, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: activeLanguage, voice: activeVoice.id, voiceIndex: activeVoice.index,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames, precision: profile.precision, frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion, espeakNg: espeak.version },
      runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders, wasmThreads: 1, graphOptimization: 'ONNX Runtime Web default',
      noiseAbove: [...profile.noiseAbove],
      waveform: 'Released Spanish FP32 ONNX graph; unseeded waveform noise. Concatenate source-span pieces without inserted audio, then apply one whole-span peak cap at 0.99.',
      unknownPhonePolicy: 'Keep the released 61-symbol frontend output and preserve any <unk> tokens; smoke audit records the exact fixture oracle.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches from the pinned graph; WASM fallback remains available.` : 'Pinned graph requests WebGPU then WASM; an untimed probe is required to verify dispatch.')
        : 'ONNX Runtime Web 1.22.0 uses explicit single-thread WASM. Spanish normalization and eSpeak G2P run locally.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !espeak || !frontend || !sentenceTools || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) {
    throw new Error('Tiny Voca Spanish adapter is not initialized');
  }
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) {
    throw new Error('Invalid Tiny Voca Spanish source chunk');
  }
  const pcm = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  espeak = null;
  frontend = null;
  sentenceTools = null;
  metadata = null;
  ort = null;
  activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Spanish worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
