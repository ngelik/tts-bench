import { fetchModelAsset } from '../cache-model-asset.mjs';
import {
  FIATO as profile,
  resolveFiatoLanguage,
  resolveFiatoVoice,
  supportsFiatoFixture,
} from '../adapters/fiato-profile.mjs';
import { loadFiatoDizione } from '../tiny-voca/fiato-dizione.mjs';
import { finished, sentences } from '../tiny-voca/fiato-frontend.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const modelRoot = profile.modelRoot;
const runtimeRoot = `/runtimes/${profile.runtimePackage}/${profile.runtimeVersion}/`;
let ort;
let session;
let config;
let phonemizeJson;
let pyodide;
let activeVoice;
let activeFixture;
let activeLanguage;
let gpuName;

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return bytesToHex(digest);
}

function sameOrigin(root, path, prefix) {
  const url = new URL(root + path, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix)) {
    throw new Error('Fiato assets must use the same-origin pinned asset tree');
  }
  return url;
}

async function checkedAsset(url, expected, label) {
  const response = await fetchModelAsset(url.href, profile.sourceRevision, {
    bufferBeforeCache: true,
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!expected || bytes.byteLength !== expected[0] || await sha256(bytes) !== expected[1]) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

const modelAsset = (name) => checkedAsset(
  sameOrigin(modelRoot, name, '/models/'),
  profile.modelAssets[name],
  `Fiato ${name}`,
);

const runtimeAsset = (name) => checkedAsset(
  sameOrigin(runtimeRoot, name, '/runtimes/onnxruntime-web-pocket/'),
  profile.runtimeFiles[name],
  `ONNX Runtime Web ${name}`,
);

const pyodideAsset = (name) => checkedAsset(
  sameOrigin(profile.pyodideRoot, name, '/runtimes/pyodide/0.26.4/'),
  profile.pyodideFiles[name],
  `Pyodide ${name}`,
);

function validateConfig(value, metadata) {
  const expectedInputs = ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'];
  const expectedOutputs = ['audio', 'durations'];
  const expectedSymbols = Object.entries(value.vocab)
    .sort((left, right) => left[1] - right[1])
    .map(([symbol]) => symbol);
  const isValid = value.sample_rate === profile.sampleRate
    && value.hop === profile.hop
    && value.step === profile.configStep
    && value.parameters === profile.parameterCount
    && value.model?.max_tokens === profile.maxTokens
    && value.model?.max_frames === profile.maxFrames
    && value.phonemizer?.version === profile.phonemizerConvention
    && value.phonemizer?.fingerprint === profile.configDizioneFingerprint
    && JSON.stringify(value.voices) === JSON.stringify(profile.voices.map(({ id }) => id))
    && JSON.stringify(value.expressions) === JSON.stringify(profile.expressions)
    && profile.expressions.every((expression) => value.vocab[expression] === profile.expressionTokenIds[expression])
    && JSON.stringify(metadata.inputs) === JSON.stringify(expectedInputs)
    && JSON.stringify(metadata.outputs) === JSON.stringify(expectedOutputs)
    && JSON.stringify(value.onnx?.inputs) === JSON.stringify(expectedInputs)
    && JSON.stringify(value.onnx?.outputs) === JSON.stringify(expectedOutputs)
    && JSON.stringify(metadata.voices) === JSON.stringify(value.voices)
    && metadata.sample_rate === profile.sampleRate
    && metadata.hop === profile.hop
    && metadata.max_tokens === profile.maxTokens
    && metadata.max_frames === profile.maxFrames
    && metadata.step === profile.configStep
    && metadata.frontend === 'dizione'
    && metadata.frontend_fingerprint === profile.graphFrontendFingerprint
    && JSON.stringify(metadata.symbols) === JSON.stringify(expectedSymbols);

  if (!isValid) {
    throw new Error('Fiato model/config metadata differs from the pinned release profile');
  }

  const ids = Object.values(value.vocab);
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 0 || id >= expectedSymbols.length)
      || new Set(ids).size !== ids.length) {
    throw new Error('Fiato vocabulary IDs are invalid or duplicated');
  }
  return value;
}

function intTensor(values) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
}

function floatTensor(value) {
  return new ort.Tensor('float32', Float32Array.of(value), [1]);
}

function sentencePlan(text) {
  const items = [];
  const sentenceList = sentences(text);
  const vocabularySize = Object.keys(config.vocab).length;
  let droppedSentences = 0;
  for (const sentence of sentenceList) {
    const textWithFinish = finished(sentence);
    const result = phonemizeJson(textWithFinish);
    const phones = result ? JSON.parse(result) : null;
    if (!phones) {
      droppedSentences += 1;
      continue;
    }

    if (phones.ids.length > profile.maxTokens) {
      throw new Error('One Fiato sentence exceeds the native 512-token limit; source text was not split or truncated');
    }
    const validIds = phones.ids.every((id) => Number.isInteger(id) && id >= 0 && id < vocabularySize);
    const validStress = phones.stress.every((value) => Number.isInteger(value) && value >= 0 && value <= 2);
    if (phones.ids.length !== phones.stress.length || !validIds || !validStress) {
      throw new Error('Fiato Dizione returned invalid token/stress values');
    }
    items.push(phones);
  }
  return { items, sentenceCount: sentenceList.length, droppedSentences };
}

async function auditFixture(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error(`Fiato audit requires all ${expected.spans} canonical English source spans`);
  }

  const rows = [];
  let utterances = 0;
  let maximumTokens = 0;
  let unknownTokens = 0;
  let droppedSentences = 0;
  for (let index = 0; index < auditTexts.length; index += 1) {
    const span = auditTexts[index];
    if (!span || span.id !== index || typeof span.text !== 'string' || !span.text.trim()) {
      throw new Error('Fiato audit spans must be nonempty and in original order');
    }

    const { items, sentenceCount, droppedSentences: dropped } = sentencePlan(span.text);
    if (!items.length && /[\p{L}\p{N}]/u.test(span.text)) {
      throw new Error(`Fiato fixture span ${index} produced no utterance`);
    }
    const phones = items.map((item) => {
      utterances += 1;
      maximumTokens = Math.max(maximumTokens, item.ids.length);
      unknownTokens += item.ids.filter((id) => id === config.vocab['<unk>']).length;
      return [item.ids, item.stress];
    });
    droppedSentences += dropped;
    rows.push([span.id, { sentenceCount, phones }]);
  }

  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = {
    spans: rows.length,
    utterances,
    maximumTokens,
    unknownTokens,
    droppedSentences,
    tokenStressSha256,
  };
  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key]) {
      throw new Error(`Fiato English fixture frontend oracle mismatch: ${JSON.stringify(actual)}`);
    }
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256, ...actual };
}

async function synthesizeSentence(item) {
  const inputs = {
    tokens: intTensor(item.ids),
    stress: intTensor(item.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: floatTensor(profile.speed),
    pitch_shift: floatTensor(profile.pitchShift),
    pitch_range: floatTensor(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const [audioData, durationData] = await Promise.all([
      outputs.audio.getData(),
      outputs.durations.getData(),
    ]);
    const durations = Array.from(durationData, Number);
    if (durations.length !== item.ids.length || durations.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Fiato returned invalid duration values');
    }

    const frames = durations.reduce((sum, value) => sum + value, 0);
    const sampleCount = frames * profile.hop;
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || frames > profile.maxFrames
        || audioData.length !== sampleCount) {
      throw new Error('Fiato audio length differs from duration frames × hop or exceeds max_frames');
    }

    const pcm = Float32Array.from(audioData);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some((value) => value !== 0)) {
      throw new Error('Fiato returned empty, nonfinite or silent PCM');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function speakSpan(text, onFirstPcm) {
  const { items } = sentencePlan(text);
  if (!items.length) throw new Error('Fiato Dizione found no speakable English words in the source span');

  const chunks = [];
  let totalSamples = 0;
  for (const item of items) {
    const pcm = await synthesizeSentence(item);
    if (chunks.length === 0) onFirstPcm?.();
    chunks.push(pcm);
    totalSamples += pcm.length;
  }

  const audio = new Float32Array(totalSamples);
  let offset = 0;
  let peakBeforeCap = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.length;
  }
  for (const sample of audio) peakBeforeCap = Math.max(peakBeforeCap, Math.abs(sample));
  let peakAfterCap = peakBeforeCap;
  if (peakBeforeCap > profile.peak) {
    const scale = profile.peak / peakBeforeCap;
    peakAfterCap = 0;
    for (let index = 0; index < audio.length; index += 1) {
      audio[index] *= scale;
      peakAfterCap = Math.max(peakAfterCap, Math.abs(audio[index]));
    }
  }

  return {
    audio,
    items,
    peakBeforeCap,
    peakAfterCap,
  };
}

function unsupported(reason) {
  return {
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    voice: activeVoice?.id ?? profile.defaultVoice,
    precision: profile.precision,
    settings: {
      modelId: profile.modelId,
      modelRevision: profile.modelRevision,
      fixtureId: profile.fixtureId,
      fixtureSha256: profile.fixtureSha256,
      language: profile.language,
      locale: profile.locale,
    },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

async function initialize(options = {}) {
  await dispose();
  if (!['cpu', 'webgpu'].includes(options.backend)) {
    throw new Error('Fiato requires an explicit cpu or webgpu backend');
  }

  const language = resolveFiatoLanguage(options.language, options.locale);
  const fixtureId = options.fixtureId ?? profile.fixtureId;
  if (!supportsFiatoFixture(options.fixtureId)) {
    return unsupported('Fiato is pinned to the canonical english-20k-v1 fixture');
  }
  if (options.sourceSha256 && options.sourceSha256 !== profile.fixtureSha256) {
    throw new Error('Fiato English fixture hash differs from the pinned canonical identity');
  }

  activeFixture = fixtureId;
  activeLanguage = language;
  activeVoice = resolveFiatoVoice(options.voice);
  const useGpu = options.backend === 'webgpu';
  if (useGpu) {
    gpuName = await hardwareGpu();
    if (!gpuName) return unsupported('Hardware WebGPU is unavailable or only a software fallback adapter is present');
  }

  const runtimeNames = useGpu
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [graphBytes, configBytes, modelBytes] = await Promise.all([
    modelAsset('onnx/model.onnx'),
    modelAsset('config.json'),
    modelAsset('onnx/model.json'),
    ...runtimeNames.map(runtimeAsset),
  ]);
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  const modelMetadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(modelBytes));
  validateConfig(config, modelMetadata);

  const loadedDizione = await loadFiatoDizione({ profile, modelAsset, pyodideAsset, config });
  pyodide = loadedDizione.pyodide;
  phonemizeJson = loadedDizione.phonemizeJson;
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;

  const runtimeModule = useGpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  ort = await import(sameOrigin(runtimeRoot, runtimeModule, '/runtimes/onnxruntime-web-pocket/').href);
  ort.env.logLevel = 'error';
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = useGpu
    ? {
      mjs: sameOrigin(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOrigin(runtimeRoot, 'ort-wasm-simd-threaded.asyncify.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    }
    : {
      mjs: sameOrigin(runtimeRoot, 'ort-wasm-simd-threaded.mjs', '/runtimes/onnxruntime-web-pocket/').href,
      wasm: sameOrigin(runtimeRoot, 'ort-wasm-simd-threaded.wasm', '/runtimes/onnxruntime-web-pocket/').href,
    };
  session = await ort.InferenceSession.create(graphBytes, {
    executionProviders: useGpu ? ['webgpu', 'wasm'] : ['wasm'],
    graphOptimizationLevel: 'all',
  });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(config.onnx.inputs)
      || JSON.stringify(session.outputNames) !== JSON.stringify(config.onnx.outputs)) {
    throw new Error('Fiato graph tensor names differ from config');
  }

  if (useGpu) {
    const device = await ort.env.webgpu.device;
    const adapter = await ort.env.webgpu.adapter;
    if (device?.adapterInfo?.isFallbackAdapter || adapter?.isFallbackAdapter || adapter?.info?.isFallbackAdapter) {
      await dispose();
      return unsupported('ONNX Runtime Web selected a software WebGPU adapter');
    }
    gpuName = device?.adapterInfo?.description || adapter?.info?.description || gpuName;
  }

  let dispatches = null;
  if (options.probe) {
    const hook = useGpu ? dispatchProbe() : null;
    try {
      const result = await speakSpan(options.probeText ?? 'Warm up.');
      if (!result.audio.length) throw new Error('Fiato untimed probe returned no PCM');
    } finally {
      dispatches = hook?.stop() ?? 0;
    }
    if (useGpu && dispatches === 0) {
      await dispose();
      return unsupported('No WebGPU compute dispatch was observed during Fiato capability synthesis');
    }
  }

  return {
    status: 'measured',
    backendEffective: useGpu ? 'webgpu+wasm' : 'cpu/wasm',
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
      locale: profile.locale,
      supportedLanguages: ['en'],
      voice: activeVoice.id,
      voiceIndex: activeVoice.index,
      speed: profile.speed,
      pitchShift: profile.pitchShift,
      pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate,
      hop: profile.hop,
      maxTokens: profile.maxTokens,
      maxFrames: profile.maxFrames,
      parameterCount: profile.parameterCount,
      precision: profile.precision,
      runtimeVersions: {
        onnxruntimeWeb: profile.runtimeVersion,
        pyodide: profile.pyodideVersion,
        numpy: loadedDizione.numpyVersion,
        dizione: profile.phonemizerVersion,
      },
      dizioneIdentity: loadedDizione.identity,
      configDizioneFingerprint: profile.configDizioneFingerprint,
      graphFrontendFingerprint: profile.graphFrontendFingerprint,
      executionProviders: useGpu ? ['webgpu', 'wasm'] : ['wasm'],
      wasmThreads: 1,
      peakCap: profile.peak,
      peakPolicy: 'Publisher 0.99 ceiling applied after sentence PCM is concatenated within each harness source span; no per-sentence normalization, added pause or trim.',
      expressions: profile.expressions,
      ...(fixtureAudit ? { fixtureAudit } : {}),
      frontend: 'Pinned Fiato Dizione 0.1.0 convention 4 through local Pyodide 0.26.4 and NumPy 1.26.4; publisher sentence and finish semantics.',
    },
    capability: {
      gpuDispatchVerified: useGpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(useGpu && options.probe ? { dispatches } : {}),
      description: useGpu
        ? 'WebGPU with WASM operator fallback; Dizione, Python/NumPy setup and PCM readback are CPU work. Actual dispatch is checked in a separate untimed synthesis.'
        : 'Explicit one-thread ONNX Runtime Web WASM CPU route; Fiato Dizione G2P runs in local Pyodide.',
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) {
    throw new Error('Fiato worker is not initialized for english-20k-v1');
  }
  if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || chunk.id >= profile.fixtureOracle.spans
      || typeof chunk.text !== 'string' || !chunk.text.trim()) {
    throw new Error('Invalid Fiato canonical source span');
  }
  if (chunk.fixtureId && chunk.fixtureId !== profile.fixtureId) throw new Error('Fiato fixture ID mismatch');
  if (chunk.sha256 && await sha256(new TextEncoder().encode(chunk.text)) !== chunk.sha256) {
    throw new Error(`Fiato source span ${chunk.id} hash mismatch`);
  }

  const result = await speakSpan(chunk.text, onFirstPcm);
  return { parts: [result.audio], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function diagnostic(options = {}) {
  if (!session) throw new Error('Fiato worker is not initialized');
  const expression = options.expression;
  const text = typeof options.text === 'string' ? options.text : profile.diagnosticSamples[expression];
  if (typeof text !== 'string') throw new Error('Fiato diagnostic requires a text or one of sigh, exhale, gasp');

  const result = await speakSpan(text);
  return {
    fixtureId: activeFixture,
    language: activeLanguage,
    voice: activeVoice.id,
    sampleRate: profile.sampleRate,
    samples: result.audio.length,
    seconds: result.audio.length / profile.sampleRate,
    sentences: result.items.length,
    tokenCounts: result.items.map(({ ids }) => ids.length),
    expression: expression ?? null,
    expressionTokens: Object.fromEntries(profile.expressions.map(tag => [
      tag, result.items.reduce((sum, { ids }) => sum + ids.filter(id => id === profile.expressionTokenIds[tag]).length, 0),
    ])),
    peakBeforeCap: result.peakBeforeCap,
    peakAfterCap: result.peakAfterCap,
    unknownTokens: result.items.reduce(
      (sum, item) => sum + item.ids.filter((id) => id === config.vocab['<unk>']).length,
      0,
    ),
  };
}

async function dispose() {
  const currentSession = session;
  session = null;
  if (currentSession) await currentSession.release();
  try {
    phonemizeJson?.destroy?.();
    pyodide?.globals?.destroy?.();
  } catch {}
  ort = null;
  pyodide = null;
  phonemizeJson = null;
  config = null;
  activeVoice = null;
  activeFixture = null;
  activeLanguage = null;
  gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') {
      value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    } else if (data.action === 'diagnostic') value = await diagnostic(data.options ?? {});
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Fiato action');
    self.postMessage({ id: data.id, value }, value?.parts?.map((part) => part.buffer) ?? []);
  } catch (error) {
    if (data.action === 'initialize') {
      try {
        await dispose();
      } catch {}
    }
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
