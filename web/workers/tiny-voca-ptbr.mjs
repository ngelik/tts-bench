import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_PTBR as profile } from '../adapters/tiny-voca-ptbr-profile.mjs';
import { createFrontend } from '../tiny-voca-ptbr/frontend.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const runtimeRoot = modelRoot + 'runtime/';
let ort, session, frontend, metadata, activeVoice, activeFixture, activeLanguage, backend, gpuName;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  const url = new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) throw new Error('Tiny Voca pt-BR assets must use the same-origin pinned model tree');
  return url;
}
async function checkedBytes(relative, label) {
  const spec = profile.assets[relative];
  if (!spec) throw new Error(`Tiny Voca pt-BR asset is not pinned: ${relative}`);
  const response = await fetchModelAsset(assetUrl(relative), profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = name => checkedBytes(`models/${name}`, `Tiny Voca pt-BR ${name}`);
const runtimeAsset = name => checkedBytes(`runtime/${name}`, `ONNX Runtime Web ${name}`);
const dataAsset = name => checkedBytes(`site/${name}`, `Dizione pt-BR ${name}`);
function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || value.step !== profile.step || value.frontend !== 'dizione-ptbr' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) || !Array.isArray(value.symbols) ||
      value.symbols.length !== 55 || new Set(value.symbols).size !== value.symbols.length) {
    throw new Error('Tiny Voca pt-BR metadata differs from the pinned checkpoint profile');
  }
}
function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Tiny Voca pt-BR voice: ${requested}`);
  return voice;
}
async function verifyFixtureAudit(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error(`Tiny Voca pt-BR audit requires ${expected.spans} ordered fixture spans`);
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid or reordered Tiny Voca pt-BR fixture span ${id}`);
    const plans = frontend.planText(item.text);
    if (!plans.length) throw new Error(`Tiny Voca pt-BR front end returned no utterance for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= metadata.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Invalid token/stress output in Tiny Voca pt-BR fixture span ${id}`);
      }
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.symbols.filter(symbol => symbol === '<unk>').length;
      return [plan.ids, plan.stress];
    });
    rows.push([id, tuples]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens ||
      unknownPhones !== expected.unknownPhones || tokenStressSha256 !== expected.tokenStressSha256) {
    throw new Error('Tiny Voca pt-BR frontend parity mismatch: ' + JSON.stringify({
      spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256,
    }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256 };
}
const idsTensor = values => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
const scalar = value => new ort.Tensor('float32', Float32Array.of(value), [1]);
async function synthesize(phones) {
  const inputs = {
    tokens: idsTensor(phones.ids), stress: idsTensor(phones.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed), pitch_shift: scalar(profile.pitchShift), pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(await outputs.durations.getData(), Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Voca pt-BR returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    if (frames > metadata.max_frames) throw new Error('Tiny Voca pt-BR utterance exceeds the released frame limit');
    const source = await outputs.audio.getData();
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || source.length !== sampleCount) {
      throw new Error('Tiny Voca pt-BR audio length differs from durations × hop');
    }
    const pcm = Float32Array.from(source);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) throw new Error('Tiny Voca pt-BR returned empty, non-finite or silent audio');
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}
async function generatePrepared(value, onFirstPcm) {
  const waves = [];
  for (const plan of frontend.planText(value)) {
    waves.push(await synthesize(plan));
    if (waves.length === 1) onFirstPcm?.();
  }
  if (!waves.length) throw new Error('Tiny Voca pt-BR produced no pronounceable PCM for this source span');
  const pcm = new Float32Array(waves.reduce((sum, wave) => sum + wave.length, 0));
  let offset = 0, peak = 0;
  for (const wave of waves) {
    pcm.set(wave, offset);
    offset += wave.length;
    for (const sample of wave) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > profile.peak) {
    const gain = profile.peak / peak;
    for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
  }
  return pcm;
}
function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice, precision: profile.precision, settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}
async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca pt-BR requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) throw new Error('Tiny Voca pt-BR requires pt-br-article-v1 and the exact pt-BR profile');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = chooseVoice(options.voice || profile.defaultVoice);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }
  const runtimeFiles = ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];
  const [modelBytes, metadataBytes, lexiconBytes, tableBytes] = await Promise.all([
    modelAsset('tiny-voca-ptbr.onnx'), modelAsset('tiny-voca-ptbr.json'),
    dataAsset('dizione/data/lexicon.tsv'), dataAsset('dizione/data/open_table.json'),
    ...['dizione/engine.js', 'dizione/g2p.js', 'dizione/normalize.js', 'dizione/symbols.js', 'tokens.js'].map(name => dataAsset(name)),
    ...runtimeFiles.map(runtimeAsset),
  ]);
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(metadata);
  const siteRoot = new URL(modelRoot + 'site/', self.location.origin);
  const [engineModule, symbolsModule, tokenizerModule] = await Promise.all([
    import(new URL('dizione/engine.js', siteRoot).href),
    import(new URL('dizione/symbols.js', siteRoot).href),
    import(new URL('tokens.js', siteRoot).href),
  ]);
  frontend = createFrontend(
    { Dizione: engineModule.Dizione, symbols: symbolsModule, makeTokenizer: tokenizerModule.makeTokenizer },
    new TextDecoder('utf-8', { fatal: true }).decode(lexiconBytes),
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(tableBytes)), profile.maxTokens,
  );
  if (JSON.stringify(frontend.symbols) !== JSON.stringify(metadata.symbols)) throw new Error('Pinned Dizione symbols differ from the checkpoint symbol inventory');
  const audit = options.auditTexts?.length ? await verifyFixtureAudit(options.auditTexts) : undefined;
  const runtimeUrl = new URL(runtimeRoot, self.location.origin).href;
  ort = await import(new URL('ort.webgpu.min.mjs', runtimeUrl).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeUrl;
  ort.env.logLevel = 'error';
  const executionProviders = webgpu ? ['webgpu'] : ['wasm'];
  session = await ort.InferenceSession.create(modelBytes, { executionProviders });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) {
    throw new Error('Tiny Voca pt-BR ONNX graph names differ from pinned metadata');
  }
  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (webgpu && options.probe) {
      // Untimed inference proves the requested WebGPU path actually dispatched. The WASM EP remains only the ORT fallback for unsupported graph ops.
      const pcm = await generatePrepared('Olá.', null);
      if (!pcm.length) throw new Error('Tiny Voca pt-BR WebGPU probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Voca pt-BR probe');
  }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id,
    precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage, locale: activeLanguage,
      voice: activeVoice.id, voiceIndex: activeVoice.index, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames, precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion }, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders, wasmThreads: 1, graphOptimization: 'ONNX Runtime Web default',
      waveform: 'Released Brazilian Portuguese FP32 ONNX graph; source-span utterances concatenated without inserted audio, then one whole-span peak cap at 0.99.',
      unknownPhonePolicy: 'Use the pinned Dizione lexicon/rule fallback and released 55-symbol vocabulary; preserve emitted <unk> tokens. Fixture smoke records the exact token/stress oracle.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches in an untimed inference probe; ONNX Runtime Web may use internal WASM CPU kernels for operators without a WebGPU implementation, but the session requests WebGPU only.` : 'The session requests WebGPU only; ONNX Runtime Web may use internal WASM CPU kernels for operators without a WebGPU implementation. Run the separate probe to verify actual dispatch.')
        : 'Explicit ONNX Runtime Web 1.22.0 single-thread WASM provider; this is the CPU backend.',
    },
  };
}
async function generate(chunk, onFirstPcm) {
  if (!session || !frontend || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca pt-BR adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Voca pt-BR source chunk');
  const pcm = await generatePrepared(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  frontend = metadata = ort = activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca pt-BR worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') {
      try { await dispose(); } catch { /* Preserve the original initialization error. */ }
    }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
