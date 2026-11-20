// Benchmark integration for the pinned official SanoTTS heart browser
// runtime. Upstream GPL files are fetched into ignored cache and never copied
// into this repository.
const MODEL_REVISION = 'bc04c49fd137607b60294b3894441bbfbe5c6659';
const SOURCE_REVISION = 'c0584a51213721faba98135821faab71bae888f0';
const RUNTIME_ROOT = `/runtimes/sano-family/${SOURCE_REVISION}/web/`;
const MODEL_ROOT = `/models/sano-heart/${MODEL_REVISION}/web/voices/heart/`;
const EXPECTED_META_SHA256 = '9a19af32725f503a4237339ab91cee66c6cfc7fb9aadbef38322d1dafadd7f87';
const EXPECTED_FRONT_SHA256 = '02e8086ebedf70216efa7beae274351d7ee916579277e83161748a08325d0b49';
const EXPECTED_DEC_SHA256 = '2d685fc751bc096b956d76a9e6ad105ed6da33c61faaa43c7423d935eeb7481b';
const EXPECTED_FRONT_BYTES = 3273696;
const EXPECTED_DEC_BYTES = 5864224;
const EXPECTED_SAMPLE_RATE = 24000;
const EXPECTED_PARAMS = 2272145;
const MAX_TOKENS = 207;
const MAX_PIECE_CHARS = 120;
const MAX_SECONDS = 30;
const OUT_CAP = EXPECTED_SAMPLE_RATE * MAX_SECONDS;
const ARENA_BYTES = 16 * 1024 * 1024;
const ALLOWED_SCRIPTS = new Set(['snt_g2p.js', 'trellis_frontend.js', 'snt_nano_heart.js']);

let g2p = null;
let nano = null;
let frontend = null;
let meta = null;
let frontBytes = null;
let decoderBytes = null;
let nativeFetch = null;
let rpcHandler = null;
let textApi = null;

function localUrl(root, file) {
  const url = new URL(root + file, self.location.origin);
  if (url.origin !== self.location.origin) throw new Error(`Sano heart attempted a non-local asset URL: ${url.href}`);
  return url.href;
}

function installLocalFetch() {
  nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requestUrl, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Sano heart attempted a non-local fetch: ${url.href}`);
    return nativeFetch(input, init);
  };
}

function restoreFetch() {
  if (nativeFetch) globalThis.fetch = nativeFetch;
  nativeFetch = null;
}

function importPinnedScript(filename) {
  if (!ALLOWED_SCRIPTS.has(filename)) throw new Error(`Sano heart rejected an unpinned runtime script: ${filename}`);
  importScripts(localUrl(RUNTIME_ROOT, filename));
}

async function readPinnedAsset(url, expectedBytes, expectedSha256, label) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Sano heart could not load ${label}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expectedBytes) throw new Error(`${label} length mismatch: expected ${expectedBytes}, received ${bytes.byteLength}.`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (sha256 !== expectedSha256) throw new Error(`${label} SHA-256 mismatch: expected ${expectedSha256}, received ${sha256}.`);
  return bytes;
}

async function loadMetaAndWeights() {
  const metaBytes = await readPinnedAsset(localUrl(MODEL_ROOT, 'meta.json'), 1186, EXPECTED_META_SHA256, 'heart metadata');
  meta = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metaBytes));
  if (meta.key !== 'heart' || meta.runtime !== 'snt_nano' || meta.lineage !== 'en_us_r227f32' ||
      meta.module !== 'snt_nano_heart.js' || meta.export_name !== 'SaanoNanoHeart' ||
      meta.weights !== 'f32' || meta.front !== 'front_f32.bin' || meta.dec !== 'model_f32.bin' ||
      meta.front_bytes !== EXPECTED_FRONT_BYTES || meta.dec_bytes !== EXPECTED_DEC_BYTES ||
      meta.sample_rate !== EXPECTED_SAMPLE_RATE || meta.vocab_size !== 62 || meta.params !== EXPECTED_PARAMS ||
      meta.param_breakdown?.duration + meta.param_breakdown?.acoustic + meta.param_breakdown?.decoder !== EXPECTED_PARAMS) {
    throw new Error('Pinned heart metadata differs from the registered FP32 English checkpoint contract.');
  }
  [frontBytes, decoderBytes] = await Promise.all([
    readPinnedAsset(localUrl(MODEL_ROOT, meta.front), EXPECTED_FRONT_BYTES, EXPECTED_FRONT_SHA256, 'heart front weights'),
    readPinnedAsset(localUrl(MODEL_ROOT, meta.dec), EXPECTED_DEC_BYTES, EXPECTED_DEC_SHA256, 'heart decoder weights'),
  ]);
}

async function initializeRuntime() {
  const previousHandler = self.onmessage;
  try {
    installLocalFetch();
    importPinnedScript('snt_g2p.js');
    importPinnedScript('trellis_frontend.js');
    importPinnedScript('snt_nano_heart.js');
    if (typeof globalThis.SaanoG2P !== 'function' || typeof globalThis.SaanoNanoHeart !== 'function' ||
        typeof globalThis.SaanoTrellisFrontend?.createFrontend !== 'function') {
      throw new Error('Pinned SanoTTS runtime did not expose its expected G2P, frontend and heart factories.');
    }
    g2p = await globalThis.SaanoG2P({ locateFile: filename => localUrl(RUNTIME_ROOT, filename) });
    if (typeof g2p._snt_g2p_init !== 'function' || g2p._snt_g2p_init() !== 0) {
      throw new Error('Pinned Sano eSpeak G2P runtime failed its explicit initialization check.');
    }
    frontend = globalThis.SaanoTrellisFrontend.createFrontend({ module: g2p });
    if (frontend.maxTokens !== MAX_TOKENS) throw new Error(`Sano heart frontend token limit is ${frontend.maxTokens}, expected ${MAX_TOKENS}.`);
    nano = await globalThis.SaanoNanoHeart({ locateFile: filename => localUrl(RUNTIME_ROOT, filename) });
    if (typeof nano._snt_nano_wasm_synthesize !== 'function' || typeof nano._snt_nano_wasm_seed_from_text !== 'function') {
      throw new Error('Pinned heart WASM is missing required synthesis exports.');
    }
    if (nano._snt_nano_wasm_weight_format() !== 1) throw new Error('Pinned heart runtime is not the official FP32 weight build.');
    if (nano._snt_nano_wasm_sample_rate() !== EXPECTED_SAMPLE_RATE) throw new Error('Pinned heart runtime sample rate is not 24 kHz.');
  } finally {
    // Emscripten's G2P loader may install a worker message handler in worker
    // environments; preserve the benchmark RPC channel after initialization.
    self.onmessage = previousHandler;
  }
}

function nonWhitespace(text) {
  return textApi.nonWhitespace(text);
}

function tokenizePiece(text) {
  const result = frontend.textToIds(text);
  if (!Array.isArray(result.ids) || result.ids.length < 3 || result.ids.length > MAX_TOKENS) {
    throw new Error(`Sano heart produced ${result.ids?.length ?? 'no'} IDs; expected 3..${MAX_TOKENS} including BOS/EOS.`);
  }
  const dropped = String(result.dropped ?? '');
  const unsupported = Array.from(dropped).filter(char => !/\s/u.test(char));
  if (unsupported.length) {
    const chars = [...new Set(unsupported)].map(char => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ');
    throw new Error(`Sano heart frontend dropped ${unsupported.length} non-whitespace IPA/text characters: ${chars}.`);
  }
  return { ids: result.ids, dropped };
}

function auditArticle(chunks) {
  if (!Array.isArray(chunks) || chunks.length !== 93) throw new Error('Sano heart requires the complete 93-span canonical fixture for frontend preflight.');
  let piecesCount = 0;
  let maxPieceChars = 0;
  let maxTokens = 0;
  let droppedWhitespaceCharacters = 0;
  const droppedWhitespaceCodepoints = new Set();
  let sourceCharacters = 0;
  let sourceNonWhitespaceCharacters = 0;
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    if (chunk.id !== index || typeof chunk.text !== 'string' || !chunk.text.length) throw new Error(`Invalid canonical Sano source span at ${index}.`);
    const pieces = textApi.splitChunks(chunk.text);
    textApi.assertCoverage(chunk.text, pieces);
    for (const text of pieces) {
      if (!text || text.length > MAX_PIECE_CHARS) throw new Error(`Sano heart split emitted a ${text.length}-character piece; maximum is ${MAX_PIECE_CHARS}.`);
      const tokenized = tokenizePiece(text);
      piecesCount++;
      maxPieceChars = Math.max(maxPieceChars, text.length);
      maxTokens = Math.max(maxTokens, tokenized.ids.length);
      droppedWhitespaceCharacters += Array.from(tokenized.dropped).length;
      for (const char of tokenized.dropped) droppedWhitespaceCodepoints.add(char.codePointAt(0));
      sourceCharacters += text.length;
      sourceNonWhitespaceCharacters += Array.from(nonWhitespace(text)).length;
    }
  }
  return {
    canonicalSpans: chunks.length,
    synthesizedPieces: piecesCount,
    maxPieceCharacters: maxPieceChars,
    maxPhonemeTokensIncludingBosEos: maxTokens,
    droppedWhitespaceCharacters,
    distinctDroppedWhitespaceCodepoints: Array.from(droppedWhitespaceCodepoints).sort((a, b) => a - b).map(codepoint => `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`),
    droppedNonWhitespaceCharacters: 0,
    sourceCharactersInSynthesisPieces: sourceCharacters,
    sourceNonWhitespaceCharactersInSynthesisPieces: sourceNonWhitespaceCharacters,
    tokenLimit: MAX_TOKENS,
    policy: 'Pinned official web/index.html sentence and clause split; max 120 characters; canonical span IDs remain unchanged.',
  };
}

function copyToHeap(bytes) {
  const pointer = nano._malloc(bytes.byteLength);
  if (!pointer) throw new Error('Sano heart WASM could not allocate weight/input memory.');
  nano.HEAPU8.set(bytes, pointer);
  return pointer;
}

function validatePcmShape(samples, label) {
  if (!(samples instanceof Float32Array) || samples.length === 0) throw new Error(`Sano heart ${label} returned empty or non-Float32 PCM.`);
  return samples;
}

function validateProbePcm(samples) {
  validatePcmShape(samples, 'probe');
  for (let i = 0; i < samples.length; i++) if (!Number.isFinite(samples[i])) throw new Error(`Sano heart probe returned non-finite PCM at sample ${i}.`);
}

function synthesizePiece(text, ids) {
  if (!nano || !frontBytes || !decoderBytes) throw new Error('Sano heart has not been initialized.');
  const ids32 = Int32Array.from(ids);
  let textPtr = 0;
  let seedPtr = 0;
  let frontPtr = 0;
  let decoderPtr = 0;
  let idsPtr = 0;
  let arenaPtr = 0;
  let outPtr = 0;
  try {
    const textBytes = nano.lengthBytesUTF8(text) + 1;
    textPtr = nano._malloc(textBytes);
    seedPtr = nano._malloc(8);
    if (!textPtr || !seedPtr) throw new Error('Sano heart WASM could not allocate seed memory.');
    nano.stringToUTF8(text, textPtr, textBytes);
    if (nano._snt_nano_wasm_seed_from_text(textPtr, seedPtr) !== 0) throw new Error('Sano heart seed derivation failed.');
    const seedLo = nano.HEAPU32[seedPtr >> 2];
    const seedHi = nano.HEAPU32[(seedPtr >> 2) + 1];
    frontPtr = copyToHeap(frontBytes);
    decoderPtr = copyToHeap(decoderBytes);
    idsPtr = copyToHeap(new Uint8Array(ids32.buffer, ids32.byteOffset, ids32.byteLength));
    arenaPtr = nano._malloc(ARENA_BYTES);
    outPtr = nano._malloc(OUT_CAP * 4);
    if (!arenaPtr || !outPtr) throw new Error('Sano heart WASM could not allocate its 16 MiB arena or 30-second output buffer.');
    const samplesWritten = nano._snt_nano_wasm_synthesize(
      frontPtr, decoderPtr, idsPtr, ids32.length, 0, seedLo, seedHi,
      arenaPtr, ARENA_BYTES, outPtr, OUT_CAP,
    );
    if (samplesWritten < 0) {
      const nativeCode = nano._snt_nano_wasm_last_rc?.() ?? 'unavailable';
      throw new Error(`Sano heart synthesis failed with WASM code ${samplesWritten} (native code ${nativeCode}).`);
    }
    if (samplesWritten === 0 || samplesWritten >= OUT_CAP) throw new Error('Sano heart returned empty or potentially cap-clipped PCM.');
    const frames = nano._snt_nano_wasm_last_frames?.() ?? 0;
    if (!Number.isInteger(frames) || frames < 1) throw new Error('Sano heart returned no valid generated frame count.');
    const samples = new Float32Array(samplesWritten);
    samples.set(nano.HEAPF32.subarray(outPtr >> 2, (outPtr >> 2) + samplesWritten));
    return validatePcmShape(samples, 'piece');
  } finally {
    for (const pointer of [textPtr, seedPtr, frontPtr, decoderPtr, idsPtr, arenaPtr, outPtr]) if (pointer) nano._free(pointer);
  }
}

function baseInfo() {
  return {
    voice: 'SanoTTS heart (English, US)',
    precision: 'Official heart FP32 front and decoder weights with the matching FP32 snt_nano WebAssembly build',
    settings: {
      runtime: 'Official Ampixa SanoTTS snt_nano WebAssembly',
      runtimeSourceRevision: SOURCE_REVISION,
      modelRevision: MODEL_REVISION,
      voiceKey: 'heart',
      lineage: 'en_us_r227f32',
      language: 'en-us',
      sampleRate: EXPECTED_SAMPLE_RATE,
      parameterCount: EXPECTED_PARAMS,
      splitPolicy: 'Official web/index.html splitChunks; sentence and clause pieces up to 120 characters; 93 canonical source IDs preserved.',
      firstPcm: 'First completed, nonempty sentence/clause piece is transferred to the page immediately; the official WASM API returns a whole piece before any audio is available.',
      frontend: 'Pinned SaanoTrellisFrontend + espeak-ng WASM en-us; max 207 phoneme tokens including BOS/EOS; non-whitespace dropped symbols fail closed.',
      deterministicSeed: 'Official snt_nano SHA-256(text)[:8] seed, independently derived for each sentence/clause piece.',
      outputCapSecondsPerPiece: MAX_SECONDS,
      arenaBytes: ARENA_BYTES,
      wasmInitialMemoryBytes: 128 * 1024 * 1024,
      executionProviders: ['wasm'],
      preprocessing: 'Text split, eSpeak G2P, Trellis normalization/tokenization and host-side PCM transfer run on CPU.',
      runtimeAndModelLicenses: 'GPL-3.0 model and GPL-3.0-or-later official browser files; acknowledgment required.',
    },
  };
}

async function initialize({ backend, probe = false, probeText = 'Hello.' } = {}) {
  if (backend !== 'cpu') {
    const reason = 'The pinned official SanoTTS heart browser path is CPU WebAssembly; it does not implement WebGPU dispatch.';
    return { ...baseInfo(), status: 'unsupported', reason, backendEffective: 'none', capability: { gpuDispatchVerified: false, description: reason } };
  }
  try {
    const runtimeHandler = self.onmessage;
    await initializeRuntime();
    await loadMetaAndWeights();
    // Keep the benchmark RPC channel installed after Emscripten startup.
    self.onmessage = runtimeHandler;
    textApi = globalThis.SanoHeartNanoText;
    if (!textApi || typeof textApi.splitChunks !== 'function') throw new Error('Sano heart split helper was not loaded.');
    if (probe) {
      const probePieces = textApi.splitChunks(probeText);
      textApi.assertCoverage(probeText, probePieces);
      const first = tokenizePiece(probePieces[0]);
      const pcm = synthesizePiece(probePieces[0], first.ids);
      if (!pcm.length || pcm.length >= OUT_CAP) throw new Error('Sano heart untimed capability probe returned invalid or cap-sized PCM.');
      validateProbePcm(pcm);
    }
    return {
      ...baseInfo(),
      status: 'measured',
      backendEffective: 'cpu/wasm',
      capability: {
        gpuDispatchVerified: null,
        description: probe
          ? 'Pinned official Sano heart FP32 WASM completed an untimed neural synthesis piece in a headed Chrome worker; no GPU execution.'
          : 'Pinned official Sano heart FP32 WASM initialized in a headed Chrome worker; no GPU execution.',
      },
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}

async function generate(chunk) {
  if (!frontend || !nano || !chunk || !Number.isInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.length) {
    throw new Error('Sano heart received an invalid source span or is not initialized.');
  }
  const pieces = textApi.splitChunks(chunk.text);
  textApi.assertCoverage(chunk.text, pieces);
  const parts = [];
  let firstPieceTransferred = false;
  for (let index = 0; index < pieces.length; index++) {
    const text = pieces[index];
    if (!text || text.length > MAX_PIECE_CHARS) throw new Error(`Sano heart split emitted invalid ${text.length}-character piece.`);
    const { ids } = tokenizePiece(text);
    const pcm = synthesizePiece(text, ids);
    if (index === 0) {
      // Transfer the first completed speech piece before later pieces start.
      // The adapter reattaches it to the complete canonical-span response.
      self.postMessage({ id: currentRequestId, event: 'first-pcm', sampleRate: EXPECTED_SAMPLE_RATE, samples: pcm }, [pcm.buffer]);
      firstPieceTransferred = true;
    } else parts.push(pcm);
  }
  if (!firstPieceTransferred) throw new Error(`Sano heart source span ${chunk.id} completed without a generated piece.`);
  return { parts, sampleRate: EXPECTED_SAMPLE_RATE, completedChunkId: chunk.id };
}

async function dispose() {
  g2p = null;
  nano = null;
  frontend = null;
  meta = null;
  frontBytes = null;
  decoderBytes = null;
  textApi = null;
  restoreFetch();
}

let currentRequestId = null;
rpcHandler = async ({ data }) => {
  currentRequestId = data.id;
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await generate(data.chunk);
    else if (data.action === 'audit') {
      await initializeRuntime();
      textApi = globalThis.SanoHeartNanoText;
      if (!textApi) throw new Error('Sano heart split helper was not loaded.');
      value = auditArticle(data.chunks);
      await dispose();
    }
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Sano heart worker action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  } finally {
    currentRequestId = null;
    self.onmessage = rpcHandler;
  }
};

importScripts(new URL('../sano/heart-nano-text.js', self.location.href).href);
self.onmessage = rpcHandler;
