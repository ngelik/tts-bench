import { observeComputeDispatches, requestHardwareWebGpuAdapter } from '../piper/webgpu.mjs';
import { KaleTTS } from '/models/kale-tts-1-nano/js/kale-tts.mjs';

const ROOT = '/models/kale-tts-1-nano/';
const RUNTIME = '/runtimes/onnxruntime-web/1.31.1/';
const VOICE_ID = 's057b';
const VOICE = 'Kenzie (s057b)';
const SAMPLE_RATE = 24000;
const GAP_SAMPLES = 2880;
const PROFILES = {
  int8: { backend: 'cpu', graph: 'kale-tts-1-nano.onnx', precision: 'INT8 decoder / FP32 timing' },
  fp32: { backend: 'webgpu', graph: 'kale-tts-1-nano.fp32.onnx', precision: 'FP32' },
};
const CPU_LSTM_NODES = ['lstms.0', 'lstms.2', 'lstms.4', 'lstm', 'shared', 'lstm_1']
  .map(name => `/g/${name}/LSTM`);

let frontend, ort, session;
const voiceTensors = {};

async function generate(chunk, firstPcm) {
  const parts = [];
  for await (const { inputs } of frontend.inputs(chunk.text, { voice: VOICE_ID })) {
    const feeds = { ...voiceTensors };
    const transient = [];
    let outputs;
    try {
      for (const [name, input] of Object.entries(inputs)) {
        if (Object.hasOwn(feeds, name)) continue;
        const tensor = new ort.Tensor(input.type, input.data, input.dims);
        feeds[name] = tensor;
        transient.push(tensor);
      }
      outputs = await session.run(feeds);
      const pcm = await outputs[session.outputNames[0]].getData();
      if (!(pcm instanceof Float32Array) || pcm.length === 0) throw new Error('Kale returned empty or non-FP32 audio');
      parts.push(Float32Array.from(pcm), new Float32Array(GAP_SAMPLES));
      if (parts.length === 2) firstPcm?.();
    } finally {
      for (const tensor of transient) tensor.dispose();
      for (const tensor of Object.values(outputs ?? {})) tensor.dispose();
    }
  }
  if (!parts.length) throw new Error(`Kale frontend produced no speech for span ${chunk.id}`);
  return { parts, sampleRate: SAMPLE_RATE, completedChunkId: chunk.id };
}

async function initialize({ backend, profile, probe, probeText }) {
  const { backend: requiredBackend, graph, precision } = PROFILES[profile];
  const useGpu = backend === 'webgpu';
  const settings = {
    language: 'en',
    locale: 'en-US',
    graph,
    threads: 1,
    speed: 1,
    sampleRate: SAMPLE_RATE,
    runtime: 'ONNX Runtime Web 1.31.1',
    graphOptimizationLevel: 'all',
    frontend: 'Official Kale normalization, English dictionary/G2P, and Kokoro-native tokenization',
    sentencePauseMs: 120,
    forcedCpuNodes: useGpu ? CPU_LSTM_NODES : [],
    executionProviders: useGpu ? ['webgpu', 'wasm'] : ['wasm'],
  };
  const unsupported = reason => ({
    status: 'unsupported', reason, backendEffective: 'none', voice: VOICE, precision, settings,
    capability: { gpuDispatchVerified: false, description: reason },
  });
  if (backend !== requiredBackend) return unsupported(`This Kale export is configured for ${requiredBackend}.`);

  const hardware = useGpu ? await requestHardwareWebGpuAdapter(navigator.gpu) : null;
  if (hardware?.reason) return unsupported(hardware.reason);

  ort = await import(RUNTIME + (useGpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = settings.threads;
  ort.env.wasm.proxy = false;
  ort.env.logLevel = 'error';
  const wasm = 'ort-wasm-simd-threaded' + (useGpu ? '.asyncify' : '');
  ort.env.wasm.wasmPaths = { mjs: RUNTIME + wasm + '.mjs', wasm: RUNTIME + wasm + '.wasm' };
  if (hardware) ort.env.webgpu.adapter = hardware.adapter;

  frontend = await KaleTTS.prepare(ROOT, { frontend: ROOT + 'frontend/' });
  const voice = frontend.listVoices().find(candidate => candidate.id === VOICE_ID);
  if (voice?.name !== 'Kenzie' || voice.accent !== 'en-us' || frontend.sampleRate !== SAMPLE_RATE) {
    throw new Error('Pinned Kale voice or sample rate differs from the benchmark profile');
  }
  // The pinned frontend supplies one constant tensor set per voice.
  const voiceFeeds = (await frontend._loadVoice(VOICE_ID)).feeds;
  const response = await fetch(ROOT + graph);
  if (!response.ok) throw new Error(`Missing Kale graph: ${response.status}`);
  const executionProviders = useGpu
    ? [{ name: 'webgpu', forceCpuNodeNames: CPU_LSTM_NODES }, 'wasm']
    : ['wasm'];
  session = await ort.InferenceSession.create(new Uint8Array(await response.arrayBuffer()), {
    executionProviders,
    graphOptimizationLevel: settings.graphOptimizationLevel,
  });
  for (const [name, input] of Object.entries(voiceFeeds)) {
    voiceTensors[name] = new ort.Tensor(input.type, input.data, input.dims);
  }

  let dispatches = 0;
  if (probe) {
    const hook = useGpu ? observeComputeDispatches() : null;
    try {
      const output = await generate({ id: 'probe', text: probeText });
      if (!output.parts.every(part => part.every(Number.isFinite))) throw new Error('Kale produced nonfinite probe PCM');
    } finally {
      dispatches = hook?.stop() ?? 0;
    }
    if (useGpu && !dispatches) return unsupported('The Kale probe observed no hardware WebGPU compute dispatch.');
  }
  return {
    status: 'measured',
    backendEffective: useGpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: VOICE,
    precision,
    settings,
    gpu: hardware?.description ?? null,
    capability: {
      gpuDispatchVerified: useGpu ? dispatches > 0 : null,
      description: useGpu
        ? `Observed ${dispatches} WebGPU compute dispatches in a separate untimed probe. Six LSTMs and other unsupported operators stay on WASM. Text preparation and final PCM are CPU-side.`
        : 'Explicit single-thread WASM provider.',
    },
  };
}

async function dispose() {
  for (const [name, tensor] of Object.entries(voiceTensors)) {
    tensor.dispose();
    delete voiceTensors[name];
  }
  await session?.release();
  session = null;
  frontend = null;
}

self.onmessage = async ({ data: { id, action, options, chunk } }) => {
  try {
    let value;
    if (action === 'initialize') value = await initialize(options);
    else if (action === 'generate') value = await generate(chunk, () => self.postMessage({ id, event: 'first-pcm' }));
    else if (action === 'dispose') await dispose();
    else throw new Error('Unknown Kale worker action');
    self.postMessage({ id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
};
