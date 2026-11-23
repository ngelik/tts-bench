import { createSoproAdapter } from './adapters/sopro.mjs';
import { createTinyVocaAdapter } from './adapters/tiny-voca.mjs';
import { createTinyVocaDeEnAdapter } from './adapters/tiny-voca-de-en.mjs';
import { createTinyVocaItAdapter } from './adapters/tiny-voca-it.mjs';
import { createTinyVocaJaTsukuyomiChanAdapter } from './adapters/tiny-voca-ja-tsukuyomi-chan.mjs';
import { createTinyVocaJaV3Adapter } from './adapters/tiny-voca-ja-v3.mjs';
import { createKoreanTtsAdapter } from './adapters/korean-tts.mjs';
import { createSlyszeglosyV1Adapter } from './adapters/slyszeglosy-v1.mjs';
import { createTinyVocaRuAdapter } from './adapters/tiny-voca-ru.mjs';
import { createTinyVocaGrAdapter } from './adapters/tiny-voca-gr.mjs';
import { createMiniVozAdapter } from './adapters/mini-voz.mjs';
import { createTinyVocaEsAdapter } from './adapters/tiny-voca-es.mjs';
import { createTinyVocaFrAdapter } from './adapters/tiny-voca-fr.mjs';
import { createTinySwaraAdapter } from './adapters/tiny-swara.mjs';
import { createTinyVocaHindiAdapter } from './adapters/tiny-voca-hindi.mjs';
import { createTinyVocaPtbrAdapter } from './adapters/tiny-voca-ptbr.mjs';
import { createTinyVocaPtbrKokoroAdapter } from './adapters/tiny-voca-ptbr-kokoro.mjs';
import { createTuiVoiceMiniMlAdapter } from './adapters/tui-voice-mini-ml.mjs';
import { createTinyUrduAdapter } from './adapters/tiny-urdu.mjs';
import { createTinyBrocaAdapter } from './adapters/tiny-broca.mjs';
import { createTinyVocaArHalabiAdapter } from './adapters/tiny-voca-ar-halabi.mjs';
import { createTinyVocaArAdapter } from './adapters/tiny-voca-ar.mjs';
import { createTinyVocaArabicAdapter } from './adapters/tiny-voca-arabic.mjs';
import { createTinyVocaHeAdapter } from './adapters/tiny-voca-he.mjs';
import { createAlpaEsAdapter } from './adapters/alpa-es.mjs';
import { createClarviaTtsTinyAdapter } from './adapters/clarvia-tts-tiny.mjs';
import { createZerreTtsAdapter } from './adapters/zerre-tts.mjs';
import { createVocinaAdapter } from './adapters/vocina.mjs';
import { createApptorDeAdapter } from './adapters/apptor-de.mjs';
import { createApptorAtAdapter } from './adapters/apptor-at.mjs';
import { createLinnetAdapter } from './adapters/linnet.mjs';
import { createMingAdapter } from './adapters/ming.mjs';
import { createMingGgufAdapter } from './adapters/audio-cpp-gguf.mjs';
import { createAudio8Adapter } from './adapters/audio8.mjs';
import { createCosyVoice3Adapter } from './adapters/cosyvoice3.mjs';
import { createPocketAdapter } from './adapters/pocket.mjs';
import { createMachBoomAdapter } from './adapters/mach-boom.mjs';
import { createLiquidCpuAdapter } from './adapters/liquid-cpu.mjs';
import { createLiquidGgufAdapter } from './adapters/liquid-gguf.mjs';
import { createPhononAdapter } from './adapters/phonon.mjs';
import { createParadeeAdapter } from './adapters/paradee.mjs';
import { createLeokaniAdapter } from './adapters/leokani.mjs';
import { createPivoAdapter } from './adapters/pivo.mjs';
import { createWoofAdapter } from './adapters/woof.mjs';
import { createPiperAdapter } from './adapters/piper.mjs';
import { createSupertonicAdapter } from './adapters/supertonic.mjs';

import { createKokoroAdapter } from './adapters/kokoro.mjs';
import { createMMSAdapter } from './adapters/mms.mjs';
import { createKittenAdapter } from './adapters/kitten.mjs';
import { createKaleAdapter } from './adapters/kale.mjs';

import { createSanoRobotTrellisAdapter } from './adapters/sano-robot-trellis.mjs';
import { createSanoAdapter } from './adapters/sano.mjs';
import { createSupraTTSAdapter } from './adapters/supratts.mjs';

import { createInflectAdapter } from './adapters/inflect.mjs';
import { createInflectMicroV3Adapter } from './adapters/inflect-micro-v3.mjs';
import { createInflectAtomAdapter } from './adapters/inflect-atom.mjs';
import { createInflectMiniV3Adapter } from './adapters/inflect-mini-v3.mjs';
import { createSilencio2Adapter } from './adapters/silencio2.mjs';
import { createKleinAdapter } from './adapters/klein.mjs';
import { createZonos3Adapter } from './adapters/zonos3.mjs';
import { createSanoKokopopAdapter } from './adapters/sano-kokopop.mjs';
import { SANO_KOKOPOP_PROFILES } from './adapters/sano-kokopop-config.mjs';
import { createUaSerhiyAdapter } from './adapters/ua-serhiy.mjs';
import { createBengaliVoiceAdapter } from './adapters/bengali-voice.mjs';

const statusNode = document.querySelector('#status');
const state = { fixture: null, fixtureId: null, chunks: null, engine: null, model: null, backend: null, smoke: false };
const FACTORIES = {
  'sopro-v2-turbo': createSoproAdapter,
  'tiny-voca': createTinyVocaAdapter,
  'tiny-voca-de-en': createTinyVocaDeEnAdapter,
  'tiny-voca-it': createTinyVocaItAdapter,
  'tiny-voca-ja-tsukuyomi-chan': createTinyVocaJaTsukuyomiChanAdapter,
  'tiny-voca-ja-v3': createTinyVocaJaV3Adapter,
  'korean-tts': createKoreanTtsAdapter,
  'slyszeglosy-v1': createSlyszeglosyV1Adapter,
  'tiny-voca-ru': createTinyVocaRuAdapter,
  'tiny-voca-gr': createTinyVocaGrAdapter,
  'mini-voz': createMiniVozAdapter,
  'tiny-voca-es': createTinyVocaEsAdapter,
  'tiny-voca-fr': createTinyVocaFrAdapter,
  'tiny-swara': createTinySwaraAdapter,
  'tiny-voca-hindi': createTinyVocaHindiAdapter,
  'tiny-voca-ptbr': createTinyVocaPtbrAdapter,
  'tiny-voca-ptbr-kokoro': createTinyVocaPtbrKokoroAdapter,
  'tui-voice-mini-ml': createTuiVoiceMiniMlAdapter,
  'tiny-urdu': createTinyUrduAdapter,
  'tiny-broca': createTinyBrocaAdapter,
  'tiny-voca-ar-halabi': createTinyVocaArHalabiAdapter,
  'tiny-voca-ar': createTinyVocaArAdapter,
  'tiny-voca-arabic': createTinyVocaArabicAdapter,
  'tiny-voca-he': createTinyVocaHeAdapter,
  'alpa-es': createAlpaEsAdapter,
  'clarvia-tts-tiny': createClarviaTtsTinyAdapter,
  'zerre-tts': createZerreTtsAdapter,
  'vocina-it': createVocinaAdapter,
  'apptor-tiny-tts': createApptorDeAdapter,
  'apptor-tiny-tts-at': createApptorAtAdapter,
  'linnet-en-35m': createLinnetAdapter,
  'ming-3.0-tts-0.5b-fusor-mix-cpu': createMingAdapter,
  'ming-3.0-tts-0.5b-gguf': createMingGgufAdapter,
  'audio8-realistic-0.6b-int4': createAudio8Adapter,
  'fun-cosyvoice3-0.5b-2512': createCosyVoice3Adapter,
  'pocket-tts-100m-english-int8': createPocketAdapter,
  'mach-boom': createMachBoomAdapter,
  'lfm3-audio-2b-fusor-q7-cpu': () => createLiquidCpuAdapter('audio'),
  'lfm3-omni-2b-fusor-q7-cpu': () => createLiquidCpuAdapter('omni'),
  'lfm3-audio-2b-gguf': () => createLiquidGgufAdapter('audio'),
  'lfm3-omni-2b-gguf': () => createLiquidGgufAdapter('omni'),
  phonon: createPhononAdapter,
  paradee: createParadeeAdapter,
  'leokani-7m': () => createLeokaniAdapter('leokani-7m'),
  'leokani-4.5m': () => createLeokaniAdapter('leokani-4.5m'),
  'pivo-curated': createPivoAdapter,
  woof: createWoofAdapter,
  'piper-en-gb-southern-english-female-low': createPiperAdapter,
  'supertonic-3': createSupertonicAdapter,
  'kokoro-82m': createKokoroAdapter,
  'mms-english': createMMSAdapter,
  'kitten-nano-0.8': createKittenAdapter,
  'kale-tts-1-nano-int8': () => createKaleAdapter('int8'),
  'kale-tts-1-nano-fp32': () => createKaleAdapter('fp32'),
  'sano-amy': createSanoAdapter,
  'sano-robot-mcu': () => createSanoRobotTrellisAdapter('sano-robot-mcu'),
  'sano-trellis': () => createSanoRobotTrellisAdapter('sano-trellis'),
  'supratts-1.0-preview': createSupraTTSAdapter,
  'inflect-micro-v2': createInflectAdapter,
  'inflect-micro-v3': createInflectMicroV3Adapter,
  'inflect-mini-v3-browser-port': createInflectMiniV3Adapter,
  'inflect-atom-v3': createInflectAtomAdapter,
  'silencio-2': createSilencio2Adapter,
  'klein-tts-x1.5-pro': createKleinAdapter,
  'zonos3-mini': createZonos3Adapter,
  'ua-serhiy-0p58m': createUaSerhiyAdapter,
  'bengali-voice': createBengaliVoiceAdapter,
  ...Object.fromEntries(Object.entries(SANO_KOKOPOP_PROFILES).map(([id, profile]) => [id, () => createSanoKokopopAdapter(profile)])),
};
export const diagnosticFactories = Object.freeze(FACTORIES);
let fixtureRegistry = null;
const loadedFixtures = new Map();

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sameJson = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

async function getFixtureRegistry() {
  if (fixtureRegistry) return fixtureRegistry;
  const response = await fetch('/fixtures/registry.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the local benchmark fixture registry.');
  const registry = await response.json();
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.fixtures)) throw new Error('Invalid benchmark fixture registry.');
  fixtureRegistry = registry;
  return registry;
}

async function loadFixture(fixtureId = 'english-20k-v1') {
  if (loadedFixtures.has(fixtureId)) return loadedFixtures.get(fixtureId);
  const registry = await getFixtureRegistry();
  const spec = registry.fixtures.find(entry => entry.id === fixtureId);
  if (!spec) throw new Error('Unknown benchmark fixture: ' + fixtureId);
  for (const file of [spec.articleFile, spec.chunksFile, spec.metadataFile]) {
    if (typeof file !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.(?:txt|json)$/.test(file)) throw new Error('Invalid fixture path in registry.');
  }
  const [articleResponse, manifestResponse, metaResponse] = await Promise.all([
    fetch('/fixtures/' + spec.articleFile, { cache: 'no-store' }),
    fetch('/fixtures/' + spec.chunksFile, { cache: 'no-store' }),
    fetch('/fixtures/' + spec.metadataFile, { cache: 'no-store' }),
  ]);
  if (!articleResponse.ok || !manifestResponse.ok || !metaResponse.ok) throw new Error('Could not load the local fixture files for ' + fixtureId + '.');
  const bytes = new Uint8Array(await articleResponse.arrayBuffer());
  const article = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const manifest = await manifestResponse.json();
  const meta = await metaResponse.json();
  const digest = await sha256(bytes);
  const codePoints = Array.from(article).length;
  if (article.length !== spec.characters || codePoints !== spec.unicodeCodePoints || bytes.length !== spec.utf8Bytes ||
      digest !== spec.sha256 || digest !== manifest.articleSha256 || digest !== meta.sha256 ||
      meta.fixtureId !== spec.id || meta.language !== spec.language ||
      !sameJson(meta.source, spec.source) ||
      meta.javascriptStringLength !== article.length || meta.unicodeCodePoints !== codePoints ||
      meta.utf8Bytes !== bytes.length) {
    throw new Error('Fixture text length, language, byte count or SHA-256 does not match its registry and metadata.');
  }
  if (manifest.targetCharacters !== article.length || manifest.chunks.length !== spec.chunks || meta.chunkCount !== spec.chunks) {
    throw new Error('Fixture span count or declared character length does not match its registry.');
  }
  let cursor = 0;
  const chunks = [];
  for (let i = 0; i < manifest.chunks.length; i++) {
    const span = manifest.chunks[i];
    const text = article.slice(span.start, span.end);
    if (span.id !== i || span.start !== cursor || span.end <= span.start || span.characters !== text.length ||
        (span.end < article.length && /[\uD800-\uDBFF]/.test(article[span.end - 1]) && /[\uDC00-\uDFFF]/.test(article[span.end]))) {
      throw new Error('Invalid fixture chunk span at index ' + i + '.');
    }
    if (await sha256(new TextEncoder().encode(text)) !== span.sha256) throw new Error('Fixture chunk SHA-256 mismatch at index ' + i + '.');
    chunks.push({ id: span.id, start: span.start, end: span.end, text, sha256: span.sha256 });
    cursor = span.end;
  }
  if (cursor !== article.length || chunks.map(chunk => chunk.text).join('') !== article) {
    throw new Error('Fixture source chunks do not reconstruct the full article.');
  }
  const fixture = spec.id === 'english-20k-v1'
    ? { id: spec.id, sha256: digest, characters: article.length, chunks: chunks.length }
    : { id: spec.id, language: spec.language, sha256: digest, characters: article.length,
      unicodeCodePoints: codePoints, utf8Bytes: bytes.length, chunks: chunks.length, source: spec.source };
  const loaded = {
    fixture,
    chunks,
  };
  loadedFixtures.set(fixtureId, loaded);
  return loaded;
}

async function selectedFixture(smoke = false, fixtureId = 'english-20k-v1') {
  const full = await loadFixture(fixtureId);
  if (!smoke) return full;
  const selected = full.chunks.slice(0, 3);
  const text = selected.map(chunk => chunk.text).join('');
  const smokeBytes = new TextEncoder().encode(text);
  const spec = (await getFixtureRegistry()).fixtures.find(entry => entry.id === fixtureId);
  const fixture = spec.id === 'english-20k-v1'
    ? { id: spec.smokeId, language: spec.language, sha256: await sha256(smokeBytes), characters: text.length, chunks: selected.length }
    : { id: spec.smokeId, language: full.fixture.language, sha256: await sha256(smokeBytes), characters: text.length,
      unicodeCodePoints: Array.from(text).length, utf8Bytes: smokeBytes.length, chunks: selected.length, source: spec.source };
  return {
    fixture,
    chunks: selected,
  };
}

export async function fixture(smoke = false, fixtureId = 'english-20k-v1') {
  const loaded = await selectedFixture(Boolean(smoke), fixtureId);
  state.fixture = loaded.fixture;
  state.fixtureId = fixtureId;
  state.chunks = loaded.chunks;
  return { ...loaded.fixture };
}

export async function initialize({ model = 'phonon', backend = 'cpu', smoke = false, probe = false, fixtureId = 'english-20k-v1' } = {}) {
  await dispose();
  state.model = model;
  state.backend = backend;
  state.smoke = Boolean(smoke);
  state.fixtureId = fixtureId;
  const loaded = await selectedFixture(Boolean(smoke), fixtureId);
  state.fixture = loaded.fixture;
  state.chunks = loaded.chunks;
  const factory = FACTORIES[model];
  if (!factory) {
    return {
      status: 'unsupported',
      reason: 'No browser adapter is registered for ' + model + '.',
      backendEffective: 'none',
      voice: 'unknown',
      precision: 'unknown',
      settings: {},
      capability: { gpuDispatchVerified: false, description: 'No model adapter is registered.' },
    };
  }
  state.engine = await factory();
  setStatus('Loading ' + model + ' assets and initializing the local browser runtime…');
  try {
    const result = await state.engine.initialize({
      backend,
      cache: true,
      probe,
      fixtureId,
      language: loaded.fixture.language,
      sourceSha256: smoke ? undefined : loaded.fixture.sha256,
      probeText: state.chunks[0]?.text ?? 'A short browser speech check.',
      control: smoke && model === 'tiny-voca-he',
      auditTexts: ((smoke && (
        (model === 'tiny-voca-de-en' && ['de-article-v1', 'english-20k-v1'].includes(fixtureId)) ||
        (model === 'tiny-voca-it' && fixtureId === 'it-article-v1') ||
        (model === 'tiny-voca-ja-tsukuyomi-chan' && fixtureId === 'ja-article-v1') ||
        (model === 'tiny-voca-ja-v3' && ['ja-article-v1', 'english-20k-v1'].includes(fixtureId)) ||
        (model === 'clarvia-tts-tiny' && fixtureId === 'tr-article-v1') ||
        (model === 'zerre-tts' && fixtureId === 'tr-article-v1') ||
        (model === 'vocina-it' && fixtureId === 'it-article-v1') ||
        (model === 'apptor-tiny-tts' && fixtureId === 'de-article-v1') ||
        (model === 'apptor-tiny-tts-at' && fixtureId === 'de-at-article-v1') ||
        (model === 'korean-tts' && ['ko-article-v1', 'english-20k-v1'].includes(fixtureId)) ||
        (model === 'slyszeglosy-v1' && fixtureId === 'pl-article-v1') ||
        (model === 'tiny-voca-ru' && fixtureId === 'ru-article-v1') ||
        (model === 'tiny-voca-gr' && fixtureId === 'el-article-v1') ||
        (model === 'mini-voz' && fixtureId === 'es-es-article-v1') ||
        (model === 'tiny-voca-es' && fixtureId === 'es-es-article-v1') ||
        (model === 'tiny-voca-fr' && fixtureId === 'fr-article-v1') ||
        (model === 'tiny-swara' && fixtureId === 'bn-article-v1') ||
        (model === 'tiny-voca-hindi' && fixtureId === 'hi-article-v1') ||
        (model === 'tiny-voca-ptbr' && fixtureId === 'pt-br-article-v1') ||
        (model === 'tiny-voca-ptbr-kokoro' && fixtureId === 'pt-br-article-v1') ||
        (model === 'tui-voice-mini-ml' && fixtureId === 'ml-article-v1') ||
        (model === 'tiny-urdu' && fixtureId === 'ur-latn-article-v1') ||
        (model === 'tiny-broca' && fixtureId === 'pt-br-article-v1') ||
        (model === 'tiny-voca-ar-halabi' && fixtureId === 'ar-article-v1') ||
        (model === 'tiny-voca-ar' && fixtureId === 'ar-article-v1') ||
        (model === 'tiny-voca-arabic' && fixtureId === 'ar-article-v1') ||
        (model === 'tiny-voca-he' && fixtureId === 'he-article-v1') ||
        (model === 'alpa-es' && fixtureId === 'es-ar-article-v1')
      )))
        ? (model === 'tiny-voca-arabic' || model === 'tiny-voca-he'
          ? (await loadFixture(fixtureId)).chunks.slice(0, 3)
          : (await loadFixture(fixtureId)).chunks).map(({ id, text }) => ({ id, text })) : [],
    });
    if (result.status === 'unsupported') {
      await dispose();
      setStatus(result.reason);
      return result;
    }
    const language = loaded.fixture.language;
    if (language && result.settings?.language !== language) {
      throw new Error(model + ' initialized with language ' + (result.settings?.language ?? '(unspecified)') +
        ' for a fixture that requires ' + language + '.');
    }
    setStatus(model + ' is ready on ' + result.backendEffective + '.');
    return result;
  } catch (error) {
    await dispose();
    setStatus('Initialization failed: ' + String(error?.message ?? error));
    throw error;
  }
}

function joinPcm(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

export function encodeWavBase64(pcm, sampleRate) {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const putText = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  putText(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  putText(8, 'WAVE');
  putText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  putText(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

export async function generate({ index = 1, smoke = state.smoke, saveAudio = false, recordMemory = false, fixtureId = state.fixtureId ?? 'english-20k-v1' } = {}) {
  if (!state.engine) throw new Error('Initialize a model before generation.');
  if (fixtureId !== state.fixtureId) throw new Error('Generation fixture differs from the initialized fixture.');
  const loaded = await selectedFixture(Boolean(smoke), fixtureId);
  const chunks = loaded.chunks;
  state.fixture = loaded.fixture;
  state.chunks = chunks;
  const parts = [];
  const sampleCounts = [];
  const completedIds = [];
  const sampleRates = new Set();
  let firstChunkMs = null;
  let firstPcmMs = null;
  let started = 0;
  let generationStartedAtEpochMs = null;
  let finalPcmAtEpochMs = null;
  setStatus('Generating ' + loaded.fixture.characters.toLocaleString() + ' characters in ' + chunks.length + ' ordered chunks…');
  started = performance.now();
  if (recordMemory) generationStartedAtEpochMs = performance.timeOrigin + started;
  for (let i = 0; i < chunks.length; i++) {
    const response = await state.engine.generateChunk(chunks[i], {
      fixtureId,
      language: loaded.fixture.language,
      onFirstPcm: () => { firstPcmMs ??= performance.now() - started; },
    });
    const chunkParts = response.parts ?? [];
    const count = chunkParts.reduce((sum, part) => sum + part.length, 0);
    sampleCounts.push(count);
    if (response.sampleRate != null) sampleRates.add(response.sampleRate);
    for (const pcm of chunkParts) parts.push(pcm);
    if (i === 0) firstChunkMs = performance.now() - started;
    completedIds.push(response.completedChunkId);
  }
  const ended = performance.now();
  if (recordMemory) finalPcmAtEpochMs = performance.timeOrigin + ended;
  const generationMs = ended - started;
  for (let i = 0; i < chunks.length; i++) {
    if (sampleCounts[i] < 1) throw new Error('Source chunk ' + i + ' returned no PCM samples.');
    if (completedIds[i] !== chunks[i].id) throw new Error('Completed source chunk ID does not match request at index ' + i);
  }
  const pcm = joinPcm(parts);
  if (sampleRates.size !== 1) throw new Error('Generated chunks did not use one consistent sample rate.');
  const sampleRate = [...sampleRates][0];
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Engine returned an invalid sample rate.');
  let finitePcm = pcm.length > 0;
  for (let i = 0; finitePcm && i < pcm.length; i++) finitePcm = Number.isFinite(pcm[i]);
  if (!finitePcm) throw new Error('Generated PCM is empty or contains a non-finite sample.');
  const pcmSha256 = await sha256(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  let articleValidation;
  try {
    articleValidation = state.engine.validateArticle?.(pcm, sampleRate, sampleCounts);
  } catch (error) {
    if (error.waveform?.passed !== false) throw error;
    state.chunks = null;
    setStatus(error.message);
    return { failedWaveform: { reason: error.message, waveform: error.waveform, index, samples: pcm.length,
      sampleRate, pcmSha256, generationMs }, audioWavBase64: encodeWavBase64(pcm, sampleRate) };
  }
  const receipt = {
    index,
    generationMs,
    samples: pcm.length,
    sampleRate,
    pcmSha256,
    validation: { finitePcm: true, chunkCount: chunks.length, nonemptyChunks: sampleCounts.every(count => count > 0),
      ...articleValidation },
    metrics: {
      firstPcmMs,
      firstSourceChunkCompletedMs: firstChunkMs,
      audioSeconds: pcm.length / sampleRate,
      realTimeFactor: generationMs / (pcm.length / sampleRate * 1000),
      minSamplesPerChunk: Math.min(...sampleCounts),
      maxSamplesPerChunk: Math.max(...sampleCounts),
    },
  };
  if (recordMemory) receipt.memoryWindow = { generationStartedAtEpochMs, finalPcmAtEpochMs };
  if (saveAudio) receipt.audioWavBase64 = encodeWavBase64(pcm, sampleRate);
  state.chunks = null;
  setStatus('Generated ' + receipt.samples.toLocaleString() + ' samples in ' + (generationMs / 1000).toFixed(2) + ' seconds.');
  return receipt;
}

export async function dispose() {
  const engine = state.engine;
  state.engine = null;
  if (engine) await engine.dispose();
}

export async function diagnostic(options) {
  if (!state.engine?.diagnostic) throw new Error('The active adapter does not expose diagnostics.');
  return state.engine.diagnostic(options);
}
window.bench = { fixture, initialize, generate, diagnostic, dispose };
setStatus('Ready. All page code and assets are served from the local benchmark checkout.');
