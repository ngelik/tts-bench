import { fetchModelAsset } from '../cache-model-asset.mjs';
import { loadDizione, modelBase, revision } from '../tiny-voca/dizione.mjs';
import { sentences, fit } from '../tiny-voca/frontend.mjs';
import { hardwareGpu, dispatchProbe } from './gpu-probe.mjs';

const ortBase = '/runtimes/onnxruntime-web/1.23.2/';
const info = {
  voice: 'F2 (American English)', precision: 'FP32',
  settings: { voiceId: 0, language: 'en', speed: 1, pitchShift: 0, pitchRange: 1, sampleRate: 24000,
    threads: 1, frontend: 'Dizione via Pyodide 0.26.4 / NumPy 1.26.4. Official sentence and phoneme-budget splitting.',
    noise: 'ONNX graph samples internal noise without a seed input.', runtimeRelease: 'onnxruntime-web@1.23.2' },
};
let ort, session, config, phonemize;

async function synthesize(phones) {
  const ids = values => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
  const scalar = value => new ort.Tensor('float32', Float32Array.of(value), [1]);
  const inputs = { tokens: ids(phones.ids), stress: ids(phones.stress), voice: new ort.Tensor('int64', BigInt64Array.of(0n), [1]),
    speed: scalar(1), pitch_shift: scalar(0), pitch_range: scalar(1) };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const expected = outputs.durations.data.reduce((sum, frames) => sum + Number(frames), 0) * config.hop;
    const pcm = Float32Array.from(outputs.audio.data);
    if (!pcm.length || pcm.length !== expected) throw new Error('Tiny Voca audio length differs from predicted durations');
    return pcm;
  } finally {
    for (const tensor of Object.values(inputs)) tensor.dispose();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
  }
}

async function generate(chunk, onFirst) {
  const parts = [];
  for (const sentence of sentences(chunk.text)) {
    const phones = fit(sentence, text => JSON.parse(phonemize(text)), config.model.max_tokens - 12);
    for (const utterance of phones) {
      parts.push(await synthesize(utterance));
      if (parts.length === 1) onFirst?.();
    }
  }
  if (!parts.length) throw new Error('Tiny Voca received an empty speech span');
  return { parts, sampleRate: config.sample_rate, completedChunkId: chunk.id };
}

const unsupported = reason => ({ ...info, backendEffective: 'none', status: 'unsupported', reason,
  capability: { gpuDispatchVerified: false, description: reason } });

async function initialize({ backend, probe, probeText }) {
  const gpuMode = backend === 'webgpu';
  let gpu = gpuMode ? await hardwareGpu() : null;
  if (gpuMode && !gpu) return unsupported('Hardware WebGPU unavailable');
  ort = await import(ortBase + (gpuMode ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const binary = 'ort-wasm-simd-threaded' + (gpuMode ? '.asyncify' : '');
  ort.env.wasm.wasmPaths = { mjs: ortBase + binary + '.mjs', wasm: ortBase + binary + '.wasm' };
  config = await (await fetchModelAsset(modelBase + 'config.json', revision)).json();
  if (config.voices[0] !== 'F2' || config.sample_rate !== 24000 || config.hop !== 256) throw new Error('Unexpected Tiny Voca config');
  phonemize = await loadDizione();
  const bytes = await (await fetchModelAsset(modelBase + 'onnx/model.onnx', revision)).arrayBuffer();
  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(bytes, { executionProviders });
  if (gpuMode) {
    const device = await ort.env.webgpu.device;
    const adapter = ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.info?.isFallbackAdapter || adapter?.isFallbackAdapter) return unsupported('ORT selected a software adapter');
    gpu = device?.adapterInfo?.description || adapter?.info?.vendor || gpu;
  }
  let count = 0;
  if (probe) {
    const hook = gpuMode ? dispatchProbe() : null;
    try {
      const { parts } = await generate({ id: 0, text: probeText });
      if (!parts.every(p => p.every(Number.isFinite)) || !parts.some(p => p.some(v => v !== 0))) throw new Error('Invalid probe PCM');
    } finally { count = hook?.stop() ?? 0; }
    if (gpuMode && !count) return unsupported('No WebGPU compute dispatch observed during speech synthesis');
  }
  return { ...info, status: 'measured', settings: { ...info.settings, executionProviders },
    backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu,
    capability: { gpuDispatchVerified: gpuMode ? count > 0 : null, description: gpuMode ?
      count + ' compute dispatches in the untimed probe. Dizione runs locally on CPU, with WASM fallback for ONNX operators.' :
      'Explicit single-thread WebAssembly inference with local Dizione phonemization.' } };
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await session?.release(); phonemize?.destroy(); }
    else throw new Error('Unknown Tiny Voca action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(p => p.buffer) ?? []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
