// Benchmark wrapper for the unchanged official Ampixa Robot and Trellis WASM.
const REVISION = 'c0584a51213721faba98135821faab71bae888f0';
const RUNTIME_ROOT = `/runtimes/sano-family/${REVISION}/web/`;
const CONFIGS = {
  'sano-robot-mcu': {
    name: 'SanoTTS Robot MCU', voice: 'mcu', rate: 22050, parameters: 567008,
    script: 'snt_tts.js', factory: 'SaanoTTS', precision: 'Official Robot INT8 front and decoder weights',
    files: [
      ['front_q8.bin', 280288, '921b1aea12a3c982ed0aacac2c3c13f2f627797f24203b6bd542c70a7a8964a8'],
      ['model_q8.bin', 399544, 'e81c2c35572c58b9e94c218866d04acacb316441875ce82cea68bf87c58a7417'],
    ],
  },
  'sano-trellis': {
    name: 'SanoTTS Trellis experimental', voice: 'trellis', rate: 24000, parameters: 995058,
    script: 'snt_trellis.js', factory: 'SaanoTrellis', precision: 'Official Trellis FP32 bundle',
    files: [['bundle.bin', 3982096, '1d102317e1427bfa72171739bed5c7322ee16a18f942d854cd74346d2210689d']],
  },
};
const ARENA_BYTES = 2 * 1024 * 1024;
const ROBOT_OUT_CAP = 400000;
const ROBOT_ID_CAP = 1024;
let config, modelId, g2p, runtime, frontend, weights, nativeFetch, requestId;
const robotCodepoints = () => new Set(self.SanoRobotPhonemeCodepoints);
const allowedScripts = new Set(['snt_g2p.js', 'trellis_frontend.js', 'snt_tts.js', 'snt_trellis.js']);
const textApi = () => self.SanoRobotTrellisText;
function localUrl(root, file) {
  const url = new URL(root + file, self.location.origin);
  if (url.origin !== self.location.origin) throw new Error('Sano assets must be same-origin.');
  return url.href;
}
function importPinned(file) {
  if (!allowedScripts.has(file)) throw new Error('Unregistered Sano script.');
  importScripts(localUrl(RUNTIME_ROOT, file));
}
function malloc(module, size) {
  const p = module._malloc(size);
  if (!p) throw new Error('Sano WASM allocation failed.');
  return p;
}
function copy(module, bytes) {
  const p = malloc(module, bytes.byteLength);
  module.HEAPU8.set(bytes, p);
  return p;
}
async function asset([file, size, sha]) {
  const root = `/models/${modelId}/${REVISION}/web/voices/${config.voice}/`;
  const response = await fetch(localUrl(root, file), { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Sano asset HTTP ${response.status}: ${file}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  if (bytes.length !== size || digest !== sha) throw new Error(`Sano weight integrity failure: ${file}`);
  return bytes;
}
function info() {
  return {
    voice: `${config.name} (English, US)`, precision: config.precision,
    settings: {
      runtime: `Official Ampixa ${config.factory} WebAssembly`, runtimeSourceRevision: REVISION,
      modelRevision: REVISION, voiceKey: config.voice, language: 'en-us', sampleRate: config.rate,
      parameterCount: config.parameters, executionProviders: ['wasm'], threads: 1,
      splitPolicy: 'Official demo sentence/clause splitting, max 120 characters; all 93 canonical span IDs preserved.',
      firstPcm: 'First whole synthesized piece transferred immediately, before subsequent pieces; not an internal neural streaming callback.',
      frontend: config.voice === 'mcu'
        ? 'Official eSpeak en-us/Kristin slot0 IDs; 1024 capacity, BOS/EOS required. Complete-fixture raw-IPA vocabulary audit runs separately before scoring; timed calls invoke official text_to_ids once.'
        : 'Official SaanoTrellisFrontend + eSpeak en-us; 207-token limit; non-whitespace dropped phonemes rejected.',
      deterministicSeed: config.voice === 'mcu' ? 'Official deterministic MCU runtime; no external RNG seed override.' : 'Official seed_key=NULL: deterministic JSON of phoneme IDs per piece.',
      nativeAllocationPolicy: 'Official demo per-piece heap allocation/copy/free; weights retained as JS bytes between pieces.',
      outputLimit: config.voice === 'mcu' ? '400000 samples per piece; native error/cap-sized output rejected.' : 'Native handle output and metadata validated; waveform-only keep=0.',
      preprocessing: 'Text splitting, G2P, ID boundary checks, model inference and PCM transfer run on CPU inside scored calls; duplicate Robot raw-IPA audit is untimed.',
    },
  };
}
async function initialize(options = {}, auditOnly = false) {
  modelId = options.modelId;
  config = CONFIGS[modelId];
  if (!config) throw new Error('Unknown Robot/Trellis model ID.');
  if (options.backend !== 'cpu') return { ...info(), status: 'unsupported', backendEffective: 'none', reason: 'Pinned official runtime has CPU WebAssembly only; no WebGPU kernels or dispatch.', capability: { gpuDispatchVerified: false, description: 'No official WebGPU path.' } };
  const handler = self.onmessage;
  try {
    nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, self.location.href);
      if (url.origin !== self.location.origin) throw new Error('Sano external fetch rejected.');
      return nativeFetch(input, init);
    };
    importPinned('snt_g2p.js');
    g2p = await self.SaanoG2P({ locateFile: file => localUrl(RUNTIME_ROOT, file) });
    if (g2p._snt_g2p_init() !== 0) throw new Error('Sano G2P initialization failed.');
    if (config.voice === 'trellis') {
      importPinned('trellis_frontend.js');
      frontend = self.SaanoTrellisFrontend.createFrontend({ module: g2p });
      if (frontend.maxTokens !== 207) throw new Error('Unexpected Trellis token contract.');
    } else {
      if (g2p.cwrap('snt_g2p_set_voice', 'number', ['string', 'number'])('en-us', 0) !== 0) throw new Error('Robot G2P voice initialization failed.');
    }
    if (!auditOnly) {
      importPinned(config.script);
      runtime = await self[config.factory]({ locateFile: file => localUrl(RUNTIME_ROOT, file) });
      weights = await Promise.all(config.files.map(asset));
      if (options.probe) {
        const piece = textApi().splitChunks(options.probeText || 'Hello.')[0];
        const pcm = synthesize(tokenize(piece).ids);
        if (!pcm.every(Number.isFinite)) throw new Error('Sano untimed probe has nonfinite PCM.');
      }
    }
    return { ...info(), status: 'measured', backendEffective: 'cpu/wasm', capability: { gpuDispatchVerified: null, description: options.probe ? 'Official CPU WASM completed an untimed speech piece.' : 'Official CPU WASM initialized; no GPU execution.' } };
  } finally { self.onmessage = handler; }
}
function tokenize(text, auditPhones = false) {
  if (config.voice === 'trellis') {
    const result = frontend.textToIds(text);
    if (!Array.isArray(result.ids) || result.ids.length < 3 || result.ids.length > 207 || result.ids[0] !== 1 || result.ids.at(-1) !== 2) throw new Error('Invalid Trellis BOS/EOS or token count.');
    if (/\S/u.test(result.dropped || '')) throw new Error(`Trellis dropped unsupported phones: ${result.dropped}`);
    return { ids: result.ids, dropped: result.dropped || '' };
  }
  let tp = 0, op = 0, ipa = 0;
  try {
    const size = g2p.lengthBytesUTF8(text) + 1;
    tp = malloc(g2p, size); op = malloc(g2p, ROBOT_ID_CAP * 4);
    g2p.stringToUTF8(text, tp, size);
    if (auditPhones) {
      ipa = malloc(g2p, 16384);
      const rawCount = g2p._snt_g2p_text_to_ipa(tp, ipa, 16384);
      if (rawCount <= 0 || rawCount >= 16383) throw new Error('Robot raw IPA validation overflow/failure.');
      const raw = g2p.UTF8ToString(ipa);
      // The raw API adds U+0361 ties; the ID API does not. Both strip language tags.
      const phones = raw.replace(/\([^)]*\)/g, '').replace(/\u0361/g, '');
      const allowed = robotCodepoints();
      for (const ch of phones) if (!/\s/u.test(ch) && !allowed.has(ch.codePointAt(0))) throw new Error(`Robot would drop phoneme U+${ch.codePointAt(0).toString(16)}.`);
    }
    const count = g2p._snt_g2p_text_to_ids(tp, op, ROBOT_ID_CAP);
    if (count < 3 || count >= ROBOT_ID_CAP - 1) throw new Error('Robot G2P empty or potentially truncated.');
    const ids = Array.from(g2p.HEAP32.subarray(op >> 2, (op >> 2) + count));
    if (ids[0] !== 1 || ids[1] !== 0 || ids.at(-1) !== 2) throw new Error('Robot missing BOS/pad/EOS.');
    return { ids, dropped: '' };
  } finally { for (const p of [tp, op, ipa]) if (p) g2p._free(p); }
}
function synthesize(ids) {
  const allocated = []; let handle = 0;
  const allocate = size => { const p = malloc(runtime, size); allocated.push(p); return p; };
  const put = bytes => { const p = allocate(bytes.byteLength); runtime.HEAPU8.set(bytes, p); return p; };
  try {
    const ids32 = Int32Array.from(ids), idsPtr = put(new Uint8Array(ids32.buffer));
    let count, pointer;
    if (config.voice === 'mcu') {
      const front = put(weights[0]), decoder = put(weights[1]);
      const arena = allocate(ARENA_BYTES), out = allocate(ROBOT_OUT_CAP * 4);
      count = runtime._snt_web_synthesize(front, decoder, idsPtr, ids.length, 0, arena, ARENA_BYTES, out, ROBOT_OUT_CAP);
      if (!Number.isInteger(count) || count <= 0 || count >= ROBOT_OUT_CAP) throw new Error(`Robot native error or output cap: ${count}`);
      pointer = out;
    } else {
      const bundle = put(weights[0]), error = allocate(4);
      if (runtime._snt_trellis_wasm_sample_rate(bundle, weights[0].length) !== config.rate) throw new Error('Trellis bundle sample rate mismatch.');
      handle = runtime._snt_trellis_wasm_run(bundle, weights[0].length, idsPtr, ids.length, 0, 0, error);
      const rc = runtime.HEAP32[error >> 2];
      if (!handle || rc !== 0) throw new Error(`Trellis native failure ${rc}`);
      if (runtime._snt_trellis_wasm_tokens(handle) !== ids.length || runtime._snt_trellis_wasm_frames(handle) <= 0) throw new Error('Trellis native token coverage or frame count mismatch.');
      count = runtime._snt_trellis_wasm_samples(handle);
      pointer = runtime._snt_trellis_wasm_stage(handle, 7);
      if (runtime._snt_trellis_wasm_handle_sample_rate(handle) !== config.rate || !Number.isInteger(count) || count <= 0 || !pointer) throw new Error('Trellis invalid waveform handle.');
    }
    if (pointer < 0 || pointer % 4 || pointer + count * 4 > runtime.HEAPU8.length) throw new Error('Sano PCM lies outside native heap.');
    return new Float32Array(runtime.HEAPF32.subarray(pointer >> 2, (pointer >> 2) + count));
  } finally {
    if (handle) runtime._snt_trellis_wasm_release(handle);
    for (const p of allocated) runtime._free(p);
  }
}
function piecesFor(chunk) {
  if (!chunk || !Number.isInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.length) throw new Error('Invalid canonical span.');
  const pieces = textApi().splitChunks(chunk.text);
  textApi().assertCoverage(chunk.text, pieces);
  if (!pieces.length || pieces.some(p => !p || p.length > 120)) throw new Error('Invalid Sano text pieces.');
  return pieces;
}
function generate(chunk) {
  if (!runtime || !weights) throw new Error('Sano runtime not initialized.');
  const parts = [];
  for (const [index, text] of piecesFor(chunk).entries()) {
    const { ids } = tokenize(text);
    const pcm = synthesize(ids);
    if (index === 0) self.postMessage({ id: requestId, event: 'first-pcm', samples: pcm, sampleRate: config.rate }, [pcm.buffer]);
    else parts.push(pcm);
  }
  return { parts, sampleRate: config.rate, completedChunkId: chunk.id };
}
function audit(chunks) {
  if (!Array.isArray(chunks) || chunks.length !== 93) throw new Error('Expected all 93 canonical spans.');
  let count = 0, maxTokens = 0, maxChars = 0, whitespaceDropped = 0;
  for (const [i, chunk] of chunks.entries()) {
    if (chunk.id !== i) throw new Error('Canonical span order mismatch.');
    for (const text of piecesFor(chunk)) {
      const result = tokenize(text, true);
      count++; maxTokens = Math.max(maxTokens, result.ids.length); maxChars = Math.max(maxChars, text.length);
      whitespaceDropped += Array.from(result.dropped).length;
    }
  }
  return { canonicalSpans: chunks.length, synthesizedPieces: count, maxPieceCharacters: maxChars, maxPhonemeTokensIncludingBosEos: maxTokens, tokenLimit: config.voice === 'mcu' ? 1023 : 207, droppedNonWhitespaceCharacters: 0, droppedWhitespaceCharacters: whitespaceDropped };
}
function dispose() {
  g2p = null; runtime = null; frontend = null; weights = null;
  if (nativeFetch) globalThis.fetch = nativeFetch;
  nativeFetch = null;
}
const handler = async ({ data }) => {
  requestId = data.id;
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = generate(data.chunk);
    else if (data.action === 'audit') { await initialize({ backend: 'cpu', modelId: data.modelId }, true); value = audit(data.chunks); dispose(); }
    else if (data.action === 'dispose') { dispose(); value = null; }
    else throw new Error('Unknown Sano action.');
    self.postMessage({ id: data.id, value }, value?.parts?.map(p => p.buffer) || []);
  } catch (error) { self.postMessage({ id: data.id, error: String(error?.stack || error) }); }
  finally { requestId = null; self.onmessage = handler; }
};
importScripts(new URL('../sano/robot-trellis-text.js', self.location.href).href);
importScripts(new URL('../sano/robot-phoneme-codepoints.js', self.location.href).href);
self.onmessage = handler;
