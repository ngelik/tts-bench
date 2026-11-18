import { Runtime } from '../sano-kokopop/runtime.js';

const BACKEND_VALUES = Object.freeze({ cpu: 1, webgpu: 6 });
const CACHE_NAME = 'tts-bench-sano-heart-nano-kokopop-v1';
const SOFTWARE_ADAPTER = /swiftshader|llvmpipe|software raster/i;
let module = null;
let runtime = null;
let config = null;
let queue = Promise.resolve();

function observeComputeDispatches() {
  let count = 0;
  let stopped = false;
  const original = [];
  const prototype = globalThis.GPUComputePassEncoder?.prototype;
  for (const name of ['dispatchWorkgroups', 'dispatchWorkgroupsIndirect']) {
    if (typeof prototype?.[name] !== 'function') continue;
    const method = prototype[name];
    try {
      prototype[name] = function (...args) {
        count++;
        return method.apply(this, args);
      };
      if (prototype[name] !== method) original.push([prototype, name, method]);
    } catch {
      // A browser with non-overridable WebGPU prototypes will leave the count
      // at zero and fail the hardware evidence gate instead of guessing.
    }
  }
  return {
    stop() {
      if (!stopped) {
        for (const [proto, name, method] of original) proto[name] = method;
        stopped = true;
      }
      return count;
    },
  };
}

function fail(message) { throw new Error(message); }

function validateAsset(asset, label, expectedName) {
  if (!asset || typeof asset.url !== 'string' || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256 || '')) {
    fail('Invalid locked ' + label + ' asset configuration.');
  }
  const url = new URL(asset.url, self.location.href);
  if (url.origin !== self.location.origin || (expectedName && !url.pathname.endsWith('/' + expectedName))) {
    fail(label + ' must be a same-origin locked file' + (expectedName ? ' named ' + expectedName : '') + '.');
  }
  return { ...asset, url: url.href };
}

async function digestHex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function readVerified(asset, label) {
  const cache = await caches.open(CACHE_NAME);
  const key = new Request(new URL('/__tts-bench-cache/' + CACHE_NAME + '/' + asset.sha256, self.location.origin));
  let response = await cache.match(key);
  if (response && (response.headers.get('X-TTS-Bench-SHA256') !== asset.sha256 ||
      response.headers.get('X-TTS-Bench-Bytes') !== String(asset.bytes))) {
    await cache.delete(key);
    response = null;
  }
  if (!response) {
    const network = await fetch(asset.url, { cache: 'no-store', credentials: 'same-origin' });
    if (network.status !== 200) fail(label + ' fetch returned HTTP ' + network.status + '.');
    const body = await network.arrayBuffer();
    if (body.byteLength !== asset.bytes) fail(label + ' length mismatch: expected ' + asset.bytes + ', got ' + body.byteLength + '.');
    const sha256 = await digestHex(body);
    if (sha256 !== asset.sha256) fail(label + ' SHA-256 mismatch: expected ' + asset.sha256 + ', got ' + sha256 + '.');
    response = new Response(body, { status: 200, headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(asset.bytes),
      'X-TTS-Bench-SHA256': asset.sha256,
      'X-TTS-Bench-Bytes': String(asset.bytes),
    } });
    await cache.put(key, response.clone());
  }
  const body = await response.arrayBuffer();
  if (body.byteLength !== asset.bytes || await digestHex(body) !== asset.sha256) {
    await cache.delete(key);
    fail(label + ' cached bytes failed length or SHA-256 validation.');
  }
  return body;
}

function runtimeAssets(modelConfig) {
  const files = modelConfig?.runtime?.files;
  if (!Array.isArray(files)) fail('Kokopop profile requires locked runtime.files entries.');
  const byName = new Map(files.map(file => [String(file.target || file.path || '').split('/').at(-1), file]));
  const entries = {};
  for (const name of ['kokopop-runtime.js', 'kokopop-runtime.wasm', 'kokopop-runtime.data']) {
    const file = byName.get(name);
    if (!file) fail('Kokopop runtime lock is missing ' + name + '.');
    const target = file.target || file.path;
    const url = file.url || '/' + target;
    entries[name] = validateAsset({ ...file, url }, 'runtime asset', name);
  }
  return entries;
}

async function getHardwareAdapter() {
  if (!navigator.gpu) return null;
  // Match Emdawnwebgpu's default adapter request in the pinned native runtime.
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) return null;
  const info = adapter.info || {};
  const identity = [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(' ');
  if (adapter.isFallbackAdapter === true || info.isFallbackAdapter === true || SOFTWARE_ADAPTER.test(identity)) return null;
  if (!adapter.features.has('shader-f16')) return null;
  return {
    identity: identity || 'WebGPU adapter (non-fallback flag; details not exposed)',
    vendor: info.vendor || null,
    architecture: info.architecture || null,
    device: info.device || null,
    description: info.description || null,
    features: [...adapter.features].sort(),
  };
}

function requireModelConfig(value) {
  const model = validateAsset(value?.model, 'heart-nano GGUF', 'heartnano-f32.gguf');
  if (!value || !value.runtime || !value.info) fail('Kokopop worker requires model, runtime and info configuration.');
  return { ...value, model };
}

async function load(options) {
  if (runtime) fail('Kokopop worker already has a loaded model.');
  if (!['cpu', 'webgpu'].includes(options?.backend)) fail('Kokopop supports explicit cpu or webgpu selection only.');
  config = requireModelConfig(options.modelConfig);
  const hardwareAdapter = options.backend === 'webgpu' ? await getHardwareAdapter() : null;
  if (options.backend === 'webgpu' && !hardwareAdapter) {
    return {
      ...config.info,
      status: 'unsupported',
      backendEffective: 'none',
      reason: 'No non-fallback WebGPU adapter with shader-f16 support is available.',
      capability: { gpuDispatchVerified: false, description: 'No eligible hardware WebGPU adapter was exposed by this browser.' },
    };
  }

  const files = runtimeAssets(config);
  const modelBytes = await readVerified(config.model, 'heart-nano F32 GGUF');
  const wasmBinary = await readVerified(files['kokopop-runtime.wasm'], 'Kokopop WebAssembly runtime');
  const dataPackage = await readVerified(files['kokopop-runtime.data'], 'Kokopop eSpeak data');
  // Verify the locked JS module before importing it from its immutable same-origin path.
  await readVerified(files['kokopop-runtime.js'], 'Kokopop JavaScript runtime');
  const { default: createModule } = await import(files['kokopop-runtime.js'].url);
  const moduleOptions = {
    wasmBinary,
    getPreloadedPackage(packageName) {
      if (String(packageName).endsWith('kokopop-runtime.data')) return dataPackage;
      throw new Error('Unexpected Kokopop preload package: ' + packageName);
    },
    locateFile(name) {
      const asset = files[name];
      return asset ? asset.url : new URL(name, files['kokopop-runtime.js'].url).href;
    },
  };
  module = await createModule(moduleOptions);
  runtime = new Runtime(module);
  const info = await runtime.load(modelBytes, BACKEND_VALUES[options.backend]);
  if (info.architecture !== 'sanotts' || !info.voices.some(voice => voice.name === 'heartnano' && voice.sampleRate === 24000)) {
    await runtime.dispose();
    runtime = null;
    fail('Locked GGUF did not load the expected 24 kHz sanoTTS heartnano voice.');
  }
  if (info.backend !== options.backend) {
    await runtime.dispose();
    runtime = null;
    fail('Kokopop selected ' + info.backend + ' for an explicit ' + options.backend + ' request.');
  }

  const report = {
    ...config.info,
    status: 'measured',
    backendEffective: options.backend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm',
    architecture: info.architecture,
    voice: 'heartnano (US English; upstream Misaki-normalized eSpeak IPA frontend)',
    precision: 'F32 GGUF expanded from the exact upstream heartnano Q8 front/model blobs; distinct from the official int8 browser profile.',
    settings: {
      ...(config.info.settings || {}),
      selectedVoice: 'heartnano',
      sampleRate: 24000,
      seed: '42 + canonical chunk id (uint32)',
      textInput: 'Raw canonical benchmark span; Kokopop applies the pinned sanoTTS frontend and does not split the canonical span further.',
      textNormalization: 'Upstream heartnano Misaki normalization followed by its pinned eSpeak IPA tokenizer.',
      streamDecode: 'Synthesis is offline for the complete canonical span; first PCM is returned after full span generation.',
      runtime: config.runtime.version,
      espeakLanguageData: 'English (US) only, from the matching Kokopop Emscripten bundle.',
    },
    capability: {
      gpuDispatchVerified: false,
      description: options.backend === 'webgpu'
        ? 'Awaiting the untimed seeded browser probe; a hardware adapter alone does not prove model dispatch.'
        : 'Explicit CPU/WASM mode of the same Kokopop runtime and exact F32 heartnano GGUF.',
      ...(options.backend === 'webgpu' ? { hardwareAdapter } : {}),
    },
  };

  if (options.probe === true) {
    const probeText = typeof options.probeText === 'string' && options.probeText.trim()
      ? options.probeText
      : 'A quick brown fox.';
    const dispatchObserver = options.backend === 'webgpu' ? observeComputeDispatches() : null;
    let output;
    try {
      output = await runtime.synthesize(probeText, { voice: 'heartnano', speed: 1, seed: 0x20af, trace: options.backend === 'webgpu' });
      if (dispatchObserver) output.gpuDispatches = dispatchObserver.stop();
    } finally {
      dispatchObserver?.stop();
    }
    if (output.sampleRate !== 24000 || !output.samples.length || !output.samples.every(Number.isFinite)) {
      fail('Kokopop probe returned invalid 24 kHz heartnano PCM.');
    }
    if (options.backend === 'webgpu') {
      const ops = output.webgpuOpAssignments || {};
      const dispatches = output.gpuDispatches;
      const namedNeuralOps = ['MUL_MAT', 'IM2COL', 'ADD', 'SILU'];
      const neural = Object.fromEntries(namedNeuralOps.filter(name => Number.isSafeInteger(ops[name]) && ops[name] > 0).map(name => [name, ops[name]]));
      // MUL_MAT is used by the heartnano duration, acoustic and TinyVocos
      // decoder graphs. Require repeated model-layer assignments plus actual
      // device dispatch; report other assigned operations without requiring
      // any particular fallback-sensitive opcode family.
      if (!Number.isSafeInteger(dispatches) || dispatches <= 0 || (ops.MUL_MAT || 0) < 4) {
        fail('WebGPU probe did not prove dispatched neural work: ' + JSON.stringify({ dispatches, ops }));
      }
      report.capability = {
        gpuDispatchVerified: true,
        description: 'An eligible hardware WebGPU adapter was selected; ggml scheduler telemetry assigned named neural ops and GPUComputePassEncoder recorded dispatches during seeded heartnano synthesis.',
        hardwareAdapter,
        dispatches,
        schedulerOperations: neural,
        probeFrames: output.samples.length,
        probeSampleRate: output.sampleRate,
      };
    }
  }
  return report;
}

async function generate(chunk) {
  if (!runtime || !config) fail('Kokopop model is not initialized.');
  if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || !Number.isSafeInteger(chunk.start) ||
      !Number.isSafeInteger(chunk.end) || typeof chunk.text !== 'string' || chunk.end - chunk.start !== chunk.text.length || !chunk.text.trim()) {
    fail('Kokopop requires the exact canonical benchmark text span.');
  }
  const output = await runtime.synthesize(chunk.text, {
    voice: 'heartnano', speed: 1, seed: (42 + chunk.id) >>> 0, trace: false,
  });
  if (output.sampleRate !== 24000 || !output.samples.length || !output.samples.every(Number.isFinite)) {
    fail('Kokopop returned invalid or non-finite heartnano PCM.');
  }
  return { parts: [output.samples], sampleRate: output.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  if (runtime) await runtime.dispose();
  runtime = null;
  module = null;
  config = null;
}

async function handle(message) {
  switch (message.action) {
    case 'initialize': return load(message.options || {});
    case 'generate': return generate(message.chunk);
    case 'dispose': await dispose(); return null;
    default: fail('Unknown Kokopop worker action: ' + message.action);
  }
}

self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      const value = await handle(data);
      self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) || []);
    } catch (error) {
      self.postMessage({ id: data.id, error: String(error?.stack || error?.message || error) });
    }
  });
};
