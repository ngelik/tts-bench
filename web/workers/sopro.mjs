import { SoproTTS } from '../sopro/sopro.mjs';
import { referencePcm, rejectTruncation } from '../sopro/reference.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { dispatchProbe } from './gpu-probe.mjs';

const revision = '9fe97bddf52ed785af3634db86a032bb7e07bf18';
const base = '/models/sopro-v2-turbo/' + revision;
const ortBase = '/runtimes/onnxruntime-web/1.31.1/';
const options = { language: 'en', seed: 1, temperature: 0.8, topP: 0.9, topK: 25,
  steps: 2, maxSeconds: 30, minSeconds: 0.4, maxSegmentChars: 300 };
const common = { ...options, threads: 4, referenceSeconds: 10, memory: 'fast', sampleRate: 24000,
  referenceSha256: '9a4e3fa7966b13dff25b31b02350ff70681b2e618ca5a634abe0d9a90401de0e',
  runtime: 'Sopro 0.3.0 / ONNX Runtime Web 1.31.1' };
const voice = 'Tiny Voca F2 synthetic English reference';
let runtime, reference;

async function generate(chunk, onFirst) {
  const parts = [];
  for await (const pcm of runtime.stream(chunk.text, reference, options)) {
    if (!(pcm instanceof Float32Array) || !pcm.length) continue;
    parts.push(Float32Array.from(pcm));
    if (parts.length === 1) onFirst?.();
  }
  if (!parts.length) throw new Error('Sopro produced no PCM for span ' + chunk.id);
  return { parts, sampleRate: runtime.sampleRate, completedChunkId: chunk.id };
}

async function initialize({ backend, probe, probeText }) {
  const gpuMode = backend === 'webgpu';
  const profile = gpuMode ? 'webgpu-fp16' : 'wasm-uint8';
  const precision = gpuMode ? 'Official webgpu-fp16 mixed precision' : 'Official wasm-uint8 mixed precision';
  const settings = { ...common, profile };
  const unsupported = reason => ({ voice, precision, settings, status: 'unsupported', reason,
    backendEffective: 'none', capability: { gpuDispatchVerified: false, description: reason } });
  let gpu;
  if (gpuMode) {
    const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter || !adapter.features.has('shader-f16')) {
      return unsupported('The official desktop WebGPU export needs a hardware adapter with shader-f16');
    }
    gpu = adapter.info?.description || adapter.info?.vendor || 'Hardware WebGPU';
  }
  if (!self.crossOriginIsolated || !globalThis.SharedArrayBuffer) throw new Error('Sopro needs cross-origin isolation for four WASM threads');
  const binary = 'ort-wasm-simd-threaded' + (gpuMode ? '.asyncify' : '');
  const wasmPaths = { wasm: ortBase + binary + '.wasm', mjs: ortBase + binary + '.mjs' };
  runtime = await SoproTTS.create({ modelBaseUrl: base, backend: gpuMode ? 'webgpu' : 'wasm', revision,
    cache: true, threads: 4, memory: 'fast', wasmPaths });
  if (runtime.backend !== profile || runtime.sampleRate !== 24000) throw new Error('Unexpected Sopro export profile or sample rate');
  rejectTruncation(runtime.tokenizer);
  const pcm = referencePcm(await (await fetchModelAsset(base + '/voice-f2.wav', revision)).arrayBuffer());
  reference = await runtime.prepareReference(pcm, { seconds: 10, sampleRate: 24000, cache: false });
  await runtime.prepareStreaming(reference, options);
  let dispatches = 0;
  if (probe) {
    const counter = gpuMode ? dispatchProbe() : null;
    try {
      const { parts } = await generate({ id: 0, text: probeText });
      if (!parts.every(part => part.every(Number.isFinite)) || !parts.some(part => part.some(sample => sample !== 0))) {
        throw new Error('Invalid Sopro probe waveform');
      }
    } finally { dispatches = counter?.stop() ?? 0; }
    if (gpuMode && dispatches === 0) return unsupported('No hardware compute dispatch during the Sopro waveform probe');
  }
  return { status: 'measured', voice, precision, settings, gpu, backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm',
    capability: { gpuDispatchVerified: gpuMode ? dispatches > 0 : null, description: gpuMode ?
      dispatches + ' probe compute dispatches. Reference and semantic stages use WASM; acoustic and vocoder graphs request WebGPU.' :
      'All inference stages explicitly use the official CPU WASM profile with four threads.' } };
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      try { value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' })); }
      catch (error) { throw new Error('Sopro source span ' + data.chunk.id + ': ' + (error?.message ?? String(error))); }
    }
    else if (data.action === 'dispose') { await runtime?.dispose(); runtime = null; reference = null; }
    else throw new Error('Unknown Sopro worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: error?.message ?? String(error) });
  }
};
