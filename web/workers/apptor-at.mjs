import { fetchModelAsset } from '../cache-model-asset.mjs';
import { G2P, makeFrontEnd, Voice } from '../apptor-at/frontend.mjs';
import { hardwareGpu, dispatchProbe } from './gpu-probe.mjs';

const revision = 'e28eb444250b4d06162e6ba8e5090c4284345913';
const root = '/models/apptor-tiny-tts-at/' + revision + '/';
const runtime = '/runtimes/onnxruntime-web/1.23.2/';
const options = { graphOptimizationLevel: 'all' };
const settings = {
  language: 'de-AT', locale: 'de-AT', voice: 'M2', voiceIndex: 1, accent: 1.0,
  precision: 'FP32 TTS / INT8 Vocos', speed: 1.0, pitchShift: 0, pitchRange: 1,
  sampleRate: 24000, gapMs: 120, threads: 1, vocos: true,
  gapPolicy: '120 ms between sentence/clause segments; fixed fixture chunk boundaries add no gap',
  frontend: 'Pinned Apptor German frontend and Austrian dictionary/rules; Austrian readings enabled at accent >= 0.5',
  runtimeRelease: 'onnxruntime-web@1.23.2 (upstream demo pins 1.20.1)',
};
const oracle = {
  fixtureId: 'de-at-article-v1',
  fixtureTextSha256: '13d72aa0ab868b492fd22384a374df6acd05c1648267da92c2db21bdc05c1324',
  tokenStressSha256: '7a0826cce334b683c5ff76098c557812bfaf89dcdcb1490b1da60bc0ca203bc1',
  runtime: 'onnxruntime-web@1.20.1', chunks: 109, characters: 23898, utterances: 328, maximumTokens: 211,
};
const ttsInputs = ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'accent'];
const ttsOutputs = ['audio', 'durations'];
let ort, g2p, voice, tts, vocos, dispatches = 0;

async function jsonAsset(name) {
  const response = await fetchModelAsset(root + name, revision);
  return response.json();
}

function validateParts(parts, id) {
  if (!Array.isArray(parts) || !parts.length) throw new Error(`Austrian frontend returned no utterances for chunk ${id}`);
  for (const part of parts) {
    if (!part?.ids?.length || part.ids.length !== part.stress?.length || part.ids.length < 3 || part.ids.length > 512) {
      throw new Error(`Austrian frontend returned empty, incomplete, or oversized tokens for chunk ${id}`);
    }
    if (!part.ids.every(id => Number.isInteger(id) && id >= 0) ||
        !part.stress.every(stress => Number.isInteger(stress) && stress >= 0 && stress <= 2)) {
      throw new Error(`Austrian frontend returned invalid token IDs or stress for chunk ${id}`);
    }
  }
  return parts;
}

async function digestAudit(auditTexts) {
  if (auditTexts.length !== oracle.chunks) throw new Error(`Austrian frontend oracle requires ${oracle.chunks} fixture spans`);
  const tokenPairs = [];
  let characters = 0, utterances = 0, maximumTokens = 0;
  for (const item of auditTexts) {
    if (!item || !Number.isInteger(item.id) || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error('Austrian fixture audit received an empty or invalid source span');
    }
    const parts = validateParts(await voice.parts(item.text, settings.accent >= 0.5, false), item.id);
    for (const part of parts) {
      tokenPairs.push(...part.ids.map((id, index) => `${id}:${part.stress[index]}`), '|');
      maximumTokens = Math.max(maximumTokens, part.ids.length);
      utterances++;
    }
    characters += Array.from(item.text).length;
  }
  const bytes = new TextEncoder().encode(tokenPairs.join(','));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const audit = { fixtureId: oracle.fixtureId, chunks: auditTexts.length, characters, utterances, maximumTokens, tokenStressSha256: hash,
    oracle: { runtime: oracle.runtime, fixtureTextSha256: oracle.fixtureTextSha256, tokenStressSha256: oracle.tokenStressSha256 } };
  if (characters !== oracle.characters || utterances !== oracle.utterances || maximumTokens !== oracle.maximumTokens || hash !== oracle.tokenStressSha256) {
    throw new Error(`Austrian frontend differs from the pinned 1.20.1 oracle: ${JSON.stringify(audit)}`);
  }
  return audit;
}

async function synthesize(text, id, firstPcm) {
  const parts = validateParts(await voice.parts(text, settings.accent >= 0.5, false), id);
  return synthesizeParts(parts, id, firstPcm);
}

async function synthesizeParts(parts, id, firstPcm) {
  let reported = false;
  const audio = await voice.speakParts(parts, {
    voice: 'M2', accent: settings.accent, speed: settings.speed, gap: settings.gapMs / 1000,
    onChunk() { if (!reported) { reported = true; firstPcm?.(); } },
  });
  if (!audio.length || !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
    throw new Error(`Apptor Austrian returned empty, nonfinite or silent PCM for chunk ${id}`);
  }
  return { parts: [audio], sampleRate: settings.sampleRate, completedChunkId: id };
}

async function initialize({ backend, probe, probeText, auditTexts = [] }) {
  const gpuMode = backend === 'webgpu';
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Apptor Austrian German supports CPU or WebGPU');
  let gpu = null;
  if (gpuMode) {
    gpu = await hardwareGpu();
    if (!gpu) return { status: 'unsupported', reason: 'Hardware WebGPU is unavailable', backendEffective: 'none', voice: 'M2',
      precision: settings.precision, settings, capability: { gpuDispatchVerified: false, description: 'No hardware WebGPU adapter.' } };
  }
  const wasmName = 'ort-wasm-simd-threaded' + (gpuMode ? '.asyncify' : '');
  ort = await import(runtime + (gpuMode ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = settings.threads;
  ort.env.wasm.proxy = false;
  ort.env.logLevel = 'error';
  ort.env.wasm.wasmPaths = { mjs: runtime + wasmName + '.mjs', wasm: runtime + wasmName + '.wasm' };
  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  const [ttsConfig, g2pConfig, frontendConfig, exceptions, austrian] = await Promise.all([
    jsonAsset('apptor-tiny-tts-at.json'), jsonAsset('apptor-g2p-de.json'), jsonAsset('frontend-de.json'),
    jsonAsset('exceptions-de.json'), jsonAsset('austrian-de.json'),
  ]);
  if (ttsConfig.sample_rate !== settings.sampleRate || ttsConfig.hop !== 256 || ttsConfig.voices.join(',') !== 'F2,M2,AT' ||
      ttsConfig.voices.indexOf('M2') !== settings.voiceIndex || ttsConfig.max_tokens !== 512 ||
      ttsConfig.inputs.join(',') !== ttsInputs.join(',') || ttsConfig.outputs.join(',') !== ttsOutputs.join(',') ||
      ttsConfig.accent_style !== 'AT') throw new Error('Pinned Austrian TTS configuration differs from the expected acoustic ABI');
  if (JSON.stringify(ttsConfig.symbols) !== JSON.stringify(frontendConfig.symbols) ||
      g2pConfig.inputs.join(',') !== 'chars' || g2pConfig.outputs.join(',') !== 'logp' ||
      !austrian.Kaffee || !austrian.Tabak || !austrian.Mathematik || !austrian.Chemie || !austrian.China) {
    throw new Error('Pinned Austrian frontend, pronunciation, or G2P configuration is incomplete');
  }
  const providerConfig = { ...options, executionProviders };
  const g2pSession = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-g2p-de.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  if (g2pSession.inputNames.join(',') !== 'chars' || g2pSession.outputNames.join(',') !== 'logp') {
    throw new Error('Austrian G2P ONNX graph names differ from the pinned ABI');
  }
  g2p = new G2P(ort, g2pSession, g2pConfig, exceptions, austrian);
  const phonemize = makeFrontEnd(frontendConfig, g2p);
  tts = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-tiny-tts-at.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  vocos = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-vocos-de.int8.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  if (tts.inputNames.join(',') !== ttsInputs.join(',') || tts.outputNames.join(',') !== ttsOutputs.join(',') ||
      vocos.inputNames.join(',') !== 'audio,a_real,a_imag,synth' || vocos.outputNames.join(',') !== 'output') {
    throw new Error('Austrian acoustic or Vocos ONNX graph names differ from the pinned ABI');
  }
  voice = new Voice(ort, tts, ttsConfig, phonemize, vocos);

  const fixtureAudit = auditTexts.length ? await digestAudit(auditTexts) : undefined;
  const probeParts = probe ? validateParts(await voice.parts(probeText || 'Ein kurzer österreichischer Sprachtest.', true, false), 'probe') : null;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) await synthesizeParts(probeParts, 'probe');
  } finally {
    dispatches = hook?.stop() ?? 0;
  }
  if (gpuMode && probe && !dispatches) return {
    status: 'unsupported', reason: 'No WebGPU compute dispatch was observed during Austrian TTS/Vocos synthesis',
    backendEffective: 'none', voice: 'M2', precision: settings.precision, settings,
    capability: { gpuDispatchVerified: false, description: 'The actual speech probe observed zero compute dispatches.' },
  };
  return {
    status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', voice: 'M2', precision: settings.precision,
    settings: { ...settings, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) }, gpu,
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null,
      description: gpuMode ? `Observed ${dispatches} compute dispatches in the untimed Austrian TTS/Vocos probe; unsupported operators can fall back to WASM.` :
        'Explicit single-thread WASM inference for Austrian G2P, TTS and Vocos.' },
  };
}

async function dispose() {
  const oldG2p = g2p, oldVoice = voice, oldTts = tts, oldVocos = vocos;
  oldG2p?.cache.clear();
  g2p = null; voice = null;
  for (const tensor of Object.values(oldVoice?.kernels ?? {})) tensor.dispose();
  await Promise.all([oldTts?.release(), oldVocos?.release(), oldG2p?.session?.release()].filter(Boolean));
  tts = null; vocos = null; ort = null;
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await synthesize(data.chunk.text, data.chunk.id,
      () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Apptor Austrian action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
