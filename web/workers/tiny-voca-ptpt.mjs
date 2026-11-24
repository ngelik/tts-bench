import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_PTPT as profile } from '../adapters/tiny-voca-ptpt-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const runtimeRoot = modelRoot + 'runtime/';
let ort, session, phonemizer, metadata, fixtureManifest, frontendOracle;
let activeVoice, activeFixture, activeLanguage, backend, gpuName;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  const url = new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) {
    throw new Error('Tiny Voca pt-PT assets must use the same-origin pinned model tree');
  }
  return url;
}

async function checkedBytes(relative, label) {
  const spec = profile.assets[relative];
  if (!spec) throw new Error(`Tiny Voca pt-PT asset is not pinned: ${relative}`);
  const response = await fetchModelAsset(assetUrl(relative), profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

function validateFrontendConfig(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames ||
      value.step !== profile.step || value.frontend !== 'pronuncia-pt' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) ||
      !Array.isArray(value.symbols) || value.symbols.length !== 53 || new Set(value.symbols).size !== 53) {
    throw new Error('Tiny Voca pt-PT frontend config differs from the pinned profile');
  }
}

function validateModelConfig(value) {
  if (value.sample_rate !== profile.sampleRate || value.max_tokens !== profile.maxTokens ||
      value.max_frames !== profile.maxFrames || JSON.stringify(value.speakers) !== JSON.stringify(profile.voices.map(voice => voice.id))) {
    throw new Error('Tiny Voca pt-PT checkpoint config differs from the pinned model profile');
  }
}

function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Tiny Voca pt-PT voice: ${requested}`);
  return voice;
}

function sentenceList(text) {
  const abbreviation = /(?:(?<![\p{L}])(?:sr|sra|srs|dr|dra|drs|prof|profa|eng|arq|exmo|exma|etc|pág|págs|vol|av|n\.º|cf|ex)|(?<![\p{L}])\p{Lu})\.$/iu;
  const parts = [];
  let current = '';
  for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]»]?)\s+(?=["'(\[«]?[\p{Lu}\p{N}])/u)) {
    current = current ? `${current} ${piece}` : piece;
    if (!abbreviation.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
}

function finishText(text) {
  const body = text.replace(/\s+$/, '');
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last)
    ? /[.!?…,;:]["'”’)\]»]*$/.test(last)
    : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : `${body}.`;
}

function fitSentence(sentence) {
  const result = phonemizer.fichas(sentence);
  if (!result) throw new Error('Tiny Voca pt-PT could not pronounce the utterance');
  if (result.ids.length <= profile.maxTokens - 12) return [result];
  const pieces = sentence.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces.flatMap(fitSentence);
  const words = sentence.split(' ');
  if (words.length < 2) throw new Error('Tiny Voca pt-PT encountered a word over the token limit');
  const half = Math.ceil(words.length / 2);
  return [...fitSentence(words.slice(0, half).join(' ')), ...fitSentence(words.slice(half).join(' '))];
}

function plansForText(text) {
  return sentenceList(finishText(text)).flatMap(fitSentence);
}

async function verifyFixtureAudit(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== profile.fixtureOracle.spans ||
      fixtureManifest.chunks.length !== profile.fixtureOracle.spans || frontendOracle.coverage.length !== profile.fixtureOracle.spans) {
    throw new Error(`Tiny Voca pt-PT article audit requires ${profile.fixtureOracle.spans} ordered fixture spans`);
  }
  if (fixtureManifest.articleSha256 !== profile.fixtureSha256 || frontendOracle.fixtureSha256 !== profile.fixtureSha256) {
    throw new Error('Tiny Voca pt-PT article oracle is not bound to the registered fixture');
  }

  const articleParts = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    const span = fixtureManifest.chunks[id];
    const expected = frontendOracle.coverage[id];
    if (!item || item.id !== id || span?.id !== id || expected?.chunk !== id ||
        typeof item.text !== 'string' || !item.text.trim() || await sha256(new TextEncoder().encode(item.text)) !== span.sha256) {
      throw new Error(`Invalid, changed or reordered Tiny Voca pt-PT article span ${id}`);
    }
    articleParts.push(item.text);
    const plans = plansForText(item.text);
    if (!plans.length || plans.length !== expected.parts.length) {
      throw new Error(`Tiny Voca pt-PT frontend utterance count differs at article span ${id}`);
    }
    for (let index = 0; index < plans.length; index++) {
      const plan = plans[index];
      const oraclePart = expected.parts[index];
      if (plan.ids.length !== plan.acento.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= metadata.symbols.length) ||
          plan.acento.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Invalid token/stress output in Tiny Voca pt-PT article span ${id}`);
      }
      const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify([plan.ids, plan.acento])));
      if (plan.ids.length !== oraclePart.tokens || tokenStressSha256 !== oraclePart.hash || plan.desconhecidos.length) {
        throw new Error(`Tiny Voca pt-PT token/stress parity mismatch at article span ${id}, utterance ${index}`);
      }
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.desconhecidos.length;
    }
  }
  if (await sha256(new TextEncoder().encode(articleParts.join(''))) !== profile.fixtureSha256 ||
      utterances !== profile.fixtureOracle.utterances || maximumTokens !== profile.fixtureOracle.maximumTokens ||
      unknownPhones !== profile.fixtureOracle.unknownPhones) {
    throw new Error('Tiny Voca pt-PT full-article frontend identity mismatch');
  }
  return {
    fixtureId: profile.fixtureId,
    fixtureSha256: profile.fixtureSha256,
    spans: auditTexts.length,
    utterances,
    maximumTokens,
    unknownPhones,
    coverageSha256: profile.fixtureOracle.coverageSha256,
  };
}

const idsTensor = values => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
const scalar = value => new ort.Tensor('float32', Float32Array.of(value), [1]);

async function synthesize(plan) {
  const inputs = {
    tokens: idsTensor(plan.ids),
    stress: idsTensor(plan.acento),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift),
    pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(await outputs.durations.getData(), Number);
    if (durations.length !== plan.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Voca pt-PT returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    if (frames < 1 || frames > profile.maxFrames || !Number.isSafeInteger(sampleCount)) {
      throw new Error('Tiny Voca pt-PT utterance exceeds the released frame limits');
    }
    const source = await outputs.audio.getData();
    if (source.length !== sampleCount) throw new Error('Tiny Voca pt-PT audio length differs from durations × hop');
    const pcm = Float32Array.from(source);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Tiny Voca pt-PT returned empty, non-finite or silent audio');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function generatePrepared(plans, onFirstPcm) {
  if (!plans.length) throw new Error('Tiny Voca pt-PT produced no pronounceable utterances for this article span');
  const waves = [];
  for (const plan of plans) {
    waves.push(await synthesize(plan));
    if (waves.length === 1) onFirstPcm?.();
  }
  const pcm = new Float32Array(waves.reduce((sum, wave) => sum + wave.length, 0));
  let offset = 0, peak = 0;
  for (const wave of waves) {
    pcm.set(wave, offset);
    offset += wave.length;
    for (const sample of wave) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > profile.peak) {
    const gain = profile.peak / peak;
    for (let index = 0; index < pcm.length; index++) pcm[index] *= gain;
  }
  return pcm;
}

function unsupported(reason) {
  return {
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    voice: activeVoice?.id || profile.defaultVoice,
    precision: profile.precision,
    settings: {},
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca pt-PT requires an explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    throw new Error('Tiny Voca pt-PT requires pt-pt-article-v1 and the exact pt-PT profile');
  }
  if (options.sourceSha256 !== undefined && options.sourceSha256 !== profile.fixtureSha256) {
    throw new Error('Tiny Voca pt-PT source SHA-256 differs from the registered European Portuguese article');
  }
  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeVoice = chooseVoice(options.voice || profile.defaultVoice);
  backend = options.backend;
  const webgpu = backend === 'webgpu';
  if (webgpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a fallback adapter is available');
  }

  const [modelBytes, modelConfigBytes, frontendConfigBytes, openWordsBytes, , coverageBytes, manifestBytes] = await Promise.all([
    checkedBytes('onnx/model.onnx', 'Tiny Voca pt-PT ONNX model'),
    checkedBytes('models/config.json', 'Tiny Voca pt-PT model config'),
    checkedBytes('site/assets/config.json', 'Tiny Voca pt-PT frontend config'),
    checkedBytes('site/assets/abertas.txt', 'Tiny Voca pt-PT open-vowel lexicon'),
    checkedBytes('site/pronuncia.js', 'Tiny Voca pt-PT phonemizer'),
    checkedBytes('site/pt-pt-article-v1-frontend-coverage.json', 'Tiny Voca pt-PT frontend oracle'),
    checkedBytes('site/pt-pt-article-v1.chunks.json', 'Tiny Voca pt-PT fixture manifest'),
    ...['runtime/ort.webgpu.min.mjs', 'runtime/ort-wasm-simd-threaded.jsep.mjs', 'runtime/ort-wasm-simd-threaded.jsep.wasm'].map(name => checkedBytes(name, `ONNX Runtime Web ${name}`)),
  ]);
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(frontendConfigBytes));
  validateFrontendConfig(metadata);
  validateModelConfig(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(modelConfigBytes)));
  frontendOracle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(coverageBytes));
  fixtureManifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));

  const frontendUrl = assetUrl('site/pronuncia.js');
  await import(frontendUrl.href);
  phonemizer = self.PronunciaPT;
  if (!phonemizer || phonemizer.VERSAO !== profile.pronunciationPackageVersion ||
      JSON.stringify(phonemizer.SIMBOLOS) !== JSON.stringify(metadata.symbols)) {
    throw new Error('Pinned PT-PT phonemizer and model symbol inventory differ');
  }
  phonemizer.definirAbertas(new TextDecoder('utf-8', { fatal: true }).decode(openWordsBytes));

  if (!options.auditTexts?.length && options.sourceSha256 !== profile.fixtureSha256) {
    throw new Error('Tiny Voca pt-PT requires the complete frontend audit or the registered article SHA-256');
  }
  const audit = options.auditTexts?.length ? await verifyFixtureAudit(options.auditTexts) : undefined;
  const runtimeUrl = new URL(runtimeRoot, self.location.origin).href;
  ort = await import(new URL('ort.webgpu.min.mjs', runtimeUrl).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtimeUrl;
  ort.env.logLevel = 'error';
  const executionProviders = webgpu ? ['webgpu'] : ['wasm'];
  session = await ort.InferenceSession.create(modelBytes, { executionProviders });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) {
    throw new Error('Tiny Voca pt-PT ONNX graph names differ from pinned frontend config');
  }

  let dispatches = 0;
  const hook = webgpu && options.probe ? dispatchProbe() : null;
  try {
    if (webgpu && options.probe) await generatePrepared(plansForText('Olá.'), null);
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Voca pt-PT probe');
  }

  return {
    status: 'measured',
    backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: activeVoice.id,
    precision: profile.precision,
    gpu: gpuName,
    settings: {
      modelId: profile.modelId,
      modelRevision: profile.modelRevision,
      sourceId: profile.sourceId,
      sourceRevision: profile.sourceRevision,
      fixtureId: activeFixture,
      fixtureSha256: profile.fixtureSha256,
      language: activeLanguage,
      locale: activeLanguage,
      voice: activeVoice.id,
      voiceIndex: activeVoice.index,
      speed: profile.speed,
      pitchShift: profile.pitchShift,
      pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate,
      hop: profile.hop,
      maxTokens: profile.maxTokens,
      tokenLimit: profile.tokenLimit,
      maxFrames: profile.maxFrames,
      step: profile.step,
      precision: profile.precision,
      frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint,
      pronunciationVectors: profile.pronunciationVectors,
      runtimeVersions: { onnxruntimeWeb: profile.runtimeVersion },
      runtimePackageIntegrity: profile.runtimePackageIntegrity,
      executionProviders,
      wasmThreads: 1,
      graphOptimization: 'ONNX Runtime Web default',
      waveform: 'Pinned FP32 European Portuguese ONNX graph; sentence utterances are concatenated without inserted audio, then each source span receives one 0.99 peak cap.',
      unknownPhonePolicy: 'The pinned pronuncia-pt rules and measured open-vowel list produce the released 53-symbol inventory; unknown phones fail the full-article audit.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe
          ? `Observed ${dispatches} WebGPU dispatches during an untimed probe; ONNX Runtime Web can use internal WASM CPU kernels for operators without a WebGPU implementation.`
          : 'The ONNX session explicitly requests WebGPU; run the separate untimed probe to verify actual dispatch. Unsupported operators may use internal WASM CPU kernels.')
        : 'Explicit single-thread ONNX Runtime Web WASM provider; this is the CPU backend.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !phonemizer || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) {
    throw new Error('Tiny Voca pt-PT adapter is not initialized');
  }
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) {
    throw new Error('Invalid Tiny Voca pt-PT article span');
  }
  const expected = fixtureManifest.chunks[chunk.id];
  if (!expected || expected.id !== chunk.id || await sha256(new TextEncoder().encode(chunk.text)) !== expected.sha256) {
    throw new Error(`Tiny Voca pt-PT received a changed or out-of-order article span ${chunk.id}`);
  }
  const expectedParts = frontendOracle.coverage[chunk.id]?.parts;
  const plans = plansForText(chunk.text);
  if (!Array.isArray(expectedParts) || plans.length !== expectedParts.length) {
    throw new Error(`Tiny Voca pt-PT would skip or add an utterance in article span ${chunk.id}`);
  }
  for (let index = 0; index < plans.length; index++) {
    const plan = plans[index], expectedPart = expectedParts[index];
    const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify([plan.ids, plan.acento])));
    if (plan.desconhecidos.length || plan.ids.length !== expectedPart.tokens || tokenStressSha256 !== expectedPart.hash) {
      throw new Error(`Tiny Voca pt-PT frontend identity mismatch in article span ${chunk.id}, utterance ${index}`);
    }
  }
  const pcm = await generatePrepared(plans, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  phonemizer = metadata = fixtureManifest = frontendOracle = ort = activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca pt-PT worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') {
      try { await dispose(); } catch { /* Preserve the original initialization error. */ }
    }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
