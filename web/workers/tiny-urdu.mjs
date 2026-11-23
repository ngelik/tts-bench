import { fetchModelAsset } from '../cache-model-asset.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { TINY_URDU as profile } from '../adapters/tiny-urdu-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const runtimeRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
let ort, session, frontend, config, activeFixture, activeLanguage, activeVoice, requestedBackend, gpuName;
let assetCacheStats = { verifiedBytes: 0, assets: 0 };

function sameOriginUrl(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) throw new Error('Tiny Urdu assets must be same-origin pinned files');
  return url;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
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
  sameOriginUrl(modelRoot, name, '/models/'), profile.modelAssets[name], `Tiny Urdu ${name}`,
);

const runtimeFiles = Object.freeze({
  'ort.wasm.min.mjs': { bytes: 53725, sha256: 'c21d9c326d453a4a61398270c804d5979e118540597cb0c07f7b3d64e6098234' },
  'ort.webgpu.min.mjs': { bytes: 70742, sha256: '329cd956772397a1aedd668e911195d39afefb182f6fc14aafa4f08ac8d8f379' },
  'ort-wasm-simd-threaded.mjs': { bytes: 24738, sha256: '30ed0b5cd1182ede931fea448afb567d4dc705ec957af09f108a2be5f770dac3' },
  'ort-wasm-simd-threaded.wasm': { bytes: 14848852, sha256: '4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d' },
  'ort-wasm-simd-threaded.asyncify.mjs': { bytes: 53457, sha256: '59cf781530e1a16df2a291d78798e3ec1152467edaec402d6f9599d85047c302' },
  'ort-wasm-simd-threaded.asyncify.wasm': { bytes: 28747738, sha256: 'ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec' },
});

const runtimeAsset = name => checkedBytes(
  sameOriginUrl(runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'), runtimeFiles[name], `ONNX Runtime Web ${name}`,
);

function unsupported(reason) {
  return {
    status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice ?? profile.defaultVoice,
    precision: profile.precision,
    settings: { language: profile.language, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language] },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames || value.step !== profile.step ||
      value.frontend !== 'tiny-urdu' || value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(['F2', 'M2']) || value.symbols?.length !== 120 ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tiny Urdu model metadata differs from its pinned release');
  }
}

function makeRuntime(backend) {
  const webgpu = backend === 'webgpu';
  const modulePath = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  return import(sameOriginUrl(runtimeRoot, modulePath, '/runtimes/onnxruntime-web-pocket/').href).then(module => {
    module.env.wasm.numThreads = 1;
    module.env.wasm.proxy = false;
    module.env.wasm.wasmPaths = webgpu
      ? {
          mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.mjs', '/runtimes/onnxruntime-web-pocket/').href,
          wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.wasm', '/runtimes/onnxruntime-web-pocket/').href,
        }
      : {
          mjs: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.mjs', '/runtimes/onnxruntime-web-pocket/').href,
          wasm: sameOriginUrl(runtimeRoot, 'ort-wasm-simd-threaded.wasm', '/runtimes/onnxruntime-web-pocket/').href,
        };
    module.env.logLevel = 'error';
    return module;
  });
}

function planSentence(sentence) {
  const plan = frontend.phonemize(sentence);
  if (!plan.symbols.some(symbol => frontend.phones.has(symbol))) return [];
  if (plan.ids.some(id => !Number.isInteger(id))) throw new Error('Tiny Urdu frontend produced an unknown token ID');
  if (plan.ids.length <= profile.plannerTokenLimit) return [plan];
  const punctuationParts = sentence.split(/(?<=[,;:—])\s+/u);
  if (punctuationParts.length > 1) return punctuationParts.flatMap(planSentence);
  const words = sentence.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [...planSentence(words.slice(0, half).join(' ')), ...planSentence(words.slice(half).join(' '))];
}

function planSpan(text) {
  return text.split(/(?<=[.?!…])\s+/u).filter(sentence => sentence.trim()).flatMap(planSentence);
}

async function auditFixture(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error('Tiny Urdu fixture audit requires all 103 ordered source spans');
  const rows = [];
  let utterances = 0, unknownTokens = 0, nonzeroStress = 0, maximumTokens = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Tiny Urdu fixture spans must remain in their original ID order');
    const plans = planSpan(item.text);
    if (!plans.length) throw new Error(`Tiny Urdu fixture source span ${item.id} has no pronounceable utterance`);
    for (const plan of plans) {
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownTokens += plan.ids.filter(id => id === 4).length;
      nonzeroStress += plan.stress.filter(value => value !== 0).length;
    }
    rows.push([item.id, plans.map(plan => [plan.ids, plan.stress])]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens ||
      unknownTokens !== expected.unknownTokens || nonzeroStress !== expected.nonzeroStress ||
      tokenStressSha256 !== expected.tokenStressSha256) {
    throw new Error('Tiny Urdu fixture token/stress oracle mismatch');
  }
  return { fixtureId: profile.fixtureId, sourceSha256: profile.fixtureSha256, spans: auditTexts.length,
    utterances, maximumTokens, unknownTokens, nonzeroStress, tokenStressSha256 };
}

async function runGraph(plan, dispatchHook = false) {
  const shape = [1, plan.ids.length];
  const feeds = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(plan.ids, BigInt), shape),
    stress: new ort.Tensor('int64', BigInt64Array.from(plan.stress, BigInt), shape),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  let hook = dispatchHook && requestedBackend === 'webgpu' ? dispatchProbe() : null;
  let output;
  try {
    output = await session.run(feeds);
    const audioData = typeof output.audio.getData === 'function' ? await output.audio.getData() : output.audio.data;
    const durationData = typeof output.durations.getData === 'function' ? await output.durations.getData() : output.durations.data;
    const frames = Array.from(durationData, Number);
    if (frames.length !== plan.ids.length || frames.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Urdu graph returned invalid frame durations');
    }
    const frameCount = frames.reduce((sum, value) => sum + value, 0);
    const samples = Float32Array.from(audioData);
    if (!Number.isSafeInteger(frameCount * profile.hop) || frameCount < 1 || frameCount > profile.maxFrames ||
        samples.length !== frameCount * profile.hop || !samples.some(value => value !== 0) || !samples.every(Number.isFinite)) {
      throw new Error('Tiny Urdu graph returned invalid or non-finite PCM');
    }
    const dispatches = hook?.stop() ?? 0;
    hook = null;
    return { samples, dispatches };
  } finally {
    hook?.stop();
    for (const tensor of [...Object.values(feeds), ...Object.values(output ?? {})]) tensor.dispose?.();
  }
}

async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Urdu requires explicit cpu or webgpu backend');
  if (options.voice && options.voice !== profile.defaultVoice) return unsupported('This Tiny Urdu profile qualifies only voice M2 at index 1.');
  if (options.fixtureId !== profile.fixtureId || options.language !== profile.language) {
    return unsupported('Tiny Urdu supports only ur-latn-article-v1 (Roman Urdu, ur-Latn).');
  }
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('Tiny Urdu fixture hash differs from the pinned 103-span oracle');

  activeFixture = options.fixtureId;
  activeLanguage = options.language;
  activeVoice = profile.defaultVoice;
  requestedBackend = options.backend;
  assetCacheStats = { verifiedBytes: 0, assets: 0 };
  if (requestedBackend === 'webgpu') {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable; select the CPU/WASM route.');
  }

  const [graphBytes, metadataBytes, frontendBytes] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('model.json'), modelAsset('frontend/urdu.mjs'),
  ]);
  const runtimeNames = requestedBackend === 'webgpu'
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeNames.map(runtimeAsset));
  const graph = graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(config);
  if (await sha256(frontendBytes) !== profile.modelAssets['frontend/urdu.mjs'].sha256) throw new Error('Tiny Urdu stock frontend digest mismatch');
  const frontendUrl = sameOriginUrl(modelRoot, 'frontend/urdu.mjs', '/models/');
  const frontendModule = await import(frontendUrl.href);
  if (typeof frontendModule.Frontend !== 'function') throw new Error('Pinned Tiny Urdu frontend does not export Frontend');
  frontend = new frontendModule.Frontend(config.symbols);

  ort = await makeRuntime(requestedBackend);
  const executionProviders = requestedBackend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graph, {
    executionProviders,
    enableCpuMemArena: false,
    enableMemPattern: false,
    graphOptimizationLevel: 'basic',
  });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(config.outputs)) {
    throw new Error('Tiny Urdu graph tensor names differ from pinned model.json');
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

  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  let probeDispatches = 0;
  if (options.probe) {
    const probePlans = planSpan(options.probeText || 'aap kaise hain?');
    if (!probePlans.length) throw new Error('Tiny Urdu dispatch probe text had no pronounceable utterance');
    const probeResult = await runGraph(probePlans[0], requestedBackend === 'webgpu');
    probeDispatches = probeResult.dispatches;
    if (requestedBackend === 'webgpu' && probeDispatches < 1) {
      await dispose();
      return unsupported('No WebGPU hardware dispatch was observed in the Tiny Urdu synthesis probe');
    }
  }

  return {
    status: 'measured', backendEffective: requestedBackend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice, precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: profile.locale, spokenLanguage: profile.spokenLanguage, supportedLanguages: [profile.language],
      voice: profile.defaultVoice, voiceIndex: profile.defaultVoiceIndex,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, plannerTokenLimit: profile.plannerTokenLimit,
      maxFrames: profile.maxFrames, step: profile.step,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange, peak: profile.peak,
      interUtteranceGapSamples: profile.interUtteranceGapSamples,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      modelAssets: profile.modelAssets, runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion },
      runtimePackage: profile.runtimePackage, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders, wasmThreads: 1, enableCpuMemArena: false, enableMemPattern: false,
      graphOptimizationLevel: 'basic',
      waveform: 'Pinned stock punctuation sentence splitting and recursive 500-token fit; concatenate utterances in source order with 150 ms gaps only within a source span, then apply one 0.99 peak cap per completed source span.',
      assetCacheStats,
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: {
      gpuDispatchVerified: requestedBackend === 'webgpu' ? (options.probe ? probeDispatches > 0 : null) : null,
      ...(requestedBackend === 'webgpu' && options.probe ? { dispatches: probeDispatches } : {}),
      description: requestedBackend === 'webgpu'
        ? `Observed ${probeDispatches} WebGPU compute dispatches during the untimed Tiny Urdu probe. ONNX Runtime Web may use WASM for unsupported operators.`
        : 'Explicit ONNX Runtime Web 1.31.1 single-thread WASM provider with CPU memory arena and memory pattern disabled.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !frontend || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Urdu adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Urdu source span');
  const plans = planSpan(chunk.text);
  if (!plans.length) throw new Error(`Tiny Urdu source span ${chunk.id} has no pronounceable utterance`);
  const output = [];
  let peak = 0;
  for (const plan of plans) {
    const result = await runGraph(plan, false);
    if (output.length) output.push(new Float32Array(profile.interUtteranceGapSamples));
    output.push(result.samples);
    for (const sample of result.samples) peak = Math.max(peak, Math.abs(sample));
    onFirstPcm?.();
    onFirstPcm = null;
  }
  const length = output.reduce((sum, part) => sum + part.length, 0);
  const span = new Float32Array(length);
  let offset = 0;
  for (const part of output) { span.set(part, offset); offset += part.length; }
  if (peak > profile.peak) {
    const scale = profile.peak / peak;
    for (let index = 0; index < span.length; index++) span[index] *= scale;
  }
  if (!span.length || !span.some(value => value !== 0) || !span.every(Number.isFinite)) throw new Error(`Tiny Urdu span ${chunk.id} PCM is invalid`);
  return { parts: [span], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  ort = frontend = config = activeFixture = activeLanguage = activeVoice = requestedBackend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Urdu worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch { /* Keep the initialization failure. */ } }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
