import { fetchModelAsset } from '../cache-model-asset.mjs';
import { observeComputeDispatches, requestHardwareWebGpuAdapter } from '../piper/webgpu.mjs';
import { prepareUaSerhiyText, createUaSerhiyPhonemizer } from '../ua-serhiy-0p58m/frontend.mjs';
import { createUaSerhiyGraphRuntime } from '../ua-serhiy-0p58m/graph-runtime.mjs';

const MODEL_REVISION = '1abd585d725a787b405c28a59ce1cbdfd34780bb';
const SAMPLE_RATE = 22_050;

let modelConfig = null;
let ort = null;
let sessions = null;
let graphRuntime = null;
let phonemizer = null;
let phonemeIdMap = null;
let restoreFetch = null;
let capability = null;
let gpuDescription = null;

function responseInfo(executionProviders = ['webgpu', 'wasm']) {
  const info = modelConfig?.info ?? {};
  return {
    voice: info.voice ?? 'Serhiy (Ukrainian)',
    precision: info.precision ?? 'FP32 generated ONNX graphs',
    settings: {
      ...(info.settings ?? {}),
      executionProviders: [...executionProviders],
      wasmThreads: 1,
      gpuProvider: 'WebGPU with explicit WASM operator fallback',
    },
  };
}

function unsupported(reason) {
  return {
    ...responseInfo(),
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function installLocalFetchFence() {
  if (restoreFetch) return;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(raw, self.location.href);
    if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
      throw new Error(`Ukrainian Serhiy refused nonlocal asset request: ${url.origin}${url.pathname}`);
    }
    return originalFetch(input, init);
  };
  restoreFetch = () => {
    globalThis.fetch = originalFetch;
    restoreFetch = null;
  };
}

async function verifiedBytes(asset, label) {
  if (!asset || typeof asset.url !== 'string' || !Number.isSafeInteger(asset.bytes) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) {
    throw new Error(`Ukrainian Serhiy ${label} asset metadata is incomplete.`);
  }
  const response = await fetchModelAsset(asset.url, MODEL_REVISION);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.bytes) {
    throw new Error(`Ukrainian Serhiy ${label} has ${bytes.byteLength} bytes; expected ${asset.bytes}.`);
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== asset.sha256) throw new Error(`Ukrainian Serhiy ${label} SHA-256 mismatch.`);
  return bytes;
}

async function verifiedConfigAsset(asset, label) {
  const bytes = await verifiedBytes(asset, label);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch (error) { throw new Error(`Ukrainian Serhiy ${label} is invalid JSON: ${String(error?.message ?? error)}`); }
}

async function prepareText(text) {
  return prepareUaSerhiyText(text, { phonemize: phonemizer, phonemeIdMap, maxIds: 255 });
}

async function synthesizeText(text, sourceId) {
  if (!graphRuntime || !phonemizer || !phonemeIdMap) throw new Error('Ukrainian Serhiy WebGPU is not initialized.');
  const prepared = await prepareText(text);
  const parts = [];
  for (let index = 0; index < prepared.sentences.length; index++) {
    const unit = prepared.sentences[index];
    try {
      const pcm = await graphRuntime.synthesizeUnit(unit.ids);
      if (!(pcm instanceof Float32Array) || !pcm.length || !pcm.every(Number.isFinite)) {
        throw new Error('The graph path returned empty or nonfinite CPU-readable PCM.');
      }
      parts.push(pcm);
    } catch (error) {
      throw new Error(
        `Ukrainian Serhiy WebGPU synthesis failed at source span ${sourceId}, ` +
        `unit ${index + 1}/${prepared.sentences.length}, IDs=${unit.ids.length}: ` +
        `${String(error?.message ?? error)}`,
      );
    }
  }
  if (!parts.length) throw new Error(`Ukrainian Serhiy produced no PCM for source span ${sourceId}.`);
  return { parts, sampleRate: SAMPLE_RATE, completedChunkId: sourceId };
}

async function releaseSessions() {
  const current = sessions;
  sessions = null;
  graphRuntime = null;
  if (!current) return;
  let firstError = null;
  for (const name of ['decoder', 'acousticFrame', 'acousticToken', 'duration']) {
    try { await current[name]?.release?.(); }
    catch (error) { firstError ??= error; }
  }
  if (firstError) throw new Error(`Ukrainian Serhiy ONNX session cleanup failed: ${String(firstError?.message ?? firstError)}`);
}

async function dispose() {
  let firstError = null;
  try { phonemizer?.dispose?.(); }
  catch (error) { firstError ??= error; }
  phonemizer = null;
  phonemeIdMap = null;
  try { await releaseSessions(); }
  catch (error) { firstError ??= error; }
  restoreFetch?.();
  ort = null;
  modelConfig = null;
  capability = null;
  gpuDescription = null;
  if (firstError) throw firstError;
}

async function initialize(options = {}) {
  if (options?.backend !== 'webgpu') return unsupported('Ukrainian Serhiy WebGPU worker requires explicit backend=webgpu.');
  const incomingConfig = options.modelConfig;
  if (!incomingConfig || incomingConfig.id !== 'ua-serhiy-0p58m' ||
      incomingConfig.source?.revision !== MODEL_REVISION ||
      !incomingConfig.runtime?.ortRoot || !incomingConfig.graphs?.decoder) {
    throw new Error('Ukrainian Serhiy WebGPU worker received a mismatched or incomplete pinned configuration.');
  }
  modelConfig = incomingConfig;
  const selection = await requestHardwareWebGpuAdapter(globalThis.navigator?.gpu);
  if (selection.reason) return unsupported(selection.reason);
  if (!selection.adapter || selection.adapter.isFallbackAdapter || selection.info?.isFallbackAdapter) {
    return unsupported('Only a non-fallback hardware WebGPU adapter is eligible.');
  }
  gpuDescription = selection.description;

  installLocalFetchFence();
  try {
    const ortRoot = modelConfig.runtime.ortRoot;
    ort = await import(ortRoot + 'ort.webgpu.min.mjs');
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const wasmBase = ortRoot + 'ort-wasm-simd-threaded.asyncify';
    ort.env.wasm.wasmPaths = { mjs: wasmBase + '.mjs', wasm: wasmBase + '.wasm' };
    ort.env.webgpu.adapter = selection.adapter;

    const [graphEntries, phonemeConfig, espeakModuleBytes, espeakWasm, espeakData] = await Promise.all([
      Promise.all(Object.entries(modelConfig.graphs).map(async ([name, asset]) => [name, await verifiedBytes(asset, `${name} graph`)])),
      verifiedConfigAsset(modelConfig.phonemeConfig, 'phoneme config'),
      verifiedBytes({ url: modelConfig.runtime.espeak.moduleUrl, bytes: modelConfig.runtime.espeak.moduleBytes,
        sha256: modelConfig.runtime.espeak.moduleSha256 }, 'eSpeak module'),
      verifiedBytes({ url: modelConfig.runtime.espeak.wasmUrl, bytes: modelConfig.runtime.espeak.wasmBytes,
        sha256: modelConfig.runtime.espeak.wasmSha256 }, 'eSpeak WASM'),
      verifiedBytes({ url: modelConfig.runtime.espeak.dataUrl, bytes: modelConfig.runtime.espeak.dataBytes,
        sha256: modelConfig.runtime.espeak.dataSha256 }, 'eSpeak dictionary data'),
    ]);
    if (!phonemeConfig.phoneme_id_map || typeof phonemeConfig.phoneme_id_map !== 'object') {
      throw new Error('Ukrainian Serhiy phoneme config has no pinned ID map.');
    }
    if (!espeakModuleBytes.byteLength) throw new Error('Pinned eSpeak worker module is empty.');
    phonemeIdMap = phonemeConfig.phoneme_id_map;

    // ORT WebGPU 1.23.2 has a shared WebGPU session initialization guard;
    // create sessions serially and keep the provider order explicit.
    const executionProviders = ['webgpu', 'wasm'];
    sessions = {};
    for (const [name, bytes] of graphEntries) {
      sessions[name] = await ort.InferenceSession.create(bytes, {
        executionProviders,
        graphOptimizationLevel: 'all',
      });
    }
    graphRuntime = createUaSerhiyGraphRuntime({ ort, sessions });

    const espeakFactoryModule = await import(modelConfig.runtime.espeak.moduleUrl);
    const createEspeak = espeakFactoryModule.default ?? espeakFactoryModule.createEspeak;
    if (typeof createEspeak !== 'function') throw new Error('Pinned eSpeak worker does not export its Emscripten factory.');
    phonemizer = await createUaSerhiyPhonemizer({
      createEspeak,
      wasmBinary: new Uint8Array(espeakWasm),
      data: espeakData,
    });

    const actualDevice = await ort.env.webgpu.device;
    const actualAdapter = ort.env.webgpu.adapter;
    const actualInfo = actualDevice?.adapterInfo ?? actualAdapter?.info ?? selection.info;
    if (actualAdapter?.isFallbackAdapter === true || actualInfo?.isFallbackAdapter === true) {
      const outcome = unsupported('ONNX Runtime selected a software WebGPU fallback adapter.');
      await dispose();
      return outcome;
    }
    gpuDescription = actualInfo?.description || actualInfo?.vendor || gpuDescription;

    let dispatches = null;
    capability = {
      gpuDispatchVerified: null,
      description: 'WebGPU + WASM fallback configured; no dispatch probe requested.',
    };
    if (options.probe === true) {
      const observation = observeComputeDispatches(globalThis);
      try {
        const probeText = typeof options.probeText === 'string' && options.probeText.trim()
          ? options.probeText
          : 'Добрий день. Це коротка перевірка синтезу.';
        const result = await synthesizeText(probeText, 0);
        if (!result.parts.length || !result.parts.every(part => part.every(Number.isFinite)) ||
            !result.parts.some(part => part.some(sample => sample !== 0))) {
          throw new Error('Ukrainian Serhiy dispatch probe returned empty, all-zero or nonfinite PCM.');
        }
      } finally {
        dispatches = observation.stop();
      }
      if (dispatches <= 0) {
        const outcome = unsupported('No actual WebGPU compute dispatch was observed during the untimed Serhiy speech probe.');
        await dispose();
        return outcome;
      }
      capability = {
        gpuDispatchVerified: true,
        description: `Observed ${dispatches} WebGPU compute dispatches during a separate untimed speech synthesis. The Ukrainian eSpeak frontend and spectral iSTFT run in JavaScript; WebGPU handles ONNX graph operators with explicit WASM fallback. Dispatch hooks were removed before timed generation.`,
      };
    }
    return {
      ...responseInfo(executionProviders),
      status: 'measured',
      backendEffective: 'webgpu+wasm',
      gpu: gpuDescription,
      capability,
    };
  } catch (error) {
    try { await dispose(); } catch { /* Preserve the original initialization error. */ }
    throw error;
  }
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      if (!data.chunk || typeof data.chunk.text !== 'string' || !Number.isSafeInteger(data.chunk.id) || data.chunk.id < 0) {
        throw new Error('Ukrainian Serhiy requires a string source span with a numeric nonnegative ID.');
      }
      value = await synthesizeText(data.chunk.text, data.chunk.id);
    } else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Ukrainian Serhiy WebGPU action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
