import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_UZ as profile } from '../adapters/tiny-voca-uz-profile.mjs';
import { normalizeInput, phonemize, sentenceList } from '../tiny-voca-uz/frontend.mjs';
import { tables } from '../tiny-voca-uz/uzbek-tables.mjs';
import { mergeSpanAudio, noiseIndexForUtterance } from '../tiny-voca-uz/playback.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const runtimeRoot = `/runtimes/onnxruntime-web-pocket/${profile.runtimeVersion}/`;
let ort, session, modelConfig, noiseInputs, activeFixture, activeLanguage, requestedBackend, gpuName;

function sameOriginUrl(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('Tiny Voca Uzbek assets must be same-origin pinned files');
  return url;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function checkedBytes(url, spec, label) {
  const response = await fetchModelAsset(url, profile.modelRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}

const modelAsset = name => checkedBytes(sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `Tiny Voca Uzbek ${name}`);
const runtimeAsset = name => checkedBytes(sameOriginUrl(runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), profile.runtimeFiles[name], `ONNX Runtime Web ${name}`);

function unsupported(reason) {
  return {
    status: 'unsupported', reason, backendEffective: 'none', voice: profile.defaultVoice, precision: profile.precision,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      language: profile.language, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function validateConfig(config) {
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.max_tokens !== profile.maxTokens ||
      config.max_frames !== profile.maxFrames || config.step !== profile.step || config.frontend !== 'uzbek-rule-based-v1' ||
      config.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(config.voices) !== JSON.stringify(['M2']) ||
      JSON.stringify(config.symbols) !== JSON.stringify(tables.symbols) || JSON.stringify(config.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'noise']) ||
      JSON.stringify(config.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tiny Voca Uzbek metadata differs from the pinned checkpoint or frontend');
  }
}

function shorter(text) {
  const clauses = text.split(/(?<=[,;:—])\s+/u);
  if (clauses.length > 1) return clauses;
  const words = text.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

function planSentence(sentence, depth = 0) {
  if (depth > 32) throw new Error('Tiny Voca Uzbek utterance split exceeded its recursion guard');
  const plan = phonemize(sentence);
  if (!plan.ids.every(Number.isInteger) || plan.ids.some(id => id === 4) || plan.unknown.length) {
    throw new Error('Tiny Voca Uzbek frontend emitted an unknown phoneme');
  }
  if (plan.ids.length <= profile.plannerTokenLimit) return [plan];
  const pieces = shorter(sentence);
  if (!pieces.length) throw new Error('One Uzbek word exceeds the checkpoint token limit');
  return pieces.flatMap(piece => planSentence(piece, depth + 1));
}

function planText(text) {
  const normalized = normalizeInput(text);
  const sentences = sentenceList(normalized);
  return sentences.flatMap(sentence => planSentence(sentence));
}

function decodeNoise(bytes) {
  if (bytes.byteLength !== profile.maxFrames * profile.hop * Float32Array.BYTES_PER_ELEMENT) throw new Error('Pinned Uzbek noise input has an unexpected byte count');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);
  for (let index = 0; index < samples.length; index++) samples[index] = view.getFloat32(index * 4, true);
  if (!samples.every(Number.isFinite)) throw new Error('Pinned Uzbek noise input contains non-finite values');
  return samples;
}

async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== profile.fixtureOracle.spans) throw new Error('Fixture audit requires all ordered uz-article-v1 source spans');
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Uzbek fixture spans must preserve source order and contain text');
    if (await sha256(new TextEncoder().encode(item.text)) !== profile.fixtureOracle.sourceSpanSha256[index]) throw new Error(`Uzbek source span ${item.id} differs from the registered fixture`);
    const plans = planText(item.text);
    if (!plans.length || plans.length > profile.noiseIndexes.length) throw new Error(`Uzbek source span ${item.id} has no valid plan or exceeds the seeded noise controls`);
    for (const plan of plans) {
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownTokens += plan.ids.filter(id => id === 4).length;
    }
    rows.push([item.id, plans.map(plan => [plan.ids, plan.stress])]);
  }
  const completeFrontendSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== profile.fixtureOracle.utterances || maximumTokens !== profile.fixtureOracle.maximumTokens ||
      unknownTokens !== profile.fixtureOracle.unknownTokens || completeFrontendSha256 !== profile.fixtureOracle.completeFrontendSha256) {
    throw new Error('Uzbek 105-span Python/browser token-stress parity oracle mismatch');
  }
  return { fixtureId: profile.fixtureId, sourceSha256: profile.fixtureSha256, spans: auditTexts.length, utterances,
    maximumTokens, unknownTokens, completeFrontendSha256 };
}

function makeRuntime(backend) {
  const webgpu = backend === 'webgpu', filename = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
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

async function runGraph(plan, utteranceIndex, measureDispatch = false) {
  if (!session || plan.ids.length < 2 || plan.ids.length > profile.maxTokens || plan.ids.length !== plan.stress.length) throw new Error('Invalid Uzbek graph token-stress input');
  const noiseIndex = noiseIndexForUtterance(utteranceIndex, profile.noiseIndexes);
  const noise = noiseInputs.get(noiseIndex);
  if (!noise) throw new Error(`Missing distinct Uzbek noise input ${noiseIndex}`);
  const shape = [1, plan.ids.length];
  const feeds = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(plan.ids, BigInt), shape),
    stress: new ort.Tensor('int64', BigInt64Array.from(plan.stress, BigInt), shape),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
    noise: new ort.Tensor('float32', noise.slice(), [1, noise.length]),
  };
  const hook = measureDispatch && requestedBackend === 'webgpu' ? dispatchProbe() : null;
  let output;
  try {
    output = await session.run(feeds);
    const audioData = typeof output.audio.getData === 'function' ? await output.audio.getData() : output.audio.data;
    const durationData = typeof output.durations.getData === 'function' ? await output.durations.getData() : output.durations.data;
    const durations = Array.from(durationData, Number);
    if (durations.length !== plan.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Uzbek graph returned invalid token durations');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    const samples = Float32Array.from(audioData);
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames || sampleCount !== samples.length ||
        !samples.length || !samples.some(value => value !== 0) || !samples.every(Number.isFinite)) throw new Error('Uzbek graph returned invalid, empty, non-finite or out-of-bounds raw PCM');
    return { samples, sampleCount, frames, dispatches: hook?.stop() ?? 0 };
  } finally {
    hook?.stop();
    for (const tensor of [...Object.values(feeds), ...Object.values(output ?? {})]) tensor.dispose?.();
  }
}

async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Uzbek requires an explicit cpu or webgpu backend');
  if (options.voice && options.voice !== profile.defaultVoice) return unsupported('This Tiny Voca Uzbek profile qualifies only voice M2 at index 0.');
  if (options.fixtureId !== profile.fixtureId || options.language !== profile.language) return unsupported('Tiny Voca Uzbek supports only uz-article-v1 (Uzbek Latin, uz-Latn).');
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('Uzbek fixture hash differs from the pinned 105-span identity');
  requestedBackend = options.backend;
  activeFixture = options.fixtureId;
  activeLanguage = options.language;
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or the selected adapter is software; use the CPU/WASM route.');
  }

  const runtimeNames = requestedBackend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const noiseSpecs = profile.noiseIndexes.map(item => [`noise-${item.index}.f32le`, profile.modelAssets[`noise-${item.index}.f32le`]]);
  const [graphBytes, configBytes, ...noiseBytes] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('model.json'), ...noiseSpecs.map(([name]) => modelAsset(name)), ...runtimeNames.map(runtimeAsset),
  ]);
  modelConfig = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  validateConfig(modelConfig);
  noiseInputs = new Map(noiseSpecs.map(([name], index) => [Number(name.slice(6, 8)), decodeNoise(noiseBytes[index])]));
  const audit = await auditFixture(options.auditTexts);
  ort = await makeRuntime(requestedBackend);
  const executionProviders = requestedBackend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graphBytes, { executionProviders, graphOptimizationLevel: 'all' });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(modelConfig.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(modelConfig.outputs)) throw new Error('Uzbek ONNX graph ABI differs from the pinned export config');
  if (requestedBackend === 'webgpu') {
    const device = await ort.env.webgpu.device, adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.info?.isFallbackAdapter || adapter?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter.');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.vendor || gpuName;
  }

  let probeDispatches = 0;
  if (options.probe) {
    const plan = planText(options.probeText || "Assalomu alaykum. O'zbek tili.")[0];
    if (!plan) throw new Error('Uzbek capability probe did not produce a stock utterance');
    const result = await runGraph(plan, 0, requestedBackend === 'webgpu');
    probeDispatches = result.dispatches;
    if (requestedBackend === 'webgpu' && probeDispatches < 1) {
      await dispose();
      return unsupported('No hardware WebGPU compute dispatch was observed during the separate Uzbek probe.');
    }
  }
  return {
    status: 'measured', backendEffective: requestedBackend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice, precision: profile.precision, gpu: gpuName,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      peak: profile.peak, precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      modelAssets: profile.modelAssets, runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, runtimePackage: profile.runtimePackage,
      runtimePackageIntegrity: profile.runtimePackageIntegrity, noiseIndexes: profile.noiseIndexes.map(item => item.index),
      executionProviders, wasmThreads: 1, graphOptimizationLevel: 'all',
      audio: 'Upstream normalize/sentence/token processing is preserved; raw utterance PCM is concatenated without inserted pauses, then peak-limited to 0.99 once per source span.',
      fixtureAudit: audit },
    capability: { gpuDispatchVerified: requestedBackend === 'webgpu' ? (options.probe ? probeDispatches > 0 : null) : null,
      ...(requestedBackend === 'webgpu' && options.probe ? { dispatches: probeDispatches } : {}),
      description: requestedBackend === 'webgpu' ? `Observed ${probeDispatches} compute dispatch(es) in the separate hardware WebGPU probe; WASM remains explicit fallback for unsupported operators.` :
        'Explicit one-thread ONNX Runtime Web 1.31.1 WASM route; Uzbek text processing and output peak cap run locally in the worker.' },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca Uzbek worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Uzbek canonical source span');
  if (chunk.id < 0 || chunk.id >= profile.fixtureOracle.spans || chunk.sha256 !== profile.fixtureOracle.sourceSpanSha256[chunk.id]) throw new Error('Uzbek source span identity or SHA-256 differs from the pinned fixture');
  const plans = planText(chunk.text);
  if (!plans.length || plans.length > profile.noiseIndexes.length) throw new Error(`Uzbek source span ${chunk.id} has no plan or exceeds the deterministic noise inputs`);
  const parts = [];
  for (let index = 0; index < plans.length; index++) {
    const result = await runGraph(plans[index], index);
    parts.push(result.samples);
    onFirstPcm?.();
    onFirstPcm = null;
  }
  const joined = mergeSpanAudio(parts, profile.peak);
  return { parts: [joined], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function diagnose(options = {}) {
  if (!session || activeLanguage !== profile.language) throw new Error('Tiny Voca Uzbek worker is not initialized');
  if (typeof options.text !== 'string' || !options.text.trim()) throw new Error('Uzbek diagnostic requires nonempty text');
  const plans = planText(options.text);
  if (!plans.length || plans.length > profile.noiseIndexes.length) throw new Error('Uzbek diagnostic exceeds its pinned noise controls');
  const outputs = [];
  for (let index = 0; index < plans.length; index++) {
    const plan = plans[index], result = await runGraph(plan, index);
    outputs.push({ samples: result.sampleCount, frames: result.frames, tokenCount: plan.ids.length, tokenIds: plan.ids, stress: plan.stress, noiseIndex: profile.noiseIndexes[index].index });
  }
  const rawSamples = outputs.reduce((sum, item) => sum + item.samples, 0);
  return { fixtureId: options.fixtureId ?? activeFixture, language: activeLanguage, voice: profile.defaultVoice,
    sampleRate: profile.sampleRate, rawSamples, outputSeconds: rawSamples / profile.sampleRate,
    utterances: outputs.length, plans: outputs };
}

async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  ort = modelConfig = noiseInputs = activeFixture = activeLanguage = requestedBackend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await diagnose(data.options);
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Uzbek action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
