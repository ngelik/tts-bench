import { createUaSerhiyGraphRuntime } from '../ua-serhiy-0p58m/graph-runtime.mjs';
import { createUaSerhiyPhonemizer, prepareUaSerhiyText } from '../ua-serhiy-0p58m/frontend.mjs';
import { UA_SERHIY_CONFIG } from '../adapters/ua-serhiy-config.mjs';

const SAMPLE_RATE = 22_050;
let ort = null;
let sessions = null;
let graphRuntime = null;
let phonemize = null;
let phonemeIdMap = null;
let restoreFetch = null;
let disposed = false;

function localUrl(value) {
  const url = new URL(value, self.location.href);
  if (url.origin !== self.location.origin) throw new Error(`Ukrainian Serhiy refused non-local asset URL: ${url.origin}`);
  return url.href;
}

function installLocalFetch() {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const requested = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requested, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Ukrainian Serhiy refused external fetch: ${url.origin}`);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

async function digestHex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

async function fetchPinned(asset, label) {
  const url = localUrl(asset.url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Ukrainian Serhiy ${label} returned HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.bytes || await digestHex(bytes) !== asset.sha256) {
    throw new Error(`Ukrainian Serhiy ${label} failed its byte-count or SHA-256 pin.`);
  }
  return bytes;
}

async function fetchRuntimeFile(url, bytes, sha256, label) {
  return fetchPinned({ url, bytes, sha256 }, label);
}

async function releaseSessions() {
  const current = sessions;
  sessions = null;
  graphRuntime = null;
  if (!current) return;
  const errors = [];
  for (const key of ['duration', 'acousticToken', 'acousticFrame', 'decoder']) {
    try { await current[key]?.release?.(); }
    catch (error) { errors.push(String(error?.message ?? error)); }
  }
  if (errors.length) throw new Error(`Ukrainian Serhiy session cleanup failed: ${errors.join('; ')}`);
}

async function loadSession(name, graph, provider) {
  const model = await fetchPinned(graph, `${name} ONNX graph`);
  return ort.InferenceSession.create(model, {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
  });
}

async function initialize(options = {}) {
  disposed = false;
  if (options.backend !== 'cpu') {
    return {
      ...UA_SERHIY_CONFIG.info,
      status: 'unsupported',
      reason: 'The Ukrainian Serhiy CPU adapter supports explicit ONNX Runtime WASM only.',
      backendEffective: 'none',
      capability: { gpuDispatchVerified: false, description: 'No GPU backend was requested by this CPU worker.' },
    };
  }
  if (sessions) await releaseSessions();
  installLocalFetch();
  const config = options.modelConfig ?? UA_SERHIY_CONFIG;
  const created = {};
  try {
    const ortRoot = localUrl(config.runtime.ortRoot);
    ort = await import(ortRoot + 'ort.wasm.min.mjs');
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = {
      mjs: ortRoot + 'ort-wasm-simd-threaded.mjs',
      wasm: ortRoot + 'ort-wasm-simd-threaded.wasm',
    };

    // Load the pinned config and local eSpeak closure before model sessions.
    const configBytes = await fetchPinned(config.phonemeConfig, 'phoneme configuration');
    const configText = new TextDecoder('utf-8', { fatal: true }).decode(configBytes);
    const piperConfig = JSON.parse(configText);
    if (piperConfig.espeak?.voice !== 'uk' || piperConfig.num_symbols !== 256 ||
        piperConfig.audio?.sample_rate !== SAMPLE_RATE || !piperConfig.phoneme_id_map) {
      throw new Error('Pinned Piper phoneme configuration does not match the Ukrainian Serhiy checkpoint.');
    }
    phonemeIdMap = piperConfig.phoneme_id_map;

    const espeak = config.runtime.espeak;
    const [moduleBytes, wasmBinary, data] = await Promise.all([
      fetchRuntimeFile(espeak.moduleUrl, espeak.moduleBytes, espeak.moduleSha256, 'eSpeak module'),
      fetchRuntimeFile(espeak.wasmUrl, espeak.wasmBytes, espeak.wasmSha256, 'eSpeak WASM'),
      fetchRuntimeFile(espeak.dataUrl, espeak.dataBytes, espeak.dataSha256, 'eSpeak data'),
    ]);
    if (typeof moduleBytes.byteLength !== 'number') throw new Error('Pinned eSpeak module response is invalid.');
    const { default: createEspeak } = await import(localUrl(espeak.moduleUrl));
    if (typeof createEspeak !== 'function') throw new Error('Pinned Piper eSpeak module has no default factory.');
    phonemize = await createUaSerhiyPhonemizer({
      createEspeak,
      wasmBinary: new Uint8Array(wasmBinary),
      data,
    });

    // Construct sequentially to avoid simultaneous ORT session initialization
    // contention while retaining the same registered order on CPU and GPU.
    created.duration = await loadSession('duration', config.graphs.duration, 'wasm');
    created.acousticToken = await loadSession('acoustic token', config.graphs.acousticToken, 'wasm');
    created.acousticFrame = await loadSession('acoustic frame', config.graphs.acousticFrame, 'wasm');
    created.decoder = await loadSession('decoder', config.graphs.decoder, 'wasm');
    sessions = created;
    graphRuntime = createUaSerhiyGraphRuntime({ ort, sessions });

    if (options.probe) {
      await synthesizeText(options.probeText || 'Перевірка синтезу мовлення.', null);
    }
    return {
      ...config.info,
      status: 'measured',
      backendEffective: 'cpu/wasm',
      capability: {
        gpuDispatchVerified: null,
        description: 'Explicit ONNX Runtime Web WASM graph inference with one thread; Ukrainian eSpeak and stress restoration run in the local Chrome worker.',
      },
    };
  } catch (error) {
    for (const session of Object.values(created)) {
      try { await session?.release?.(); } catch { /* keep original setup failure */ }
    }
    sessions = null;
    graphRuntime = null;
    phonemize?.dispose?.();
    phonemize = null;
    phonemeIdMap = null;
    ort = null;
    throw error;
  } finally {
    restoreFetch?.();
    restoreFetch = null;
  }
}

async function synthesizeText(text, requestId) {
  if (!graphRuntime || !phonemize || !phonemeIdMap) throw new Error('Ukrainian Serhiy has not been initialized.');
  const prepared = await prepareUaSerhiyText(text, { phonemize, phonemeIdMap });
  if (prepared.sourceText !== text || prepared.sentences.map(unit => unit.text).join('') !== text) {
    throw new Error('Ukrainian Serhiy frontend did not preserve the complete source span.');
  }
  const parts = [];
  for (const unit of prepared.sentences) {
    if (unit.ids.length < 1 || unit.ids.length > 255) throw new Error('Ukrainian Serhiy frontend emitted an invalid bounded unit.');
    const pcm = await graphRuntime.synthesizeUnit(unit.ids);
    if (!(pcm instanceof Float32Array) || pcm.length === 0) {
      throw new Error('Ukrainian Serhiy produced empty PCM.');
    }
    parts.push(pcm);
    if (requestId !== null) self.postMessage({ id: requestId, event: 'first-pcm' });
    requestId = null;
  }
  if (!parts.length) throw new Error('Ukrainian Serhiy produced no audio units.');
  return {
    parts,
    sampleRate: SAMPLE_RATE,
    frontend: {
      units: prepared.sentences.length,
      tokenIds: prepared.tokenIds.length,
      stressStats: prepared.stressStats,
    },
  };
}

async function dispose() {
  disposed = true;
  const errors = [];
  try { await releaseSessions(); } catch (error) { errors.push(String(error?.message ?? error)); }
  try { phonemize?.dispose?.(); } catch (error) { errors.push(String(error?.message ?? error)); }
  phonemize = null;
  phonemeIdMap = null;
  ort = null;
  restoreFetch?.();
  restoreFetch = null;
  if (errors.length) throw new Error(errors.join('; '));
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') {
      if (disposed) throw new Error('Ukrainian Serhiy worker has been disposed.');
      value = await synthesizeText(data.chunk.text, data.id);
      value.completedChunkId = data.chunk.id;
    } else if (data.action === 'dispose') {
      await dispose();
      value = null;
    } else throw new Error('Unknown Ukrainian Serhiy worker action.');
    const transfer = value?.parts?.map(part => part.buffer) ?? [];
    self.postMessage({ id: data.id, value }, transfer);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
