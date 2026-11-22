import { fetchModelAsset } from '../cache-model-asset.mjs';
import { assetDigests, defaultVoice, defaultVoiceIndex, fixtureOracle, modelRevision, sampleRate, validateVocinaMetadata } from '../vocina/profile.mjs';
import { dispatchProbe, hardwareGpu } from './gpu-probe.mjs';

const root = '/models/vocina-it/' + modelRevision + '/';
const runtime = root + 'runtime/';
const settingsBase = {
  language: 'it', locale: 'it-IT', voiceId: defaultVoice, voiceIndex: defaultVoiceIndex,
  voiceLabel: 'I1 (Femminile)', speed: 1, pitch: 0, pitchRange: 1, variants: [],
  precision: 'dynamic-MatMul INT8', sampleRate, threads: 1, modelRevision,
  graphSha256: assetDigests['vocina-int8.onnx'][1],
  frontend: 'Vocina official g2p_it and tinyvoca_web algorithm at ' + modelRevision + '; Italian Wiktionary lexicon',
  runtimeRelease: 'onnxruntime-web@1.27.0',
  algorithm: 'g2p.frasi; official adatta token fitting (max 200); official per-piece pauses including final pause per source span; global 0.99 peak limiter.',
  integrationChanges: 'Dedicated benchmark worker; zero-delay UI-yield between pieces omitted because no UI is rendered in the worker.',
  stochasticity: 'The graph uses native RandomNormalLike; PCM hashes may differ across runs and are not a repeatability oracle.',
};
const info = { voice: 'I1 (Femminile)', precision: 'INT8', settings: settingsBase };
let ort, voice, metadata, gpuName;
const byteCache = new Map();
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function asset(name) {
  if (byteCache.has(name)) return byteCache.get(name);
  const spec = assetDigests[name];
  if (!spec) throw new Error('Unpinned Vocina asset: ' + name);
  const path = name.startsWith('ort.') || name.startsWith('ort-') ? 'runtime/' + name : name;
  const response = await fetchModelAsset(root + path, modelRevision);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await sha256(bytes) !== spec[1]) throw new Error('Vocina asset checksum mismatch: ' + name);
  byteCache.set(name, bytes);
  return bytes;
}

async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== fixtureOracle.spans) throw new Error('Vocina audit needs all 107 Italian fixture spans.');
  const rows = [];
  let planCount = 0, maximumTokens = 0, unknownSpans = 0;
  for (let index = 0; index < auditTexts.length; index++) {
    const item = auditTexts[index];
    if (!item || item.id !== index || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Vocina received a reordered or empty fixture span.');
    const plans = voice.audit(item.text, []);
    if (!plans.length) throw new Error('Vocina produced no plan for fixture span ' + index + '.');
    if (plans.some(plan => !plan.ids.length || plan.ids.length !== plan.stress.length || plan.ids.length > 200)) throw new Error('Vocina token fitting exceeded its verified plan at span ' + index + '.');
    planCount += plans.length;
    maximumTokens = Math.max(maximumTokens, ...plans.map(plan => plan.ids.length));
    if (plans.some(plan => plan.unknown)) unknownSpans++;
    rows.push([item.id, plans.map(({ ids, stress, pausa }) => [ids, stress, pausa])]);
  }
  const tokenStressPauseSha256 = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  if (planCount !== fixtureOracle.plans || maximumTokens !== fixtureOracle.maximumTokens ||
      unknownSpans !== fixtureOracle.unknownSpans || tokenStressPauseSha256 !== fixtureOracle.tokenStressPauseSha256) {
    throw new Error('Vocina fixture frontend parity failed (plans ' + planCount + ', max ' + maximumTokens +
      ', unknown spans ' + unknownSpans + ', digest ' + tokenStressPauseSha256 + ').');
  }
  return { fixtureId: fixtureOracle.fixtureId, sourceSha256: fixtureOracle.sourceSha256, spans: auditTexts.length,
    plans: planCount, maximumTokens, unknownSpans, tokenStressPauseSha256 };
}

const unsupported = reason => ({ ...info, status: 'unsupported', backendEffective: 'none', reason,
  capability: { gpuDispatchVerified: false, description: reason } });

async function synthesize(text, onFirst) {
  let reported = false;
  const audio = await voice.leggi(text, {
    voce: defaultVoiceIndex, velocita: 1, varianti: [],
    suFrase: ({ audio: pcm }) => {
      if (!reported && pcm?.length) { reported = true; onFirst?.(); }
    },
  });
  if (!(audio instanceof Float32Array) || !audio.length || !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
    throw new Error('Vocina returned empty, non-finite or silent PCM.');
  }
  let peak = 0;
  for (const value of audio) peak = Math.max(peak, Math.abs(value));
  if (peak > 0.990001) throw new Error('Vocina output exceeds its official 0.99 peak limiter.');
  return audio;
}

async function generate(chunk, onFirst) {
  const audio = await synthesize(chunk.text, onFirst);
  return { parts: [audio], sampleRate, completedChunkId: chunk.id };
}

async function initialize({ backend, probe, probeText, fixtureId, language = 'it', auditTexts = [] }) {
  if (!['cpu', 'webgpu'].includes(backend)) throw new Error('Vocina supports CPU/WASM and WebGPU with explicit WASM fallback.');
  if (fixtureId !== fixtureOracle.fixtureId || language !== 'it') throw new Error('Vocina v1.0 requires it-article-v1 and Italian frontend routing.');
  const gpuMode = backend === 'webgpu';
  gpuName = gpuMode ? await hardwareGpu() : null;
  if (gpuMode && !gpuName) return unsupported('No non-fallback hardware WebGPU adapter is available.');

  const [metadataBytes, graphBytes, datiBytes, lexBytes, g2pBytes, wasmBytes, runtimeBytes] = await Promise.all([
    asset('vocina-int8.json'), asset('vocina-int8.onnx'), asset('dati.json'),
    asset('lessico_wikizionario.json'), asset('g2p_it.js'),
    asset(gpuMode ? 'ort-wasm-simd-threaded.asyncify.wasm' : 'ort-wasm-simd-threaded.wasm'),
    asset(gpuMode ? 'ort.webgpu.bundle.min.mjs' : 'ort.wasm.bundle.min.mjs'),
  ]);
  if (!g2pBytes.length) throw new Error('Vocina G2P module is empty.');
  metadata = validateVocinaMetadata(JSON.parse(new TextDecoder().decode(metadataBytes)));
  const dati = JSON.parse(new TextDecoder().decode(datiBytes));
  const lex = JSON.parse(new TextDecoder().decode(lexBytes));
  if (!lex.voci || typeof lex.voci !== 'object' || Array.isArray(lex.voci) || !Object.keys(lex.voci).length) {
    throw new Error('Vocina Wiktionary lexicon has no keyed voci inventory.');
  }
  dati.wikizionario = lex.voci;
  const frontendModule = await import('../vocina/vocina-browser.mjs');
  await import(root + 'g2p_it.js');
  ort = await import(runtime + (gpuMode ? 'ort.webgpu.bundle.min.mjs' : 'ort.wasm.bundle.min.mjs'));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  // wasmBinary is passed to caricaVoce below; wasmPaths would make ORT request another mjs loader.
  ort.env.logLevel = 'error';
  const graph = graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength);
  voice = await frontendModule.caricaVoce({
    ort, dati, modello: graph, metadati: metadata, wasm: wasmBytes,
    executionProviders: gpuMode ? ['webgpu', 'wasm'] : ['wasm'],
  });
  if (voice.frequenza !== sampleRate || voice.voci[defaultVoiceIndex] !== defaultVoice || voice.voci[1] !== 'I2') {
    throw new Error('Vocina loaded an unexpected voice inventory or sample rate.');
  }
  const fixtureAudit = auditTexts.length ? await auditFixture(auditTexts) : undefined;
  let dispatches = 0;
  const hook = gpuMode && probe ? dispatchProbe() : null;
  try {
    if (probe) {
      const result = await synthesize(probeText || 'Buongiorno. Questa è una prova di sintesi vocale.');
      if (!result.length) throw new Error('Vocina capability probe produced no PCM.');
    }
  } finally { dispatches = hook?.stop() ?? 0; }
  if (gpuMode && probe && !dispatches) return unsupported('No WebGPU compute dispatch was observed during Vocina synthesis.');

  const executionProviders = gpuMode ? ['webgpu', 'wasm'] : ['wasm'];
  const result = { ...info, status: 'measured', backendEffective: gpuMode ? 'webgpu+wasm' : 'cpu/wasm', gpu: gpuName,
    settings: { ...settingsBase, fixtureId, executionProviders, ...(fixtureAudit ? { fixtureAudit } : {}) },
    capability: { gpuDispatchVerified: gpuMode ? (probe ? dispatches > 0 : null) : null, description: gpuMode ?
      'Observed ' + dispatches + ' WebGPU compute dispatches during the untimed probe; unsupported operators may run on explicit WASM fallback.' :
      'ONNX Runtime Web 1.27.0 bundled CPU/WASM entrypoint, verified local WASM binary and one WASM thread; Italian G2P runs in the dedicated worker.' } };
  byteCache.clear();
  return result;
}

async function dispose() {
  // The official wrapper exposes no session release method. rpc-bridge terminates this
  // dedicated worker immediately after this response, releasing ORT and G2P allocations.
  voice = null; ort = null; metadata = null; gpuName = null; byteCache.clear();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') await dispose();
    else throw new Error('Unknown Vocina action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
