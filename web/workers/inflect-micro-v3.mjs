import { phonemizeMicroEnglish } from '../inflect-micro-v3/g2p.mjs';
import { INTERNAL_GAP_SAMPLES, MAX_PHONEMES, prepareMicroText } from '../inflect-micro-v3/frontend.mjs';
import { sourceFilterSynthesis } from '../inflect-micro-v3/dsp.mjs';
import { assertMicroTextFeatureDimensions, assertMicroTokenIdCount, buildMicroFramePlan, MICRO_MAX_FRAMES, MICRO_SPEED, microStyleRow } from '../inflect-micro-v3/contract.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const MODEL_ROOT = '/models/inflect-micro-v3/c1a7db6ef44c931623fc2028cb0409659b83156c/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.23.2/';
const SAMPLE_RATE = 24_000;
const VOICE = 'Cassidy (fixed voice 2)';
const VOICE_ID = 2;
const SPEED = MICRO_SPEED;
const BASE_SEED = 42;
const MODEL_INFO = Object.freeze({
  voice: VOICE,
  precision: 'FP32 exported ONNX text/prosody/joint graphs plus FP32 style bank',
  settings: {
    voiceId: VOICE_ID,
    speed: SPEED,
    seed: BASE_SEED,
    sampleRate: SAMPLE_RATE,
    threads: 1,
    frontend: 'Conservative numeric preparation, pinned 220-character source-preserving splitting, Klein 0.2.0 English G2P adaptation, strict exported 178-symbol vocabulary; native Misaki parity is not claimed.',
    waveform: 'Custom real-valued port of pinned 600/150 Hann source-filter STFT/iSTFT; fixed Cassidy style; JavaScript seeded Gaussian source differs from PyTorch RNG sequence.',
    chunking: `Maximum 220 characters per internal utterance, strict 512-token limit, ${INTERNAL_GAP_SAMPLES} silent samples (120 ms) between internal utterances only; no truncation.`,
    seedSchedule: 'Seed resets per canonical span: (42 + canonicalSpanId × 1024 + internalUtteranceIndex) modulo 2^32.',
    executionProviders: [],
  },
});

let ort = null;
let textFeaturesSession = null;
let textProsodySession = null;
let jointSession = null;
let vocab = null;
let styles = null;
let backendEffective = null;
let restoreFetch = null;

function unsupported(reason) {
  return {
    ...MODEL_INFO,
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function installLocalFetch() {
  if (restoreFetch) return;
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const requested = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requested, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Inflect Micro v3 refused non-local fetch: ${url.origin}`);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

async function localResponse(path) {
  const response = await fetch(MODEL_ROOT + path);
  if (!response.ok) throw new Error(`Inflect Micro v3 local asset fetch failed: ${path} HTTP ${response.status}`);
  return response;
}

async function localBytes(path) {
  return localResponse(path).then(response => response.arrayBuffer());
}

async function tensorData(tensor, expectedType, label) {
  if (!tensor || !Array.isArray(tensor.dims)) throw new Error(`Inflect Micro v3 ${label} tensor is missing.`);
  const value = typeof tensor.getData === 'function' ? await tensor.getData() : tensor.data;
  if (!(value instanceof expectedType)) throw new Error(`Inflect Micro v3 ${label} tensor returned unexpected data type.`);
  return value;
}

function registerOutputs(collection, output) {
  if (!output || typeof output !== 'object') throw new Error('Inflect Micro v3 ONNX call returned no outputs.');
  for (const tensor of Object.values(output)) if (tensor && typeof tensor.dispose === 'function') collection.add(tensor);
  return output;
}

function disposeTensors(collection) {
  let firstError = null;
  for (const tensor of collection) {
    try { tensor.dispose(); } catch (error) { firstError ??= error; }
  }
  collection.clear();
  if (firstError) throw new Error(`Inflect Micro v3 tensor disposal failed: ${String(firstError?.message ?? firstError)}`);
}

function seedFor(chunkId, utteranceIndex) {
  if (!Number.isSafeInteger(chunkId) || chunkId < 0 || !Number.isSafeInteger(utteranceIndex) || utteranceIndex < 0) {
    throw new Error('Inflect Micro v3 requires numeric canonical-span and utterance IDs.');
  }
  return (BASE_SEED + chunkId * 1024 + utteranceIndex) >>> 0;
}

function pauseSamples() { return new Float32Array(INTERNAL_GAP_SAMPLES); }

async function runUtterance(utterance, seed) {
  const tensors = new Set();
  try {
    const inputIds = BigInt64Array.from(utterance.ids, value => BigInt(value));
    if (utterance.phones.length > MAX_PHONEMES) {
      throw new Error('Inflect Micro v3 token count exceeds the pinned model boundary.');
    }
    assertMicroTokenIdCount(inputIds.length);
    const idsTensor = new ort.Tensor('int64', inputIds, [1, inputIds.length]);
    tensors.add(idsTensor);
    const features = registerOutputs(tensors, await textFeaturesSession.run({ input_ids: idsTensor }, [
      'durations', 'duration_features', 'asr_tokens',
    ]));
    const durationData = await tensorData(features.durations, Float32Array, 'duration');
    const tokenCount = inputIds.length;
    assertMicroTextFeatureDimensions(
      features.durations.dims,
      features.duration_features.dims,
      features.asr_tokens.dims,
      tokenCount,
    );
    const plan = buildMicroFramePlan(durationData, tokenCount);
    if (features.asr_tokens.dims[1] !== 512) throw new Error('Inflect Micro v3 ASR feature width differs from 512.');
    const alignment = new ort.Tensor('float32', plan.alignment, [1, tokenCount, plan.frameCount]);
    tensors.add(alignment);
    const prosody = registerOutputs(tensors, await textProsodySession.run({
      duration_features: features.duration_features,
      asr_tokens: features.asr_tokens,
      alignment,
    }, ['asr', 'f0', 'noise']));
    if (prosody.asr.dims?.length !== 3 || prosody.asr.dims[0] !== 1 || prosody.asr.dims[1] !== 512
      || prosody.asr.dims[2] !== plan.frameCount || prosody.f0.dims?.length !== 2
      || prosody.f0.dims[1] !== 2 * plan.frameCount || prosody.noise.dims?.length !== 2
      || prosody.noise.dims[1] !== 2 * plan.frameCount) {
      throw new Error('Inflect Micro v3 prosody graph returned unexpected dimensions.');
    }
    const styleRow = microStyleRow(utterance.phones.length);
    const style = styles.slice(styleRow * 128, (styleRow + 1) * 128);
    const styleTensor = new ort.Tensor('float32', style, [1, 128]);
    tensors.add(styleTensor);
    const coefficients = registerOutputs(tensors, await jointSession.run({
      asr: prosody.asr,
      f0: prosody.f0,
      noise: prosody.noise,
      style: styleTensor,
    }, ['gains', 'pulse_shift', 'burst_gains']));
    const [gainData, shiftData, burstData] = await Promise.all([
      tensorData(coefficients.gains, Float32Array, 'source-filter gains'),
      tensorData(coefficients.pulse_shift, Float32Array, 'pulse shift'),
      tensorData(coefficients.burst_gains, Float32Array, 'burst gains'),
    ]);
    const [f0Data] = await Promise.all([tensorData(prosody.f0, Float32Array, 'F0')]);
    for (const [label, data] of [['gains', gainData], ['pulse shift', shiftData], ['burst gains', burstData], ['F0', f0Data]]) {
      if (!data.length || !data.every(Number.isFinite)) throw new Error(`Inflect Micro v3 ${label} contains no finite values.`);
    }
    const pcm = sourceFilterSynthesis({
      f0: f0Data,
      gains: { data: gainData, dims: coefficients.gains.dims },
      pulseShift: shiftData,
      burstGains: { data: burstData, dims: coefficients.burst_gains.dims },
      seed,
    });
    if (pcm.length !== plan.frameCount * 600 || !pcm.length || !pcm.every(Number.isFinite)) {
      throw new Error('Inflect Micro v3 source-filter synthesis returned invalid sample coverage.');
    }
    return pcm;
  } finally {
    disposeTensors(tensors);
  }
}

async function generate(chunk, onFirstPcm) {
  if (!textFeaturesSession || !textProsodySession || !jointSession || !vocab || !styles) {
    throw new Error('Inflect Micro v3 has not been initialized.');
  }
  if (!chunk || typeof chunk.text !== 'string' || !chunk.text.trim() || !Number.isSafeInteger(chunk.id) || chunk.id < 0) {
    throw new Error('Inflect Micro v3 needs nonempty text and a numeric canonical-span ID.');
  }
  const prepared = await prepareMicroText(chunk.text, { phonemize: phonemizeMicroEnglish, vocab });
  if (!prepared.utterances.length || prepared.utterances.some(item => !item.ids.length)) {
    throw new Error(`Inflect Micro v3 frontend returned no tokens for canonical span ${chunk.id}.`);
  }
  const pieces = [];
  let first = true;
  for (const utterance of prepared.utterances) {
    const seed = seedFor(chunk.id, utterance.index);
    let pcm;
    try {
      pcm = await runUtterance(utterance, seed);
    } catch (error) {
      throw new Error(`Inflect Micro v3 synthesis failed at canonical span ${chunk.id}, internal utterance ${utterance.index + 1}/${prepared.utterances.length}, voiceId=${VOICE_ID}, seed=${seed}, paddedTokenIds=${utterance.ids.length}: ${String(error?.message ?? error)}`);
    }
    if (!pcm.length || !pcm.every(Number.isFinite)) throw new Error(`Inflect Micro v3 returned invalid PCM for canonical span ${chunk.id}.`);
    if (!first) pieces.push(pauseSamples());
    pieces.push(pcm);
    if (first) { first = false; onFirstPcm?.(); }
  }
  const totalSamples = pieces.reduce((sum, part) => sum + part.length, 0);
  if (!Number.isSafeInteger(totalSamples) || totalSamples <= 0) throw new Error('Inflect Micro v3 returned no audio samples.');
  const audio = new Float32Array(totalSamples);
  let offset = 0;
  for (const piece of pieces) { audio.set(piece, offset); offset += piece.length; }
  if (offset !== totalSamples || !audio.every(Number.isFinite)) throw new Error('Inflect Micro v3 output assembly failed.');
  return { parts: [audio], sampleRate: SAMPLE_RATE, completedChunkId: chunk.id };
}

async function initialize({ backend, probe = false, probeText = 'A short browser speech check.' }) {
  if (!['cpu', 'webgpu'].includes(backend)) return unsupported('Inflect Micro v3 supports explicit CPU/WASM and WebGPU providers only.');
  let gpu = null;
  let selectedAdapter = null;
  if (backend === 'webgpu') {
    gpu = await hardwareGpu();
    if (!gpu) return unsupported('No hardware WebGPU adapter is available; software fallback is not ranked.');
    try { selectedAdapter = await navigator.gpu.requestAdapter(); }
    catch (error) { return unsupported('WebGPU adapter request failed: ' + String(error?.message ?? error)); }
    if (!selectedAdapter || selectedAdapter.isFallbackAdapter || selectedAdapter.info?.isFallbackAdapter) {
      return unsupported('No non-fallback hardware WebGPU adapter is available.');
    }
  }
  installLocalFetch();
  try {
    ort = await import(ORT_ROOT + (backend === 'cpu' ? 'ort.wasm.min.mjs' : 'ort.webgpu.min.mjs'));
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const wasm = 'ort-wasm-simd-threaded' + (backend === 'webgpu' ? '.asyncify' : '');
    ort.env.wasm.wasmPaths = { mjs: ORT_ROOT + wasm + '.mjs', wasm: ORT_ROOT + wasm + '.wasm' };
    if (backend === 'webgpu') ort.env.webgpu.adapter = selectedAdapter;
    const [manifestBytes, vocabBytes, styleBytes, featuresBytes, prosodyBytes, jointBytes] = await Promise.all([
      localBytes('manifest.json'), localBytes('vocab.json'), localBytes('cassidy-style-bank.f32'),
      localBytes('text-features.onnx'), localBytes('text-prosody.onnx'), localBytes('joint-coefficients.onnx'),
    ]);
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (manifest.schema !== 'inflect-micro-v3-browser-onnx-v1'
      || manifest.modelRevision !== 'c1a7db6ef44c931623fc2028cb0409659b83156c'
      || manifest.voice !== 'cassidy' || manifest.voiceId !== VOICE_ID
      || manifest.sampleRate !== SAMPLE_RATE || manifest.precision !== 'FP32'
      || manifest.internalGapSamples !== INTERNAL_GAP_SAMPLES || manifest.maxFrames !== MICRO_MAX_FRAMES) {
      throw new Error('Inflect Micro v3 export manifest does not match the pinned checkpoint and inference contract.');
    }
    vocab = JSON.parse(new TextDecoder().decode(vocabBytes));
    if (!vocab || typeof vocab !== 'object' || Array.isArray(vocab)
      || Object.keys(vocab).length === 0
      || Object.entries(vocab).some(([symbol, id]) => [...symbol].length !== 1 || !Number.isSafeInteger(id) || id <= 0 || id >= 178)
      || new Set(Object.values(vocab)).size !== Object.keys(vocab).length) {
      throw new Error('Inflect Micro v3 exported 178-symbol vocabulary is invalid.');
    }
    if (styleBytes.byteLength !== 510 * 128 * Float32Array.BYTES_PER_ELEMENT) {
      throw new Error('Inflect Micro v3 Cassidy style-bank size differs from 510×128 FP32 values.');
    }
    styles = new Float32Array(styleBytes);
    if (!styles.every(Number.isFinite)) throw new Error('Inflect Micro v3 Cassidy style bank contains nonfinite values.');
    const executionProviders = backend === 'cpu' ? ['wasm'] : ['webgpu', 'wasm'];
    const sessionOptions = {
      executionProviders,
      graphOptimizationLevel: 'all',
      ...(backend === 'webgpu' ? { preferredOutputLocation: 'cpu' } : {}),
    };
    textFeaturesSession = await ort.InferenceSession.create(featuresBytes, sessionOptions);
    textProsodySession = await ort.InferenceSession.create(prosodyBytes, sessionOptions);
    jointSession = await ort.InferenceSession.create(jointBytes, sessionOptions);
    backendEffective = backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm';
    if (backend === 'webgpu') {
      const device = await ort.env.webgpu.device;
      const actualAdapter = ort.env.webgpu.adapter;
      const actualInfo = device?.adapterInfo ?? actualAdapter?.info;
      if (actualInfo?.isFallbackAdapter || actualAdapter?.isFallbackAdapter) {
        await dispose();
        return unsupported('ONNX Runtime selected a software WebGPU fallback adapter.');
      }
      gpu = actualInfo?.description || actualInfo?.vendor || gpu;
    }
  } catch (error) {
    await dispose().catch(() => {});
    throw error;
  }

  let dispatches = null;
  if (probe) {
    const hook = backend === 'webgpu' ? dispatchProbe() : null;
    try {
      const result = await generate({ id: 0, text: probeText });
      if (!result.parts.length || result.parts.every(part => !part.length || !part.every(Number.isFinite))) {
        throw new Error('Inflect Micro v3 untimed inference probe returned invalid PCM.');
      }
    } catch (error) {
      await dispose().catch(() => {});
      throw error;
    } finally {
      dispatches = hook?.stop() ?? 0;
    }
    if (backend === 'webgpu' && dispatches === 0) {
      await dispose();
      return unsupported('No actual WebGPU dispatch was observed during Inflect Micro v3 inference.');
    }
  }

  return {
    ...MODEL_INFO,
    settings: { ...MODEL_INFO.settings, executionProviders: backend === 'cpu' ? ['wasm'] : ['webgpu', 'wasm'] },
    status: 'measured',
    backendEffective,
    ...(backend === 'webgpu' ? { gpu } : {}),
    capability: {
      gpuDispatchVerified: backend === 'cpu' ? null : probe ? dispatches > 0 : null,
      description: backend === 'cpu'
        ? probe ? 'Explicit one-thread ONNX Runtime WASM; untimed PCM inference passed.' : 'Explicit one-thread ONNX Runtime WASM provider.'
        : probe
          ? `Observed ${dispatches} ONNX WebGPU dispatches during untimed model inference; source-filter DSP and final PCM assembly ran in JavaScript on CPU. Output tensors were read back to CPU; probe hooks were removed before timed work.`
          : 'WebGPU with WASM fallback configured; dispatch was not probed in this initialization.',
    },
  };
}

async function dispose() {
  const sessions = [textFeaturesSession, textProsodySession, jointSession];
  textFeaturesSession = null;
  textProsodySession = null;
  jointSession = null;
  vocab = null;
  styles = null;
  backendEffective = null;
  ort = null;
  let firstError = null;
  for (const session of sessions) {
    try { await session?.release(); } catch (error) { firstError ??= error; }
  }
  restoreFetch?.();
  restoreFetch = null;
  if (firstError) throw new Error('Inflect Micro v3 session disposal failed: ' + String(firstError?.message ?? firstError));
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') {
      value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    } else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Inflect Micro v3 worker action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
