import { TINY_VOCA_NL as profile } from '../adapters/tiny-voca-nl-profile.mjs';
import { makeInt64Tensor } from '../tiny-voca-nl/tensors.mjs';
import { validateTinyVocaNlConfig } from '../tiny-voca-nl/config.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.spaceRevision}/`;
let ort, session, frontend, trace, phonemize, config, activeFixture, activeLanguage;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function asset(path) {
  const expected = profile.assets[path];
  if (!expected) throw new Error(`Unpinned Tiny Voca Dutch asset: ${path}`);
  const url = new URL(modelRoot + path, self.location.href);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) throw new Error('Dutch assets must be same-origin pinned files');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tiny Voca Dutch ${path} failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected[0] || await sha256(bytes) !== expected[1]) throw new Error(`Tiny Voca Dutch ${path} size or SHA-256 mismatch`);
  return bytes;
}

async function loadFrontend() {
  const spaceRoot = new URL(modelRoot, self.location.href);
  frontend = await import(new URL('dutch.mjs', spaceRoot).href);
  trace = await frontend.loadTrace({ locateFile: name => new URL(`assets/${name}`, spaceRoot).href });
  phonemize = frontend.createPhonemizer(config.symbols, trace);
}

const scalar = value => new ort.Tensor('float32', Float32Array.of(value), [1]);
class TooLong extends Error {}

async function synthesize(phones) {
  const inputs = {
    tokens: makeInt64Tensor(ort, phones.tokens), stress: makeInt64Tensor(ort, phones.stress),
    voice: makeInt64Tensor(ort, [0], [1]), speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift), pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.tokens.length || durations.some(n => !Number.isSafeInteger(n) || n < 0)) {
      throw new Error('Tiny Voca Dutch returned invalid frame durations');
    }
    const frames = durations.reduce((sum, n) => sum + n, 0);
    if (frames > profile.maxFrames) throw new TooLong('Dutch utterance exceeded the upstream frame limit');
    const samples = frames * profile.hop;
    if (!Number.isSafeInteger(samples) || samples < 1 || outputs.audio.data.length !== samples) {
      throw new Error('Tiny Voca Dutch PCM length differs from frames × hop');
    }
    const pcm = Float32Array.from(outputs.audio.data);
    let peak = 0, audible = false;
    for (const sample of pcm) {
      if (!Number.isFinite(sample)) throw new Error('Tiny Voca Dutch returned non-finite audio');
      peak = Math.max(peak, Math.abs(sample));
      audible ||= sample !== 0;
    }
    if (!audible) throw new Error('Tiny Voca Dutch returned silent audio');
    if (peak > profile.peak) {
      const gain = profile.peak / peak;
      for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
    }
    return pcm;
  } finally {
    for (const tensor of Object.values(inputs)) tensor.dispose?.();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose?.();
  }
}

function split(value) {
  const clauses = value.split(/(?<=[,;:—])\s+/);
  if (clauses.length > 1) return clauses;
  const words = value.split(/\s+/);
  if (words.length < 2) return [];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

async function* speak(value) {
  const phones = phonemize(value);
  if (!phones) return;
  if (phones.tokens.length <= Math.min(config.max_tokens, profile.tokenLimit)) {
    try { yield await synthesize(phones); return; }
    catch (error) { if (!(error instanceof TooLong)) throw error; }
  }
  const parts = split(value);
  if (!parts.length) throw new Error(`Dutch text cannot fit the model token/frame limit: ${value.slice(0, 60)}`);
  for (const part of parts) yield* speak(part);
}

async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca Dutch is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Dutch source span');
  try {
    const parts = [];
    for (const sentence of frontend.sentences(chunk.text)) {
      for await (const pcm of speak(sentence)) {
        parts.push(pcm);
        if (parts.length === 1 && pcm.length) onFirstPcm?.();
      }
    }
    if (!parts.length) throw new Error(`Dutch frontend produced no audible utterance`);
    return { parts, sampleRate: profile.sampleRate, completedChunkId: chunk.id };
  } catch (error) {
    throw new Error(`Tiny Voca Dutch source span ${chunk.id} failed: ${error?.message ?? error}`, { cause: error });
  }
}

async function initialize(options = {}) {
  if (options.backend !== 'cpu') throw new Error('Tiny Voca Dutch uses the upstream one-thread WASM backend only');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    throw new Error('Tiny Voca Dutch requires the pinned nl-article-v1 fixture');
  }
  if (options.modelConfig?.id !== profile.id || options.modelConfig?.modelRevision !== profile.modelRevision ||
      options.modelConfig?.sourceRevision !== profile.sourceRevision) throw new Error('Dutch model/source profile mismatch');
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  const spaceRoot = new URL(modelRoot, self.location.href);
  const [modelBytes, metadataBytes, ortModuleBytes, ortGlueBytes, ortWasmBytes, frontendBytes, espeakModuleBytes, espeakDataBytes, espeakWasmBytes] = await Promise.all([
    asset('assets/model.onnx'), asset('assets/model.json'), asset('assets/ort/ort.wasm.min.mjs'),
    asset('assets/ort/ort-wasm-simd-threaded.mjs'), asset('assets/ort/ort-wasm-simd-threaded.wasm'), asset('dutch.mjs'),
    asset('assets/espeak.mjs'), asset('assets/espeak.data'), asset('assets/espeak.wasm'),
  ]);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateTinyVocaNlConfig(config, profile);
  if (!ortModuleBytes.length || !ortGlueBytes.length || !frontendBytes.length || !espeakModuleBytes.length || !espeakDataBytes.length || !espeakWasmBytes.length) {
    throw new Error('Dutch browser runtime asset set is incomplete');
  }
  const ortUrl = new URL('assets/ort/ort.wasm.min.mjs', spaceRoot).href;
  ort = await import(ortUrl);
  ort.env.wasm.wasmPaths = new URL('assets/ort/', spaceRoot).href;
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(config.outputs)) {
    throw new Error('Dutch ONNX graph input/output names differ from pinned config');
  }
  await loadFrontend();
  return {
    status: 'measured', backendEffective: 'cpu/wasm', voice: profile.voice, precision: profile.precision,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId,
      sourceRevision: profile.sourceRevision, spaceId: profile.spaceId, spaceRevision: profile.spaceRevision,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage,
      locale: profile.locale, voice: profile.voice, voiceIndex: 0, speed: profile.speed,
      pitchShift: profile.pitchShift, pitchRange: profile.pitchRange, sampleRate: profile.sampleRate,
      hop: profile.hop, maxTokens: profile.tokenLimit, maxFrames: profile.maxFrames,
      precision: profile.precision, frontend: `Pinned upstream dutch.mjs + eSpeak NG ${profile.espeakVersion}`,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion, espeakNg: profile.espeakVersion },
      executionProviders: ['wasm'], wasmThreads: 1,
      waveform: 'Stochastic calibrated excitation in the pinned FP32 ONNX graph; no synthesis seed. Upstream one-thread WASM worker behavior; 256-token recursive split; per-utterance 0.99 peak cap; no inserted gaps.',
      fixtureQualification: 'AI-assisted Dutch translation; no independent human translation review. Full-article use has known stock-frontend failures at spans 31, 54, 74, 88 and 99; no unknown-phone fallback is applied.',
    },
    capability: { gpuDispatchVerified: false, description: 'Pinned publisher browser path explicitly uses one-thread ONNX Runtime WASM; no GPU backend.' },
  };
}

async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  ort = null; frontend = null; trace = null; phonemize = null; config = null;
  activeFixture = null; activeLanguage = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Tiny Voca Dutch action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') { try { await dispose(); } catch {} }
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
