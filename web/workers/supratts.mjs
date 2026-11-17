import { fetchModelAsset } from '../cache-model-asset.mjs';
import { observeComputeDispatches, requestHardwareWebGpuAdapter } from '../piper/webgpu.mjs';
import { dcBlock, inverseStft } from '../supratts/fft.mjs';

const REVISION = '80a6b0bd13c92e30e88b0c22183be9c2bdc7061c';
const MODEL_ROOT = '/models/supratts-1.0-preview/' + REVISION + '/';
const PYODIDE_ROOT = '/runtimes/supratts/pyodide-0.29.3/';
const ORT_ROOT = '/runtimes/onnxruntime-web/1.23.2/';
const SAMPLE_RATE = 24000;
const MAX_TOKENS = 207;
const MAX_FRAMES = 2400;
const SOFT_FRAMES = 2000;
const SENTENCE_GAP = Math.round(0.10 * SAMPLE_RATE);
const FFT_SIZE = 1024;
const HOP = 256;
const MODEL_FILE_NAMES = ['duration.onnx', 'acoustic-token.onnx', 'acoustic-frame.onnx', 'decoder.onnx'];
const PYTHON_FILES = [
  ['microtts/frontend.py', 'microtts/frontend.py'],
  ['microtts/g2p/__init__.py', 'microtts/g2p/__init__.py'],
  ['microtts/g2p/english.py', 'microtts/g2p/english.py'],
  ['microtts/g2p/oov.py', 'microtts/g2p/oov.py'],
  ['microtts/g2p/g2p_data/us_gold.json', 'microtts/g2p/g2p_data/us_gold.json'],
  ['microtts/g2p/g2p_data/us_silver.json', 'microtts/g2p/g2p_data/us_silver.json'],
  ['microtts/g2p/g2p_data/oov_bart_en_us.npz', 'microtts/g2p/g2p_data/oov_bart_en_us.npz'],
];

let ort = null;
let sessions = [];
let pyodide = null;
let activeProvider = [];
let activeTensors = new Set();
let restoreFetch = null;
let tiltVector = null;

function installLocalFetch() {
  if (restoreFetch) return;
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const requested = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requested, self.location.href);
    if (url.origin !== self.location.origin) throw new Error('SupraTTS attempted a non-local fetch: ' + url.origin);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

async function modelBytes(relativePath) {
  const response = await fetchModelAsset(MODEL_ROOT + relativePath, REVISION);
  return new Uint8Array(await response.arrayBuffer());
}

function parseNpyFloat32(bytes, expectedLength) {
  const magic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];
  if (bytes.length < 12 || magic.some((value, index) => bytes[index] !== value)) {
    throw new Error('SupraTTS tilt.npy has an invalid NPY header.');
  }
  const major = bytes[6];
  if (major !== 1 && major !== 2) throw new Error('SupraTTS tilt.npy uses an unsupported NPY version.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lengthBytes = major === 1 ? 2 : 4;
  const headerStart = 8 + lengthBytes;
  const headerBytes = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  const dataOffset = headerStart + headerBytes;
  const header = new TextDecoder('ascii').decode(bytes.subarray(headerStart, dataOffset));
  const descr = /['\"]descr['\"]:\s*['\"]<f4['\"]/.test(header);
  const cOrder = /['\"]fortran_order['\"]:\s*False/.test(header);
  const shape = /['\"]shape['\"]:\s*\(\s*(\d+)\s*,?\s*\)/.exec(header);
  if (!descr || !cOrder || Number(shape?.[1]) !== expectedLength) {
    throw new Error('SupraTTS tilt.npy must be a little-endian, C-order FP32 vector with 100 values.');
  }
  if (bytes.byteLength !== dataOffset + expectedLength * 4) throw new Error('SupraTTS tilt.npy byte count does not match its declared vector shape.');
  const viewData = new Float32Array(bytes.buffer, bytes.byteOffset + dataOffset, expectedLength);
  const result = new Float32Array(viewData);
  if (!result.every(Number.isFinite)) throw new Error('SupraTTS tilt.npy contains non-finite values.');
  return result;
}

async function initializePythonG2p() {
  const { loadPyodide } = await import(PYODIDE_ROOT + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.origin).href });
  if (pyodide.version !== '0.29.3') throw new Error('Unexpected Pyodide version ' + pyodide.version + '.');
  await pyodide.loadPackage('numpy');
  pyodide.FS.mkdirTree('/supratts/microtts/g2p/g2p_data');
  // The upstream package initializer imports PyTorch. The browser port needs
  // its MIT G2P frontend and NumPy OOV helper, so this package shim is empty.
  pyodide.FS.writeFile('/supratts/microtts/__init__.py', new TextEncoder().encode(''));
  for (const [source, destination] of PYTHON_FILES) {
    const parts = destination.split('/');
    parts.pop();
    pyodide.FS.mkdirTree('/supratts/' + parts.join('/'));
    pyodide.FS.writeFile('/supratts/' + destination, await modelBytes(source));
  }
  pyodide.runPython('import sys\nsys.path.insert(0, \"/supratts\")\nfrom microtts.g2p import phonemize\n');
}

function integerDurations(logDurations) {
  const durations = new Int32Array(logDurations.length);
  let total = 0;
  for (let i = 0; i < logDurations.length; i++) {
    const value = Math.fround(Math.exp(logDurations[i]));
    if (!Number.isFinite(value)) throw new Error('SupraTTS duration model returned a non-finite prediction.');
    // torch.round uses ties-to-even; preserve that behavior for exact halves.
    const lower = Math.floor(value);
    const fraction = value - lower;
    const rounded = fraction < 0.5 ? lower : fraction > 0.5 ? lower + 1 : lower % 2 === 0 ? lower : lower + 1;
    durations[i] = Math.max(1, rounded);
    total += durations[i];
  }
  return { durations, total };
}

function frameInputs(hidden, durations) {
  const tokens = durations.length;
  const total = durations.reduce((sum, value) => sum + value, 0);
  const channels = hidden.length / tokens;
  const expanded = new Float32Array(channels * total);
  const features = new Float32Array(3 * total);
  const maxDuration = Math.max(...durations, 1);
  const durationScale = Math.log1p(maxDuration);
  let frame = 0;
  for (let token = 0; token < tokens; token++) {
    const duration = durations[token];
    const tokenPosition = tokens > 1 ? token / (tokens - 1) : 0;
    const durationHint = Math.log1p(duration) / durationScale;
    for (let within = 0; within < duration; within++, frame++) {
      for (let channel = 0; channel < channels; channel++) {
        expanded[channel * total + frame] = hidden[channel * tokens + token];
      }
      features[frame] = total > 1 ? frame / (total - 1) : 0;
      features[total + frame] = tokenPosition;
      features[(2 * total) + frame] = duration > 1 ? within / (duration - 1) : 0;
    }
  }
  return { expanded, features, frames: total };
}

function prepareDurationFeatures(tokenCount) {
  const features = new Float32Array(3 * tokenCount);
  const lengthHint = Math.log1p(Math.max(tokenCount, 1)) / Math.log1p(207);
  for (let i = 0; i < tokenCount; i++) {
    features[i] = tokenCount > 1 ? i / (tokenCount - 1) : 0;
    features[tokenCount + i] = lengthHint;
    features[2 * tokenCount + i] = 1;
  }
  return features;
}

function prepareTokenFeatures(ids, durations) {
  const count = ids.length;
  const features = new Float32Array(2 * count);
  const maxDuration = Math.max(...durations, 1);
  const scale = Math.log1p(maxDuration);
  for (let i = 0; i < count; i++) {
    features[i] = count > 1 ? i / (count - 1) : 0;
    features[count + i] = Math.log1p(durations[i]) / scale;
  }
  return features;
}

async function runSession(session, values) {
  const inputs = {};
  const owned = [];
  try {
    for (const [name, spec] of Object.entries(values)) {
      const tensor = new ort.Tensor(spec.type, spec.data, spec.dims);
      inputs[name] = tensor;
      owned.push(tensor);
      activeTensors.add(tensor);
    }
    const outputs = await session.run(inputs);
    for (const value of Object.values(outputs)) {
      activeTensors.add(value);
      owned.push(value);
    }
    const output = Object.values(outputs)[0];
    const copy = output.type === 'int64' ? new BigInt64Array(output.data) : new Float32Array(output.data);
    return { data: copy, dims: [...output.dims] };
  } finally {
    for (const tensor of owned) {
      activeTensors.delete(tensor);
      tensor.dispose();
    }
  }
}

function tensorSpec(type, data, dims) { return { type, data, dims }; }

async function phonemize(text) {
  if (!pyodide) throw new Error('SupraTTS Python G2P is not initialized.');
  pyodide.globals.set('supra_text', text);
  try {
    const encoded = pyodide.runPython('import json\njson.dumps(phonemize(supra_text), ensure_ascii=False)\n');
    const [ids, dropped] = JSON.parse(encoded);
    if (dropped) {
      const symbols = [...new Set(Array.from(dropped))].join('');
      throw new Error('The upstream SupraTTS frontend dropped unsupported phoneme symbols: ' + JSON.stringify(symbols) + '.');
    }
    if (!Array.isArray(ids) || ids.length < 3 || ids.length > MAX_TOKENS) {
      throw new Error('SupraTTS phonemizer returned ' + (ids?.length ?? 'no') + ' tokens; expected 3–' + MAX_TOKENS + '.');
    }
    return Int32Array.from(ids);
  } finally {
    pyodide.globals.delete('supra_text');
  }
}

async function predictDurations(ids) {
  const features = prepareDurationFeatures(ids.length);
  const result = await runSession(sessions[0], {
    ids: tensorSpec('int64', BigInt64Array.from(ids, value => BigInt(value)), [ids.length]),
    features: tensorSpec('float32', features, [3, ids.length]),
  });
  return integerDurations(result.data);
}

async function synthesizeIds(ids) {
  const predicted = await predictDurations(ids);
  const tokenFeatures = prepareTokenFeatures(ids, predicted.durations);
  const tokenResult = await runSession(sessions[1], {
    ids: tensorSpec('int64', BigInt64Array.from(ids, value => BigInt(value)), [ids.length]),
    features: tensorSpec('float32', tokenFeatures, [2, ids.length]),
  });
  const expanded = frameInputs(tokenResult.data, predicted.durations);
  const melResult = await runSession(sessions[2], {
    hidden: tensorSpec('float32', expanded.expanded, [tokenResult.dims[0], expanded.frames]),
    features: tensorSpec('float32', expanded.features, [3, expanded.frames]),
  });
  const frames = Math.min(predicted.total, MAX_FRAMES);
  if (frames < 1 || melResult.dims[1] < frames) throw new Error('SupraTTS acoustic model returned too few frames.');
  const melChannels = melResult.dims[0];
  const mel = new Float32Array(melChannels * frames);
  for (let channel = 0; channel < melChannels; channel++) {
    mel.set(melResult.data.subarray(channel * melResult.dims[1], channel * melResult.dims[1] + frames), channel * frames);
  }
  for (let channel = 0; channel < melChannels; channel++) {
    const offset = channel * frames;
    for (let frame = 0; frame < frames; frame++) mel[offset + frame] += tiltVector[channel];
  }
  const noise = new Float32Array(4 * frames); // Official MicroTTS inference uses noise_scale=0.
  const spectrum = await runSession(sessions[3], {
    mel: tensorSpec('float32', mel, [melChannels, frames]),
    noise: tensorSpec('float32', noise, [4, frames]),
  });
  return dcBlock(inverseStft(spectrum.data, frames, { fftSize: FFT_SIZE, hop: HOP }));
}

async function durationForText(text) {
  const ids = await phonemize(text);
  return (await predictDurations(ids)).total;
}

async function splitTextForModel(text) {
  const trimmed = text.trim();
  const parts = trimmed.split(/(?<=[.!?…:])\s+/u).filter(value => value.trim());
  const output = [];
  for (const sentence of parts.length ? parts : [text]) {
    if (await durationForText(sentence) <= SOFT_FRAMES) {
      output.push(sentence);
      continue;
    }
    const words = sentence.split(/\s+/u).filter(Boolean);
    let current = [];
    let frames = 0;
    for (const word of words) {
      const wordFrames = await durationForText(word);
      if (current.length && frames + wordFrames > SOFT_FRAMES) {
        output.push(current.join(' '));
        current = [word];
        frames = wordFrames;
      } else {
        current.push(word);
        frames += wordFrames;
      }
    }
    if (current.length) output.push(current.join(' '));
  }
  return output;
}

function concatenate(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Float32Array(size);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  return joined;
}

async function synthesizeText(text, reportFirstPcm = null) {
  const pieces = await splitTextForModel(text);
  if (!pieces.length) throw new Error('SupraTTS could not split the source span into sentence pieces.');
  const waveforms = [];
  for (let i = 0; i < pieces.length; i++) {
    const ids = await phonemize(pieces[i]);
    const pcm = await synthesizeIds(ids);
    if (pcm.length < 1 || !pcm.every(Number.isFinite)) throw new Error('SupraTTS returned empty or non-finite PCM.');
    waveforms.push(pcm);
    if (i < pieces.length - 1) waveforms.push(new Float32Array(SENTENCE_GAP));
    if (reportFirstPcm) { reportFirstPcm(); reportFirstPcm = null; }
  }
  return concatenate(waveforms);
}

function unsupported(reason) {
  return {
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    voice: 'fixed single voice',
    precision: 'FP32 ONNX; FP32 CPU/GPU operator execution',
    settings: { executionProviders: [], threads: 1, sampleRate: SAMPLE_RATE, noiseScale: 0, sentenceGapSeconds: 0.10 },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function info(backend) {
  return {
    status: 'measured',
    backendEffective: backend === 'cpu' ? 'cpu/wasm' : 'webgpu+wasm',
    voice: 'fixed single voice',
    precision: 'FP32 ONNX; FP32 CPU/GPU operator execution',
    settings: {
      executionProviders: [...activeProvider],
      wasmThreads: 1,
      sampleRate: SAMPLE_RATE,
      noiseScale: 0,
      sentenceGapSeconds: 0.10,
      maxTokens: MAX_TOKENS,
      maxFramesPerPiece: MAX_FRAMES,
      softFrameBudget: SOFT_FRAMES,
      frontend: 'Pinned official SupraTTS English dictionary-first frontend and NumPy OOV model in Pyodide 0.29.3 / NumPy 2.2.5; no espeak or network; unsupported phones fail rather than being dropped silently.',
      model: 'SupraTTS-1.0-Preview; four FP32 ONNX graphs exported at opset 17 from the pinned MIT checkpoint.',
      synthesis: 'Official zero-noise, 24 kHz mono path; 100-band mel tilt, centered Hann iSTFT and FFT DC-blocking filter; one 0.10 s gap between internal sentence pieces.',
      cpuWork: 'English G2P, frame expansion, iSTFT overlap-add and waveform DC blocking run in the Chrome worker; neural operators use the explicitly requested ONNX provider with possible WASM fallback.',
    },
    capability: backend === 'cpu'
      ? { gpuDispatchVerified: null, description: 'Explicit one-thread ONNX Runtime Web WASM; the official Python/NumPy G2P and signal reconstruction run in the same Chrome worker.' }
      : { gpuDispatchVerified: null, description: 'WebGPU plus WASM operator fallback requested; the separate inference probe will verify actual compute dispatches.' },
    ...(backend === 'webgpu' ? { gpu: 'Hardware WebGPU adapter' } : {}),
  };
}

async function loadOrt(backend, adapter) {
  const moduleName = backend === 'cpu' ? 'ort.wasm.min.mjs' : 'ort.webgpu.min.mjs';
  ort = await import(ORT_ROOT + moduleName);
  ort.env.logLevel = 'error';
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const wasmBundle = backend === 'webgpu' ? 'ort-wasm-simd-threaded.asyncify' : 'ort-wasm-simd-threaded';
  ort.env.wasm.wasmPaths = { mjs: ORT_ROOT + wasmBundle + '.mjs', wasm: ORT_ROOT + wasmBundle + '.wasm' };
  if (backend === 'webgpu') ort.env.webgpu.adapter = adapter;
  activeProvider = backend === 'cpu' ? ['wasm'] : ['webgpu', 'wasm'];
  const modelFiles = await Promise.all(MODEL_FILE_NAMES.map(name => modelBytes('onnx/' + name)));
  sessions = await Promise.all(modelFiles.map(bytes => ort.InferenceSession.create(bytes, {
    executionProviders: activeProvider,
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  })));
}

async function initialize({ backend, probe, probeText }) {
  if (!['cpu', 'webgpu'].includes(backend)) return unsupported('SupraTTS supports explicit CPU/WASM and WebGPU backends only.');
  installLocalFetch();
  let adapter = null;
  let adapterDescription = null;
  if (backend === 'webgpu') {
    const selection = await requestHardwareWebGpuAdapter(navigator.gpu);
    if (selection.reason) return unsupported(selection.reason);
    adapter = selection.adapter;
    adapterDescription = selection.description;
  }
  try {
    await initializePythonG2p();
    tiltVector = parseNpyFloat32(await modelBytes('tilt.npy'), 100);
    await loadOrt(backend, adapter);
    if (backend === 'webgpu') {
      const actualAdapter = await ort.env.webgpu.adapter;
      const actualDevice = await ort.env.webgpu.device;
      const actualInfo = actualDevice?.adapterInfo ?? actualAdapter?.info ?? {};
      if (actualAdapter?.isFallbackAdapter === true || actualInfo?.isFallbackAdapter === true) {
        await dispose();
        return unsupported('ONNX Runtime selected a software fallback WebGPU adapter.');
      }
      adapterDescription = actualInfo.description || actualInfo.vendor || adapterDescription;
    }
    let capability = info(backend).capability;
    if (probe) {
      const observer = backend === 'webgpu' ? observeComputeDispatches(self) : null;
      let dispatches = 0;
      try {
        const output = await synthesizeText(probeText || 'A short browser speech check.');
        if (!output.length || !output.every(Number.isFinite)) throw new Error('SupraTTS capability synthesis returned invalid PCM.');
      } finally {
        dispatches = observer?.stop() ?? 0;
      }
      if (backend === 'webgpu') {
        if (!dispatches) {
          await dispose();
          return unsupported('The requested SupraTTS WebGPU provider produced no observed compute dispatch during the separate capability synthesis.');
        }
        capability = {
          gpuDispatchVerified: true,
          description: 'Observed ' + dispatches + ' WebGPU compute dispatches during a separate untimed synthesis. Neural operators use WebGPU with possible WASM fallback; G2P, frame expansion and waveform reconstruction use CPU. Dispatch hooks were removed before measured generation.',
        };
      }
    }
    return { ...info(backend), capability, ...(backend === 'webgpu' ? { gpu: adapterDescription } : {}) };
  } catch (error) {
    await dispose();
    throw error;
  }
}

async function dispose() {
  for (const tensor of activeTensors) {
    try { tensor.dispose(); } catch {}
  }
  activeTensors.clear();
  const current = sessions;
  sessions = [];
  await Promise.all(current.map(session => session.release()));
  if (pyodide) {
    try { pyodide.runPython('import gc; gc.collect()'); } catch {}
    pyodide = null;
  }
  ort = null;
  activeProvider = [];
  tiltVector = null;
  restoreFetch?.();
  restoreFetch = null;
}

self.onmessage = async ({ data }) => {
  const { id, action } = data;
  try {
    let value;
    if (action === 'initialize') value = await initialize(data.options);
    else if (action === 'generate') {
      const pcm = await synthesizeText(data.chunk.text, () => self.postMessage({ id, event: 'first-pcm' }));
      value = { parts: [pcm], sampleRate: SAMPLE_RATE, completedChunkId: data.chunk.id };
    } else if (action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown SupraTTS worker action.');
    self.postMessage({ id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id, error: String(error?.stack ?? error) });
  }
};
