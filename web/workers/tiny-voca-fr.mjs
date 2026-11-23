import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';
import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_FR as profile } from '../adapters/tiny-voca-fr-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
let ort, session, espeakFactory, espeakWasm, frontend, metadata, activeVoice, activeFixture, activeLanguage, backend, gpuName;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  const url = new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/models/')) {
    throw new Error('Tiny Voca French assets must use the same-origin pinned model tree');
  }
  return url;
}

async function checkedBytes(relative, label) {
  const spec = profile.assets[relative];
  if (!spec) throw new Error(`Tiny Voca French asset is not pinned: ${relative}`);
  const response = await fetchModelAsset(assetUrl(relative), profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) {
    throw new Error(`${label} size or SHA-256 mismatch`);
  }
  return bytes;
}

const modelAsset = name => checkedBytes(`models/${name}`, `Tiny Voca French ${name}`);
const siteAsset = name => checkedBytes(`site/${name}`, `Tiny Voca French source ${name}`);
async function runtimeAsset(name) {
  const relative = backend === 'cpu' ? `runtime/cpu/${name}` : `runtime/webgpu/${name}`;
  const spec = profile.assets[relative];
  if (!spec) throw new Error(`Tiny Voca French runtime asset is not pinned: ${name}`);
  const url = backend === 'cpu'
    ? assetUrl(relative)
    : new URL(`/runtimes/onnxruntime-web-pocket/1.31.1/${name}`, self.location.origin);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
    throw new Error('Tiny Voca French runtime assets must use the same-origin pinned runtime tree');
  }
  const response = await fetchModelAsset(url, profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) {
    throw new Error(`ONNX Runtime Web ${name} size or SHA-256 mismatch`);
  }
  return bytes;
}

function validateMetadata(value) {
  if (value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames ||
      value.step !== profile.step || value.frontend !== 'espeak' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify(profile.voices.map(voice => voice.id)) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) ||
      !Array.isArray(value.symbols) || value.symbols.length !== 52 || new Set(value.symbols).size !== value.symbols.length) {
    throw new Error('Tiny Voca French metadata differs from the pinned checkpoint profile');
  }
}

function chooseVoice(requested) {
  const voice = profile.voices.find(item => item.id === requested);
  if (!voice) throw new Error(`Unsupported Tiny Voca French voice: ${requested}`);
  return voice;
}

async function phonemize(text) {
  let out = '';
  await espeakFactory({
    arguments: ['-q', '--ipa', '--sep=_', '-v', 'fr-fr', text],
    print: line => { out += line + '\n'; },
    printErr: () => {},
    instantiateWasm: (imports, ready) => {
      WebAssembly.instantiate(espeakWasm, imports).then(ready);
      return {};
    },
  });
  return out;
}

function splitLongSentence(value) {
  const pieces = value.split(/(?<=[,;:—])\s+/);
  if (pieces.length > 1) return pieces;
  const words = value.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

async function fit(value) {
  let phones;
  try { phones = await frontend.phonemize(value, phonemize); }
  catch (error) {
    if (error instanceof frontend.NothingToPronounce) return [];
    throw error;
  }
  if (phones.ids.length <= metadata.max_tokens - 12) return [{ utterance: value, ...phones }];
  const pieces = splitLongSentence(value);
  if (!pieces.length) throw new Error(`A French word exceeds the token limit: ${value.slice(0, 40)}`);
  const fitted = [];
  for (const piece of pieces) fitted.push(...await fit(piece));
  return fitted;
}

function finished(text) {
  const body = text.replace(/\s+$/, '');
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last)
    ? /[.!?…,;:]["'”’)\]»]*$/.test(last)
    : /[.!?…»"]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : body + '.';
}

function idsTensor(values) { return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]); }
function scalar(value) { return new ort.Tensor('float32', Float32Array.of(value), [1]); }

class UtteranceTooLong extends Error {}

async function synthesize(phones) {
  const inputs = {
    tokens: idsTensor(phones.ids),
    stress: idsTensor(phones.stress),
    voice: new ort.Tensor('int64', BigInt64Array.of(BigInt(activeVoice.index)), [1]),
    speed: scalar(profile.speed),
    pitch_shift: scalar(profile.pitchShift),
    pitch_range: scalar(profile.pitchRange),
  };
  let outputs;
  try {
    outputs = await session.run(inputs);
    const durations = Array.from(outputs.durations.data, Number);
    if (durations.length !== phones.ids.length || durations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Tiny Voca French returned invalid frame durations');
    }
    const frames = durations.reduce((sum, value) => sum + value, 0);
    if (frames > metadata.max_frames) throw new UtteranceTooLong('Tiny Voca French utterance exceeds the upstream frame limit');
    const sampleCount = frames * profile.hop;
    const source = outputs.audio.data;
    if (!Number.isSafeInteger(sampleCount) || frames < 1 || source.length !== sampleCount) {
      throw new Error('Tiny Voca French audio length differs from durations × hop');
    }
    const pcm = Float32Array.from(source);
    if (!pcm.length || !pcm.every(Number.isFinite) || !pcm.some(value => value !== 0)) {
      throw new Error('Tiny Voca French returned empty, non-finite or silent audio');
    }
    return pcm;
  } finally {
    for (const input of Object.values(inputs)) input.dispose?.();
    if (outputs) for (const output of Object.values(outputs)) output.dispose?.();
  }
}

async function generateText(value, onFirstPcm) {
  const waves = [];
  let first = true;
  const addSentence = async sentence => {
    for (const plan of await fit(sentence)) {
      try {
        const pcm = await synthesize(plan);
        waves.push(pcm);
        if (first) { first = false; onFirstPcm?.(); }
      } catch (error) {
        if (!(error instanceof UtteranceTooLong)) throw error;
        const pieces = splitLongSentence(plan.utterance);
        if (!pieces.length) throw new Error(`A French word exceeds the model frame limit: ${plan.utterance.slice(0, 40)}`);
        for (const piece of pieces) await addSentence(piece);
      }
    }
  };
  for (const sentence of frontend.sentences(finished(value))) await addSentence(sentence);
  if (!waves.length) throw new Error('Tiny Voca French produced no pronounceable PCM for this source span');

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

async function verifyFixtureAudit(auditTexts) {
  const expected = profile.fixtureOracle;
  if (!Array.isArray(auditTexts) || auditTexts.length !== expected.spans) {
    throw new Error(`Tiny Voca French smoke audit requires ${expected.spans} ordered fixture spans`);
  }
  const rows = [];
  let utterances = 0, maximumTokens = 0, unknownPhones = 0;
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`Invalid or reordered Tiny Voca French fixture span ${id}`);
    }
    const plans = [];
    for (const sentence of frontend.sentences(finished(item.text))) plans.push(...await fit(sentence));
    if (!plans.length) throw new Error(`Tiny Voca French frontend returned no text for fixture span ${id}`);
    const tuples = plans.map(plan => {
      if (plan.ids.length !== plan.stress.length || plan.ids.length < 3 ||
          plan.ids.some(value => !Number.isInteger(value) || value < 0 || value >= metadata.symbols.length) ||
          plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
        throw new Error(`Invalid token/stress output in Tiny Voca French fixture span ${id}`);
      }
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.ids.length);
      unknownPhones += plan.ids.filter(value => value === 4).length;
      return [plan.ids, plan.stress];
    });
    rows.push([id, tuples]);
  }
  const tokenStressSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (utterances !== expected.utterances || maximumTokens !== expected.maximumTokens ||
      unknownPhones !== expected.unknownPhones || tokenStressSha256 !== expected.tokenStressSha256) {
    throw new Error('Tiny Voca French frontend parity mismatch: ' + JSON.stringify({
      spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256,
    }));
  }
  return { fixtureId: profile.fixtureId, fixtureSha256: profile.fixtureSha256,
    spans: rows.length, utterances, maximumTokens, unknownPhones, tokenStressSha256 };
}

function unsupported(reason) {
  return { status: 'unsupported', reason, backendEffective: 'none', voice: activeVoice?.id || profile.defaultVoice,
    precision: profile.precision, settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
}

async function initialize(options = {}) {
  if (!['cpu', 'webgpu'].includes(options.backend)) throw new Error('Tiny Voca French requires explicit cpu or webgpu backend');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    throw new Error('Tiny Voca French requires fr-article-v1 and the exact French profile');
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

  const runtimeFiles = webgpu
    ? ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']
    : ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  const [modelBytes, metadataBytes, espeakWasmBytes] = await Promise.all([
    modelAsset('model.onnx'), modelAsset('model.json'), siteAsset('espeak-ng.wasm'),
    siteAsset('frontend-fr.js'), siteAsset('espeak-ng.js'), ...runtimeFiles.map(runtimeAsset),
  ]);
  metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes));
  validateMetadata(metadata);
  espeakWasm = await WebAssembly.compile(espeakWasmBytes);
  const sourceRoot = new URL(modelRoot + 'site/', self.location.origin);
  frontend = await import(new URL('frontend-fr.js', sourceRoot).href);
  espeakFactory = (await import(new URL('espeak-ng.js', sourceRoot).href)).default;
  if (typeof espeakFactory !== 'function' || JSON.stringify(frontend.SYMBOLS) !== JSON.stringify(metadata.symbols)) {
    throw new Error('Pinned Tiny Voca French frontend or eSpeak NG 1.0.2 module is unavailable');
  }

  const audit = options.auditTexts?.length ? await verifyFixtureAudit(options.auditTexts) : undefined;
  const runtimeRoot = webgpu
    ? new URL('/runtimes/onnxruntime-web-pocket/1.31.1/', self.location.origin)
    : new URL(modelRoot + 'runtime/cpu/', self.location.origin);
  const runtimeName = webgpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs';
  ort = await import(new URL(runtimeName, runtimeRoot).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = webgpu ? {
    mjs: new URL('ort-wasm-simd-threaded.asyncify.mjs', runtimeRoot).href,
    wasm: new URL('ort-wasm-simd-threaded.asyncify.wasm', runtimeRoot).href,
  } : runtimeRoot.href;
  ort.env.logLevel = 'error';
  session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: webgpu ? ['webgpu', 'wasm'] : ['wasm'],
  });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(metadata.inputs) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(metadata.outputs)) {
    throw new Error('Tiny Voca French ONNX graph names differ from pinned model metadata');
  }
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
      const pcm = await generateText(options.probeText || 'Bonjour, comment allez-vous ?', null);
      if (!pcm.length) throw new Error('Tiny Voca French capability probe returned no PCM');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (webgpu && options.probe && dispatches < 1) {
    await dispose();
    return unsupported('No WebGPU compute dispatch was observed during the Tiny Voca French probe');
  }

  const runtimeVersion = webgpu ? profile.webgpuRuntimeVersion : profile.cpuRuntimeVersion;
  const executionProviders = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  return {
    status: 'measured', backendEffective: webgpu ? 'webgpu+wasm' : 'cpu/wasm', voice: activeVoice.id,
    precision: profile.precision, gpu: gpuName,
    settings: {
      modelId: profile.modelId, modelRevision: profile.modelRevision, sourceId: profile.sourceId,
      sourceRevision: profile.sourceRevision, fixtureId: activeFixture, fixtureSha256: profile.fixtureSha256,
      language: activeLanguage, locale: profile.locale, voice: activeVoice.id, voiceIndex: activeVoice.index,
      speed: profile.speed, pitchShift: profile.pitchShift, pitchRange: profile.pitchRange,
      sampleRate: profile.sampleRate, hop: profile.hop, maxTokens: profile.maxTokens,
      tokenLimit: profile.tokenLimit, maxFrames: profile.maxFrames, step: profile.step,
      precision: profile.precision, frontend: profile.frontend, frontendFingerprint: profile.frontendFingerprint,
      runtimeVersion, runtimeVersions: { onnxruntimeWeb: runtimeVersion, espeakNg: '1.0.2' },
      runtimePackageIntegrity: webgpu ? profile.runtimePackageIntegrity.webgpu : profile.runtimePackageIntegrity.cpu,
      espeakPackageIntegrity: profile.espeakPackageIntegrity,
      executionProviders, waveformExecutionProviders: executionProviders, wasmThreads: 1,
      graphOptimization: 'ONNX Runtime Web default',
      waveform: 'Released French FP32 ONNX graph; unseeded waveform noise. Concatenate generated utterances for each source span, then apply one whole-span peak cap at 0.99.',
      numericInput: 'No benchmark-specific number rewriting. The upstream browser eSpeak `fr-fr` frontend reads 17 h 40 with h as the letter name between 17 and 40; liaison limitations such as comment‿allez missing [t] remain as released.',
      runtimeCompatibility: 'Upstream browser demo is CPU/WASM only. ONNX Runtime Web 1.20.1 fails WebGPU at /Concat_6 with a non-concat dimension mismatch; WebGPU uses the existing pinned ONNX Runtime Web 1.31.1 assets and retains WASM fallback.',
      ...(audit ? { fixtureAudit: audit } : {}),
    },
    capability: {
      gpuDispatchVerified: webgpu ? (options.probe ? dispatches > 0 : null) : null,
      ...(webgpu && options.probe ? { dispatches } : {}),
      description: webgpu
        ? (options.probe ? `Observed ${dispatches} WebGPU compute dispatches from ONNX Runtime Web ${runtimeVersion}; WASM fallback remains available.` : 'Pinned 1.31.1 graph requests WebGPU then WASM; an untimed probe is required to verify dispatch.')
        : `ONNX Runtime Web ${runtimeVersion} uses explicit single-thread WASM, matching the upstream CPU-only browser demo. French normalization and eSpeak NG G2P run locally.`,
    },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!session || !frontend || !espeakFactory || !espeakWasm || activeFixture !== profile.fixtureId || activeLanguage !== profile.language) {
    throw new Error('Tiny Voca French adapter is not initialized');
  }
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim()) {
    throw new Error('Invalid Tiny Voca French source chunk');
  }
  const pcm = await generateText(chunk.text, onFirstPcm);
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  const current = session;
  session = null;
  if (current) await current.release();
  espeakFactory = null;
  espeakWasm = null;
  frontend = null;
  metadata = null;
  ort = null;
  activeVoice = null;
  activeFixture = activeLanguage = backend = gpuName = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Tiny Voca French worker action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
