import { requestHardwareWebGpuAdapter, observeComputeDispatches } from '../piper/webgpu.mjs';
import { configureTransformers } from './transformers-support.mjs';
import { createSpanNoise, prepareSilencioText, splitSilencioTaggedText } from '../silencio2/frontend.mjs';
import {
  ASSET_ROOT,
  MODEL_ID,
  MODEL_REVISION,
  RUNTIME_ROOT,
  SAMPLE_RATE,
  TRANSFORMERS_ROOT,
  VOICE,
  WASM_THREADS,
} from '../silencio2/settings.mjs';

const nativePostMessage = self.postMessage.bind(self);
const nativeFetch = globalThis.fetch.bind(globalThis);
let bundle = null;
let tokenizer = null;
let ort = null;
let sessions = {};
let mimiInitialState = null;
let backend = null;
let providers = [];
let gpuDescription = null;
let restoreFetch = null;
let initialized = false;

const INFO = {
  voice: VOICE,
  precision: 'FP32 ONNX graphs; one-thread CPU/WASM or WebGPU with WASM operator fallback.',
  settings: {
    model: `${MODEL_ID}@${MODEL_REVISION}`,
    voice: VOICE,
    sampleRate: SAMPLE_RATE,
    wasmThreads: WASM_THREADS,
    runtime: 'ONNX Runtime Web 1.31.1; Transformers.js 3.5.1 tokenizer.',
    randomSeed: 'Seed 0 per canonical source span; Mulberry32 + Box-Muller normal noise, scaled by sqrt(0.3); not bitwise PyTorch RNG parity.',
    frontend: 'Pinned Silencio-2 prompt preparation, tag validation, SentencePiece-equivalent Unigram IDs and sentence/fallback chunking; chunks above 48 IDs fail.',
    generation: 'Official drifting flow, EOS threshold, minimum frame and text-dependent EOS tail; raw unnormalized Float32 stream at 24 kHz.',
    voiceState: 'Precomputed state from the official bundled synthetic voice 260 WAV and pinned model checkpoint.',
    outputLocation: 'Every ONNX run is awaited; PCM is copied to worker CPU Float32Arrays before return.',
  },
};

function unsupported(reason) {
  return {
    ...INFO,
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function installLocalFetchFence() {
  globalThis.fetch = async (input, init) => {
    const value = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(value, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Silencio-2 attempted a non-local fetch: ${url.origin}`);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

async function digestHex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function localUrl(root, filename) {
  const url = new URL(root + filename, self.location.href);
  if (url.origin !== self.location.origin) throw new Error('Silencio-2 assets must be served from the benchmark origin.');
  return url;
}

async function fetchAsset(filename, expected = null) {
  const url = localUrl(ASSET_ROOT, filename);
  const response = await nativeFetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Missing local Silencio-2 asset ${filename}: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (expected && (bytes.byteLength !== expected.bytes || await digestHex(bytes) !== expected.sha256)) {
    throw new Error(`Silencio-2 asset digest mismatch: ${filename}`);
  }
  return bytes;
}

async function loadBundle() {
  const raw = await fetchAsset('bundle.json');
  bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  if (bundle.modelId !== MODEL_ID || bundle.modelRevision !== MODEL_REVISION || bundle.voice !== VOICE || bundle.sampleRate !== SAMPLE_RATE) {
    throw new Error('Silencio-2 bundle metadata does not match the pinned model, voice or sample rate.');
  }
  for (const name of ['flow-main.onnx', 'flow-head.onnx', 'text-conditioner.onnx', 'mimi-decoder.onnx', 'tokenizer.json', 'tokenizer_config.json', 'voice-260-state.bin.gz', 'mimi-initial-state.bin.gz']) {
    if (!bundle.files?.[name]?.sha256 || !Number.isSafeInteger(bundle.files[name].bytes)) {
      throw new Error(`Silencio-2 bundle is missing a pinned file receipt for ${name}.`);
    }
  }
  if (!bundle.tokenizerParity?.allIdsMatch || !bundle.tokenizerParity?.allDecodesMatch) {
    throw new Error('Silencio-2 bundle has no successful official tokenizer parity receipt.');
  }
  if (!bundle.frontendParity?.allSpansChunked || bundle.frontendParity?.sourceSpans !== 93 || bundle.frontendParity?.sourceCharacters !== 20000) {
    throw new Error('Silencio-2 bundle has no complete 20,000-character frontend parity receipt.');
  }
}

function dtypeName(value) {
  if (value === 'float32') return 'float32';
  if (value === 'int64') return 'int64';
  if (value === 'bool') return 'bool';
  throw new Error(`Unsupported Silencio-2 state dtype ${value}.`);
}

function typedArray(dtype, buffer) {
  if (dtype === 'float32') {
    if (buffer.byteLength % 4) throw new Error('Invalid Float32 Silencio-2 state byte length.');
    return new Float32Array(buffer);
  }
  if (dtype === 'int64') {
    if (buffer.byteLength % 8) throw new Error('Invalid Int64 Silencio-2 state byte length.');
    return new BigInt64Array(buffer);
  }
  if (dtype === 'bool') return new Uint8Array(buffer);
  throw new Error(`Unsupported Silencio-2 state dtype ${dtype}.`);
}

async function decompress(bytes) {
  if (typeof DecompressionStream !== 'function') throw new Error('Chrome has no gzip DecompressionStream for the pinned voice state.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).arrayBuffer();
}

async function parseStateAsset(filename, manifest) {
  const compressed = await fetchAsset(filename, bundle.files[filename]);
  const raw = await decompress(compressed);
  const view = new DataView(raw);
  const bytes = new Uint8Array(raw);
  let offset = 0;
  const take = size => {
    if (offset + size > raw.byteLength) throw new Error(`Truncated Silencio-2 state file ${filename}.`);
    const at = offset;
    offset += size;
    return at;
  };
  const magic = new TextDecoder().decode(bytes.subarray(take(5), offset));
  if (magic !== 'S2VS1') throw new Error(`Invalid Silencio-2 state header in ${filename}.`);
  const count = view.getUint32(take(4), true);
  if (count !== manifest.length) throw new Error(`Silencio-2 state tensor count mismatch in ${filename}.`);
  const result = new Map();
  for (let index = 0; index < count; index++) {
    const nameLengthAt = take(2);
    const nameLength = view.getUint16(nameLengthAt, true);
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(take(nameLength), offset));
    const typeAt = take(2);
    const typeCode = view.getUint8(typeAt);
    const rank = view.getUint8(typeAt + 1);
    const dims = [];
    for (let dim = 0; dim < rank; dim++) dims.push(view.getUint32(take(4), true));
    const lengthAt = take(8);
    const dataLength = Number(view.getBigUint64(lengthAt, true));
    const dataAt = take(dataLength);
    const record = manifest[index];
    const dtype = ['float32', 'int64', 'bool'][typeCode];
    if (!dtype || name !== record.path || dtype !== dtypeName(record.dtype) || JSON.stringify(dims) !== JSON.stringify(record.shape)) {
      throw new Error(`Silencio-2 state schema mismatch at ${filename}:${index}.`);
    }
    const copy = raw.slice(dataAt, dataAt + dataLength);
    const data = typedArray(dtype, copy);
    const expectedSize = dims.reduce((product, dimension) => product * dimension, 1);
    if (data.length !== expectedSize) throw new Error(`Silencio-2 state element count mismatch for ${name}.`);
    result.set(record.input_name, { data, dims, type: dtype });
  }
  if (offset !== raw.byteLength) throw new Error(`Unexpected trailing bytes in Silencio-2 state file ${filename}.`);
  return result;
}

function makeTensor(value) {
  return new ort.Tensor(value.type, value.data, value.dims);
}

function resizeCache(value, entry, length) {
  if (entry.dynamicAxis == null) return value;
  const axis = entry.dynamicAxis;
  const oldLength = value.dims[axis];
  const target = Math.max(oldLength, length);
  if (target === oldLength) return { ...value, data: value.data.slice(), dims: [...value.dims] };
  const dims = [...value.dims];
  dims[axis] = target;
  const data = new value.data.constructor(dims.reduce((a, b) => a * b, 1));
  if (value.type === 'float32') data.fill(Number.NaN);
  const outer = value.dims.slice(0, axis).reduce((a, b) => a * b, 1);
  const inner = value.dims.slice(axis + 1).reduce((a, b) => a * b, 1);
  const oldBlock = oldLength * inner;
  const newBlock = target * inner;
  for (let index = 0; index < outer; index++) {
    data.set(value.data.subarray(index * oldBlock, (index + 1) * oldBlock), index * newBlock);
  }
  return { ...value, data, dims };
}

function stateFeeds(state, manifest) {
  const feeds = {};
  for (const entry of manifest) feeds[entry.input_name] = state.get(entry.input_name);
  for (const [name, tensor] of Object.entries(feeds)) if (!tensor) throw new Error(`Silencio-2 graph state input ${name} is missing.`);
  return feeds;
}

function disposeExcept(tensors, keep) {
  const keepSet = new Set(keep);
  for (const tensor of tensors) if (tensor && !keepSet.has(tensor)) tensor.dispose?.();
}

async function runFlow(sequence, textEmbeddings, state) {
  const entries = bundle.flowStateManifest;
  const stateInput = stateFeeds(state, entries);
  const inputs = {
    sequence: makeTensor({ type: 'float32', data: sequence.data, dims: sequence.dims }),
    text_embeddings: makeTensor({ type: 'float32', data: textEmbeddings.data, dims: textEmbeddings.dims }),
    ...stateInput,
  };
  const previousStateTensors = entries.map(entry => state.get(entry.input_name));
  let outputs;
  try {
    outputs = await sessions.flowMain.run(inputs);
    const nextState = new Map(entries.map(entry => [entry.input_name, outputs[entry.output_name]]));
    const conditioning = Float32Array.from(outputs.conditioning.data);
    const isEos = Boolean(Number(outputs.is_eos.data[0]));
    const nextValues = [...nextState.values()];
    disposeExcept(previousStateTensors, nextValues);
    outputs.conditioning.dispose?.();
    outputs.is_eos.dispose?.();
    return { conditioning, isEos, state: nextState };
  } catch (error) {
    if (outputs) disposeExcept(Object.values(outputs), []);
    throw error;
  } finally {
    inputs.sequence.dispose?.();
    inputs.text_embeddings.dispose?.();
  }
}

async function runHead(conditioning, noise) {
  const feeds = {
    conditioning: makeTensor({ type: 'float32', data: conditioning, dims: [1, bundle.flowConditioningDim] }),
    noise: makeTensor({ type: 'float32', data: noise, dims: [1, bundle.latentDim] }),
  };
  let outputs;
  try {
    outputs = await sessions.flowHead.run(feeds);
    return Float32Array.from(outputs.latent.data);
  } finally {
    feeds.conditioning.dispose?.();
    feeds.noise.dispose?.();
    if (outputs) disposeExcept(Object.values(outputs), []);
  }
}

async function runText(text) {
  const encoded = tokenizer(text, { add_special_tokens: false, truncation: false, padding: false }).input_ids;
  const ids = BigInt64Array.from(encoded.data, value => BigInt(Number(value)));
  if (!ids.length) throw new Error('Silencio-2 tokenizer returned no text IDs.');
  const input = new ort.Tensor('int64', ids, [1, ids.length]);
  let outputs;
  try {
    outputs = await sessions.textConditioner.run({ token_ids: input });
    return Float32Array.from(outputs.embeddings.data);
  } finally {
    input.dispose?.();
    if (outputs) disposeExcept(Object.values(outputs), []);
    for (const value of Object.values(encoded)) value.dispose?.();
  }
}

function disposeState(state) {
  for (const value of state.values()) value.dispose?.();
  state.clear();
}

function createLatentQueue() {
  const values = [];
  const waiters = [];
  let closed = false;
  return {
    push(value) {
      if (closed) throw new Error('Silencio-2 decoder queue is already closed.');
      const waiter = waiters.shift();
      if (waiter) waiter({ done: false, value });
      else values.push(value);
    },
    tryPop() { return values.shift() ?? null; },
    next() {
      const value = values.shift();
      if (value) return Promise.resolve({ done: false, value });
      if (closed) return Promise.resolve({ done: true, value: undefined });
      return new Promise(resolve => waiters.push(resolve));
    },
    close() {
      closed = true;
      for (const waiter of waiters.splice(0)) waiter({ done: true, value: undefined });
    },
  };
}

function fillForManifest(entry) {
  const value = mimiInitialState?.get(entry.input_name);
  if (!value) throw new Error(`Silencio-2 initial Mimi state ${entry.path} is missing.`);
  return { type: value.type, data: value.data.slice(), dims: [...value.dims] };
}

function initialMimiState(sequenceCapacity) {
  const state = new Map();
  for (const entry of bundle.mimiStateManifest) {
    const source = fillForManifest(entry);
    const value = resizeCache(source, entry, sequenceCapacity);
    state.set(entry.input_name, makeTensor(value));
  }
  return state;
}

async function runMimi(latents, state) {
  const entries = bundle.mimiStateManifest;
  const stateInput = stateFeeds(state, entries);
  const latentData = new Float32Array(latents.length * bundle.latentDim);
  for (let index = 0; index < latents.length; index++) {
    latentData.set(latents[index], index * bundle.latentDim);
  }
  const inputs = {
    latent: makeTensor({ type: 'float32', data: latentData, dims: [1, latents.length, bundle.latentDim] }),
    ...stateInput,
  };
  const oldState = entries.map(entry => state.get(entry.input_name));
  let outputs;
  try {
    outputs = await sessions.mimi.run(inputs);
    const nextState = new Map(entries.map(entry => [entry.input_name, outputs[entry.output_name]]));
    const pcm = Float32Array.from(outputs.audio.data);
    disposeExcept(oldState, [...nextState.values()]);
    outputs.audio.dispose?.();
    return { pcm, state: nextState };
  } catch (error) {
    if (outputs) disposeExcept(Object.values(outputs), []);
    throw error;
  } finally {
    inputs.latent.dispose?.();
  }
}

function cloneVoiceState(requiredLength) {
  const result = new Map();
  for (const entry of bundle.flowStateManifest) {
    const initial = voiceState.get(entry.input_name);
    if (!initial) throw new Error(`Silencio-2 voice prompt state lacks ${entry.path}.`);
    const resized = resizeCache(initial, entry, requiredLength);
    const value = entry.dynamicAxis == null ? { ...resized, data: resized.data.slice(), dims: [...resized.dims] } : resized;
    result.set(entry.input_name, makeTensor(value));
  }
  return result;
}

let voiceState = null;

async function generateUtterance(text, emotion, requestId, pcmParts, spanNoise) {
  // The model chunks emotion-prefixed text, but its EOS-tail heuristic is
  // computed from the plain chunk before the tag is prefixed.
  const chunkText = prepareSilencioText(text, bundle.text);
  const prepared = prepareSilencioText(emotion ? `<${emotion}> ${text}` : text, bundle.text);
  const textTokens = tokenizer(prepared.text, { add_special_tokens: false, truncation: false, padding: false }).input_ids;
  const tokenCount = textTokens.data.length;
  const maxPreparedTokens = bundle.text.maxTokensPerChunk + (emotion ? 1 : 0);
  if (!tokenCount || tokenCount > maxPreparedTokens) {
    for (const tensor of Object.values(textTokens)) tensor.dispose?.();
    throw new Error(`Silencio-2 prepared ${tokenCount} tokens; expected 1..${maxPreparedTokens}.`);
  }
  const maxFrames = Math.ceil((tokenCount / bundle.tokensPerSecondEstimate + bundle.generationSecondsPadding) * bundle.frameRate);
  const framesAfterEos = bundle.modelRecommendedFramesAfterEos ?? (chunkText.framesAfterEosGuess + 2);
  const textEmbeddings = await runText(prepared.text);
  for (const tensor of Object.values(textTokens)) tensor.dispose?.();
  const voiceOffset = Number(voiceState.get(bundle.flowStateManifest.find(entry => entry.key === 'offset').input_name).data[0]);
  const flowCapacity = voiceOffset + tokenCount + maxFrames;
  let flowState = cloneVoiceState(flowCapacity);
  let mimiState = initialMimiState(maxFrames * bundle.mimiStepsPerLatent);
  const textInput = { data: textEmbeddings, dims: [1, tokenCount, bundle.conditioningDim] };
  const emptySequence = { data: new Float32Array(0), dims: [1, 0, bundle.latentDim] };
  const parts = [];
  const latentQueue = createLatentQueue();
  let firstAudioChunk = true;
  let decoderFailure = null;
  const decoderTask = (async () => {
    try {
      while (true) {
        const first = await latentQueue.next();
        if (first.done) return;
        const latentBatch = [first.value];
        const maxBatch = bundle.maxDecoderFramesPerCall;
        while (maxBatch <= 0 || latentBatch.length < maxBatch) {
          const next = latentQueue.tryPop();
          if (next == null) break;
          latentBatch.push(next);
        }
        const decoded = await runMimi(latentBatch, mimiState);
        mimiState = decoded.state;
        if (decoded.pcm.length) {
          if (firstAudioChunk) {
            const fadeLength = Math.min(decoded.pcm.length, SAMPLE_RATE / 200);
            for (let index = 0; index < fadeLength; index++) decoded.pcm[index] *= index / Math.max(1, fadeLength - 1);
            firstAudioChunk = false;
          }
          parts.push(decoded.pcm);
          nativePostMessage({ id: requestId, event: 'first-pcm' });
        }
      }
    } catch (error) {
      decoderFailure = error;
      latentQueue.close();
    }
  })();
  let eosStep = null;
  let previousLatent = new Float32Array(bundle.latentDim);
  previousLatent.fill(Number.NaN);
  try {
    const prefill = await runFlow(emptySequence, textInput, flowState);
    flowState = prefill.state;
    // The official flow samples and discards one latent while prefilling text.
    spanNoise().fill(0);
    for (let generationStep = 0; generationStep < maxFrames; generationStep++) {
      const step = await runFlow({ data: previousLatent, dims: [1, 1, bundle.latentDim] },
        { data: new Float32Array(0), dims: [1, 0, bundle.conditioningDim] }, flowState);
      flowState = step.state;
      const noise = spanNoise();
      if (step.isEos && eosStep === null && generationStep >= bundle.minFramesBeforeEos) eosStep = generationStep;
      if (eosStep !== null && generationStep >= eosStep + framesAfterEos) {
        noise.fill(0);
        step.conditioning.fill(0);
        break;
      }
      const latent = await runHead(step.conditioning, noise);
      previousLatent = latent;
      latentQueue.push(latent);
      if (decoderFailure) throw decoderFailure;
      noise.fill(0);
      step.conditioning.fill(0);
    }
    latentQueue.close();
    await decoderTask;
    if (decoderFailure) throw decoderFailure;
  } finally {
    latentQueue.close();
    await decoderTask;
    disposeState(flowState);
    disposeState(mimiState);
    textEmbeddings.fill(0);
  }
  if (!parts.length) throw new Error('Silencio-2 generated no PCM for an internal utterance.');
  pcmParts.push(...parts);
}

async function synthesize(chunk, requestId) {
  if (!initialized) throw new Error('Silencio-2 is not initialized.');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.length) throw new Error('Invalid Silencio-2 source span.');
  if (chunk.sha256 && await digestHex(new TextEncoder().encode(chunk.text)) !== chunk.sha256) throw new Error(`Silencio-2 source span ${chunk.id} SHA-256 mismatch.`);
  const parsed = splitSilencioTaggedText(tokenizer, chunk.text, bundle.text);
  const noise = createSpanNoise(0, bundle.latentDim, Math.sqrt(bundle.temperature));
  const parts = [];
  for (const utterance of parsed) await generateUtterance(utterance.text, utterance.emotion, requestId, parts, noise);
  const sampleCount = parts.reduce((total, pcm) => total + pcm.length, 0);
  if (!sampleCount || parts.some(pcm => !pcm.every(Number.isFinite))) throw new Error(`Silencio-2 span ${chunk.id} returned empty or non-finite PCM.`);
  return { parts, sampleRate: SAMPLE_RATE, completedChunkId: chunk.id };
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) return unsupported('Silencio-2 supports explicit CPU/WASM and WebGPU backends only.');
  if (initialized) throw new Error('Silencio-2 worker is already initialized.');
  backend = options.backend;
  gpuDescription = null;
  installLocalFetchFence();
  try {
    await loadBundle();
    configureTransformers();
    tokenizer = await (await import(`${TRANSFORMERS_ROOT}transformers.min.js`)).PreTrainedTokenizer.from_pretrained('silencio-2-onnx-v1', { local_files_only: true });

    const runtimeUrl = localUrl(RUNTIME_ROOT, backend === 'webgpu' ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs');
    let selectedAdapter = null;
    if (backend === 'webgpu') {
      const selection = await requestHardwareWebGpuAdapter(globalThis.navigator?.gpu);
      if (selection.reason) return unsupported(selection.reason);
      selectedAdapter = selection.adapter;
      gpuDescription = selection.description;
    }
    ort = await import(runtimeUrl.href);
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = WASM_THREADS;
    ort.env.wasm.proxy = false;
    const wasmBundle = backend === 'webgpu' ? 'ort-wasm-simd-threaded.asyncify' : 'ort-wasm-simd-threaded';
    ort.env.wasm.wasmPaths = {
      mjs: `${RUNTIME_ROOT}${wasmBundle}.mjs`,
      wasm: `${RUNTIME_ROOT}${wasmBundle}.wasm`,
    };
    providers = backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
    if (backend === 'webgpu') ort.env.webgpu.adapter = selectedAdapter;

    const files = {};
    for (const name of ['flow-main.onnx', 'flow-head.onnx', 'text-conditioner.onnx', 'mimi-decoder.onnx']) {
      files[name] = await fetchAsset(name, bundle.files[name]);
    }
    sessions = {
      flowMain: await ort.InferenceSession.create(files['flow-main.onnx'], { executionProviders: providers, graphOptimizationLevel: 'all' }),
      flowHead: await ort.InferenceSession.create(files['flow-head.onnx'], { executionProviders: providers, graphOptimizationLevel: 'all' }),
      textConditioner: await ort.InferenceSession.create(files['text-conditioner.onnx'], { executionProviders: providers, graphOptimizationLevel: 'all' }),
      mimi: await ort.InferenceSession.create(files['mimi-decoder.onnx'], { executionProviders: providers, graphOptimizationLevel: 'all' }),
    };
    voiceState = await parseStateAsset('voice-260-state.bin.gz', bundle.flowStateManifest);
    mimiInitialState = await parseStateAsset('mimi-initial-state.bin.gz', bundle.mimiStateManifest);
    if (backend === 'webgpu') {
      const actualDevice = await ort.env.webgpu.device;
      const actualAdapter = await ort.env.webgpu.adapter;
      const info = actualDevice?.adapterInfo ?? actualAdapter?.info;
      if (info?.isFallbackAdapter || actualAdapter?.isFallbackAdapter) {
        await dispose();
        return unsupported('ONNX Runtime selected a software WebGPU fallback adapter.');
      }
      gpuDescription = info?.description || info?.vendor || gpuDescription;
    }

    initialized = true;
    let dispatchCount = 0;
    if (options.probe) {
      const hook = backend === 'webgpu' ? observeComputeDispatches(self) : null;
      try {
        const probeText = options.probeText || 'A short browser speech check.';
        const response = await synthesize({ id: -1, start: 0, end: probeText.length, text: probeText }, -1);
        if (!response.parts.length || !response.parts.every(part => part.length && part.every(Number.isFinite))) throw new Error('Silencio-2 capability synthesis returned invalid PCM.');
        for (const part of response.parts) part.fill(0);
      } finally {
        dispatchCount = hook?.stop() ?? 0;
      }
      if (backend === 'webgpu' && dispatchCount === 0) {
        await dispose();
        return unsupported('No real WebGPU compute dispatch was observed during Silencio-2 synthesis.');
      }
    }
    return {
      ...INFO,
      status: 'measured',
      backendEffective: backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm',
      settings: { ...INFO.settings, executionProviders: [...providers], browserNoise: 'Mulberry32 + Box-Muller, seed 0 per source span', tokenizerFrontend: 'Pinned local SentencePiece Unigram conversion' },
      capability: {
        gpuDispatchVerified: backend === 'cpu' ? null : dispatchCount > 0,
        description: backend === 'cpu' ? 'Explicit single-thread ONNX Runtime Web WASM provider; text preprocessing runs in the worker.' : `Observed ${dispatchCount} actual WebGPU compute dispatches during separate untimed synthesis. WebGPU with WASM operator fallback; CPU-readable PCM. Hooks removed before scored generation.`,
      },
      ...(backend === 'webgpu' ? { gpu: gpuDescription || 'WebGPU device description unavailable' } : {}),
    };
  } catch (error) {
    await dispose().catch(() => {});
    throw error;
  }
}

async function dispose() {
  let firstError = null;
  initialized = false;
  if (voiceState) disposeState(voiceState);
  voiceState = null;
  tokenizer = null;
  for (const session of Object.values(sessions)) {
    try { await session.release(); } catch (error) { firstError ??= error; }
  }
  sessions = {};
  ort = null;
  bundle = null;
  if (mimiInitialState) disposeState(mimiInitialState);
  mimiInitialState = null;
  providers = [];
  backend = null;
  gpuDescription = null;
  restoreFetch?.();
  restoreFetch = null;
  if (firstError) throw firstError;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await synthesize(data.chunk, data.id);
    else if (data.action === 'audit') {
      if (!tokenizer) throw new Error('Silencio-2 tokenizer is not initialized.');
      const utterances = splitSilencioTaggedText(tokenizer, data.text, bundle.text);
      value = { utteranceCount: utterances.length, utterances: utterances.map(item => item.text) };
    } else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Silencio-2 worker action.');
    const transfer = value?.parts?.map(part => part.buffer) ?? [];
    nativePostMessage({ id: data.id, value }, transfer);
  } catch (error) {
    nativePostMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
