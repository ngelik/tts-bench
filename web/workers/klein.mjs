import { phonemize } from '../klein/g2p.mjs';
import { fitPhoneChunks, gaussian, PAUSE_SECONDS, splitText, VOICE_NAMES } from '../klein/model.mjs';
import { createKleinSessionsSequentially } from '../klein/session-loader.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const BASE = '/models/klein-tts-x1.5-pro/25e0e73bebba71e5985bc369628ebdcb81bf7116/';
const RUNTIME = '/runtimes/onnxruntime-web/1.23.2/';
const VOICE_ID = 'af_heart';
let ort, encoder, decoder, info, style, voiceIndex;

const MODEL_INFO = Object.freeze({
  voice: 'Sarah (af_heart)', precision: 'FP32',
  settings: {
    threads: 1, speed: 1, sampleRate: 24000, voiceId: VOICE_ID,
    frontend: 'Klein-TTS upstream 0.2.0 Misaki G2P and pinned browser eSpeak 1.2.1 fallback; no-tie IPA mapping',
    sentenceChunks: 'Upstream 250-character sentence grouping; strict vocabulary validation; recursively split at source word boundaries instead of upstream silent 510-token truncation',
    noise: 'Upstream mulberry32 + Box-Muller; seed = canonical chunk id × 1024 + internal subchunk index',
    interChunkPauseSeconds: PAUSE_SECONDS,
  },
});

function unsupported(reason) {
  return { ...MODEL_INFO, status: 'unsupported', reason, backendEffective: 'none', capability: { gpuDispatchVerified: false, description: reason } };
}

function getVoiceIndex(id) {
  const index = info.speakers.indexOf(id);
  if (index < 0) throw new Error(`Klein checkpoint does not contain the selected voice ${id}.`);
  return index;
}

async function runPart(part, seed) {
  const { ids } = part;
  const n = ids.length + 2;
  const tokenTensor = new ort.Tensor('int64', BigInt64Array.from([0, ...ids, 0], BigInt), [1, n]);
  const styleTensor = new ort.Tensor('float32', style, [1, style.length]);
  const speedTensor = new ort.Tensor('float32', Float32Array.of(1), [1]);
  let encoded, decoded;
  try {
    encoded = await encoder.run({
      tokens: tokenTensor,
      style: styleTensor,
      speed: speedTensor,
    });
    const durations = encoded.durations.data;
    const features = encoded.features.data;
    const width = encoded.features.dims[2];
    const framesPerDuration = info.frames_per_duration;
    const repeats = Array.from(durations, value => Math.max(1, Math.round(value)) * framesPerDuration);
    const frameCount = repeats.reduce((sum, count) => sum + count, 0);
    const frames = new Float32Array(frameCount * width);
    let cursor = 0;
    for (let token = 0; token < n; token++) {
      const row = features.subarray(token * width, (token + 1) * width);
      for (let repeat = 0; repeat < repeats[token]; repeat++) {
        frames.set(row, cursor * width);
        cursor++;
      }
    }
    const samples = frameCount * info.hop;
    const channels = info.noise_channels;
    const frameTensor = new ort.Tensor('float32', frames, [1, frameCount, width]);
    const noiseTensor = new ort.Tensor('float32', gaussian(channels * samples, seed), [1, channels, samples]);
    try {
      decoded = await decoder.run({ frames: frameTensor, style: styleTensor, noise: noiseTensor });
      const audioTensor = decoded.audio;
      // ORT WebGPU resolves session.run only after producing a CPU-readable
      // output tensor. Await getData when exposed, then copy before disposal.
      const raw = typeof audioTensor.getData === 'function' ? await audioTensor.getData() : audioTensor.data;
      return Float32Array.from(raw);
    } finally {
      frameTensor.dispose();
      noiseTensor.dispose();
    }
  } finally {
    tokenTensor.dispose();
    styleTensor.dispose();
    speedTensor.dispose();
    if (encoded) for (const tensor of Object.values(encoded)) tensor.dispose();
    if (decoded) for (const tensor of Object.values(decoded)) tensor.dispose();
  }
}

async function generate(chunk) {
  if (!encoder || !decoder) throw new Error('Klein model is not initialized.');
  const parts = [];
  for (const text of splitText(chunk.text)) parts.push(...await fitPhoneChunks(text, phonemize, info.vocab));
  if (!parts.length) throw new Error(`Klein produced no phoneme chunks for canonical span ${chunk.id}.`);
  const rendered = [];
  for (let index = 0; index < parts.length; index++) {
    rendered.push(await runPart(parts[index], Number(chunk.id) * 1024 + index));
  }
  const pauseSamples = Math.round(PAUSE_SECONDS * info.sample_rate);
  const total = rendered.reduce((sum, part) => sum + part.length, 0) + pauseSamples * Math.max(0, rendered.length - 1);
  const audio = new Float32Array(total);
  let offset = 0;
  for (let index = 0; index < rendered.length; index++) {
    audio.set(rendered[index], offset);
    offset += rendered[index].length + (index + 1 < rendered.length ? pauseSamples : 0);
  }
  if (!audio.length || !audio.every(Number.isFinite)) throw new Error(`Klein returned empty or nonfinite PCM for canonical span ${chunk.id}.`);
  return { parts: [audio], sampleRate: info.sample_rate, completedChunkId: chunk.id };
}

async function loadJsonAndGraphs(backend) {
  const [modelResponse, encoderResponse, decoderResponse] = await Promise.all([
    fetch(BASE + 'model.json'),
    fetch(BASE + 'encoder.onnx'),
    fetch(BASE + 'decoder.onnx'),
  ]);
  if (![modelResponse, encoderResponse, decoderResponse].every(response => response.ok)) {
    throw new Error('Pinned Klein model files are missing from the verified local asset cache.');
  }
  const [modelJson, encoderBytes, decoderBytes] = await Promise.all([
    modelResponse.json(), encoderResponse.arrayBuffer(), decoderResponse.arrayBuffer(),
  ]);
  info = modelJson;
  if (info.sample_rate !== 24000 || info.speakers.length !== 17 || info.params !== 13122196) {
    throw new Error('Klein model metadata does not match the pinned X1.5 Pro checkpoint.');
  }
  voiceIndex = getVoiceIndex(VOICE_ID);
  style = Float32Array.from(info.styles[voiceIndex]);
  if (style.length !== info.styles[0].length) throw new Error('Klein voice style width is inconsistent.');
  const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  if (backend === 'webgpu') options.executionProviders = ['webgpu', 'wasm'];
  ({ encoder, decoder } = await createKleinSessionsSequentially(ort, encoderBytes, decoderBytes, options));
}

async function initialize({ backend, probe = false, probeText = 'A short local speech check.' }) {
  if (!['cpu', 'webgpu'].includes(backend)) return unsupported('Klein supports only CPU/WASM and WebGPU requests.');
  let gpu = backend === 'webgpu' ? await hardwareGpu() : null;
  if (backend === 'webgpu' && !gpu) return unsupported('No non-fallback hardware WebGPU adapter is available.');
  ort = await import(RUNTIME + (backend === 'cpu' ? 'ort.wasm.min.mjs' : 'ort.webgpu.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.logLevel = 'error';
  const wasm = 'ort-wasm-simd-threaded' + (backend === 'webgpu' ? '.asyncify' : '');
  ort.env.wasm.wasmPaths = { mjs: RUNTIME + wasm + '.mjs', wasm: RUNTIME + wasm + '.wasm' };
  await loadJsonAndGraphs(backend);
  if (backend === 'webgpu') {
    const adapter = ort.env.webgpu.adapter;
    const device = ort.env.webgpu.device;
    const info = device?.adapterInfo ?? adapter?.info;
    if (info?.isFallbackAdapter || adapter?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime selected a software WebGPU adapter.');
    }
    gpu = info?.description || info?.vendor || gpu;
  }
  let dispatches = null;
  if (probe) {
    const hook = backend === 'webgpu' ? dispatchProbe() : null;
    try {
      const out = await generate({ id: 0, text: probeText });
      if (!out.parts[0].every(Number.isFinite)) throw new Error('Klein probe returned nonfinite PCM.');
    } finally {
      dispatches = hook?.stop() ?? 0;
    }
    if (backend === 'webgpu' && !dispatches) {
      await dispose();
      return unsupported('No WebGPU compute dispatch was observed during the separate probe.');
    }
  }
  return {
    ...MODEL_INFO,
    status: 'measured',
    backendEffective: backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm',
    gpu,
    capability: {
      gpuDispatchVerified: backend === 'cpu' ? null : dispatches == null ? false : dispatches > 0,
      description: backend === 'cpu'
        ? 'Explicit one-thread WASM inference; browser eSpeak G2P is CPU work.'
        : `Non-fallback hardware adapter ${gpu}; observed ${dispatches ?? 0} compute dispatches in a separate untimed probe. WebGPU with possible WASM operator fallback; eSpeak preprocessing and CPU-readable PCM readback are CPU work.`,
    },
  };
}

async function dispose() {
  await Promise.all([encoder?.release(), decoder?.release()].filter(Boolean));
  encoder = null;
  decoder = null;
  info = null;
  style = null;
  voiceIndex = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk);
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Klein action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
