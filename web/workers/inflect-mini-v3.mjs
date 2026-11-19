import { prepareMicroText } from '../inflect-micro-v3/frontend.mjs';
import { phonemizeMicroEnglish } from '../inflect-micro-v3/g2p.mjs';
import { dispatchProbe } from './gpu-probe.mjs';
import { inflectMiniSourceFeatures } from '../inflect-mini-v3/source-dsp.mjs';

const MODEL_ROOT = '/models/inflect-mini-v3-browser-port/fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.23.2/';
const SAMPLE_RATE = 24000;
const SPEAKER_ID = 2;
const BASE_SEED = 42;
const MAX_PHONEMES = 510;
const MAX_FRAMES = 1200;
const CLOCK_SAMPLES_PER_FRAME = 600;
const STYLE_DIM = 128;
const HARMONIC_COUNT = 9;
const SOURCE_BINS = 11;
const SOURCE_NFFT = 20;
const SOURCE_HOP = 5;
const SOURCE_UPSAMPLE_SCALE = 300;
const FRONTEND_DESCRIPTION = 'Distinct browser-port configuration: pinned Inflect v3 numeric normalization and source-preserving 220-character split; Klein 0.2.0 browser G2P port with the pinned English lexicon and local browser eSpeak fallback. Native Mini uses Misaki 0.9.4 with bundled eSpeak; this frontend is an adaptation and has not been qualified for exact native-output parity. Checkpoint phoneme mapping rejects unknown symbols.';
const INFO = {
  voice: 'Cassidy (synthetic preset; pinned Mini speaker 2, af_sarah donor bank; browser-port profile)',
  precision: 'FP32 ONNX browser port; not exact native waveform parity',
  settings: {
    configuration: 'inflect-mini-v3-browser-port; separate from official/native Inflect Mini v3 execution',
    sampleRate: SAMPLE_RATE,
    speed: 1,
    speakerId: SPEAKER_ID,
    style: 'Pinned native length-indexed Cassidy style table; one row per phoneme count.',
    seed: '42 + canonical chunk id + internal utterance index (uint32); Mulberry32 + Box-Muller excitation. Not PyTorch bitwise RNG parity.',
    runtime: 'ONNX Runtime Web 1.23.2; pinned Inflect Mini v3 opset-17 FP32 graphs.',
    frontend: FRONTEND_DESCRIPTION,
    chunking: 'Pinned native-v3 exact source-preserving 220-character internal splitter; 120 ms silence between generated internal utterances.',
    waveform: 'Offline full-utterance graph execution; first PCM follows completion/readback of the first internal utterance. No trimming, fades, gain, or clipping.',
    sourceFrontend: 'Standalone Float32 CPU harmonic source and source-STFT port; the waveform neural graph receives these features in a separate ONNX session. Strict native waveform parity remains failed and is reported in the pinned conversion artifact.',
    executionProviders: [],
  },
};

let ort = null;
let sessions = [];
let vocab = null;
let styleTable = null;
let sourceLinearParameters = null;
let phonemize = null;
let restoreFetch = null;
let backendEffective = null;
let activeNeuralDispatchCount = null;

function unsupported(reason) {
  return {
    ...INFO,
    settings: { ...INFO.settings, executionProviders: [] },
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function installLocalFetch() {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const requested = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requested, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Inflect Mini attempted a non-local fetch: ${url.origin}`);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

async function localBytes(path) {
  const url = MODEL_ROOT + path;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Inflect Mini local asset fetch failed: ${path} HTTP ${response.status}`);
  return response.arrayBuffer();
}

function disposeTensor(tensor) {
  if (typeof tensor?.dispose === 'function') tensor.dispose();
  else tensor?.release?.();
}

async function runSession(session, feeds, outputNames) {
  const inputs = {};
  const owned = [];
  try {
    for (const [name, spec] of Object.entries(feeds)) {
      const tensor = new ort.Tensor(spec.type, spec.data, spec.dims);
      inputs[name] = tensor;
      owned.push(tensor);
    }
    const dispatchHook = session === sessions[2] && activeNeuralDispatchCount !== null
      ? dispatchProbe()
      : null;
    let outputs;
    try {
      outputs = await session.run(inputs, outputNames);
    } finally {
      if (dispatchHook) activeNeuralDispatchCount += dispatchHook.stop();
    }
    for (const output of Object.values(outputs)) owned.push(output);
    const copied = {};
    for (const name of outputNames) {
      const output = outputs[name];
      if (!output || !Array.isArray(output.dims)) throw new Error(`Inflect Mini graph omitted ${name}.`);
      const data = typeof output.getData === 'function' ? await output.getData() : output.data;
      if (!(data instanceof Float32Array)) throw new Error(`Inflect Mini ${name} output is not FP32.`);
      copied[name] = { data: new Float32Array(data), dims: [...output.dims] };
    }
    return copied;
  } finally {
    for (const tensor of owned) disposeTensor(tensor);
  }
}

function roundTiesToEven(value) {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction < 0.5) return floor;
  if (fraction > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

function makeAlignment(durations, tokenCount) {
  if (durations.length !== tokenCount || durations.length === 0) {
    throw new Error('Inflect Mini duration graph returned an incomplete token clock.');
  }
  const counts = new Int32Array(tokenCount);
  let frames = 0;
  for (let index = 0; index < tokenCount; index++) {
    const duration = durations[index];
    if (!Number.isFinite(duration) || Math.abs(duration) >= 1e7) {
      throw new Error('Inflect Mini duration graph returned invalid duration values.');
    }
    const count = Math.max(1, roundTiesToEven(duration));
    counts[index] = count;
    frames += count;
  }
  if (frames < 2 || frames > MAX_FRAMES) {
    throw new Error(`Inflect Mini predicted ${frames} frames; the pinned native limit is ${MAX_FRAMES}, with no truncation.`);
  }
  const alignment = new Float32Array(tokenCount * frames);
  let offset = 0;
  for (let token = 0; token < tokenCount; token++) {
    for (let frame = 0; frame < counts[token]; frame++) alignment[token * frames + offset + frame] = 1;
    offset += counts[token];
  }
  if (offset !== frames) throw new Error('Inflect Mini alignment frame count mismatch.');
  return { alignment, frames };
}

function randomSource(seed) {
  let state = seed >>> 0;
  let spare = null;
  function uniform() {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  function normal() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const u1 = Math.max(uniform(), 1e-12);
    const u2 = uniform();
    const radius = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  }
  return { uniform, normal };
}

function sourceExcitation(seed, frames) {
  const random = randomSource(seed);
  const phase = new Float32Array(HARMONIC_COUNT);
  for (let index = 0; index < HARMONIC_COUNT; index++) phase[index] = index === 0 ? 0 : random.uniform();
  const noise = new Float32Array(CLOCK_SAMPLES_PER_FRAME * frames * HARMONIC_COUNT);
  for (let index = 0; index < noise.length; index++) noise[index] = random.normal();
  return { phase, noise };
}

function chunkSeed(chunkId, utteranceIndex) {
  const chunkIndex = Number.isSafeInteger(Number(chunkId)) && Number(chunkId) >= 0 ? Number(chunkId) : 0;
  return (BASE_SEED + chunkIndex + utteranceIndex) >>> 0;
}

function styleFor(phones) {
  const phoneCount = Array.from(phones).length;
  if (phoneCount < 1 || phoneCount > MAX_PHONEMES) {
    throw new Error(`Inflect Mini phoneme count ${phoneCount} is outside 1–${MAX_PHONEMES}; no truncation.`);
  }
  if (!styleTable || styleTable.length !== MAX_PHONEMES * STYLE_DIM) {
    throw new Error('Inflect Mini Cassidy style table is unavailable or malformed.');
  }
  const begin = (phoneCount - 1) * STYLE_DIM;
  return styleTable.slice(begin, begin + STYLE_DIM);
}

async function synthesizeUtterance(utterance, seed) {
  const ids = BigInt64Array.from(utterance.ids, value => BigInt(value));
  const duration = await runSession(sessions[0], {
    ids: { type: 'int64', data: ids, dims: [1, ids.length] },
  }, ['durations', 'duration_features', 'asr_tokens']);
  if (duration.durations.dims.length !== 2 || duration.durations.dims[1] !== ids.length) {
    throw new Error('Inflect Mini duration graph token dimension differs from its input.');
  }
  const { alignment, frames } = makeAlignment(duration.durations.data, ids.length);
  const bridge = await runSession(sessions[1], {
    duration_features: { type: 'float32', data: duration.duration_features.data, dims: duration.duration_features.dims },
    asr_tokens: { type: 'float32', data: duration.asr_tokens.data, dims: duration.asr_tokens.dims },
    alignment: { type: 'float32', data: alignment, dims: [1, ids.length, frames] },
  }, ['hidden', 'f0']);
  if (JSON.stringify(bridge.hidden.dims) !== JSON.stringify([1, 512, 2 * frames])
      || JSON.stringify(bridge.f0.dims) !== JSON.stringify([1, 2 * frames])) {
    throw new Error('Inflect Mini bridge returned an invalid 2× prosody/frame clock.');
  }
  const excitation = sourceExcitation(seed, frames);
  const style = styleFor(utterance.phones);
  if (!sourceLinearParameters || sourceLinearParameters.length !== HARMONIC_COUNT + 1) {
    throw new Error('Inflect Mini source-linear DSP parameters are unavailable or malformed.');
  }
  const source = inflectMiniSourceFeatures({
    f0: bridge.f0.data,
    frameCount: frames,
    phaseUniform: excitation.phase,
    harmonicNoise: excitation.noise,
    linearWeights: sourceLinearParameters.subarray(0, HARMONIC_COUNT),
    linearBias: sourceLinearParameters[HARMONIC_COUNT],
    sampleRate: SAMPLE_RATE,
    upsampleScale: SOURCE_UPSAMPLE_SCALE,
    nFft: SOURCE_NFFT,
    hopLength: SOURCE_HOP,
  });
  const generated = await runSession(sessions[2], {
    hidden: { type: 'float32', data: bridge.hidden.data, dims: bridge.hidden.dims },
    style: { type: 'float32', data: style, dims: [1, STYLE_DIM] },
    source_spec: { type: 'float32', data: source.sourceSpec,
      dims: [1, 2 * SOURCE_BINS, source.stftFrames] },
  }, ['waveform']);
  const expectedSamples = CLOCK_SAMPLES_PER_FRAME * frames;
  if (JSON.stringify(generated.waveform.dims) !== JSON.stringify([1, expectedSamples])
      || generated.waveform.data.length !== expectedSamples) {
    throw new Error('Inflect Mini waveform sample clock differs from its predicted frame count.');
  }
  return generated.waveform.data;
}

function pause() {
  return new Float32Array(Math.round(SAMPLE_RATE * 0.12));
}

async function generate(chunk, onFirst) {
  if (!sessions.length || !phonemize || !vocab) throw new Error('Inflect Mini has not been initialized.');
  if (typeof chunk?.text !== 'string' || !chunk.text.trim()) throw new Error('Inflect Mini received an empty canonical span.');
  const prepared = await prepareMicroText(chunk.text, { phonemize, vocab });
  const utterances = prepared?.utterances;
  if (!Array.isArray(utterances) || !utterances.length) throw new Error('Inflect Mini frontend returned no internal utterances.');
  const parts = [];
  let firstReported = false;
  for (const utterance of utterances) {
    if (typeof utterance?.phones !== 'string' || !Array.isArray(utterance?.ids) || utterance.ids.length < 3) {
      throw new Error('Inflect Mini frontend returned a malformed utterance.');
    }
    if (parts.length) parts.push(pause());
    const pcm = await synthesizeUtterance(utterance, chunkSeed(chunk.id, utterance.index));
    if (!pcm.length) throw new Error('Inflect Mini returned empty PCM for an internal utterance.');
    parts.push(pcm);
    if (!firstReported) {
      firstReported = true;
      onFirst?.();
    }
  }
  return { parts, sampleRate: SAMPLE_RATE, completedChunkId: chunk.id };
}

async function dispose() {
  const previous = sessions;
  sessions = [];
  backendEffective = null;
  activeNeuralDispatchCount = null;
  ort = null;
  vocab = null;
  styleTable = null;
  sourceLinearParameters = null;
  phonemize?.dispose?.();
  phonemize = null;
  restoreFetch?.();
  restoreFetch = null;
  let firstError = null;
  for (const session of previous) {
    try { await session.release(); }
    catch (error) { firstError ??= error; }
  }
  if (firstError) throw new Error('Inflect Mini session disposal failed: ' + String(firstError?.message ?? firstError));
}

async function initialize({ backend, probe = false, probeText = 'A short browser speech check.' }) {
  if (!['cpu', 'webgpu'].includes(backend)) return unsupported('Inflect Mini supports explicit CPU/WASM and WebGPU providers only.');
  let adapter = null;
  let gpu = null;
  if (backend === 'webgpu') {
    if (!navigator.gpu) return unsupported('Chrome does not expose WebGPU.');
    try { adapter = await navigator.gpu.requestAdapter(); }
    catch (error) { return unsupported('WebGPU adapter request failed: ' + String(error?.message ?? error)); }
    if (!adapter) return unsupported('No hardware WebGPU adapter is available.');
    if (adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return unsupported('Software WebGPU adapters are not ranked.');
    gpu = adapter.info?.description || adapter.info?.vendor || 'Hardware WebGPU adapter';
  }

    const executionProviders = backend === 'cpu' ? ['wasm'] : ['webgpu', 'wasm'];
  installLocalFetch();
  try {
    ort = await import(ORT_ROOT + (backend === 'cpu' ? 'ort.wasm.min.mjs' : 'ort.webgpu.min.mjs'));
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const wasmBase = backend === 'webgpu' ? 'ort-wasm-simd-threaded.asyncify' : 'ort-wasm-simd-threaded';
    ort.env.wasm.wasmPaths = { mjs: ORT_ROOT + wasmBase + '.mjs', wasm: ORT_ROOT + wasmBase + '.wasm' };
    if (backend === 'webgpu') ort.env.webgpu.adapter = adapter;

    const [durationBytes, bridgeBytes, waveformBytes, styleBytes, vocabBytes, sourceLinearBytes] = await Promise.all([
      localBytes('onnx/text-duration.onnx'),
      localBytes('onnx/text-bridge.onnx'),
      localBytes('onnx/waveform-generator.onnx'),
      localBytes('cassidy-style-table.f32'),
      localBytes('phoneme-vocab.json'),
      localBytes('source-linear-weights.f32'),
    ]);
    if (styleBytes.byteLength !== MAX_PHONEMES * STYLE_DIM * Float32Array.BYTES_PER_ELEMENT) {
      throw new Error('Inflect Mini Cassidy style table has an unexpected byte length.');
    }
    styleTable = new Float32Array(styleBytes.slice(0));
    if (sourceLinearBytes.byteLength !== (HARMONIC_COUNT + 1) * Float32Array.BYTES_PER_ELEMENT) {
      throw new Error('Inflect Mini source-linear DSP parameters have an unexpected byte length.');
    }
    sourceLinearParameters = new Float32Array(sourceLinearBytes.slice(0));
    vocab = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(vocabBytes));
    if (!vocab || typeof vocab !== 'object' || Array.isArray(vocab)) throw new Error('Inflect Mini checkpoint vocabulary is malformed.');
    phonemize = phonemizeMicroEnglish;
    const sessionOptions = {
      executionProviders,
      graphOptimizationLevel: 'all',
      ...(backend === 'webgpu' ? { preferredOutputLocation: 'cpu' } : {}),
    };
    // Keep creation serial; some browser providers cannot initialize multiple
    // graph sessions concurrently against one device.
    sessions.push(await ort.InferenceSession.create(durationBytes, sessionOptions));
    sessions.push(await ort.InferenceSession.create(bridgeBytes, sessionOptions));
    sessions.push(await ort.InferenceSession.create(waveformBytes, sessionOptions));
    backendEffective = backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm';
    if (backend === 'webgpu') {
      const actualDevice = await ort.env.webgpu.device;
      const actualAdapter = ort.env.webgpu.adapter;
      const actualInfo = actualDevice?.adapterInfo ?? actualAdapter?.info;
      if (actualInfo?.isFallbackAdapter || actualAdapter?.isFallbackAdapter) {
        await dispose();
        return unsupported('ONNX Runtime selected a software fallback WebGPU adapter.');
      }
      gpu = actualInfo?.description || actualInfo?.vendor || gpu;
    }
  } catch (error) {
    await dispose().catch(() => {});
    throw error;
  }

  let dispatches = 0;
  if (probe) {
    activeNeuralDispatchCount = backend === 'webgpu' ? 0 : null;
    try {
      const output = await generate({ id: 'inflect-mini-probe', text: probeText });
      if (!output.parts.some(part => part.length > 0)) throw new Error('Inflect Mini untimed capability synthesis returned no PCM.');
    } catch (error) {
      await dispose().catch(() => {});
      throw error;
    } finally {
      dispatches = activeNeuralDispatchCount ?? 0;
      activeNeuralDispatchCount = null;
    }
    if (backend === 'webgpu' && dispatches === 0) {
      await dispose();
      return unsupported('No actual WebGPU compute dispatch was observed during Inflect Mini synthesis.');
    }
  }

  return {
    ...INFO,
    settings: { ...INFO.settings, executionProviders },
    status: 'measured',
    backendEffective,
    ...(backend === 'webgpu' ? { gpu } : {}),
    capability: {
      gpuDispatchVerified: backend === 'cpu' ? null : probe ? dispatches > 0 : null,
      description: backend === 'cpu'
        ? probe ? 'Explicit one-thread ONNX Runtime Web WASM; an untimed Mini utterance completed.' : 'Explicit one-thread ONNX Runtime Web WASM provider.'
        : probe
          ? `Observed ${dispatches} WebGPU compute dispatches in the waveform neural graph during untimed Mini synthesis; deterministic source excitation and STFT run in standalone CPU DSP, and WASM handles unsupported neural operators. Dispatch probe is removed before timed work.`
          : 'WebGPU + WASM operator fallback configured; no dispatch probe was requested.',
    },
  };
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Inflect Mini worker action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
