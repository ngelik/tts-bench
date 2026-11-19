import { fetchModelAsset } from '../cache-model-asset.mjs';
import { phonemizeEnglish } from '../inflect-atom/frontend.mjs';
import { dispatchProbe } from './gpu-probe.mjs';
const ROOT = '/models/inflect-atom-v3/';
const ORT = '/runtimes/onnxruntime-web/1.23.2/';
const REVISION = '6d517b3580e0167556148770760bbbb6a8870b99';
const RATE = 24000;
const INFO = {
  voice: 'Cassidy (official fixed voice, index 2)', precision: 'FP32 ONNX acoustic core; FP32 DSP with FP64 long-utterance phase accumulation',
  settings: {
    sampleRate: RATE, speakerId: 2, seed: 7717, speed: 1, maxFrames: 4096,
    frontend: 'eSpeak NG 1.52.0 + Misaki 0.9.4 espeak-light mapping; CR/LF/TAB converted to spaces before G2P; unknown phones fail',
    chunking: 'Canonical spans; upstream 510-phone limit and greedy 200-phone internal splitting when needed, 80 ms internal pauses',
    noiseGenerator: 'Pinned C++ MT19937 + polar Box-Muller standard-normal noise; same browser stream on both providers, not PyTorch bitwise RNG parity',
    runtime: 'ONNX Runtime Web 1.23.2; Emscripten 3.1.74 DSP and eSpeak; encoder always WASM',
    executionProviders: [],
  },
};
let ort, encoder, decoder, dsp, espeak, constants, vocab, chosenBackend;
async function bytes(name) {
  const response = await fetchModelAsset(ROOT + name, REVISION);
  if (!response.ok) throw new Error(`Atom asset ${name}: HTTP ${response.status}`);
  return response.arrayBuffer();
}
const json = async (name) => JSON.parse(new TextDecoder().decode(await bytes(name)));
const unsupported = (reason) => ({ ...INFO, status: 'unsupported', reason, backendEffective: 'none', capability: { gpuDispatchVerified: false, description: reason } });

function phones(text) {
  return phonemizeEnglish(text, (input) => espeak.ccall('atom_espeak', 'string', ['string'], [input]));
}
function pieces(text) {
  const full = phones(text);
  if (full.length <= 510) return [full];
  const words = text.match(/\s*\S+\s*/gu) ?? [];
  if (words.join('') !== text) throw new Error('Atom splitter did not preserve complete input');
  const output = [];
  let current = '';
  let currentPhones = '';
  for (const word of words) {
    const next = phones(current + word);
    if (next.length <= 200) { current += word; currentPhones = next; continue; }
    if (current) output.push(currentPhones);
    current = word; currentPhones = phones(word);
    if (currentPhones.length > 200) throw new Error('One whitespace-delimited unit exceeds the official 200-phone splitting limit');
  }
  if (current) output.push(currentPhones);
  return output;
}
function render(features, frames, seed) {
  const allocations = [];
  function allocate(values) {
    const pointer = dsp._malloc(values.length * 4);
    if (!pointer) throw new Error('Atom DSP allocation failed');
    allocations.push(pointer);
    dsp.HEAPF32.set(values, pointer / 4);
    return pointer;
  }
  try {
    const featurePointers = features.map(allocate);
    const noise = allocate(new Float32Array(frames * 300));
    dsp._atom_noise(noise, frames * 300, seed >>> 0);
    const theta = allocate(constants.theta);
    const fir = allocate(constants.fir);
    const output = allocate(new Float32Array(frames * 300));
    const status = dsp._atom_render(...featurePointers, noise, theta, fir, frames, constants.f0_mean[2], constants.f0_std[2], output);
    if (status !== 0) throw new Error(`Atom DSP rejected its waveform (status ${status})`);
    return dsp.HEAPF32.slice(output / 4, output / 4 + frames * 300);
  } finally { for (const pointer of allocations) dsp._free(pointer); }
}
async function infer(phonemes, seed) {
  const tokens = [0];
  for (const phone of phonemes) {
    if (!Object.hasOwn(vocab, phone)) throw new Error(`Atom vocabulary has no ${JSON.stringify(phone)}`);
    tokens.push(vocab[phone]);
  }
  tokens.push(0);
  if (tokens.length < 3 || tokens.length > 512) throw new Error('Atom input exceeds the official token limit');
  const tensors = new Set();
  const tensor = (kind, values, dimensions) => { const value = new ort.Tensor(kind, values, dimensions); tensors.add(value); return value; };
  const remember = (values) => { for (const value of Object.values(values)) tensors.add(value); return values; };
  try {
    const encoded = remember(await encoder.run({ ids: tensor('int64', BigInt64Array.from(tokens, BigInt), [1, tokens.length]), speaker: tensor('int64', BigInt64Array.of(2n), [1]) }));
    const durations = await encoded.durations.getData();
    let frames = 0;
    for (const count of durations) {
      const value = Number(count);
      if (!Number.isSafeInteger(value) || value < 1) throw new Error('Atom returned invalid token durations');
      frames += value;
    }
    if (frames < 2 || frames > 4096) throw new Error(`Atom predicted ${frames} frames; refusing truncation`);
    const decoded = remember(await decoder.run({ encoded: encoded.encoded, durations: tensor('float32', Float32Array.from(durations, Number), [1, tokens.length]), pitch: encoded.pitch, frames: tensor('float32', Float32Array.from({ length: frames }, (_, i) => i), [frames]) }));
    const features = [];
    for (const [name, bands] of [['f0_norm', 1], ['voiced_logits', 1], ['harmonic_log', 40], ['noise_log', 24]]) {
      const values = await decoded[name].getData();
      if (!(values instanceof Float32Array) || values.length !== frames * bands || !values.every(Number.isFinite)) throw new Error(`Atom ${name} feature shape/values invalid`);
      features.push(values);
    }
    return render(features, frames, seed);
  } finally { for (const value of tensors) value.dispose(); }
}
async function generate(chunk) {
  if (!encoder || !decoder) throw new Error('Atom not initialized');
  const split = pieces(chunk.text);
  const parts = [];
  for (let i = 0; i < split.length; i++) {
    if (i) parts.push(new Float32Array(RATE * 0.08));
    parts.push(await infer(split[i], 7717 + i));
  }
  return { parts, sampleRate: RATE, completedChunkId: chunk.id };
}
async function initialize({ backend, probe = false, probeText = 'A short browser speech check.' }) {
  if (!['cpu', 'webgpu'].includes(backend)) return unsupported('Explicit CPU/WASM and WebGPU only');
  let adapter;
  if (backend === 'webgpu') {
    adapter = await navigator.gpu?.requestAdapter();
    if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return unsupported('No hardware WebGPU adapter available');
  }
  chosenBackend = backend;
  const providers = backend === 'cpu' ? ['wasm'] : ['webgpu', 'wasm'];
  try {
    ort = await import(ORT + (backend === 'cpu' ? 'ort.wasm.min.mjs' : 'ort.webgpu.min.mjs'));
    ort.env.logLevel = 'error'; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
    const base = backend === 'cpu' ? 'ort-wasm-simd-threaded' : 'ort-wasm-simd-threaded.asyncify';
    ort.env.wasm.wasmPaths = { mjs: ORT + base + '.mjs', wasm: ORT + base + '.wasm' };
    if (adapter) ort.env.webgpu.adapter = adapter;
    constants = await json('dsp.json'); vocab = await json('vocab.json');
    const createDsp = (await import(ROOT + 'dsp.mjs')).default;
    dsp = await createDsp({ wasmBinary: await bytes('dsp.wasm') });
    const createEspeak = (await import(ROOT + 'espeak.mjs')).default;
    const espeakData = await bytes('espeak.data');
    espeak = await createEspeak({ wasmBinary: await bytes('espeak.wasm'), getPreloadedPackage: () => espeakData });
    if (espeak._atom_espeak_init() !== 0) throw new Error('Pinned eSpeak English initialization failed');
    encoder = await ort.InferenceSession.create(await bytes('encoder.onnx'), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    decoder = await ort.InferenceSession.create(await bytes('decoder.onnx'), { executionProviders: providers, graphOptimizationLevel: 'all', preferredOutputLocation: 'cpu' });
    let dispatches = 0;
    if (probe) {
      const hook = backend === 'webgpu' ? dispatchProbe() : null;
      try {
        const output = await generate({ id: 'atom-capability', text: probeText });
        if (!output.parts.length || !output.parts.every((part) => part.length && part.every(Number.isFinite))) throw new Error('Atom capability PCM invalid');
      } finally { dispatches = hook?.stop() ?? 0; }
      if (backend === 'webgpu' && !dispatches) { await dispose(); return unsupported('No actual WebGPU decoder compute dispatch observed'); }
    }
    return { ...INFO, settings: { ...INFO.settings, executionProviders: providers, encoderExecutionProviders: ['wasm'], decoderExecutionProviders: providers }, status: 'measured', backendEffective: backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm', ...(adapter ? { gpu: adapter.info?.description || adapter.info?.vendor || 'Hardware WebGPU' } : {}), capability: { gpuDispatchVerified: backend === 'cpu' ? null : probe ? dispatches > 0 : null, description: backend === 'cpu' ? 'One-thread WASM acoustic inference and local WASM DSP/frontend' : `Convolution decoder uses WebGPU with WASM fallback; GRU encoder and DSP remain WASM. Untimed dispatches: ${dispatches}.` } };
  } catch (error) { await dispose().catch(() => {}); throw error; }
}
async function dispose() {
  const old = [encoder, decoder]; encoder = decoder = null;
  for (const session of old) await session?.release();
  dsp = espeak = constants = vocab = ort = null; chosenBackend = null;
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await generate(data.chunk);
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Atom worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map((part) => part.buffer) ?? []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
