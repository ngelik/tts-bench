import { fetchModelAsset } from '../cache-model-asset.mjs';
import { BENGALI_VOICE_PROFILE as profile } from '../adapters/bengali-voice-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.browserSourceRevision}/`;
const runtimeRoot = modelRoot + 'runtime/';
const webRoot = modelRoot + 'web/';
const sampleRate = profile.sampleRate;
const MAX_PHONES = 125;
const predicted = new Map();
const byteCache = new Map();
let ort, voice, g2p, frontend, frontendModule, expandWeights;
let activeFixture, activeLanguage;

const unsupported = reason => ({
  status: 'unsupported', backendEffective: 'none', voice: profile.voice, precision: profile.precision,
  settings: { modelId: profile.id, language: activeLanguage || 'bn' },
  capability: { gpuDispatchVerified: false, description: reason }, reason,
});

async function digest(bytes) {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), value => value.toString(16).padStart(2, '0')).join('');
}

function relativePath(name) {
  if (name === 'frontend.js' || name === 'weight-shuffle.js' || name === 'weights.js') return 'web/' + name;
  if (name === 'ort.wasm.min.mjs' || name === 'ort-wasm-simd-threaded.mjs' || name === 'ort-wasm-simd-threaded.wasm.gz') return 'runtime/' + name;
  if (name === 'model.weights.gz' || name === 'voice.onnx.gz') return 'assets/bn-compact/' + name;
  return 'assets/' + name;
}

async function asset(name) {
  if (byteCache.has(name)) return byteCache.get(name);
  const expected = profile.assetDigests[name];
  if (!expected) throw new Error('Unpinned Bengali Voice asset: ' + name);
  const response = await fetchModelAsset(modelRoot + relativePath(name), profile.modelRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected[0] || await digest(bytes) !== expected[1]) {
    throw new Error('Bengali Voice asset checksum mismatch: ' + name);
  }
  byteCache.set(name, bytes);
  return bytes;
}

async function unpack(name) {
  const bytes = await asset(name);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function integers(values) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
}

async function predict(spelling) {
  if (predicted.has(spelling)) return predicted.get(spelling);
  const chars = Array.from(spelling);
  if (chars.length > 64) return [];
  if (!g2p) {
    const [encoderBytes, decoderBytes] = await Promise.all([unpack('g2p-encode.onnx.gz'), unpack('g2p-decode.onnx.gz')]);
    g2p = [
      await ort.InferenceSession.create(encoderBytes, { executionProviders: ['wasm'] }),
      await ort.InferenceSession.create(decoderBytes, { executionProviders: ['wasm'] }),
    ];
  }

  const source = integers([1, ...chars.map(char => frontend.graphemes[char] ?? 3), 2]);
  let encoderOutputs;
  let token = integers([1]);
  let state;
  const result = [];
  try {
    encoderOutputs = await g2p[0].run({ source });
    const memory = encoderOutputs.memory, keys = encoderOutputs.keys;
    state = encoderOutputs.hidden;
    for (let i = 0; i < (chars.length + 2) * 2 + 4; i++) {
      const previousToken = token, previousState = state;
      const next = await g2p[1].run({ token: previousToken, memory, keys, hidden: previousState });
      const id = Number(next.phone.data[0]);
      token = next.phone;
      state = next.state;
      if (previousToken !== token) previousToken.dispose?.();
      if (previousState !== state && previousState !== encoderOutputs.hidden) previousState.dispose?.();
      if (id === 2) {
        if (predicted.size >= 512) predicted.clear();
        predicted.set(spelling, result);
        return result;
      }
      result.push(frontend.phoneIds[id]);
    }
    return [];
  } finally {
    source.dispose?.();
    token.dispose?.();
    if (state !== encoderOutputs?.hidden) state?.dispose?.();
    for (const value of Object.values(encoderOutputs || {})) value.dispose?.();
  }
}

function sentences(text) {
  return text.split(/(?<=[।॥.!?…]["')\]]?)\s+/u);
}

async function visit(sentence, report, onPlan) {
  const phones = await frontendModule.phonemize(sentence, frontend, predict);
  report.unknown.push(...phones.unknown);
  if (!phones.hasWord) return;
  report.maxPhones = Math.max(report.maxPhones, phones.tokens.length);
  if (phones.tokens.length <= MAX_PHONES) {
    report.plans++;
    await onPlan(phones);
    return;
  }
  const clauses = sentence.split(/(?<=[,;:—])\s+/u);
  if (clauses.length > 1) {
    for (const clause of clauses) await visit(clause, report, onPlan);
    return;
  }
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('A single Bengali word exceeds the publisher phone limit.');
  const middle = Math.ceil(words.length / 2);
  await visit(words.slice(0, middle).join(' '), report, onPlan);
  await visit(words.slice(middle).join(' '), report, onPlan);
}

async function traverse(text, onPlan = async () => {}) {
  const pronounced = frontendModule.finished(frontendModule.normalize(frontendModule.romanizeInput(text, frontend.roman)));
  const report = { unknown: [], maxPhones: 0, plans: 0 };
  for (const sentence of sentences(pronounced)) await visit(sentence, report, onPlan);
  return { pronounced, ...report };
}

async function auditFixture(fixtureId, language, auditTexts, { sourceSha256, synthesizeSpans = false } = {}) {
  const expected = profile.fixtures[fixtureId];
  if (!expected || expected.language !== language || (sourceSha256 && sourceSha256 !== expected.sourceSha256) ||
      !Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error('Bengali Voice fixture audit received an unregistered Bengali article route.');
  }
  const rows = [];
  const spans = [];
  const unknowns = [];
  let plans = 0, maxPhones = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error('Bengali Voice fixture audit received invalid or reordered source spans.');
    }
    const planRows = [];
    let samples = 0;
    const prepared = await traverse(item.text, async phones => {
      planRows.push(phones.tokens);
      if (synthesizeSpans) samples += (await synthesize(phones)).length;
    });
    if (!prepared.plans) throw new Error('Bengali Voice fixture audit found a span without speakable words.');
    if (prepared.unknown.length) unknowns.push({ span: item.id, words: prepared.unknown });
    plans += prepared.plans;
    maxPhones = Math.max(maxPhones, prepared.maxPhones);
    rows.push([item.id, prepared.pronounced, planRows]);
    spans.push({ id: item.id, pronounced: prepared.pronounced, unknowns: prepared.unknown, ...(synthesizeSpans ? { samples } : {}) });
  }
  const tokenPlanSha256 = await digest(new TextEncoder().encode(JSON.stringify(rows)));
  if (unknowns.length) throw new Error('Bengali Voice fixture contains unknown words: ' + JSON.stringify(unknowns.slice(0, 8)));
  return { fixtureId, sourceSha256: expected.sourceSha256, spanCount: auditTexts.length, plans, maximumPhones: maxPhones,
    tokenPlanSha256, unknowns, spans };
}

async function synthesize(phones) {
  const tokens = integers(phones.tokens);
  const stress = integers(new Array(phones.tokens.length).fill(0));
  const speed = new ort.Tensor('float32', Float32Array.of(1), [1]);
  const pitchShift = new ort.Tensor('float32', Float32Array.of(0), [1]);
  const pitchRange = new ort.Tensor('float32', Float32Array.of(1), [1]);
  const speaker = new ort.Tensor('int64', BigInt64Array.of(0n), [1]);
  let outputs;
  try {
    outputs = await voice.run({ tokens, stress, voice: speaker, speed, pitch_shift: pitchShift, pitch_range: pitchRange });
    const pcm = Float32Array.from(outputs.audio.data);
    if (!pcm.length || !pcm.some(value => value !== 0) || !pcm.every(Number.isFinite)) {
      throw new Error('Bengali Voice returned empty, silent, or nonfinite PCM.');
    }
    return pcm;
  } finally {
    for (const value of [tokens, stress, speed, pitchShift, pitchRange, speaker]) value.dispose?.();
    if (outputs) for (const value of Object.values(outputs)) value.dispose?.();
  }
}

async function generate(chunk, onFirst) {
  if (!voice) throw new Error('Bengali Voice is not initialized.');
  const pieces = [];
  const prepared = await traverse(chunk.text, async phones => pieces.push(await synthesize(phones)));
  if (!prepared.plans) throw new Error('Bengali Voice received a source span without speakable words.');
  if (prepared.unknown.length) throw new Error(`Bengali Voice found unknown words in span ${chunk.id}: ${prepared.unknown.join(', ')}`);
  const length = pieces.reduce((sum, part) => sum + part.length, 0);
  if (!length) throw new Error('Bengali Voice returned no audio for source span ' + chunk.id);
  const pcm = new Float32Array(length);
  let peak = 0, offset = 0;
  for (const part of pieces) {
    pcm.set(part, offset);
    offset += part.length;
    for (const value of part) {
      if (!Number.isFinite(value)) throw new Error('Bengali Voice produced nonfinite PCM for source span ' + chunk.id);
      peak = Math.max(peak, Math.abs(value));
    }
  }
  if (peak > 0.99) for (let i = 0; i < pcm.length; i++) pcm[i] *= 0.99 / peak;
  onFirst?.();
  return { parts: [pcm], sampleRate, completedChunkId: chunk.id };
}

async function initialize(options = {}) {
  await dispose();
  activeFixture = options.fixtureId;
  activeLanguage = options.language;
  if (options.backend !== 'cpu') return unsupported('Bengali Voice WebGPU is unavailable: the pinned graph failed qualified browser WebGPU controls; CPU fallback is not relabeled as GPU.');
  const fixture = profile.fixtures[options.fixtureId];
  if (!fixture || fixture.language !== options.language || (options.sourceSha256 && options.sourceSha256 !== fixture.sourceSha256)) {
    return unsupported('Bengali Voice requires a registered bn-article-v1 or bn-latn-article-v1 fixture at its pinned text digest.');
  }

  const [wasmBytes, graphBytes, weightBytes, frontendBytes] = await Promise.all([
    unpack('ort-wasm-simd-threaded.wasm.gz'), unpack('voice.onnx.gz'), unpack('model.weights.gz'), unpack('frontend.json.gz'),
    asset('frontend.js'), asset('weight-shuffle.js'), asset('weights.js'), asset('ort.wasm.min.mjs'), asset('ort-wasm-simd-threaded.mjs'),
  ]).then(([wasm, graph, weights, front]) => [wasm, graph, weights, front]);
  frontend = JSON.parse(new TextDecoder().decode(frontendBytes));
  const module = await import(webRoot + 'frontend.js');
  const shuffler = await import(webRoot + 'weight-shuffle.js');
  frontendModule = module;
  expandWeights = shuffler.expandWeights;
  ort = await import(runtimeRoot + 'ort.wasm.min.mjs');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeRoot;
  ort.env.wasm.wasmBinary = wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength);
  ort.env.logLevel = 'error';
  const weights = expandWeights(weightBytes.buffer.slice(weightBytes.byteOffset, weightBytes.byteOffset + weightBytes.byteLength));
  voice = await ort.InferenceSession.create(graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength), {
    executionProviders: ['wasm'],
    externalData: [{ path: 'voice.weights', data: weights }],
  });
  if (options.probe) {
    const probe = await generate({ id: 'probe', text: options.probeText || 'Tumi kokhon bari phirbe?' });
    if (!probe.parts.some(part => part.length)) throw new Error('Bengali Voice capability probe returned no PCM.');
  }
  byteCache.clear();
  return { status: 'measured', backendEffective: 'cpu/wasm', voice: profile.voice, precision: profile.precision,
    settings: { modelId: profile.id, modelRevision: profile.modelRevision, browserSourceRevision: profile.browserSourceRevision,
      language: options.language, synthesisLanguage: 'bn', fixtureId: options.fixtureId,
      fixtureSourceSha256: fixture.sourceSha256, voiceIndex: profile.voiceIndex,
      sampleRate, speed: 1, pitchShift: 0, pitchRange: 1, maxPhones: MAX_PHONES, wasmThreads: 1,
      runtimeVersion: '1.24.3', executionProviders: ['wasm'], g2pExecutionProviders: ['wasm'],
      frontend: `Pinned Bengali publisher frontend.js ${profile.browserSourceRevision}: finished(normalize(romanizeInput(text, frontend.roman))), Bengali phonemizer and trained G2P fallback.`,
      runtimeRelease: 'onnxruntime-web@1.24.3',
      output: 'Publisher sentence/clause/word-halving plan; no inserted silence; concatenate complete source span and peak-limit to 0.99.' },
    capability: { gpuDispatchVerified: null, description: 'ONNX Runtime Web 1.24.3 single-thread SIMD WASM CPU route; executionProviders=[wasm].' } };
}

async function dispose() {
  const sessions = [voice, ...(g2p || [])].filter(Boolean);
  voice = null; g2p = null;
  for (const session of sessions) await session.release();
  ort = null; frontend = null; frontendModule = null; expandWeights = null;
  activeFixture = null; activeLanguage = null; predicted.clear(); byteCache.clear();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await auditFixture(data.options.fixtureId, data.options.language, data.options.auditTexts,
      { sourceSha256: data.options.sourceSha256, synthesizeSpans: data.options.synthesizeSpans === true });
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Bengali Voice action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
