import {fetchModelAsset} from '../cache-model-asset.mjs';
import {ALPA_SANSKRIT as profile} from '../adapters/alpa-sanskrit-profile.mjs';
import {dispatchProbe, hardwareGpu} from './gpu-probe.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/`;
const runtimeRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
const graphPath = 'onnx/alpa-v0.2.onnx';
const configPath = 'onnx/alpa-v0.2.json';
const frontendPath = 'frontend/alpa-text.mjs';
const inputNames = ['tokens', 'weight', 'voice', 'speed', 'pitch_shift', 'pitch_range'];
const outputNames = ['audio', 'durations'];

let ort, session, frontend;

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function checkedAsset(path, [length, digest]) {
  const response = await fetchModelAsset(path, profile.sourceRevision, {bufferBeforeCache: true});
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== length || await sha256(bytes) !== digest) {
    throw new Error(`Alpa asset size or SHA-256 mismatch for ${path}`);
  }
  return bytes;
}

function validateConfig(config) {
  if (config.model !== 'alpa-v0.2' || config.sample_rate !== profile.sampleRate ||
      config.hop !== profile.hop || config.max_tokens !== profile.maxTokens ||
      config.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(config.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(config.symbols) !== JSON.stringify(frontend.SYMBOLS) ||
      JSON.stringify(Object.keys(config.inputs)) !== JSON.stringify(inputNames) ||
      JSON.stringify(Object.keys(config.outputs)) !== JSON.stringify(outputNames)) {
    throw new Error('Alpa v0.2 config differs from the pinned graph and frontend');
  }
}

function planText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Alpa requires nonempty Devanagari Sanskrit text');
  const plan = frontend.chunks(text);
  if (plan.unknown.length) throw new Error(`Alpa frontend found unknown text: ${JSON.stringify(plan.unknown)}`);
  if (!plan.parts.length) throw new Error('Alpa frontend produced an empty plan');
  const unknownId = frontend.SYMBOL_TO_ID.get(frontend.UNK);
  for (const {ids, weight} of plan.parts) {
    if (ids.length < 3 || ids.length > profile.maxTokens || ids.length !== weight.length ||
        ids.some(id => !Number.isInteger(id) || id < 0 || id >= frontend.SYMBOLS.length || id === unknownId) ||
        weight.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
      throw new Error('Alpa plan has invalid tokens or syllable weights');
    }
  }
  return plan.parts;
}

async function auditFixture(texts) {
  const expected = profile.fixtureOracle;
  if (texts.length !== expected.spans) throw new Error('Alpa fixture audit requires all 90 ordered source spans');
  let maximumTokens = 0;
  let utterances = 0;
  const ordered = texts.map(({id, text}, index) => {
    if (id !== index) throw new Error('Alpa fixture spans are out of order');
    const parts = planText(text);
    if (parts.length !== expected.maxPartsPerSpan) throw new Error('Alpa fixture part count differs from the reviewed plan');
    utterances += parts.length;
    return [id, parts.map(({ids, weight}) => {
      maximumTokens = Math.max(maximumTokens, ids.length);
      return [ids, weight];
    })];
  });
  const tokenWeightSha256 = await sha256(new TextEncoder().encode(JSON.stringify(ordered)));
  if (maximumTokens !== expected.maximumTokens || tokenWeightSha256 !== expected.orderedSpanPlanSha256) {
    throw new Error('Alpa fixture token and syllable-weight digest differs from the reviewed plan');
  }
  return {spans: texts.length, utterances, maximumTokens, unknownTokens: 0, tokenWeightSha256};
}

async function synthesizePart({ids, weight}) {
  const integers = values => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
  const scalar = value => new ort.Tensor('float32', Float32Array.of(value), [1]);
  const inputs = {
    tokens: integers(ids),
    weight: integers(weight),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(profile.defaultVoiceIndex)), [1]),
    speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift),
    pitch_range: scalar(profile.pitchRange),
  };
  let output;
  try {
    output = await session.run(inputs);
    const durations = Array.from(await output.durations.getData(), Number);
    if (durations.length !== ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Alpa returned invalid duration values');
    }
    const pcm = Float32Array.from(await output.audio.getData());
    const samples = durations.reduce((sum, frames) => sum + frames, 0) * profile.hop;
    if (!Number.isSafeInteger(samples) || pcm.length !== samples || !pcm.length ||
        !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Alpa returned invalid, empty or silent PCM');
    }
    return pcm;
  } finally {
    for (const tensor of [...Object.values(inputs), ...Object.values(output ?? {})]) tensor.dispose?.();
  }
}

async function synthesize(plans, onFirstPcm) {
  const parts = [];
  for (const plan of plans) {
    parts.push(await synthesizePart(plan));
    if (parts.length === 1) onFirstPcm?.();
  }
  return parts;
}

function unsupported(reason) {
  return {
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    voice: profile.defaultVoice,
    precision: profile.precision,
    settings: {fixtureId: profile.fixtureId, language: profile.language},
    capability: {gpuDispatchVerified: false, description: reason},
  };
}

async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Select the CPU or WebGPU Alpa route');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    return unsupported('Alpa requires the Devanagari Sanskrit fixture sa-article-v1.');
  }
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) {
    throw new Error('Alpa requires the exact registered Sanskrit article');
  }
  if (options.voice && options.voice !== profile.defaultVoice) return unsupported('This Alpa profile uses female at index 0.');

  const webgpu = options.backend === 'webgpu';
  let gpu = webgpu ? await hardwareGpu() : null;
  if (webgpu && !gpu) return unsupported('Hardware WebGPU unavailable');

  const runtimeName = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  const binary = webgpu ? 'ort-wasm-simd-threaded.asyncify' : 'ort-wasm-simd-threaded';
  const [graph, configBytes] = await Promise.all([
    checkedAsset(modelRoot + graphPath, profile.modelAssets[graphPath]),
    checkedAsset(modelRoot + configPath, profile.modelAssets[configPath]),
    checkedAsset(modelRoot + frontendPath, [profile.frontendAsset.bytes, profile.frontendAsset.sha256]),
    ...[runtimeName, binary + '.mjs', binary + '.wasm'].map(name =>
      checkedAsset(runtimeRoot + name, profile.runtimeAssets[name])),
  ]);
  frontend = await import(modelRoot + frontendPath);
  const config = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(configBytes));
  validateConfig(config);
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;

  ort = await import(runtimeRoot + runtimeName);
  ort.env.logLevel = 'error';
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {mjs: runtimeRoot + binary + '.mjs', wasm: runtimeRoot + binary + '.wasm'};
  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(graph, {executionProviders, graphOptimizationLevel: 'all'});
  if (JSON.stringify(session.inputNames) !== JSON.stringify(inputNames) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(outputNames)) {
    throw new Error('Alpa ONNX graph tensor names differ from the pinned contract');
  }

  if (webgpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpu = device?.adapterInfo?.description || adapter?.info?.vendor || gpu;
  }

  let dispatches = null;
  if (options.probe) {
    const plans = planText(options.probeText ?? 'नमस्ते। अहं संस्कृतं वदामि।');
    const hook = webgpu ? dispatchProbe() : null;
    try {
      await synthesize(plans);
    } finally {
      dispatches = hook?.stop() ?? 0;
    }
    if (webgpu && dispatches === 0) {
      await dispose();
      return unsupported('No hardware WebGPU compute dispatch was observed in the Alpa probe');
    }
  }

  return {
    status: 'measured',
    backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: profile.defaultVoice,
    precision: profile.precision,
    gpu,
    settings: {
      modelId: profile.modelId,
      modelRevision: profile.modelRevision,
      sourceRevision: profile.sourceRevision,
      frontendRevision: profile.frontendRevision,
      frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint,
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
      parameterCount: profile.parameterCount,
      precision: profile.precision,
      maxTokens: profile.maxTokens,
      runtimeVersions: {onnxruntimeWeb: profile.runtimeVersion},
      executionProviders,
      wasmThreads: 1,
      graphOptimizationLevel: 'all',
      audio: 'Raw 24 kHz PCM joined in the stock Devanagari planner order.',
      polish: config.polish,
      ...(fixtureAudit ? {fixtureAudit} : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu && options.probe ? dispatches > 0 : null,
      ...(webgpu && options.probe ? {dispatches} : {}),
      description: webgpu
        ? 'Hardware WebGPU with explicit WASM operator fallback and PCM readback.'
        : 'Single-thread ONNX Runtime Web CPU/WASM with local Sanskrit text planning.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session) throw new Error('Alpa is not initialized');
  if (!Number.isSafeInteger(chunk?.id) || chunk.id < 0 || chunk.id >= profile.fixtureOracle.spans) {
    throw new Error('Alpa received an invalid source span ID');
  }
  const parts = await synthesize(planText(chunk.text), onFirstPcm);
  return {parts, sampleRate: profile.sampleRate, completedChunkId: chunk.id};
}

async function diagnostic(options) {
  if (!session) throw new Error('Alpa is not initialized');
  const plans = planText(options.text);
  const pcm = await synthesize(plans);
  return {
    fixtureId: profile.fixtureId,
    language: profile.language,
    voice: profile.defaultVoice,
    sampleRate: profile.sampleRate,
    samples: pcm.reduce((total, part) => total + part.length, 0),
    parts: plans.length,
    tokenCounts: plans.map(part => part.ids.length),
  };
}

async function dispose() {
  const current = session;
  session = null;
  ort = frontend = null;
  await current?.release();
}

self.onmessage = async ({data}) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      value = await generate(data.chunk, () => self.postMessage({id: data.id, event: 'first-pcm'}));
    } else if (data.action === 'diagnostic') value = await diagnostic(data.options ?? {});
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Alpa worker action');
    const transfer = Array.isArray(value?.parts) ? value.parts.map(part => part.buffer) : [];
    self.postMessage({id: data.id, value}, transfer);
  } catch (error) {
    if (data.action === 'initialize') {
      try { await dispose(); } catch { /* Report the original initialization error. */ }
    }
    self.postMessage({id: data.id, error: String(error?.message ?? error)});
  }
};
