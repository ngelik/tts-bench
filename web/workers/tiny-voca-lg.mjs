import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_LG as profile } from '../adapters/tiny-voca-lg-profile.mjs';
import { LUGANDA_SYMBOLS, limitSpanPeak, phonemizeText } from '../adapters/tiny-voca-lg-frontend.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/`;
const runtimeRoot = `/runtimes/onnxruntime-web-pocket/${profile.runtimeVersion}/`;
let ort, session, modelConfig, activeFixture, activeLanguage, requestedBackend, gpuName;

function sameOriginUrl(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('Tiny Voca Luganda assets must be same-origin pinned files');
  return url;
}
async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function checkedBytes(url, spec, label, revision = profile.modelRevision) {
  const response = await fetchModelAsset(url, revision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = name => checkedBytes(sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `Tiny Voca Luganda ${name}`);
const runtimeAsset = name => checkedBytes(sameOriginUrl(runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), profile.runtimeFiles[name], `ONNX Runtime Web ${name}`);

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: profile.defaultVoice, precision: profile.precision,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      language: profile.language, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, voice: 'F2', voiceIndex: profile.defaultVoiceIndex },
    capability: { gpuDispatchVerified: false, description: reason } };
}
function validateConfig(config) {
  if (config.sample_rate !== profile.sampleRate || config.hop !== profile.hop || config.max_tokens !== profile.maxTokens ||
      config.max_frames !== profile.maxFrames || config.step !== profile.step || config.frontend !== 'lug-rules' ||
      config.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(config.voices) !== JSON.stringify(['F2', 'M2']) ||
      JSON.stringify(config.symbols) !== JSON.stringify(LUGANDA_SYMBOLS) ||
      JSON.stringify(config.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(config.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tiny Voca Luganda config differs from its pinned model card or frontend');
  }
}
async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== profile.fixtureOracle.spans) throw new Error('Fixture audit requires all ordered lg-article-v1 canonical source chunks');
  let utterances = 0, maximumTokens = 0, unknownTokens = 0, nonWhitespaceCharacters = 0;
  const rows = [], perSpanDigests = [];
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Fixture audit chunks must retain source order and contain text');
    const sourceDigest = await sha256(new TextEncoder().encode(item.text));
    if (sourceDigest !== profile.fixtureOracle.spanSha256[index]) throw new Error(`Luganda fixture chunk ${item.id} differs from its pinned source SHA-256`);
    const plans = phonemizeText(item.text, { maxTokens: profile.maxTokens });
    if (!plans.length) throw new Error(`Fixture chunk ${item.id} contains no pronounceable sentence`);
    const planRows = [];
    for (const plan of plans) {
      if (plan.tokens.length > profile.maxTokens - 12 || plan.tokens.length !== plan.stress.length) throw new Error(`Stock fit margin or token/stress alignment failed for chunk ${item.id}`);
      utterances++; maximumTokens = Math.max(maximumTokens, plan.tokens.length);
      unknownTokens += plan.tokens.filter(token => token === 4).length;
      planRows.push([plan.tokens, plan.stress]);
    }
    const spanDigest = await sha256(new TextEncoder().encode(JSON.stringify(planRows)));
    if (spanDigest !== profile.fixtureOracle.spanTokenStressSha256[index]) throw new Error(`Token/stress oracle mismatch for Luganda fixture chunk ${item.id}`);
    perSpanDigests.push(spanDigest);
    nonWhitespaceCharacters += Array.from(item.text).filter(char => !/\s/u.test(char)).length;
    rows.push([item.id, planRows]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const spanTokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(perSpanDigests)));
  if (utterances !== profile.fixtureOracle.utterances || maximumTokens !== profile.fixtureOracle.maximumTokens ||
      unknownTokens !== profile.fixtureOracle.unknownTokens || tokenStressSha256 !== profile.fixtureOracle.tokenStressSha256) {
    throw new Error('Luganda all-span stock worker token/stress oracle mismatch');
  }
  return { fixtureId: profile.fixtureId, sourceSha256: profile.fixtureSha256, spans: auditTexts.length, utterances,
    nonWhitespaceCharacters, maximumTokens, unknownTokens, spanTokenStressSha256, tokenStressSha256 };
}
function makeRuntime(backend) {
  const webgpu = backend === 'webgpu', filename = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  return import(sameOriginUrl(runtimeRoot, filename, '/runtimes/onnxruntime-web-pocket/').href).then(module => {
    module.env.wasm.numThreads = 1; module.env.wasm.proxy = false;
    module.env.wasm.wasmPaths = webgpu ? {
      mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    } : {
      mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    };
    module.env.logLevel = 'error'; return module;
  });
}
async function runGraph(plan, measureDispatch = false) {
  if (!session || plan.tokens.length < 2 || plan.tokens.length > profile.maxTokens || plan.tokens.length !== plan.stress.length) throw new Error('Invalid Luganda graph token/stress input');
  const shape = [1, plan.tokens.length];
  const feeds = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(plan.tokens, BigInt), shape),
    stress: new ort.Tensor('int64', BigInt64Array.from(plan.stress, BigInt), shape),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  const hook = measureDispatch && requestedBackend === 'webgpu' ? dispatchProbe() : null;
  let output;
  try {
    output = await session.run(feeds);
    const audioData = typeof output.audio.getData === 'function' ? await output.audio.getData() : output.audio.data;
    const durationData = typeof output.durations.getData === 'function' ? await output.durations.getData() : output.durations.data;
    const durations = Array.from(durationData, Number);
    if (durations.length !== plan.tokens.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Graph returned invalid token durations');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    const samples = Float32Array.from(audioData);
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames || sampleCount !== samples.length ||
        !samples.length || !samples.some(value => value !== 0) || !samples.every(Number.isFinite)) throw new Error('Graph returned invalid, empty, non-finite or out-of-bounds raw PCM');
    return { samples, dispatches: hook?.stop() ?? 0 };
  } finally {
    hook?.stop();
    for (const tensor of [...Object.values(feeds), ...Object.values(output ?? {})]) tensor.dispose?.();
  }
}
async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Luganda requires an explicit CPU or WebGPU backend');
  if (options.fixtureId !== profile.fixtureId || options.language !== profile.language) return unsupported('Tiny Voca Luganda supports only lg-article-v1 in language lg.');
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('Luganda fixture hash differs from the pinned lg-article-v1 identity');
  requestedBackend = options.backend; activeFixture = options.fixtureId; activeLanguage = options.language;
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or a software adapter was selected; choose the CPU/WASM route.');
  }
  const runtimeNames = requestedBackend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeNames.map(runtimeAsset));
  const [graphBytes, configBytes] = await Promise.all([modelAsset('model.onnx'), modelAsset('model.json')]);
  modelConfig = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  validateConfig(modelConfig);
  const audit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  ort = await makeRuntime(requestedBackend);
  const executionProviders = requestedBackend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graphBytes, { executionProviders, graphOptimizationLevel: 'all' });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(modelConfig.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(modelConfig.outputs)) throw new Error('ONNX graph ABI differs from the pinned model config');
  if (requestedBackend === 'webgpu') {
    const device = await ort.env.webgpu.device, adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.info?.isFallbackAdapter || adapter?.isFallbackAdapter) return unsupported('ORT selected a software WebGPU adapter');
    gpuName = device?.adapterInfo?.description || adapter?.info?.vendor || gpuName;
  }
  let probeDispatches = 0;
  if (options.probe) {
    const plan = phonemizeText(options.probeText || 'Oli otya? Nkwagala nnyo.')[0];
    if (!plan) throw new Error('Luganda probe text produced no stock worker utterance');
    const result = await runGraph(plan, requestedBackend === 'webgpu');
    probeDispatches = result.dispatches;
    if (requestedBackend === 'webgpu' && probeDispatches < 1) { await dispose(); return unsupported('No hardware WebGPU compute dispatch was observed during the Luganda probe.'); }
  }
  return {
    status: 'measured', backendEffective: requestedBackend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice, precision: profile.precision, gpu: gpuName,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      voice: 'F2', voiceIndex: profile.defaultVoiceIndex, sampleRate: profile.sampleRate, hop: profile.hop,
      maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange, peak: profile.peak,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      modelAssets: profile.modelAssets, runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, runtimePackage: profile.runtimePackage,
      runtimePackageIntegrity: profile.runtimePackageIntegrity, executionProviders, wasmThreads: 1, graphOptimizationLevel: 'all',
      audio: 'Sentence-level raw PCM is joined per source span in order, then peak-limited to 0.99.', ...(audit ? { fixtureAudit: audit } : {}) },
    capability: { gpuDispatchVerified: requestedBackend === 'webgpu' ? (options.probe ? probeDispatches > 0 : null) : null,
      ...(requestedBackend === 'webgpu' && options.probe ? { dispatches: probeDispatches } : {}),
      description: requestedBackend === 'webgpu' ? `Observed ${probeDispatches} hardware WebGPU compute dispatches in the untimed probe; WASM remains an explicit fallback for unsupported operators.` :
        'Explicit one-thread ONNX Runtime Web 1.31.1 WASM route; Luganda text frontend runs locally in the worker.' },
  };
}
async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca Luganda worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Luganda canonical source chunk');
  if (chunk.id < 0 || chunk.id >= profile.fixtureOracle.spans || chunk.sha256 !== profile.fixtureOracle.spanSha256[chunk.id]) throw new Error('Luganda source chunk identity or SHA-256 differs from the pinned fixture');
  const plans = phonemizeText(chunk.text);
  if (!plans.length) throw new Error(`Luganda source chunk ${chunk.id} has no pronounceable sentence`);
  const parts = [];
  for (const plan of plans) {
    const result = await runGraph(plan);
    parts.push(result.samples); onFirstPcm?.(); onFirstPcm = null;
  }
  const sampleCount = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Float32Array(sampleCount);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  limitSpanPeak(joined, profile.peak);
  return { parts: [joined], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function diagnose(options = {}) {
  if (!session || activeLanguage !== profile.language) throw new Error('Tiny Voca Luganda worker is not initialized');
  if (typeof options.text !== 'string' || !options.text.trim()) throw new Error('Diagnostic requires nonempty Luganda text');
  const plans = phonemizeText(options.text);
  if (!plans.length) throw new Error('Diagnostic text produced no pronounceable Luganda sentence');
  const rendered = [];
  for (const plan of plans) {
    const result = await runGraph(plan);
    rendered.push({ samples: result.samples.length, tokenCount: plan.tokens.length, tokens: plan.tokens, stress: plan.stress });
  }
  return { fixtureId: options.fixtureId ?? activeFixture, language: activeLanguage, sampleRate: profile.sampleRate,
    samples: rendered.reduce((sum, row) => sum + row.samples, 0), utterances: rendered.length,
    tokenPlans: rendered.map(({ tokens, stress, tokenCount }) => ({ tokens, stress, tokenCount })) };
}
async function dispose() {
  const current = session; session = null; if (current) await current.release();
  ort = modelConfig = activeFixture = activeLanguage = requestedBackend = gpuName = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await diagnose(data.options);
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Luganda action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
