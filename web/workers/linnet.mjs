import { fetchModelAsset } from '../cache-model-asset.mjs';
import { widenSafetensorsIntoWasm } from '../linnet/safetensors-widen.mjs';

const MODEL = 'linnet-en-35m';
const REVISION = 'a75fdfe50bc3d3e776b9c5040f149f49a054aaf5';
const MODEL_ROOT = `/models/${MODEL}/${REVISION}/`;
const WASM_URL = '/runtimes/linnet-tts/0.1.1/linnet-tts-0.1.1.wasm';
const GPU_PROBE_WASM_URL = '/runtimes/linnet-tts/0.1.1/linnet-tts-webgpu-probe.wasm';
const GPU_PROBE_WASM_CACHE_VERSION = 'linnet-v0.1.1-webgpu-probe-29dfdd503a3930e4e36c1130e4c9aab0592201ca';
const WEBGPU_MIN_MACS = 32 * 1024;
const PRESET_VOICE = 'linnet-en-f1';
const PARAMETERS = Object.freeze({ temperature: 0.3, cfg: 2.0, seed: 0 });
const info = {
  voice: PRESET_VOICE,
  precision: 'FP16 weights widened to FP32 in WASM memory for SIMD128 kernels',
  settings: {
    sampleRate: 24000,
    threads: 1,
    seed: PARAMETERS.seed,
    temperature: PARAMETERS.temperature,
    classifierFreeGuidance: PARAMETERS.cfg,
    stop: 'Official LinnetTTS browser session defaults; one step emits up to 80 ms',
    runtimeRelease: 'Official VoxRT LinnetTTS browser WASM 0.1.1',
    modelRevision: REVISION,
  },
};

let wasm = null;
let voiceId = null;
let sampleRate = null;
let gpuEnabled = false;
let gpuAdapterInfo = null;
let gpuDispatchCount = 0;
let uploadedWeightKeys = new Set();
const yieldChannel = new MessageChannel();
let resumeSynthesis = null;
yieldChannel.port1.onmessage = () => {
  const resume = resumeSynthesis;
  resumeSynthesis = null;
  resume?.();
};
const yieldToWorkerQueue = () => new Promise(resolve => {
  resumeSynthesis = resolve;
  yieldChannel.port2.postMessage(0);
});

const unsupported = reason => ({
  ...info,
  backendEffective: 'none',
  status: 'unsupported',
  reason,
  capability: { gpuDispatchVerified: false, description: reason },
});

function requireExports(exports) {
  const required = ['memory', 'lt_alloc', 'lt_free', 'lt_load', 'lt_voice', 'lt_start', 'lt_step',
    'lt_chunk_ptr', 'lt_sample_rate', 'lt_error_ptr', 'lt_error_len'];
  for (const name of required) if (!(name in exports)) throw new Error('Official Linnet WASM is missing export ' + name);
  return exports;
}

function copyToWasm(bytes) {
  let pointer;
  try { pointer = wasm.lt_alloc(bytes.length); }
  catch (error) { throw new Error('Official Linnet WASM input allocation trapped for ' + bytes.length + ' bytes: ' + (error?.message ?? String(error))); }
  if (!Number.isInteger(pointer) || pointer <= 0 || pointer + bytes.length > wasm.memory.buffer.byteLength) {
    throw new Error('WASM could not allocate Linnet input bytes');
  }
  new Uint8Array(wasm.memory.buffer, pointer, bytes.length).set(bytes);
  return pointer;
}

function lastError() {
  const pointer = wasm.lt_error_ptr();
  const length = wasm.lt_error_len();
  if (!Number.isInteger(pointer) || !Number.isInteger(length) || length < 0 || pointer + length > wasm.memory.buffer.byteLength) {
    return 'Official Linnet runtime returned an invalid error buffer';
  }
  return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, pointer, length));
}

async function assetBytes(path) {
  let response;
  try { response = await fetchModelAsset(MODEL_ROOT + path, REVISION); }
  catch (error) { throw new Error('Failed to fetch Linnet asset ' + path + ': ' + (error?.message ?? String(error))); }
  return new Uint8Array(await response.arrayBuffer());
}

function linnetGpuDispatch(aPointer, bPointer, outputPointer, m, k, n, transposeB) {
  const macs = m * k * n;
  if (!gpuEnabled || macs < WEBGPU_MIN_MACS) return 0;
  if (!self.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') {
    throw new Error('The Linnet hybrid path requires cross-origin isolation and SharedArrayBuffer.');
  }
  const memory = wasm?.memory?.buffer;
  const bCount = transposeB ? n * k : k * n;
  if (!memory || !Number.isSafeInteger(aPointer) || !Number.isSafeInteger(bPointer) || !Number.isSafeInteger(outputPointer) ||
      aPointer + m * k * 4 > memory.byteLength || bPointer + bCount * 4 > memory.byteLength || outputPointer + m * n * 4 > memory.byteLength) {
    throw new Error('The Linnet WebGPU operation received a pointer outside WASM memory.');
  }
  const lhs = new Float32Array(memory, aPointer, m * k);
  const rhs = new Float32Array(memory, bPointer, bCount);
  const weightKey = `${bPointer}:${bCount}:${transposeB ? 't' : 'n'}`;
  const weightBuffer = uploadedWeightKeys.has(weightKey) ? null : new SharedArrayBuffer(rhs.byteLength);
  if (weightBuffer) new Float32Array(weightBuffer).set(rhs);
  const stateBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const errorBuffer = new SharedArrayBuffer(512);
  const inputBuffer = new SharedArrayBuffer(lhs.byteLength);
  const outputBuffer = new SharedArrayBuffer(m * n * Float32Array.BYTES_PER_ELEMENT);
  new Float32Array(inputBuffer).set(lhs);
  self.postMessage({ type: 'linnet-gpu-request', request: {
    m, k, n, transposeB: transposeB !== 0, weightKey, weightBuffer, stateBuffer, errorBuffer, inputBuffer, outputBuffer,
  } });
  const waitResult = Atomics.wait(new Int32Array(stateBuffer), 0, 0, 120000);
  const state = Atomics.load(new Int32Array(stateBuffer), 0);
  if (state !== 1) {
    const bytes = new Uint8Array(errorBuffer);
    const end = bytes.indexOf(0);
    const reason = new TextDecoder().decode(bytes.subarray(0, end < 0 ? bytes.length : end));
    throw new Error(reason || `Linnet WebGPU dispatch failed with state ${state} (${waitResult}).`);
  }
  uploadedWeightKeys.add(weightKey);
  new Float32Array(memory, outputPointer, m * n).set(new Float32Array(outputBuffer));
  gpuDispatchCount++;
  return 1;
}

async function load({ webgpu = false } = {}) {
  let response;
  const url = webgpu ? GPU_PROBE_WASM_URL : WASM_URL;
  const cacheVersion = webgpu ? GPU_PROBE_WASM_CACHE_VERSION : REVISION;
  try { response = await fetchModelAsset(url, cacheVersion); }
  catch (error) { throw new Error('Failed to fetch official Linnet WASM: ' + (error?.message ?? String(error))); }
  if (!response.ok) throw new Error('Official Linnet WASM could not be loaded (HTTP ' + response.status + ')');
  const wasmBytes = await response.arrayBuffer();
  const imports = webgpu ? { env: { linnet_gpu_dispatch: linnetGpuDispatch } } : {};
  const instantiated = await WebAssembly.instantiate(wasmBytes, imports);
  wasm = requireExports(instantiated.instance.exports);

  const [weights, tokenizer, voice] = await Promise.all([
    assetBytes('linnet-en-35m.fp16.safetensors'),
    assetBytes('tokenizer.model'),
    assetBytes('voices/linnet-en-f1.npy'),
  ]);

  // The first-party browser worker keeps the widened model allocation for the
  // lifetime of the WASM module; mirror that ownership/lifetime here.
  const expanded = widenSafetensorsIntoWasm(weights, wasm.lt_alloc, wasm.memory);
  let tokenizerPointer = 0;
  try {
    tokenizerPointer = copyToWasm(tokenizer);
    let status;
    try { status = wasm.lt_load(expanded.pointer, expanded.bytes, tokenizerPointer, tokenizer.length); }
    catch (error) { throw new Error('Official Linnet WASM model load trapped: ' + (error?.message ?? String(error))); }
    if (status !== 0) throw new Error(lastError() || 'Official Linnet model load failed');
  } finally {
    if (tokenizerPointer) wasm.lt_free(tokenizerPointer, tokenizer.length);
    if (webgpu) wasm.lt_free(expanded.pointer, expanded.bytes);
  }

  const voicePointer = copyToWasm(voice);
  try {
    try { voiceId = wasm.lt_voice(voicePointer, voice.length); }
    catch (error) { throw new Error('Official Linnet WASM voice load trapped: ' + (error?.message ?? String(error))); }
    if (!Number.isInteger(voiceId) || voiceId < 0) throw new Error(lastError() || 'Official Linnet preset voice failed to load');
  } finally {
    wasm.lt_free(voicePointer, voice.length);
  }
  try { sampleRate = wasm.lt_sample_rate(); }
  catch (error) { throw new Error('Official Linnet WASM sample-rate query trapped: ' + (error?.message ?? String(error))); }
  if (sampleRate !== 24000) throw new Error('Linnet returned an unexpected sample rate: ' + sampleRate);
}

async function synthesize(text, onFirstPcm) {
  const encoded = new TextEncoder().encode(text);
  if (!encoded.length) throw new Error('Linnet received an empty source chunk');
  const textPointer = copyToWasm(encoded);
  try {
    let status;
    try {
      status = wasm.lt_start(voiceId, textPointer, encoded.length,
        PARAMETERS.temperature, PARAMETERS.cfg, PARAMETERS.seed);
    } catch (error) { throw new Error('Official Linnet WASM utterance start trapped: ' + (error?.message ?? String(error))); }
    if (status !== 0) throw new Error(lastError() || 'Linnet could not start an utterance');
  } finally {
    wasm.lt_free(textPointer, encoded.length);
  }

  const parts = [];
  for (;;) {
    let count;
    try { count = wasm.lt_step(); }
    catch (error) { throw new Error('Official Linnet WASM inference step trapped: ' + (error?.message ?? String(error))); }
    if (count === 0) break;
    if (!Number.isInteger(count) || count < 0 || count > 24_000) {
      throw new Error(count < 0 ? lastError() || 'Linnet inference step failed.' : 'Linnet returned an invalid PCM step length');
    }
    const pointer = wasm.lt_chunk_ptr();
    if (!Number.isInteger(pointer) || pointer < 0 || pointer + count * 4 > wasm.memory.buffer.byteLength) {
      throw new Error('Linnet returned a PCM range outside WASM memory');
    }
    const pcm = new Float32Array(wasm.memory.buffer, pointer, count).slice();
    const invalidIndex = pcm.findIndex(sample => !Number.isFinite(sample));
    if (!pcm.length || invalidIndex !== -1) {
      throw new Error('Linnet returned ' + pcm.length + ' PCM samples; first non-finite sample index: ' + invalidIndex +
        (invalidIndex === -1 ? '' : ' value: ' + String(pcm[invalidIndex])));
    }
    onFirstPcm?.();
    parts.push(pcm);
    await yieldToWorkerQueue();
  }
  if (!parts.length) throw new Error('Linnet returned no speech for source chunk');
  return parts;
}

async function initialize({ backend, probe, probeText, gpuAdapterInfo: adapterInfo, allowSoftwareGpu = false }) {
  const webgpu = backend === 'webgpu';
  if (backend !== 'cpu' && !webgpu) return unsupported('The official LinnetTTS browser runtime does not support the requested backend.');
  if (webgpu) {
    gpuAdapterInfo = adapterInfo ?? null;
    if (!gpuAdapterInfo?.available) return unsupported(gpuAdapterInfo?.reason || 'No WebGPU adapter is available for Linnet.');
    if (gpuAdapterInfo.isFallbackAdapter && !allowSoftwareGpu) {
      return unsupported('Only a software WebGPU adapter is available; hardware inference is unverified.');
    }
    gpuEnabled = true;
    gpuDispatchCount = 0;
    uploadedWeightKeys = new Set();
  } else {
    gpuEnabled = false;
    gpuAdapterInfo = null;
  }
  await load({ webgpu });
  if (probe) {
    const parts = await synthesize(probeText || 'A short Linnet browser speech check.');
    if (!parts.length || !parts.some(part => part.some(sample => sample !== 0))) throw new Error('Linnet diagnostic inference returned silence');
    if (webgpu && gpuDispatchCount === 0) return unsupported('The Linnet probe completed without dispatching a dense operation to WebGPU.');
  }
  const executionProvider = webgpu
    ? `WebGPU dense matrix operations >=${WEBGPU_MIN_MACS} MACs plus official Linnet WASM SIMD128/CPU kernels for remaining operations${gpuAdapterInfo.isFallbackAdapter ? ' (software diagnostic adapter)' : ''}`
    : 'official LinnetTTS WebAssembly SIMD128';
  return {
    ...info,
    status: 'measured',
    backendEffective: webgpu ? 'webgpu/wasm-hybrid' : 'cpu/wasm',
    settings: {
      ...info.settings,
      ...(webgpu ? {
        runtimeRelease: 'Source-built VoxRT LinnetTTS v0.1.1 Apache Rust runtime',
        runtimeSourceCommit: '29dfdd503a3930e4e36c1130e4c9aab0592201ca',
      } : {}),
      executionProvider,
      ...(webgpu ? { webgpuMinMacs: WEBGPU_MIN_MACS, webgpuAdapter: gpuAdapterInfo } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (probe ? gpuDispatchCount > 0 : null) : null,
      description: webgpu
        ? `${executionProvider}; one CPU WASM worker synchronously hands dense operations to a sibling WebGPU worker and reads results back.`
        : 'Official LinnetTTS WebAssembly SIMD128 inference runs on one browser CPU thread.',
    },
  };
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      let first = false;
      let parts;
      try {
        parts = await synthesize(data.chunk.text, () => {
          if (first) return;
          first = true;
          self.postMessage({ id: data.id, event: 'first-pcm' });
        });
      } catch (error) { throw new Error('Linnet source span ' + data.chunk.id + ': ' + (error?.message ?? String(error))); }
      value = { parts, sampleRate, completedChunkId: data.chunk.id };
    } else if (data.action === 'dispose') {
      if (gpuEnabled) wasm?.lt_dispose?.();
      wasm = null;
      voiceId = null;
      sampleRate = null;
      gpuEnabled = false;
      gpuAdapterInfo = null;
      uploadedWeightKeys = new Set();
      value = true;
    } else throw new Error('Unknown Linnet worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
