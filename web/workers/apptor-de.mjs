import { fetchModelAsset } from '../cache-model-asset.mjs';
import { G2P, makeFrontEnd, Voice } from '../apptor-de/frontend.mjs';
import { hardwareGpu, dispatchProbe } from './gpu-probe.mjs';

const revision = '0b6962273a1d6618f250cdbd621b56ba04b62cef';
const root = '/models/apptor-tiny-tts/' + revision + '/';
const runtime = '/runtimes/onnxruntime-web/1.23.2/';
const options = { graphOptimizationLevel: 'all' };
const settings = {
  language: 'de', locale: 'de-DE', voice: 'M2', precision: 'FP32 TTS / INT8 Vocos', speed: 1,
  pitchShift: 0, pitchRange: 1, sampleRate: 24000, gapMs: 120, threads: 1, vocos: true,
  gapPolicy: '120 ms between sentence/clause segments; fixed fixture chunk boundaries add no gap',
  frontend: 'Pinned apptor Standard German browser G2P, German normalization and tokenization; Austrian conditioning disabled',
  runtimeRelease: 'onnxruntime-web@1.23.2',
};

let ort, g2p, voice, tts, vocos, dispatches = 0;

async function jsonAsset(name) {
  const response = await fetchModelAsset(root + name, revision);
  return response.json();
}

async function digestAudit(auditTexts) {
  const tokenPairs = [];
  let chunks = 0, characters = 0, utterances = 0;
  for (const item of auditTexts) {
    if (!item || typeof item.text !== 'string' || !item.text.trim()) throw new Error('German fixture audit received an empty source chunk');
    const parts = await voice.parts(item.text);
    if (!parts.length) throw new Error(`German fixture audit dropped chunk ${item.id}`);
    for (const part of parts) {
      if (part.ids.length > 512) throw new Error(`German fixture audit exceeded the token limit in chunk ${item.id}`);
      if (part.ids.length !== part.stress.length || part.ids.length < 3) throw new Error(`German fixture audit returned incomplete tokens in chunk ${item.id}`);
      tokenPairs.push(...part.ids.map((id, index) => `${id}:${part.stress[index]}`), '|');
      utterances++;
    }
    chunks++;
    characters += Array.from(item.text).length;
  }
  const bytes = new TextEncoder().encode(tokenPairs.join(','));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  return { fixtureId: 'de-article-v1', chunks, characters, utterances, tokenStressSha256: hash };
}

async function synthesize(text, id, firstPcm) {
  const parts = await voice.parts(text);
  return synthesizeParts(parts, id, firstPcm);
}

async function synthesizeParts(parts, id, firstPcm) {
  let reported = false;
  const audio = await voice.speakParts(parts, {
    onChunk() { if (!reported) { reported = true; firstPcm?.(); } },
  });
  if (!audio.length || !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
    throw new Error(`Apptor returned empty, nonfinite or silent PCM for chunk ${id}`);
  }
  return { parts: [audio], sampleRate: settings.sampleRate, completedChunkId: id };
}

async function initialize({ backend, probe, probeText, auditTexts = [] }) {
  const gpuMode = backend === 'webgpu';
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Apptor Standard German supports CPU or WebGPU');
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
  const [ttsConfig, g2pConfig, frontendConfig, exceptions] = await Promise.all([
    jsonAsset('apptor-tiny-tts-de.json'), jsonAsset('apptor-g2p-de.json'), jsonAsset('frontend-de.json'), jsonAsset('exceptions-de.json'),
  ]);
  if (ttsConfig.sample_rate !== 24000 || ttsConfig.hop !== 256 || ttsConfig.voices.join(',') !== 'F2,M2' ||
      ttsConfig.max_tokens !== 512 || ttsConfig.inputs.join(',') !== 'tokens,stress,voice,speed,pitch_shift,pitch_range' ||
      ttsConfig.inputs.includes('accent')) throw new Error('Pinned Standard German TTS configuration differs from the expected ABI');
  if (JSON.stringify(ttsConfig.symbols) !== JSON.stringify(frontendConfig.symbols) ||
      g2pConfig.inputs.join(',') !== 'chars' || g2pConfig.outputs.join(',') !== 'logp') {
    throw new Error('Pinned German frontend and G2P configuration differ from the expected ABI');
  }
  const providerConfig = { ...options, executionProviders };
  const g2pSession = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-g2p-de.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  g2p = new G2P(ort, g2pSession, g2pConfig, exceptions);
  const phonemize = makeFrontEnd(frontendConfig, g2p);
  tts = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-tiny-tts-de.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  vocos = await ort.InferenceSession.create(await fetchModelAsset(root + 'apptor-vocos-de.int8.onnx', revision).then(r => r.arrayBuffer()), providerConfig);
  voice = new Voice(ort, tts, ttsConfig, phonemize, vocos);

  if (auditTexts.length) var fixtureAudit = await digestAudit(auditTexts);
  const probeParts = probe ? await voice.parts(probeText || 'Ein kurzer deutscher Sprachtest.') : null;
  let hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const result = await synthesizeParts(probeParts, 'probe');
      if (!result.parts.length) throw new Error('Apptor capability probe returned no PCM');
    }
  } finally {
    dispatches = hook?.stop() ?? 0;
    hook = null;
  }
  if (gpuMode && probe && !dispatches) return {
    status: 'unsupported', reason: 'No WebGPU compute dispatch was observed during German TTS/Vocos synthesis',
    backendEffective: 'none', voice: 'M2', precision: settings.precision, settings,
    capability: { gpuDispatchVerified: false, description: 'The actual speech probe observed zero compute dispatches.' },
  };
  return {
    status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', voice: 'M2', precision: settings.precision,
    settings: { ...settings, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) }, gpu,
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null,
      description: gpuMode ? `Observed ${dispatches} compute dispatches in the untimed probe. CPU-side German normalization and final PCM assembly; ONNX operators may fall back to WASM.` :
        'Explicit single-thread WASM inference for German G2P, TTS and Vocos.' },
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
    else throw new Error('Unknown Apptor action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
