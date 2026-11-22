import { fetchModelAsset } from '../cache-model-asset.mjs';
import { assetDigests, browserSourceRevision, defaultVoice, defaultVoiceIndex, fixtureOracle, modelRevision, releasedVoices, sampleRate, validateTinyVocaItMetadata } from '../tiny-voca-it/profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const root = `/models/tiny-voca-it/${modelRevision}/${browserSourceRevision}/`;
const runtime = root + 'runtime/';
const settingsBase = {
  language: 'it', locale: 'it-IT', voiceId: defaultVoice, voiceIndex: defaultVoiceIndex,
  speed: 1, emotion: 'neutral', emotionIndex: 0, intensity: 0, pitch: 0, pitchRange: 1,
  sampleRate, threads: 1,
  frontend: `Official tiny-voca-it frontend.js + numbers.js at ${browserSourceRevision}; eSpeak NG 1.0.2 Italian voice`,
  runtimeRelease: 'onnxruntime-web@1.20.1',
  waveform: 'Native ONNX RandomNormalLike noise is unseeded; PCM hashes are not a repeatability oracle.',
};
const info = { voice: 'Lorenzo (EM4)', precision: 'FP32', settings: settingsBase };
let ort, session, metadata, frontend, expandNumbers, espeakModule, espeakWasm, gpuName;
const byteCache = new Map();
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function asset(name) {
  if (byteCache.has(name)) return byteCache.get(name);
  const spec = assetDigests[name];
  if (!spec) throw new Error('Unpinned Tiny Voca Italian asset: ' + name);
  const response = await fetchModelAsset(root + (name.startsWith('ort.') || name.startsWith('ort-') ? 'runtime/' + name : name), modelRevision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error('Tiny Voca Italian asset checksum mismatch: ' + name);
  byteCache.set(name, bytes);
  return bytes;
}

function sentences(text) {
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…;])\s+/);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

async function phonemize(text) {
  return frontend.phonemize(text);
}

async function fit(sentence) {
  const phones = await phonemize(sentence);
  if (phones.ids.length <= metadata.max_tokens - 8) return [phones];
  const pieces = sentence.split(/(?<=[,:—])\s+/);
  if (pieces.length > 1) return (await Promise.all(pieces.map(fit))).flat();
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single Italian word exceeds the pinned model token limit.');
  const half = Math.ceil(words.length / 2);
  return [...await fit(words.slice(0, half).join(' ')), ...await fit(words.slice(half).join(' '))];
}


function tensor(type, data, dims) {
  return new ort.Tensor(type, data, dims);
}

async function synthesize(phones) {
  const count = phones.ids.length;
  const ids = values => tensor('int64', BigInt64Array.from(values, BigInt), [1, count]);
  const scalar = value => tensor('float32', Float32Array.of(value), [1]);
  const index = value => tensor('int64', BigInt64Array.of(BigInt(value)), [1]);
  const inputs = {
    tokens: ids(phones.ids), stress: ids(phones.stress), voice: index(defaultVoiceIndex),
    speed: scalar(1), pitch_shift: scalar(0), pitch_range: scalar(1),
    emotion: index(0), intensity: scalar(0),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const audio = Float32Array.from(outputs.audio.data);
    const frames = Array.from(outputs.durations.data, Number).reduce((sum, value) => sum + value, 0);
    if (!audio.length || !Number.isSafeInteger(frames) || frames < 1 || audio.length !== frames * metadata.hop ||
        !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
      throw new Error('Tiny Voca Italian returned invalid or duration-mismatched PCM.');
    }
    return audio;
  } finally {
    for (const value of Object.values(inputs)) value.dispose?.();
    if (outputs) for (const value of Object.values(outputs)) value.dispose?.();
  }
}

async function generate(chunk, onFirst) {
  const parts = [];
  let emitted = false, firstReported = false;
  const normalized = expandNumbers(chunk.text);
  for (const sentence of sentences(normalized)) {
    // The official worker completes one sentence's token fitting and synthesis
    // before phonemizing the next sentence in this source span.
    const planned = await fit(sentence);
    for (const phones of planned) {
      if (emitted) parts.push(new Float32Array(Math.round(0.25 * sampleRate)));
      const pcm = await synthesize(phones);
      parts.push(pcm);
      emitted = true;
      if (!firstReported && pcm.length) { firstReported = true; onFirst?.(); }
    }
  }
  if (!emitted) throw new Error('Tiny Voca Italian received a source span with no speakable text.');
  const samples = parts.reduce((sum, part) => sum + part.length, 0);
  if (!samples || !parts.every(part => part.every(Number.isFinite))) throw new Error('Tiny Voca Italian returned invalid PCM for source span ' + chunk.id);
  return { parts, sampleRate, completedChunkId: chunk.id };
}

async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== fixtureOracle.spans) throw new Error('Tiny Voca Italian fixture audit received the wrong source span count.');
  const rows = [];
  const unknowns = [];
  let utterances = 0, maximumTokens = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Tiny Voca Italian fixture audit received an invalid or reordered source span.');
    const plans = [];
    for (const sentence of sentences(expandNumbers(item.text))) plans.push(...await fit(sentence));
    if (!plans.length) throw new Error('Tiny Voca Italian fixture audit found an empty source span.');
    for (const phones of plans) {
      if (phones.ids.length > metadata.max_tokens - 8 || phones.ids.length !== phones.stress.length ||
          phones.ids.some(id => !Number.isInteger(id) || id < 0 || id >= metadata.symbols.length) ||
          phones.stress.some(level => !Number.isInteger(level) || level < 0 || level > 2)) throw new Error('Tiny Voca Italian frontend exceeded its token/stress contract.');
      if (phones.unknown.length) unknowns.push({ span: item.id, symbols: phones.unknown });
    }
    utterances += plans.length;
    maximumTokens = Math.max(maximumTokens, ...plans.map(plan => plan.ids.length));
    rows.push([item.id, plans.map(({ ids, stress }) => [ids, stress])]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const expectedUnknowns = fixtureOracle.unknowns;
  if (utterances !== fixtureOracle.utterances || maximumTokens !== fixtureOracle.maximumTokens || digest !== fixtureOracle.tokenStressSha256 ||
      JSON.stringify(unknowns) !== JSON.stringify(expectedUnknowns)) {
    throw new Error(`Tiny Voca Italian official full-fixture frontend parity failed (digest ${digest}, ${utterances} plans, max ${maximumTokens}).`);
  }
  return { fixtureId: fixtureOracle.fixtureId, sourceSha256: fixtureOracle.sourceSha256, spans: auditTexts.length,
    utterances, maximumTokens, tokenStressSha256: digest, unknowns };
}

const unsupported = reason => ({ ...info, status: 'unsupported', backendEffective: 'none', reason,
  capability: { gpuDispatchVerified: false, description: reason } });

async function initialize({ backend, probe, probeText, fixtureId, language = 'it', auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Tiny Voca Italian supports CPU/WASM or WebGPU with WASM fallback.');
  if (fixtureId !== fixtureOracle.fixtureId || language !== 'it') throw new Error('Tiny Voca Italian requires it-article-v1 and the it frontend.');
  const gpuMode = backend === 'webgpu';
  gpuName = gpuMode ? await hardwareGpu() : null;
  if (gpuMode && !gpuName) return unsupported('A non-fallback hardware WebGPU adapter is unavailable.');

  const [metadataBytes, graphBytes, frontendBytes, numbersBytes, espeakBytes, espeakSource, espeakModuleValue] = await Promise.all([
    asset('tiny-voca-it-preview-fp32.json'), asset('tiny-voca-it-preview-fp32.onnx'), asset('frontend.js'),
    asset('numbers.js'), asset('espeak-ng.wasm'), asset('espeak-ng.js'), import(root + 'espeak-ng.js'),
  ]);
  if (!frontendBytes.length || !numbersBytes.length || !espeakSource.length) throw new Error('Tiny Voca Italian frontend assets are empty.');
  const frontendModule = await import(root + 'frontend.js');
  const numbersModule = await import(root + 'numbers.js');
  metadata = validateTinyVocaItMetadata(JSON.parse(new TextDecoder().decode(metadataBytes)));
  frontend = new frontendModule.ItalianFrontend(metadata.frontend_identity, async piece => {
    const instance = await espeakModule({
      arguments: ['--phonout', 'out', '-q', '--ipa', '--sep=_', '-v', 'it', '-f', 'in.txt'],
      print: () => {}, printErr: () => {},
      preRun: module => module.FS.writeFile('in.txt', piece.replace(/\n+$/, '') + '\n'),
      instantiateWasm: (imports, done) => { WebAssembly.instantiate(espeakWasm, imports).then(done); return {}; },
    });
    return instance.FS.readFile('out', { encoding: 'utf8' });
  });
  expandNumbers = numbersModule.expandNumbers;
  espeakWasm = await WebAssembly.compile(espeakBytes);
  espeakModule = espeakModuleValue.default;

  const runtimeAssets = gpuMode
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeAssets.map(asset));
  ort = await import(runtime + (gpuMode ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtime;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(graphBytes, {
    executionProviders: gpuMode ? ['webgpu', 'wasm'] : ['wasm'],
    graphOptimizationLevel: 'all',
  });

  const fixtureAudit = auditTexts.length ? await auditFixture(auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const probeResult = await generate({ id: 'probe', text: probeText || 'Buongiorno. Questa è una prova di sintesi vocale.' });
      if (!probeResult.parts.length) throw new Error('Tiny Voca Italian capability probe returned no PCM.');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (gpuMode && probe && !dispatches) return unsupported('No WebGPU compute dispatch was observed during Tiny Voca Italian synthesis.');

  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  const result = { ...info, status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...settingsBase, fixtureId, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null, description: gpuMode ?
      `Observed ${dispatches} WebGPU compute dispatches during an untimed synthesis probe; unsupported operators may fall back to explicit WASM.` :
      'ONNX Runtime Web 1.20.1 with the official single-thread SIMD WASM route; CPU frontend preprocessing.' } };
  // Session/modules own the initialized model/runtime state. Do not retain the
  // duplicate verified download buffers across browser generation or RSS probes.
  byteCache.clear();
  return result;
}

async function dispose() {
  await session?.release();
  session = null; ort = null; metadata = null; frontend = null; expandNumbers = null; espeakModule = null; espeakWasm = null; gpuName = null;
  byteCache.clear();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Italian action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
