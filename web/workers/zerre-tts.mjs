import { fetchModelAsset } from '../cache-model-asset.mjs';
import { assetDigests, browserSourceRevision, defaultVoice, defaultVoiceIndex, fixtureOracle, hop, maxFrames, maxTokens, modelRevision, sampleRate, symbolCount, validateZerreMetadata } from '../zerre-tts/profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const root = `/models/zerre-tts/${modelRevision}/${browserSourceRevision}/`;
const runtime = root + 'runtime/';
const settingsBase = {
  language: 'tr', locale: 'tr-TR', publicVoiceId: defaultVoice, voiceId: 'MK', voiceIndex: defaultVoiceIndex,
  modelRevision, browserSourceRevision,
  graphSha256: assetDigests['model.onnx'][1],
  speed: 1, pitchShift: 0, pitchRange: 1, sampleRate, threads: 1,
  frontend: `Official Zerre browser phonemizer and 25,344-entry eSpeak lexicon at ${browserSourceRevision}; no numeric expansion`,
  runtimeRelease: 'onnxruntime-web@1.20.1',
  textBehavior: 'Whitespace collapses; sentence boundaries follow . ! ? …; tokenization retains letters and [.,!?;:—…], so digit runs are dropped and apostrophe suffixes become a separate word.',
  waveform: 'Unseeded RandomNormalLike noise makes repeated native PCM hashes differ; a one-frame backend output-length difference is possible.',
};
const info = { voice: 'SES-A', precision: 'INT8', settings: settingsBase };
let ort, session, metadata, lexicon, phonemizer, gpuName;
const byteCache = new Map();
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function asset(name) {
  if (byteCache.has(name)) return byteCache.get(name);
  const spec = assetDigests[name];
  if (!spec) throw new Error('Unpinned Zerre asset: ' + name);
  const path = name.startsWith('ort.') || name.startsWith('ort-') ? `runtime/${name}` : name;
  const response = await fetchModelAsset(root + path, modelRevision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error('Zerre asset checksum mismatch: ' + name);
  byteCache.set(name, bytes);
  return bytes;
}

function sentencePieces(text) {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
}

function planSentence(piece) {
  const phones = phonemizer.phonemize(piece, lexicon, metadata.symbols);
  const included = phones.ids.length >= 3 && phones.ids.length <= metadata.max_tokens;
  return { piece, phones, included };
}

function plansFor(text) {
  return sentencePieces(text).map(planSentence);
}

function validatePlan(phones) {
  if (!phones || !Array.isArray(phones.ids) || !Array.isArray(phones.stress) || phones.ids.length !== phones.stress.length ||
      phones.ids.some(id => !Number.isInteger(id) || id < 0 || id >= symbolCount) ||
      phones.stress.some(level => !Number.isInteger(level) || level < 0 || level > 2)) {
    throw new Error('Zerre phonemizer returned an invalid token/stress plan.');
  }
}

async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== fixtureOracle.spans) throw new Error('Zerre fixture audit received the wrong source span count.');
  const rows = [];
  const digitSpanIds = [];
  let plansCount = 0, maximumTokens = 0, digitPieces = 0, skippedPlans = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Zerre fixture audit received an invalid or reordered source span.');
    const plans = plansFor(item.text);
    if (!plans.length) throw new Error(`Zerre fixture audit found no sentence pieces in source span ${item.id}.`);
    if (plans.some(plan => /\p{N}/u.test(plan.piece))) { digitSpanIds.push(item.id); }
    for (const plan of plans) {
      validatePlan(plan.phones);
      plansCount++;
      maximumTokens = Math.max(maximumTokens, plan.phones.ids.length);
      if (/\p{N}/u.test(plan.piece)) digitPieces++;
      if (!plan.included) skippedPlans++;
    }
    rows.push([item.id, plans.map(({ phones, included }) => [phones.ids, phones.stress, included])]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (plansCount !== fixtureOracle.plans || maximumTokens !== fixtureOracle.maximumTokens ||
      digitPieces !== fixtureOracle.digitPieces || JSON.stringify(digitSpanIds) !== JSON.stringify(fixtureOracle.digitSpanIds) ||
      skippedPlans !== 0 || digest !== fixtureOracle.tokenStressIncludedSha256) {
    throw new Error(`Zerre official fixture frontend parity failed (digest ${digest}; ${plansCount} plans; max ${maximumTokens}; ${skippedPlans} skipped).`);
  }
  return { fixtureId: fixtureOracle.fixtureId, sourceSha256: fixtureOracle.sourceSha256, spans: auditTexts.length,
    plans: plansCount, maximumTokens, skippedPlans, digitPieces, digitSpanIds, tokenStressIncludedSha256: digest,
    numericOmission: `${digitPieces} sentence pieces across ${digitSpanIds.length} spans contain digits that the official browser tokenizer drops.` };
}

function createTensor(type, data, dims) { return new ort.Tensor(type, data, dims); }

async function synthesize(phones) {
  const count = phones.ids.length;
  const integers = values => createTensor('int64', BigInt64Array.from(values, BigInt), [1, count]);
  const scalar = value => createTensor('float32', Float32Array.of(value), [1]);
  const inputs = {
    tokens: integers(phones.ids), stress: integers(phones.stress),
    voice: createTensor('int64', BigInt64Array.of(BigInt(defaultVoiceIndex)), [1]),
    speed: scalar(1), pitch_shift: scalar(0), pitch_range: scalar(1),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const audio = Float32Array.from(outputs.audio.data);
    const frames = Array.from(outputs.durations.data, Number).reduce((sum, value) => sum + value, 0);
    if (!audio.length || audio.length > maxFrames * hop || !Number.isSafeInteger(frames) || frames < 1 || frames > maxFrames ||
        audio.length !== frames * hop || !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
      throw new Error('Zerre returned invalid, empty or unexpectedly shaped PCM.');
    }
    return audio;
  } finally {
    for (const tensor of Object.values(inputs)) tensor.dispose?.();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose?.();
  }
}

function limitPeak(audio) {
  let peak = 0;
  for (const value of audio) peak = Math.max(peak, Math.abs(value));
  if (peak > 0.99) {
    const scale = 0.99 / peak;
    for (let index = 0; index < audio.length; index++) audio[index] *= scale;
  }
  return audio;
}

async function generate(chunk, onFirst) {
  const audioPieces = [];
  let firstReported = false;
  for (const piece of sentencePieces(chunk.text)) {
    // Match the official worker's order: phonemize and synthesize one sentence
    // before doing G2P for the next sentence.
    const plan = planSentence(piece);
    if (!plan.included) continue;
    validatePlan(plan.phones);
    const pcm = await synthesize(plan.phones);
    if (!firstReported && pcm.length) { firstReported = true; onFirst?.(); }
    audioPieces.push(pcm);
  }
  if (!audioPieces.length) throw new Error('Metin okunamadı.');
  const length = audioPieces.reduce((sum, piece) => sum + piece.length, 0);
  const joined = new Float32Array(length);
  let offset = 0;
  for (const piece of audioPieces) { joined.set(piece, offset); offset += piece.length; }
  const audio = limitPeak(joined);
  if (!audio.every(Number.isFinite) || !audio.some(value => value !== 0)) throw new Error('Zerre produced invalid final PCM.');
  return { parts: [audio], sampleRate: metadata.sample_rate, completedChunkId: chunk.id };
}

const unsupported = reason => ({ ...info, status: 'unsupported', backendEffective: 'none', reason,
  capability: { gpuDispatchVerified: false, description: reason } });

async function initialize({ backend, probe, probeText, fixtureId, language = 'tr', auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Zerre TTS supports CPU/WASM or hardware WebGPU with explicit WASM fallback.');
  if (fixtureId !== fixtureOracle.fixtureId || language !== 'tr') throw new Error('Zerre TTS requires tr-article-v1 and the Turkish frontend; English and Kurdish are unsupported.');
  const gpuMode = backend === 'webgpu';
  gpuName = gpuMode ? await hardwareGpu() : null;
  if (gpuMode && !gpuName) return unsupported('A non-fallback hardware WebGPU adapter is unavailable.');

  const [metadataBytes, graphBytes, lexiconBytes, phonemizerBytes] = await Promise.all([
    asset('model.json'), asset('model.onnx'), asset('lexicon-tr.json'), asset('phonemize-tr.js'),
  ]);
  metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  lexicon = JSON.parse(new TextDecoder().decode(lexiconBytes));
  validateZerreMetadata(metadata, lexicon);
  if (!phonemizerBytes.length) throw new Error('The pinned Zerre phonemizer asset is empty.');
  await import(root + 'phonemize-tr.js');
  phonemizer = globalThis.zerre;
  if (typeof phonemizer?.phonemize !== 'function') throw new Error('The pinned Zerre phonemizer did not initialize.');

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
    executionProviders: gpuMode ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all',
  });

  const fixtureAudit = auditTexts.length ? await auditFixture(auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const result = await generate({ id: 'probe', text: probeText || 'Merhaba dünya.' });
      if (!result.parts.length) throw new Error('Zerre capability probe returned no PCM.');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (gpuMode && probe && !dispatches) return unsupported('No WebGPU compute dispatch was observed during Zerre TTS synthesis.');

  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  const result = { ...info, status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...settingsBase, fixtureId, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null, description: gpuMode ?
      `Observed ${dispatches} WebGPU compute dispatches during an untimed synthesis probe; unsupported operations may use explicit WASM fallback.` :
      'ONNX Runtime Web 1.20.1 with the official single-thread SIMD WASM route; local Turkish frontend preprocessing.' } };
  byteCache.clear();
  return result;
}

async function dispose() {
  await session?.release();
  session = null; ort = null; metadata = null; lexicon = null; phonemizer = null; gpuName = null;
  byteCache.clear();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Zerre TTS action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
