import { fetchModelAsset } from '../cache-model-asset.mjs';
import { TINY_VOCA_HINDI as profile } from '../adapters/tiny-voca-hindi-profile.mjs';

const modelRoot = `/models/${profile.id}/${profile.modelRevision}/${profile.sourceRevision}/`;
const normalizerPath = 'web/hindi_norm.js';
const modelPath = '/tmp/tiny-voca-hindi.gguf';
let engine = null;
let activeFixture = null;
let activeLanguage = null;
let activeBackend = null;
let assetCacheStats = { verifiedBytes: 0, assets: 0 };

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function assetUrl(relative) {
  const url = relative.startsWith('runtimes/')
    ? new URL('/' + relative, self.location.origin)
    : new URL(modelRoot + relative, self.location.origin);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
    throw new Error('Tiny Voca Hindi assets must use the same-origin pinned model tree');
  }
  return url;
}

async function checkedAsset(relative) {
  const spec = profile.assets[relative];
  if (!spec) throw new Error('Tiny Voca Hindi asset is not hash-locked: ' + relative);
  const response = await fetchModelAsset(assetUrl(relative), profile.sourceRevision, { bufferBeforeCache: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec.bytes || await sha256(bytes) !== spec.sha256) {
    throw new Error('Tiny Voca Hindi asset size or SHA-256 mismatch: ' + relative);
  }
  assetCacheStats.verifiedBytes += bytes.byteLength;
  assetCacheStats.assets++;
  return bytes;
}

async function loadNormalizer() {
  await import(assetUrl(normalizerPath).href);
  if (typeof globalThis.normalizeHi !== 'function') throw new Error('Pinned Hindi normalizer did not expose globalThis.normalizeHi');
}

function normalizeText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Tiny Voca Hindi requires nonempty source text');
  const normalized = globalThis.normalizeHi(text, { english: true }).replace(/।/g, '.');
  if (typeof normalized !== 'string' || !normalized.trim()) throw new Error('Tiny Voca Hindi normalizer returned no speech text');
  return normalized;
}

function unsupported(reason) {
  return {
    status: 'unsupported', reason, backendEffective: 'none', voice: profile.defaultVoice,
    precision: profile.precision,
    settings: { language: profile.language, locale: profile.locale, supportedLanguages: [profile.language] },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

async function auditFixture(auditTexts) {
  if (!Array.isArray(auditTexts) || auditTexts.length !== profile.fixtureOracle.spans) {
    throw new Error(`Tiny Voca Hindi normalization audit requires all ${profile.fixtureOracle.spans} ordered fixture spans`);
  }
  let maxNormalizedCharacters = 0;
  const normalizedRows = [];
  for (let id = 0; id < auditTexts.length; id++) {
    const item = auditTexts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`Invalid or reordered Tiny Voca Hindi fixture span ${id}`);
    }
    const normalized = normalizeText(item.text);
    if (!/[\u0900-\u097F]/u.test(normalized) || /[A-Za-z0-9]/u.test(normalized)) {
      throw new Error(`Tiny Voca Hindi fixture span ${id} is not fully normalized as Devanagari text`);
    }
    maxNormalizedCharacters = Math.max(maxNormalizedCharacters, [...normalized].length);
    normalizedRows.push([id, normalized]);
  }
  return {
    fixtureId: profile.fixtureId,
    fixtureSha256: profile.fixtureSha256,
    status: 'normalization-covered',
    spans: normalizedRows.length,
    maxNormalizedCharacters,
    normalizedTextSha256: await sha256(new TextEncoder().encode(JSON.stringify(normalizedRows))),
    note: 'This checks pinned text normalization coverage only; C++ G2P phone parity is not exposed by the released engine ABI.',
  };
}

async function initialize(options = {}) {
  if (options.modelConfig?.id !== profile.id || options.modelConfig?.modelRevision !== profile.modelRevision ||
      options.modelConfig?.sourceRevision !== profile.sourceRevision) {
    throw new Error('Exact pinned Tiny Voca Hindi profile required');
  }
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language) {
    return unsupported('Tiny Voca Hindi supports only hi-article-v1 in Hindi (hi).');
  }
  if (options.backend !== 'cpu') return unsupported('Tiny Voca Hindi has no verified WebGPU runtime; select CPU.');

  activeFixture = options.fixtureId;
  activeLanguage = profile.language;
  activeBackend = 'cpu';

  const [modelBytes, wasmBytes, glueBytes] = await Promise.all([
    checkedAsset('tts_hi_q8_0.gguf'),
    checkedAsset('runtimes/tiny-voca-hindi/ggml-0.29.0/benchmark-hindi.wasm'),
    checkedAsset('runtimes/tiny-voca-hindi/ggml-0.29.0/benchmark-hindi.mjs'),
  ]);
  await checkedAsset(normalizerPath);
  // Blob module imports are blocked by the benchmark server's strict script-src.
  // These loopback assets are imported only after their immutable files have
  // been checked against the independently verified build hashes.
  await loadNormalizer();

  const runtimeUrl = assetUrl('runtimes/tiny-voca-hindi/ggml-0.29.0/benchmark-hindi.mjs');
  const { default: createModule } = await import(runtimeUrl.href);
  if (typeof createModule !== 'function') throw new Error('Pinned Tiny Voca Hindi Emscripten factory is unavailable');
  engine = await createModule({
    wasmBinary: wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength),
    locateFile(path) {
      if (path !== 'benchmark-hindi.wasm') throw new Error('Unexpected Tiny Voca Hindi runtime dependency: ' + path);
      return assetUrl('runtimes/tiny-voca-hindi/ggml-0.29.0/benchmark-hindi.wasm').href;
    },
  });
  if (typeof engine.ccall !== 'function' || !engine.FS?.writeFile || !engine.FS?.unlink || !engine.HEAPF32) {
    throw new Error('Tiny Voca Hindi Emscripten ABI is incomplete');
  }

  engine.FS.writeFile(modelPath, modelBytes);
  let sampleRate = 0;
  try {
    sampleRate = engine.ccall('hindi_load', 'number', ['string'], [modelPath]);
    if (sampleRate !== profile.sampleRate) {
      const detail = engine.ccall('hindi_error', 'string', [], []);
      throw new Error(`Tiny Voca Hindi model load failed (${sampleRate} Hz): ${detail || 'unexpected sample rate'}`);
    }
  } finally {
    engine.FS.unlink(modelPath);
  }

  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : undefined;
  return {
    status: 'measured',
    backendEffective: 'cpu/wasm',
    voice: profile.defaultVoice,
    precision: profile.precision,
    settings: {
      modelId: profile.modelId,
      modelRevision: profile.modelRevision,
      sourceRevision: profile.sourceRevision,
      fixtureId: profile.fixtureId,
      fixtureSha256: profile.fixtureSha256,
      language: profile.language,
      locale: profile.locale,
      supportedLanguages: [profile.language],
      voice: profile.defaultVoice,
      voiceIndex: profile.defaultVoiceIndex,
      style: profile.defaultStyle,
      styleIndex: profile.defaultStyleIndex,
      availableStyles: profile.styles,
      speed: profile.speed,
      pitchLimiter: profile.pitchLimiter,
      seed: profile.seedMode,
      threads: profile.threads,
      sampleRate: profile.sampleRate,
      parameterCount: profile.parameterCount,
      precision: profile.precision,
      frontend: profile.frontend,
      frontendSha256: profile.frontendSha256,
      engine: 'ggml v0.29.0 Emscripten/WebAssembly; one CPU thread',
      engineRevision: profile.engineRevision,
      executionProviders: ['wasm'],
      wasmThreads: profile.threads,
      normalization: 'normalizeHi(text, { english: true }).replace(/।/g, ".")',
      fixtureFrontendCoverage: profile.fixtureOracle,
      waveform: 'Stock Tiny Voca Hindi source-filter output; one complete source span per model call; no inserted sentence gap; upstream 0.99 peak limit.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    assetCache: { enabled: true, ...assetCacheStats },
    capability: { gpuDispatchVerified: false, description: 'CPU/WASM only; no GPU provider is available in the pinned runtime.' },
  };
}

async function generate(chunk, onFirstPcm) {
  if (!engine || activeFixture !== profile.fixtureId || activeLanguage !== profile.language || activeBackend !== 'cpu') {
    throw new Error('Tiny Voca Hindi adapter is not initialized');
  }
  if (!chunk || !Number.isSafeInteger(chunk.id) || !Number.isSafeInteger(chunk.start) ||
      !Number.isSafeInteger(chunk.end) || typeof chunk.text !== 'string' ||
      chunk.end - chunk.start !== chunk.text.length) {
    throw new Error('Tiny Voca Hindi requires an exact canonical source span');
  }
  const normalized = normalizeText(chunk.text);
  const count = engine.ccall('hindi_speak', 'number', ['string'], [normalized]);
  if (!Number.isSafeInteger(count) || count < 1) {
    const detail = engine.ccall('hindi_error', 'string', [], []);
    throw new Error('Tiny Voca Hindi synthesis failed: ' + (detail || 'engine returned no PCM'));
  }
  const pointer = engine.ccall('hindi_pcm', 'number', [], []);
  if (!Number.isSafeInteger(pointer) || pointer < 0 || pointer % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error('Tiny Voca Hindi returned an invalid PCM pointer');
  }
  const start = pointer / Float32Array.BYTES_PER_ELEMENT;
  const end = start + count;
  if (end > engine.HEAPF32.length) throw new Error('Tiny Voca Hindi PCM view exceeds WebAssembly memory');
  const pcm = Float32Array.from(engine.HEAPF32.subarray(start, end));
  let peak = 0;
  for (const sample of pcm) {
    if (!Number.isFinite(sample)) throw new Error('Tiny Voca Hindi returned non-finite PCM');
    peak = Math.max(peak, Math.abs(sample));
  }
  if (!pcm.length || peak === 0) throw new Error('Tiny Voca Hindi returned empty or silent PCM');
  onFirstPcm?.();
  return { parts: [pcm], sampleRate: profile.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  engine = null;
  activeFixture = activeLanguage = activeBackend = null;
  assetCacheStats = { verifiedBytes: 0, assets: 0 };
}

self.onmessage = async ({ data: { id, action, options, chunk } }) => {
  try {
    let value;
    switch (action) {
      case 'initialize': value = await initialize(options); break;
      case 'generate': value = await generate(chunk, () => self.postMessage({ id, event: 'first-pcm' })); break;
      case 'diagnostic':
        if (options?.auditTexts) value = await auditFixture(options.auditTexts);
        else throw new Error('Unknown Tiny Voca Hindi diagnostic');
        break;
      case 'dispose': await dispose(); value = null; break;
      default: throw new Error('Unknown Tiny Voca Hindi action');
    }
    self.postMessage({ id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    if (action === 'initialize') {
      try { await dispose(); } catch {}
    }
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
};
