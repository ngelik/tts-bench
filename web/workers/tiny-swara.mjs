import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { createFrontend, splitSentences } from '../tiny-swara/frontend.mjs';
import { TINY_SWARA as profile } from '../adapters/tiny-swara-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
let ort, session, espeak, frontend, metadata, inventory, activeVoice, activeFixture, activeLanguage, backend, gpuName;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function assetUrl(relative) {
  const url = new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) throw new Error('Tiny Swara assets must use the same-origin pinned model tree');
  return url;
}
async function checkedBytes(relative, label, external = false) {
  const spec = profile.assets[relative] ?? profile.ortAssets[relative];
  if (!spec) throw new Error(`Tiny Swara asset is not pinned: ${relative}`);
  const url = !external ? assetUrl(relative) : profile.assets[relative]
    ? new URL(`/runtimes/espeak-ng/tiny-swara-1.52.0/${relative}`, self.location.origin)
    : new URL(`/runtimes/onnxruntime-web-pocket/${profile.runtimeVersion}/${relative}`, self.location.origin);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) throw new Error('Tiny Swara assets must use the same-origin pinned asset tree');
  const response = await fetchModelAsset(url, profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}

function orderedSymbols(value) {
  const entries = Object.entries(value.vocab);
  if (entries.some(([token, id]) => !Number.isSafeInteger(id) || id < 0 || id >= entries.length) ||
      new Set(entries.map(([, id]) => id)).size !== entries.length) throw new Error('Tiny Swara config vocabulary is invalid');
  return entries.sort((a, b) => a[1] - b[1]).map(([token]) => token);
}
function validateMetadata(config, inventoryValue, symbols) {
  const actualSymbols = orderedSymbols(config);
  if (config.model?.sample_rate !== profile.sampleRate || config.model?.hop !== profile.hop || config.model?.max_tokens !== profile.maxTokens ||
      config.model?.max_frames !== profile.maxFrames || config.step !== profile.step || config.frontend !== 'espeak' ||
      config.frontend_fingerprint !== profile.declaredFrontendFingerprint || !sameJson(config.voices, profile.voices.map(voice => voice.id)) ||
      config.sample_rate !== profile.sampleRate || !sameJson(config.onnx?.inputs, ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      !sameJson(config.onnx?.outputs, ['audio', 'durations']) || !sameJson(actualSymbols, symbols) || inventoryValue.voice !== 'bn' || symbols.length !== 77) {
    throw new Error('Tiny Swara release config differs from the pinned Bengali checkpoint profile');
  }
}
function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Tiny Swara voice: ${requested}`);
  return voice;
}
function createEspeakModule(bytes, dataBytes) {
  return import(new URL(`/runtimes/espeak-ng/tiny-swara-1.52.0/espeak-quiet.mjs`, self.location.origin).href)
    .then(({ default: factory }) => {
      if (typeof factory !== 'function') throw new Error('Tiny Swara eSpeak 1.52.0 Emscripten factory is unavailable');
      return factory({
        wasmBinary: bytes,
        locateFile(path) {
          if (!['espeak-quiet.wasm', 'espeak-quiet.data'].includes(path)) throw new Error(`Unexpected Tiny Swara eSpeak resource: ${path}`);
          return new URL(`/runtimes/espeak-ng/tiny-swara-1.52.0/${path}`, self.location.origin).href;
        },
        getPreloadedPackage(name, size) {
          if (!String(name).endsWith('espeak-quiet.data') || size !== dataBytes.byteLength) throw new Error('Tiny Swara eSpeak data package mismatch');
          return dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength);
        },
      });
    });
}
function createRawEspeak(module) {
  const initialized = module.ccall('bench_espeak_init', 'number', ['string'], ['/data']);
  if (initialized !== 0) throw new Error('Tiny Swara eSpeak NG failed to initialize Bengali and English data');
  const version = module.ccall('bench_espeak_version', 'string', [], []);
  if (!String(version).includes('1.52.0')) throw new Error(`Tiny Swara requires eSpeak NG 1.52.0; received ${version}`);
  return (piece, voice) => {
    const output = module.ccall('bench_espeak_trace', 'string', ['string', 'string'], [piece, voice]);
    if (typeof output !== 'string') throw new Error(`Tiny Swara eSpeak NG failed for voice ${voice}`);
    return output;
  };
}

function prepareSentence(sentence) {
  const phones = frontend.phonemize(sentence);
  if (phones.unknown.length) throw new Error(`Tiny Swara has unmapped phonemes in ${sentence.slice(0, 48)}: ${[...new Set(phones.unknown)].join(', ')}`);
  if (phones.ids.length > profile.maxTokens) throw new Error(`Tiny Swara sentence exceeds ${profile.maxTokens} model tokens`);
  return { sentence, ...phones };
}
function prepareText(text) {
  return splitSentences(text).map(prepareSentence);
}
function idsTensor(values) { return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]); }
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

async function synthesize(plan) {
  const inputs = {
    tokens: idsTensor(plan.ids),
    stress: idsTensor(plan.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift),
    pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    if (typeof outputs.audio?.getData !== 'function') throw new Error('Tiny Swara ONNX Runtime did not expose awaited CPU PCM readback');
    const source = await outputs.audio.getData();
    if (!source?.length) throw new Error('Tiny Swara returned empty audio');
    const pcm = Float32Array.from(source);
    let peak = 0;
    for (const sample of pcm) {
      if (!Number.isFinite(sample)) throw new Error('Tiny Swara returned non-finite audio');
      peak = Math.max(peak, Math.abs(sample));
    }
    if (peak > 0) {
      const gain = 0.9 / peak;
      for (let index = 0; index < pcm.length; index++) pcm[index] *= gain;
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}
async function generateText(text, onFirstPcm) {
  const sentences = splitSentences(text);
  if (!sentences.length) throw new Error('Tiny Swara did not find a pronounceable sentence');
  const waves = [];
  for (const sentence of sentences) {
    const plan = prepareSentence(sentence);
    const wave = await synthesize(plan);
    waves.push(wave);
    if (waves.length === 1) onFirstPcm?.();
  }
  if (waves.length === 1) return waves[0];
  const joined = new Float32Array(waves.reduce((sum, wave) => sum + wave.length, 0));
  let offset = 0;
  for (const wave of waves) { joined.set(wave, offset); offset += wave.length; }
  return joined;
}

async function verifyFixtureAudit(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error(`Tiny Swara audit requires all ${expected.spans} ordered Bengali fixture spans`);
  const rows = [];
  let plans = 0, maximumTokens = 0, unknownPhones = 0, primaryStress = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Invalid or reordered Tiny Swara fixture span ${id}`);
    const tuples = prepareText(item.text).map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 || plan.ids.some(value => !Number.isSafeInteger(value) || value < 0 || value >= 77) ||
          plan.stress.some(value => !Number.isSafeInteger(value) || value < 0 || value > 2)) throw new Error(`Invalid Tiny Swara token/stress output in fixture span ${id}`);
      plans++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.unknown.length;
      primaryStress += plan.stress.filter(value => value === 1).length;
      return [plan.ids, plan.stress];
    });
    rows.push([id, tuples]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (plans !== expected.plans || maximumTokens !== expected.maximumTokens || unknownPhones !== expected.unknownPhones ||
      primaryStress !== expected.primaryStress || tokenStressSha256 !== expected.tokenStressSha256) {
    throw new Error('Tiny Swara frontend parity mismatch: ' + JSON.stringify({ spans: rows.length, plans, maximumTokens, unknownPhones, primaryStress, tokenStressSha256 }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, spans: rows.length, plans, maximumTokens, unknownPhones, primaryStress, tokenStressSha256 };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice,
    precision: profile.precision, settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}
async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Swara requires an explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) throw new Error('Tiny Swara requires bn-article-v1 and native Bengali language bn');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = chooseVoice(options.voice || profile.defaultVoice);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }

  const runtimeFiles = webgpu
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, configBytes, inventoryBytes, lexiconBytes, espeakData, espeakJs, espeakWasm, ...runtimeBytes] = await Promise.all([
    checkedBytes('model.onnx', 'Tiny Swara INT8 graph'),
    checkedBytes('config.json', 'Tiny Swara config'),
    checkedBytes('inventory.json', 'Tiny Swara inventory'),
    checkedBytes('lexicon.json', 'Tiny Swara lexicon'),
    checkedBytes('espeak-quiet.data', 'Tiny Swara eSpeak data', true),
    checkedBytes('espeak-quiet.mjs', 'Tiny Swara eSpeak module', true),
    checkedBytes('espeak-quiet.wasm', 'Tiny Swara eSpeak WebAssembly', true),
    ...runtimeFiles.map(name => checkedBytes(name, `ONNX Runtime Web ${name}`, true)),
  ]);
  // The Emscripten module itself and its data package share the global runtime path.
  // Their hashes are checked before evaluation; the module's relative data URL is pinned.
  void espeakJs;
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  inventory = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(inventoryBytes));
  const lexicon = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(lexiconBytes));
  const module = await createEspeakModule(espeakWasm, espeakData);
  const rawEspeak = createRawEspeak(module);
  espeak = module;
  frontend = createFrontend({ inventory, lexicon, rawEspeak });
  validateMetadata(metadata, inventory, frontend.symbols);

  const audit = options.auditTexts?.length ? await verifyFixtureAudit(options.auditTexts) : undefined;
  const runtimeRoot = new URL(`/runtimes/onnxruntime-web-pocket/${profile.runtimeVersion}/`, self.location.origin);
  const runtimeModule = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  ort = await import(new URL(runtimeModule, runtimeRoot).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = webgpu ? {
    mjs: new URL('ort-wasm-simd-threaded.asyncify.mjs', runtimeRoot).href,
    wasm: new URL('ort-wasm-simd-threaded.asyncify.wasm', runtimeRoot).href,
  } : runtimeRoot.href;
  ort.env.wasm.wasmBinary = runtimeBytes.at(-1);
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, { executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'] });
  if (!sameJson(session.inputNames, metadata.onnx.inputs) || !sameJson(session.outputNames, metadata.onnx.outputs)) throw new Error('Tiny Swara ONNX graph names differ from the released config');
  if (webgpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }

  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (options.probe) {
      const pcm = await generateText(options.probeText || 'আমার সোনার বাংলা।', null);
      if (!pcm.length) throw new Error('Tiny Swara capability probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Swara probe');
  }
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id,
    precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage, locale: profile.locale,
      voice: activeVoice.id, voiceIndex: activeVoice.index, speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames, step: profile.step,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      declaredFrontendFingerprint: profile.declaredFrontendFingerprint, runtimeVersion: profile.runtimeVersion,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion, espeakNg: '1.52.0' }, runtimePackageIntegrity: profile.runtimeIntegrity,
      espeakSourceRevision: profile.espeakRevision, executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'],
      waveformExecutionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'], wasmThreads: 1, graphOptimization: 'ONNX Runtime Web default',
      waveform: 'Released INT8 ONNX graph. Each source sentence is peak-normalized to 0.9 when nonzero, matching inference.py; sentence PCM is concatenated without a final span cap. Graph contains RandomNormalLike, so PCM is not bit-identical across executions or providers.',
      frontendScope: 'Native Bengali uses eSpeak NG 1.52.0 voice bn. Known Latin lexicon entries route through Bengali spelling; other Latin words use en-us phones projected through the Bengali inventory. English input is not a supported English voice/model configuration.',
      frontendFingerprintNote: 'The released config declares 54cece4f…; the pinned inventory plus all Bengali/code-mix fallback mappings compute 9b2e2c14…. Native Bengali fixture token/stress parity is checked independently.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches from ONNX Runtime Web ${profile.runtimeVersion}; WASM fallback remains available.` : 'Pinned ONNX Runtime Web 1.31.1 requests WebGPU with WASM fallback; an untimed probe is required to verify dispatch.')
        : `ONNX Runtime Web ${profile.runtimeVersion} uses explicit single-thread WASM; Bengali normalization and eSpeak NG phonemization run locally.`,
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !frontend || !espeak || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Swara adapter is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Tiny Swara source chunk');
  const pcm = await generateText(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}
async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  if (espeak) { try { espeak.ccall('bench_espeak_dispose', null, [], []); } catch {} }
  espeak = frontend = metadata = inventory = ort = null;
  activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Swara worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
