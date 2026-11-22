import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { TINY_VOCA_GR as profile } from '../adapters/tiny-voca-gr-profile.mjs';
import { phonemize, planText, shorter, spokenSentences } from '../tiny-voca-gr/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const ortRoot = '/runtimes/onnxruntime-web-pocket/1.31.1/';
const espeakRoot = '/runtimes/espeak-ng/tiny-voca-gr-1.51/';
let ort, session, espeak, activeFixture, activeLanguage, activeVoice, backend, gpuName, modelMetadata;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function checkedBytes(url, spec, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}

async function localBytes(path, spec, label) {
  const url = new URL(path, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//u.test(url.pathname)) throw new Error(`${label} must come from the same-origin pinned asset tree`);
  return checkedBytes(url.href, spec, label);
}

const modelAsset = name => localBytes(modelRoot + name, profile.assets[name], `Tiny Voca Greek ${name}`);
const runtimeAsset = name => localBytes(ortRoot + name, profile.ortAssets[name], `ONNX Runtime Web ${name}`);
const espeakAsset = name => localBytes(espeakRoot + name, profile.assets[name], `eSpeak NG Greek ${name}`);

async function loadEspeak() {
  const [moduleBytes, wasmBinary, data] = await Promise.all([
    espeakAsset('espeak-quiet.mjs'), espeakAsset('espeak-quiet.wasm'), espeakAsset('espeak-quiet.data'),
  ]);
  const moduleUrl = new URL(espeakRoot + 'espeak-quiet.mjs', self.location.href).href;
  const createEspeak = (await import(moduleUrl)).default;
  if (typeof createEspeak !== 'function' || moduleBytes.length === 0) throw new Error('Pinned eSpeak NG ESM factory is unavailable');
  espeak = await createEspeak({
    wasmBinary,
    getPreloadedPackage: () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    locateFile: name => new URL(espeakRoot + name, self.location.href).href,
  });
  if (espeak.ccall('bench_espeak_init', 'number', ['string'], ['/data']) !== 0) throw new Error('eSpeak NG Greek frontend failed to initialize');
  if (!String(espeak.ccall('bench_espeak_version', 'string', [], [])).includes('1.51')) throw new Error('eSpeak NG runtime is not the pinned 1.51 release');
}

function trace(text) {
  const value = espeak.ccall('bench_espeak_trace', 'string', ['string'], [text]);
  if (typeof value !== 'string') throw new Error('eSpeak NG returned no Greek phoneme trace');
  return value;
}

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || value.step !== 104000 || value.frontend !== 'espeak' ||
      value.frontend_fingerprint !== 'c046ae2a680a92760786caa0ae74b10ad3a74067885db6e037a0b118a413e839' ||
      value.normalization !== 'greek-nfc-v1' || value.espeak_version !== '1.51' || value.checkpoint_sha256 !== profile.checkpointSha256 ||
      JSON.stringify(value.voices) !== JSON.stringify(['M', 'F']) || JSON.stringify(value.symbols) !== JSON.stringify(profile.symbols) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations'])) throw new Error('Tiny Voca Greek model metadata differs from the pinned checkpoint profile');
}

function idsTensor(values) { return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]); }
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

class UtteranceTooLong extends Error {}

async function synthesize(phones) {
  const inputs = {
    tokens: idsTensor(phones.ids), stress: idsTensor(phones.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed), pitch_shift: scalar(profile.pitchShift), pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Tiny Voca Greek returned invalid durations');
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > profile.maxFrames) throw new UtteranceTooLong('Tiny Voca Greek utterance exceeds the upstream frame limit');
    const samples = frames * profile.hop;
    const source = outputs.audio.data;
    if (!Number.isSafeInteger(samples) || samples < 1 || source.length !== samples) throw new Error('Tiny Voca Greek audio length differs from durations × hop');
    const pcm = Float32Array.from(source);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) throw new Error('Tiny Voca Greek returned empty, non-finite or silent audio');
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

function planChunk(text) {
  return planText(text, trace, profile.tokenLimit);
}

async function verifyFixtureOracle(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error('Greek fixture oracle requires all 109 ordered source spans');
  const rows = [], unknown = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid or reordered Greek fixture span ${id}`);
    const plans = planChunk(item.text);
    if (!plans.length) throw new Error(`Greek frontend returned no pronounceable text for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= modelMetadata.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) throw new Error(`Invalid token/stress output in Greek fixture span ${id}`);
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.ids.filter(value => value === 4).length;
      return [plan.ids, plan.stress];
    });
    const bad = [...new Set(plans.flatMap(plan => plan.unknown))].sort();
    if (bad.length) unknown.push({ id, phones: bad });
    rows.push([id, tuples]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || unknownPhones !== expected.unknownPhones ||
      digest !== expected.tokenStressSha256 || JSON.stringify(unknown) !== JSON.stringify(expected.unknown)) {
    throw new Error('Greek native frontend parity mismatch: ' + JSON.stringify({ spans: rows.length, utterances, maximumTokens, unknownPhones, digest, unknown }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256: digest, unknown };
}

async function generatePrepared(text, onFirstPcm) {
  const waves = [];
  const read = async piece => {
    let plans;
    try { plans = planText(piece, trace, profile.tokenLimit); }
    catch (error) { if (error.message === 'Greek frontend found nothing to pronounce') return; throw error; }
    for (const plan of plans) await synthesizePlan(plan, read);
  };
  const synthesizePlan = async (plan, retry) => {
    try {
      const pcm = await synthesize(plan);
      waves.push(pcm);
      if (waves.length === 1) onFirstPcm?.();
    } catch (error) {
      if (!(error instanceof UtteranceTooLong)) throw error;
      const pieces = shorter(plan.utterance);
      if (!pieces.length) throw new Error(`one Greek word is too long to synthesize: ${plan.utterance.slice(0, 40)}`);
      for (const part of pieces) await retry(part);
    }
  };
  // Match the upstream sentence preparation and then split token or frame overflows.
  for (const sentence of spokenSentences(text)) await read(sentence);
  if (!waves.length) throw new Error('Greek frontend produced no pronounceable audio for this source span');
  const size = waves.reduce((sum, wave) => sum + wave.length, 0);
  const pcm = new Float32Array(size);
  let offset = 0, peak = 0;
  for (const wave of waves) {
    pcm.set(wave, offset); offset += wave.length;
    for (const sample of wave) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > profile.peak) {
    const gain = profile.peak / peak;
    for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
  }
  return pcm;
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice, precision: profile.precision,
    settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize(options = {}) {
  const modelConfig = options.modelConfig;
  if (!modelConfig || modelConfig.id !== profile.id || modelConfig.modelRevision !== profile.modelRevision || modelConfig.sourceId !== profile.sourceId || modelConfig.sourceRevision !== profile.sourceRevision) {
    throw new Error('Tiny Voca Greek requires the pinned model and source profile');
  }
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca Greek requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) throw new Error('Tiny Voca Greek requires the registered el-article-v1 Modern Greek fixture');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = profile.voices.find(voice => voice.id === (options.voice || profile.defaultVoice));
  if (!activeVoice) throw new Error('Tiny Voca Greek supports only the released M and F voices');
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }
  const runtimeNames = webgpu ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, ...runtimeBytes] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('model.json'), ...runtimeNames.map(runtimeAsset),
  ]);
  void runtimeBytes;
  modelMetadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  validateMetadata(modelMetadata);
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
  if (JSON.stringify(session.inputNames) !== JSON.stringify(modelMetadata.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(modelMetadata.outputs)) {
    throw new Error('Tiny Voca Greek ONNX graph names differ from pinned model.json');
  }
  if (webgpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose(); return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }
  await loadEspeak();
  const fixtureAudit = options.auditTexts?.length ? await verifyFixtureOracle(options.auditTexts) : undefined;
  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (options.probe) {
      const probe = await generatePrepared(typeof options.probeText === 'string' && options.probeText.trim() ? options.probeText : 'Καλημέρα.', null);
      if (!probe.length) throw new Error('Tiny Voca Greek capability probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches <= 0) { await dispose(); return unsupported('No WebGPU compute dispatch was observed in the untimed Greek synthesis probe'); }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id, precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage, locale: activeLanguage,
      voice: activeVoice.id, voiceIndex: activeVoice.index, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames,
      precision: profile.precision, frontend: profile.frontend, runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion, espeakNg: '1.51', espeakNgRevision: profile.espeakRevision },
      executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], wasmThreads: 1,
      waveform: 'FP32 ONNX export of the released checkpoint. Plain PCM concatenation and one 0.99 peak cap per source span. The graph generates waveform noise internally.',
      unknownPhonePolicy: 'The Greek inventory maps unsupported eSpeak phones to <unk>. The fixture audit retains these phones. Standalone English is unsupported.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    capability: { gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches from the pinned FP32 graph. WASM remains available for unsupported operators.` : 'The pinned FP32 graph requests WebGPU then WASM. Separate capability initialization verifies dispatch.')
        : 'The pinned FP32 graph uses explicit single-thread WASM. Greek normalization and eSpeak G2P run locally in the worker.' },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !espeak || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca Greek adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Voca Greek source chunk');
  const pcm = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  try { espeak?.ccall('bench_espeak_dispose', 'number', [], []); } catch {}
  espeak = null; ort = null; modelMetadata = null; activeFixture = activeLanguage = backend = gpuName = activeVoice = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Tiny Voca Greek action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
