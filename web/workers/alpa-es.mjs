import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { ALPA_ES as profile } from '../adapters/alpa-es-profile.mjs';
import { phonemize, frontendFingerprint } from '../alpa-es/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const ortRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
let ort, session, metadata, activeVoice, activeFixture, activeLanguage, backend, gpuName;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function checkedBytes(url, spec, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}

function localAsset(path, spec, label) {
  const url = new URL(path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//u.test(url.pathname)) {
    throw new Error(`${label} must come from the same-origin pinned asset tree`);
  }
  return checkedBytes(url.href, spec, label);
}

const modelAsset = name => localAsset(modelRoot + name, profile.assets[name], `Alpa Spanish ${name}`);
const runtimeAsset = name => localAsset(ortRoot + name, profile.ortAssets[name], `ONNX Runtime Web ${name}`);

function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Alpa Spanish voice: ${requested}`);
  return voice;
}

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || value.step !== profile.step || value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.symbols) !== JSON.stringify(profile.symbols) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'weight', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) || value.polish?.pitch_smooth !== 3 ||
      value.polish?.consonant_limit !== 1000 || value.polish?.open_limit !== 4500 || value.polish?.sharpen !== 1.6 ||
      value.polish?.sharpen_from !== 8 || value.polish?.sharpen_to !== 40 || value.polish?.noise_cap !== -15 || value.polish?.treble !== 4) {
    throw new Error('Alpa Spanish ONNX metadata differs from the pinned checkpoint profile');
  }
}

function idsTensor(values) { return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]); }
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

async function synthesize(phones) {
  const inputs = {
    tokens: idsTensor(phones.ids), weight: idsTensor(phones.weight),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed), pitch_shift: scalar(profile.pitchShift), pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Alpa Spanish returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > metadata.max_frames) throw new Error(`Alpa Spanish source span exceeds the native ${metadata.max_frames}-frame limit`);
    const samples = frames * profile.hop;
    const audio = outputs.audio.data;
    if (!Number.isSafeInteger(samples) || frames < 1 || audio.length !== samples) {
      throw new Error('Alpa Spanish audio length differs from durations × hop');
    }
    const pcm = Float32Array.from(audio);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Alpa Spanish returned empty, non-finite or silent audio');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function verifyFixtureOracle(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error(`Alpa Spanish smoke audit requires all ${expected.spans} ordered fixture spans`);
  }
  const rows = [], unknownCounts = new Map();
  let maximumTokens = 0, unknownGroups = 0, spansWithUnknowns = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid or reordered Alpa Spanish fixture span ${id}`);
    const phones = phonemize(item.text);
    if (phones.ids.length > profile.maxTokens) throw new Error(`Alpa Spanish fixture span ${id} exceeds the native ${profile.maxTokens}-token limit`);
    if (phones.ids.length !== phones.weight.length || phones.ids.length < 3 ||
        phones.ids.some(value => !Number.isInteger(value) || value < 0 || value >= profile.symbols.length) ||
        phones.weight.some(value => !Number.isInteger(value) || value < 0 || value > 2)) throw new Error(`Invalid token/weight output in Alpa Spanish fixture span ${id}`);
    maximumTokens = Math.max(maximumTokens, phones.ids.length);
    if (phones.unknown.length) spansWithUnknowns++;
    for (const value of phones.unknown) { unknownGroups++; unknownCounts.set(value, (unknownCounts.get(value) ?? 0) + 1); }
    rows.push([id, [phones.ids, phones.weight]]);
  }
  const tokenWeightSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const unknownGroupsByLiteral = [...unknownCounts].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const unknownGroupsByLiteralSha256 = await sha256(new TextEncoder().encode(JSON.stringify(unknownGroupsByLiteral)));
  if (maximumTokens !== expected.maximumTokens || unknownGroups !== expected.unknownGroups ||
      spansWithUnknowns !== expected.spansWithUnknowns || tokenWeightSha256 !== expected.tokenWeightSha256 ||
      unknownGroupsByLiteralSha256 !== expected.unknownGroupsByLiteralSha256) {
    throw new Error('Alpa Spanish fixture frontend parity mismatch: ' + JSON.stringify({
      spans: rows.length, maximumTokens, unknownGroups, spansWithUnknowns, tokenWeightSha256, unknownGroupsByLiteralSha256,
      unknownGroupsByLiteral: Object.fromEntries([...unknownCounts].sort(([a], [b]) => a.localeCompare(b))),
    }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, utterances: rows.length,
    maximumTokens, unknownGroups, spansWithUnknowns, unknownGroupsByLiteralSha256, tokenWeightSha256 };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice,
    precision: profile.precision, settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Alpa Spanish requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    throw new Error('Alpa Spanish requires the registered es-ar-article-v1 Rioplatense Spanish fixture');
  }
  if (await frontendFingerprint() !== profile.frontendFingerprint) throw new Error('Alpa Spanish frontend fingerprint differs from the profile');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = chooseVoice(options.voice || profile.defaultVoice);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }
  const runtimeFiles = webgpu ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes] = await Promise.all([
    modelAsset('alpa-es.onnx'), modelAsset('alpa-es.json'), ...runtimeFiles.map(runtimeAsset),
  ]);
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(metadata);
  const ortUrl = new URL(ortRoot + (webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'), self.location.href).href;
  ort = await import(ortUrl);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = webgpu ? {
    mjs: new URL(ortRoot + 'ort-wasm-simd-threaded.asyncify.mjs', self.location.href).href,
    wasm: new URL(ortRoot + 'ort-wasm-simd-threaded.asyncify.wasm', self.location.href).href,
  } : new URL(ortRoot, self.location.href).href;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all',
  });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) {
    throw new Error('Alpa Spanish ONNX graph names differ from pinned model metadata');
  }
  if (webgpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  const fixtureAudit = options.auditTexts?.length ? await verifyFixtureOracle(options.auditTexts) : undefined;
  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (options.probe) {
      const probeText = typeof options.probeText === 'string' && options.probeText.trim() ? options.probeText : 'Hola, ¿cómo andás?';
      const pcm = await synthesize(phonemize(probeText));
      if (!pcm.length) throw new Error('Alpa Spanish capability probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches <= 0) { await dispose(); return unsupported('No WebGPU compute dispatch was observed in the untimed Alpa Spanish synthesis probe'); }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id, precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage, locale: activeLanguage,
      voice: activeVoice.id, voiceIndex: activeVoice.index, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, step: profile.step,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], wasmThreads: 1,
      waveform: 'Raw Float32 PCM from the pinned ONNX graph; default Polish corrections; graph-internal unseeded noise and breath retained; no peak normalization or cross-span joining in the adapter.',
      polish: metadata.polish,
      numericInput: 'No number expansion. Within each piece, all non-letter characters are concatenated into an unknown group and recorded; when letters remain, those characters are removed before mapping (A-17 maps from A). A numeric-only piece emits <unk>.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: { gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches from the pinned Alpa FP32 graph. WASM remains available for unsupported operators.` : 'The pinned FP32 graph requests WebGPU then WASM; separate capability initialization verifies dispatch.')
        : 'The pinned FP32 graph uses explicit single-thread WASM. Rioplatense Spanish normalization and phonemization run in the local worker.' },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Alpa Spanish adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Alpa Spanish source chunk');
  const phones = phonemize(chunk.text);
  if (phones.ids.length > metadata.max_tokens) throw new Error(`Alpa Spanish source span exceeds the native ${metadata.max_tokens}-token limit`);
  const pcm = await synthesize(phones);
  onFirstPcm?.();
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  ort = null; metadata = null;
  activeFixture = activeLanguage = backend = gpuName = activeVoice = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Alpa Spanish action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
