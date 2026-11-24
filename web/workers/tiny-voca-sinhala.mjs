import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_SINHALA as profile } from '../adapters/tiny-voca-sinhala-profile.mjs';
import * as frontend from '../tiny-voca-si/frontend.js';
import { Espeak } from '../tiny-voca-si/espeak.js';
import { assembleStockPlayback } from '../tiny-voca-si/playback.mjs';

const root = `/models/${profile.id}/${profile.modelRevision}/`;
const runtimeRoot = root + 'runtime/';
let ort, session, config, espeak, activeFixture, activeLanguage, activeVoice;

function assetUrl(relative) {
  const url = new URL(root + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(root)) throw new Error('Sinhala inference assets must be same-origin pinned files');
  return url.href;
}
function runtimeUrl(name) {
  const url = new URL(runtimeRoot + name, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(runtimeRoot)) throw new Error('Sinhala ORT assets must be same-origin pinned files');
  return url.href;
}
async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function checkedAsset(relative, spec, label) {
  const response = await fetchModelAsset(assetUrl(relative), profile.modelRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!spec || bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error(`${label} size or SHA-256 mismatch`);
  return bytes;
}
const modelAsset = name => checkedAsset(name, profile.modelAssets[name], `Sinhala ${name}`);
const runtimeAsset = name => checkedAsset(`runtime/${name}`, profile.runtimeAssets[name], `ONNX Runtime Web ${name}`);

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || value.step !== profile.step || value.frontend !== 'espeak-ng-library' ||
      value.frontend_fingerprint !== profile.frontendFingerprint || JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.symbols) !== JSON.stringify(frontend.SYMBOLS) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Tiny Voca Sinhala metadata differs from its pinned checkpoint or frontend');
  }
}

function planText(text) {
  const plans = [];
  const sentences = frontend.sentences(frontend.finished(text));
  function fit(piece, sentenceEnd, depth = 0) {
    if (depth > 32) throw new Error('Sinhala shorter() exceeded safe recursion depth');
    let phones;
    try { phones = frontend.phonemize(espeak, piece); }
    catch (error) {
      if (error instanceof frontend.NothingToPronounce) return [];
      throw error;
    }
    if (phones.ids.length <= profile.maxTokens - 12) return [{ text: piece, phones, sentenceEnd }];
    const pieces = frontend.shorter(piece);
    if (pieces.length < 2 || pieces.some(part => !part.trim())) throw new Error(`Sinhala sentence cannot fit the stock max_tokens - 12 limit: ${piece.slice(0, 48)}`);
    const split = [];
    for (let index = 0; index < pieces.length; index++) split.push(...fit(pieces[index], sentenceEnd && index === pieces.length - 1, depth + 1));
    return split;
  }
  for (const sentence of sentences) plans.push(...fit(sentence, true));
  return plans;
}

async function auditFixture(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) throw new Error('Sinhala fixture audit requires all ordered si-article-v1 source spans');
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownOccurrences = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index], oracle = expected.rows[index];
    if (item.id !== index || oracle.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Sinhala fixture span ${index} is missing, empty or reordered`);
    if (await sha256(new TextEncoder().encode(item.text)) !== oracle.spanSha256) throw new Error(`Sinhala fixture span ${index} SHA-256 mismatch`);
    const plans = planText(item.text);
    if (plans.length !== oracle.utterances.length) throw new Error(`Sinhala frontend utterance count differs for fixture span ${index}`);
    const utteranceRows = [];
    for (let planIndex = 0; planIndex < plans.length; planIndex++) {
      const phones = plans[planIndex].phones, utteranceOracle = oracle.utterances[planIndex];
      if (phones.ids.length !== utteranceOracle.tokens || phones.ids.length !== phones.stress.length) throw new Error(`Sinhala token count/alignment differs at span ${index}, utterance ${planIndex}`);
      if (phones.unknown.length) unknownOccurrences += phones.unknown.length;
      const digest = await sha256(new TextEncoder().encode(JSON.stringify([phones.ids, phones.stress])));
      if (digest !== utteranceOracle.tokenStressSha256) throw new Error(`Sinhala token/stress oracle mismatch at span ${index}, utterance ${planIndex}`);
      maximumTokens = Math.max(maximumTokens, phones.ids.length); utterances++;
      utteranceRows.push({ tokens: phones.ids.length, unknown: phones.unknown, tokenStressSha256: digest });
    }
    rows.push({ id: index, spanSha256: oracle.spanSha256, utterances: utteranceRows });
  }
  const coverageSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.sourceSentences || maximumTokens !== expected.maxTokens ||
      unknownOccurrences !== expected.unknownOccurrences || coverageSha256 !== expected.coverageSha256) {
    throw new Error('Sinhala fixture frontend coverage differs from its pinned source oracle');
  }
  return { fixtureId: profile.fixtureId, sourceSha256: profile.fixtureSha256, spans: auditTexts.length,
    utterances, maximumTokens, unknownOccurrences, coverageSha256 };
}

async function runGraph(phones) {
  const count = phones.ids.length;
  if (!session || count < 3 || count > profile.maxTokens || count !== phones.stress.length) throw new Error('Invalid Sinhala graph token/stress input');
  const tensor = (type, values) => new ort.Tensor(type, values, [1, count]);
  const inputs = {
    tokens: tensor('int64', BigInt64Array.from(phones.ids, BigInt)),
    stress: tensor('int64', BigInt64Array.from(phones.stress, BigInt)),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: new ort.Tensor('float32', Float32Array.of(profile.speed), [1]),
    pitch_shift: new ort.Tensor('float32', Float32Array.of(profile.pitchShift), [1]),
    pitch_range: new ort.Tensor('float32', Float32Array.of(profile.pitchRange), [1]),
  };
  let outputs;
  try {
    outputs = await session.run(inputs, ['audio', 'durations']);
    if (!outputs.audio || !outputs.durations) throw new Error('Sinhala ONNX graph omitted audio or durations');
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== count || durations.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Sinhala graph returned invalid token durations');
    const frames = durations.reduce((sum, value) => sum + value, 0), sampleCount = frames * profile.hop;
    const samples = Float32Array.from(outputs.audio.data);
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames || samples.length !== sampleCount ||
        !samples.length || !samples.every(Number.isFinite) || !samples.some(value => value !== 0)) throw new Error('Sinhala graph returned invalid, empty, silent or out-of-bounds PCM');
    return samples;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function synthesizeSpan(text, onFirstPcm) {
  const plans = planText(text);
  if (!plans.length) throw new Error('Tiny Voca Sinhala received a span with no pronounceable text');
  const utterancePcm = [];
  for (const plan of plans) {
    const pcm = await runGraph(plan.phones);
    utterancePcm.push(pcm);
    if (utterancePcm.length === 1) onFirstPcm?.();
  }
  return { plans, ...assembleStockPlayback(plans, utterancePcm, profile.sampleRate, {
    pauseSeconds: profile.interSentencePauseSeconds, peak: profile.peak,
  }) };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: profile.defaultVoice, precision: profile.precision,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, language: profile.language, locale: profile.locale },
    capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize(options = {}) {
  await dispose();
  if (options.backend !== 'cpu') return unsupported('This adapter is qualified for the pinned ONNX Runtime Web 1.20.1 CPU/WASM provider only.');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) return unsupported('Tiny Voca Sinhala supports only si-article-v1 with language si.');
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) throw new Error('Sinhala fixture hash differs from the pinned si-article-v1 identity');
  const requestedVoice = options.voice ?? profile.defaultVoice;
  activeVoice = profile.voices.find(voice => voice.id === requestedVoice);
  if (!activeVoice) return unsupported(`Tiny Voca Sinhala exposes only M1 and F1; unsupported voice ${requestedVoice}.`);
  activeFixture = profile.fixtureId; activeLanguage = profile.language;
  const [graphBytes, metadataBytes, wasmBytes, dataBytes, ...runtimeBytes] = await Promise.all([
    modelAsset('tiny-voca-si.onnx'), modelAsset('tiny-voca-si.json'), modelAsset('phonemizer/espeak-ng.wasm'), modelAsset('phonemizer/espeak-ng-data.bin'),
    ...Object.keys(profile.runtimeAssets).map(runtimeAsset),
  ]);
  if (runtimeBytes.length !== Object.keys(profile.runtimeAssets).length) throw new Error('Incomplete Sinhala CPU runtime asset closure');
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(config);
  const wasmBuffer = wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength);
  const dataBuffer = dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength);
  espeak = await Espeak.load(wasmBuffer, dataBuffer, { voice: 'inc/si' });
  ort = await import(runtimeUrl('ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.wasm.wasmPaths = runtimeRoot; ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(graphBytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.inputs) || JSON.stringify(session.outputNames) !== JSON.stringify(config.outputs)) throw new Error('Sinhala ONNX graph tensor interface differs from pinned metadata');
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  if (options.probe) await synthesizeSpan(options.probeText || 'ආයුබෝවන්! ඔබට කොහොමද?');
  const runtimeFiles = Object.keys(profile.runtimeAssets);
  return {
    status: 'measured', backendEffective: 'cpu/wasm', voice: activeVoice.id, precision: profile.precision,
    settings: { modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId, sourceRevision: profile.sourceRevision,
      parameterCount: profile.parameterCount, parameterCountKind: profile.parameterCountKind,
      fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256, language: activeLanguage, locale: profile.locale,
      supportedLanguages: [profile.language], voice: activeVoice.id, voiceIndex: activeVoice.index, speaker: activeVoice.speaker,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens, maxFrames: profile.maxFrames,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange, peak: profile.peak,
      interSentencePauseSeconds: profile.interSentencePauseSeconds, precision: profile.precision, frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint, runtimeVersion: profile.runtimeVersion,
      runtimePackage: profile.runtimePackage, runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders: ['wasm'], wasmThreads: 1, graphOptimizationLevel: 'all',
      sourceLimitations: 'The publisher restricts both donated voices to non-obscene, non-offensive speech; no impersonation, deception, obscene or offensive content.',
      outputPolicy: 'Stock browser default: 0.35 seconds of silence between sentences, with one 0.99 peak normalizer over each complete canonical source span; no trailing pause after its last sentence.',
      runtimeFiles, ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: false, description: 'Explicit ONNX Runtime Web 1.20.1 one-thread WASM CPU route; WebGPU is unsupported by this adapter.' },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) throw new Error('Tiny Voca Sinhala worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Sinhala canonical source span');
  const oracle = profile.fixtureOracle.rows[chunk.id];
  if (chunk.id < 0 || !oracle || chunk.sha256 !== oracle.spanSha256) throw new Error('Sinhala source span ID or SHA-256 differs from the pinned fixture');
  const rendered = await synthesizeSpan(chunk.text, onFirstPcm);
  return { parts: [rendered.samples], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function diagnose(options = {}) {
  if (!session || activeLanguage !== profile.language) throw new Error('Tiny Voca Sinhala worker is not initialized');
  if (typeof options.text !== 'string' || !options.text.trim()) throw new Error('Diagnostic requires nonempty Sinhala text');
  const result = await synthesizeSpan(options.text);
  return { fixtureId: options.fixtureId ?? activeFixture, language: activeLanguage, voice: activeVoice.id,
    sampleRate: profile.sampleRate, samples: result.samples.length, utterances: result.plans.length,
    rawPeak: result.rawPeak, normalizedPeak: result.normalizedPeak, pauseSamples: result.pauseSamples,
    playbackPcmSha256: await sha256(new Uint8Array(result.samples.buffer, result.samples.byteOffset, result.samples.byteLength)),
    tokenPlans: result.plans.map(plan => ({ tokenCount: plan.phones.ids.length, tokens: plan.phones.ids, stress: plan.phones.stress, sentenceEnd: plan.sentenceEnd })) };
}

async function dispose() {
  const current = session; session = null;
  if (current) await current.release();
  ort = config = espeak = activeFixture = activeLanguage = activeVoice = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'diagnostic') value = await diagnose(data.options);
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca Sinhala action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
