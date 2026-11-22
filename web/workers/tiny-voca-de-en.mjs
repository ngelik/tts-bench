import { fetchModelAsset } from '../cache-model-asset.mjs';
import { assetDigests, browserSourceRevision, fixtureOracle, hop, maxFrames, modelRevision, resolveFixtureLanguage, sampleRate, validatePlan, voiceIndex, voices } from '../voca64/profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const root = `/models/tiny-voca-de-en/${modelRevision}/${browserSourceRevision}/`;
const runtime = '/runtimes/onnxruntime-web/1.23.2/';
const runtimeWasm = {
  cpu: ['ort-wasm-simd-threaded.wasm', 11905541, '45eaee27761ad883742a8d4b8fce1538d60ce43b51adf1726fafccc59b8c1a15'],
  webgpu: ['ort-wasm-simd-threaded.asyncify.wasm', 25499390, 'babec0bbddb6d3082623b99b7e1391b75e0729bcca076ff8424d7753af97fada'],
};
const info = {
  voice: 'fresh-de-f00 / fresh-en-f00 (fixed synthetic female presets)', precision: 'FP32',
  settings: { language: 'en', voices, sampleRate, hop, threads: 1,
    frontend: 'Pinned Designed Voices nrmlz + Phony DE/EN frontend and sentence planner',
    runtimeRelease: 'onnxruntime-web@1.23.2', seed: 20261119 },
};

let ort, phony, nrmlz, german, english, metadataText, frontendWeights, modelConfig, planSession, waveSession, noise, tails, gpuName, activeLanguage;
const bytesByName = new Map();
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function asset(name) {
  if (bytesByName.has(name)) return bytesByName.get(name);
  const spec = assetDigests[name];
  if (!spec) throw new Error('Unpinned Tiny Voca DE/EN asset: ' + name);
  const response = await fetchModelAsset(root + name, modelRevision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error('Tiny Voca DE/EN asset checksum mismatch: ' + name);
  bytesByName.set(name, bytes);
  return bytes;
}

async function runtimeWasmBytes(gpuMode = false) {
  const [name, expectedBytes, expectedHash] = gpuMode ? runtimeWasm.webgpu : runtimeWasm.cpu;
  const response = await fetchModelAsset(runtime + name, modelRevision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expectedBytes || await sha256(bytes) !== expectedHash) throw new Error('ONNX Runtime Web 1.23.2 WASM checksum mismatch');
  return bytes;
}

async function frontend(language) {
  if (!german) {
    const [metadata, lexicon, weights, phonyWasm, nrmlzWasm, phonyModule, nrmlzModule] = await Promise.all([
      asset('assets/frontend/frontend.json'), asset('assets/frontend/german.lex'), asset('assets/frontend/models.safetensors'),
      asset('assets/phony/phony_wasm_bg.wasm'), asset('assets/nrmlz/nrmlz_wasm_bg.wasm'),
      import(root + 'assets/phony/phony_wasm.js'), import(root + 'assets/nrmlz/nrmlz_wasm.js'),
    ]);
    phony = phonyModule;
    nrmlz = nrmlzModule;
    metadataText = new TextDecoder().decode(metadata);
    frontendWeights = weights;
    await Promise.all([phony.default({ module_or_path: phonyWasm }), nrmlz.default({ module_or_path: nrmlzWasm })]);
    nrmlz.warmUp();
    german = phony.Phony.fromPacked(metadataText, lexicon);
    german.loadModels(weights);
  }
  if (language === 'en' && !english) {
    const [englishModule, dictionary, quickjs] = await Promise.all([
      import(root + 'english.js'), asset('assets/frontend/english.lex'), asset('assets/quickjs.wasm'),
    ]);
    english = await englishModule.createEnglish({ phonyModule: phony, metadataText, weightsBytes: frontendWeights,
      englishDictionaryBytes: dictionary, quickjsWasmBytes: quickjs });
  }
}

function prepare(language, text) {
  const normalized = nrmlz.normalize(language, text);
  const phones = language === 'en' ? english.phonemize(normalized) : JSON.parse(german.phonemize(normalized, language, '[]'));
  const plans = JSON.parse(phony.sentencePlan(JSON.stringify(phones), 128));
  if (!plans.length) throw new Error('The fixture span contains no official Voca64 plans');
  plans.forEach(validatePlan);
  // Sentence-plan pieces such as [BOS, quote, EOS] are retained. Require speech
  // at the complete fixture span, not independently in every punctuation piece.
  if (!plans.some(plan => plan.ids.some(id => id >= 17 || id === 4))) throw new Error('The complete fixture span contains no audible Voca64 speech');
  return { normalized, phones, plans };
}

async function auditFixture(language, auditTexts) {
  const expected = Object.values(fixtureOracle).find(value => value.language === language);
  if (!expected || auditTexts.length !== expected.spans) throw new Error('Tiny Voca DE/EN fixture audit received the wrong span count');
  const records = [];
  let utterances = 0, maximumTokens = 0;
  for (const item of auditTexts) {
    if (!item || typeof item.id !== 'number' || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Tiny Voca DE/EN fixture audit received an invalid source span');
    const { plans } = prepare(language, item.text);
    utterances += plans.length;
    maximumTokens = Math.max(maximumTokens, ...plans.map(plan => plan.ids.length));
    records.push([item.id, plans.map(({ ids, stress }) => [ids, stress])]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(records)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens || digest !== expected.tokenStressSha256) {
    throw new Error(`Tiny Voca DE/EN ${language} official fixture token/stress oracle mismatch (${digest})`);
  }
  return { fixtureId: language === 'de' ? 'de-article-v1' : 'english-20k-v1', spans: records.length, utterances, maximumTokens, tokenStressSha256: digest };
}

const idsTensor = values => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
const voiceTensor = language => new ort.Tensor('int64', BigInt64Array.of(BigInt(voiceIndex(language))), [1]);

async function synthesizePlan(language, plan) {
  const tokens = idsTensor(plan.ids), stress = idsTensor(plan.stress), voice = voiceTensor(language);
  const planInputs = { tokens, stress, voice };
  let prediction, waveOutput;
  try {
    prediction = await planSession.run(planInputs);
    const durations = prediction.durations.data;
    if (durations.length !== plan.ids.length) throw new Error('Voca64 duration tensor differs from token plan length');
    const frames = Array.from(durations, Number).reduce((sum, value) => sum + value, 0);
    if (!Number.isInteger(frames) || frames < 1 || frames > maxFrames) throw new Error('Voca64 plan exceeds the pinned safe audio frame range');
    const samples = frames * hop;
    const signal = new Float32Array(samples);
    signal.set(noise.subarray(0, samples));
    signal.set(tails.subarray((frames - 1) * 16, frames * 16), samples - 16);
    const noiseTensor = new ort.Tensor('float32', signal, [1, samples]);
    const waveInputs = { tokens, voice, hidden: prediction.hidden, durations: prediction.durations, noise: noiseTensor };
    try {
      waveOutput = await waveSession.run(waveInputs);
      const pcm = Float32Array.from(waveOutput.audio.data);
      if (pcm.length !== samples || !pcm.every(Number.isFinite)) throw new Error('Voca64 returned invalid PCM or duration mismatch');
      return pcm;
    } finally {
      noiseTensor.dispose();
      for (const tensor of Object.values(waveOutput ?? {})) tensor.dispose?.();
    }
  } finally {
    for (const tensor of new Set([...Object.values(planInputs), ...Object.values(prediction ?? {})])) tensor.dispose?.();
  }
}

async function generate(chunk, onFirst) {
  const language = chunk.language ?? activeLanguage;
  if (!voices[language]) throw new Error('Tiny Voca DE/EN does not support ' + language);
  const { plans } = prepare(language, chunk.text);
  const parts = [];
  for (const plan of plans) {
    const pcm = await synthesizePlan(language, plan);
    parts.push(pcm);
    if (pcm.length && !parts.slice(0, -1).some(part => part.length)) onFirst?.();
  }
  const complete = parts.reduce((sum, part) => sum + part.length, 0);
  if (!complete || !parts.every(part => part.every(Number.isFinite)) || !parts.some(part => part.some(value => value !== 0))) {
    throw new Error('Tiny Voca DE/EN returned empty, nonfinite or silent PCM for source span ' + chunk.id);
  }
  return { parts, sampleRate, completedChunkId: chunk.id };
}

async function initialize({ backend, probe, probeText, fixtureId, language: fixtureLanguage, auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Tiny Voca DE/EN supports CPU or WebGPU');
  const gpuMode = backend === 'webgpu';
  if (gpuMode) {
    gpuName = await hardwareGpu();
    if (!gpuName) return { ...info, status: 'unsupported', backendEffective: 'none', reason: 'Hardware WebGPU is unavailable', capability: { gpuDispatchVerified: false, description: 'No hardware WebGPU adapter was available.' } };
  }
  const language = resolveFixtureLanguage(fixtureId, fixtureLanguage);
  activeLanguage = language;
  const [configBytes, planBytes, waveBytes, noiseBytes, tailsBytes] = await Promise.all([
    asset('assets/voca64/config.json'), asset('assets/voca64/plan.onnx'), asset('assets/voca64/wave.onnx'),
    asset('assets/voca64/noise.bin'), asset('assets/voca64/noise-tails.bin'),
  ]);
  modelConfig = JSON.parse(new TextDecoder().decode(configBytes));
  if (modelConfig.family !== 'voca' || modelConfig.config.sample_rate !== sampleRate || modelConfig.config.max_tokens !== 512 ||
      modelConfig.weights.sha256 !== '39dbd586c49a8f0dc13753fc791f78decb65b138c7c3d846850cf659c815d82f' ||
      modelConfig.config.speakers.length !== 64 || modelConfig.config.vocab_size !== 88 || modelConfig.browser.hop !== hop || modelConfig.browser.threads !== 1) {
    throw new Error('Pinned Voca64 config does not match the verified model checkpoint');
  }
  await frontend(language);
  noise = new Float32Array(noiseBytes.buffer, noiseBytes.byteOffset, noiseBytes.byteLength / 4);
  tails = new Float32Array(tailsBytes.buffer, tailsBytes.byteOffset, tailsBytes.byteLength / 4);
  ort = await import(runtime + (gpuMode ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtime;
  ort.env.wasm.wasmBinary = await runtimeWasmBytes(gpuMode);
  ort.env.logLevel = 'error';
  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  const sessionOptions = { executionProviders, graphOptimizationLevel: 'all', enableCpuMemArena: true };
  planSession = await ort.InferenceSession.create(planBytes, sessionOptions);
  waveSession = await ort.InferenceSession.create(waveBytes, sessionOptions);
  const fixtureAudit = auditTexts.length ? await auditFixture(language, auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const probeResult = await generate({ id: 'probe', text: probeText || (language === 'de' ? 'Ein kurzer Sprachtest.' : 'A short speech test.') });
      if (!probeResult.parts.length) throw new Error('Tiny Voca DE/EN capability probe returned no PCM');
    }
  } finally {
    dispatches = hook?.stop() ?? 0;
  }
  if (gpuMode && probe && !dispatches) return { ...info, status: 'unsupported', backendEffective: 'none', reason: 'No WebGPU compute dispatch was observed during Voca64 synthesis', gpu: gpuName,
    capability: { gpuDispatchVerified: false, description: 'The real plan/wave probe observed zero WebGPU compute dispatches.' } };
  const selectedVoice = voices[language];
  return { ...info, status: 'measured', voice: selectedVoice, backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...info.settings, language, voiceId: selectedVoice, fixtureId, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null, description: gpuMode ?
      `Observed ${dispatches} WebGPU compute dispatches in the untimed real synthesis probe; unsupported operators may fall back to WASM.` :
      'Pinned official Voca64 plan and wave graphs run with ONNX Runtime Web 1.23.2, explicit single-thread WASM SIMD.' } };
}

async function dispose() {
  await Promise.all([planSession?.release(), waveSession?.release()].filter(Boolean));
  planSession = null; waveSession = null; bytesByName.clear();
  german = null; english = null; phony = null; nrmlz = null; ort = null; noise = null; tails = null; gpuName = null; activeLanguage = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca DE/EN action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
