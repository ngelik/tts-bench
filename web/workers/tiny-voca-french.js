/* Scratch-only Ymelka Tiny Voca French worker, derived from the pinned Space worker. */
const MODEL_ROOT = '/models/tiny-voca-french/502ebbc0b9d442d056da1ef60926646394a2dbc8/9662a249d8ced6957d9f85665468f93df84fbea8/';
const PYODIDE_ROOT = '/runtimes/pyodide/0.26.4/';
const ORT_ROOT = MODEL_ROOT + 'runtime/cpu/';
const STOCK_FRONTEND = Object.freeze({
  vocabularyFingerprint: '31807ddbd16771299960e70d15addc80902ab70ae20738240178903e23c7f7a6',
  frontendRulesFingerprint: 'dfd29983f7c255e96722a1640cf04f0d433be815fb92b1bd82039682d22f18ba',
  fixtureOracle: { spans: 108, utterances: 334, maximumTokens: 176, unknownTokens: 0,
    tokenStressSha256: '7d44468cb35583bf3c3147e6dc09453faf3bf79e2617a61e216d9e10f71fcf30' },
});
const SPEC = {
  'assets/model.onnx': [21348301, '7e02ecd2899c33c4e27d68c7977dfd10b3b3a3b667451e12f620493ba62afaf8'],
  'assets/config.json': [433, '0299f6b54c4ccc7d1ff4a68acb408dff3a46e664fbf28da91362aa1ea0827181'],
  'assets/frontend.zip': [92483, '936d0d2344b7dd611dcca8417a47e03e2a89a912b851218aa87d299987e2530c'],
  'assets/espeak-tv.js': [115247, '6d89ac1392f02cb34ef974e2091339b6c3188ed8bc699732460271ddf23c96e7'],
  'assets/espeak-tv.wasm': [373215, '98f800f5e4879fb5feb2bafa9fc3e24b29f22043ee85c8b0ea9b132037d4888e'],
  'assets/espeak-tv.data': [11627324, 'ec4c2a525499354d33de586f45c01e4be48459890449fc9479ff11e3aaf231d9'],
  'runtime/cpu/ort.wasm.min.js': [49026, 'e66568724f8848e57cc2a56e4bea3a5b86ce3ff81b2da11eac8ed7ab02b27bd4'],
  'runtime/cpu/ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
  'runtime/cpu/ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
};
const PYODIDE = {
  'pyodide.js': [14761, 'c0069107621d5b942a659e737a12e774cc0451feaa2256f475d72e071d844ec7'],
  'pyodide.asm.js': [1229099, '919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed'],
  'pyodide.asm.wasm': [10088051, 'b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94'],
  'python_stdlib.zip': [2341872, '72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336'],
  'pyodide-lock.json': [106335, 'cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0'],
};
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
let pyodide, plan, session, config, active = false;

async function checked(url, spec, label) {
  const full = new URL(url, self.location.href);
  if (full.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(full.pathname)) throw new Error(label + ' is not same-origin');
  // Preserve the normal browser cache: standard local loaders subsequently
  // request the same immutable runtime URLs.
  const response = await fetch(full.href);
  if (!response.ok) throw new Error(label + ' fetch failed: HTTP ' + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || await hash(bytes) !== spec[1]) throw new Error(label + ' size or SHA-256 mismatch');
  return bytes;
}
const modelAsset = path => checked(MODEL_ROOT + path, SPEC[path], 'Pinned Space ' + path);
const pyodideAsset = name => checked(PYODIDE_ROOT + name, PYODIDE[name], 'Pyodide ' + name);
const runtimeAsset = name => modelAsset('runtime/cpu/' + name);

async function loadFrontend() {
  const [archive, data, loader, wasm] = await Promise.all([
    modelAsset('assets/frontend.zip'), modelAsset('assets/espeak-tv.data'), modelAsset('assets/espeak-tv.js'), modelAsset('assets/espeak-tv.wasm'),
    ...Object.keys(PYODIDE).map(pyodideAsset),
  ]);
  void loader;
  self.importScripts(MODEL_ROOT + 'assets/espeak-tv.js');
  if (typeof self.createEspeak !== 'function') throw new Error('Pinned eSpeak NG 1.51 loader did not initialize');
  const espeak = await self.createEspeak({ locateFile: name => MODEL_ROOT + 'assets/' + name,
    getPreloadedPackage: () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    instantiateWasm: (imports, ready) => {
      WebAssembly.instantiate(wasm, imports).then(result => ready(result.instance, result.module));
      return {};
    } });
  self.tv_raw = text => espeak.ccall('tv_cli', 'string', ['string'], [text]);
  self.importScripts(PYODIDE_ROOT + 'pyodide.js');
  pyodide = await self.loadPyodide({ indexURL: new URL(PYODIDE_ROOT, self.location.href).href });
  if (pyodide.version !== '0.26.4') throw new Error('Unexpected Pyodide version: ' + pyodide.version);
  pyodide.unpackArchive(archive.slice().buffer, 'zip', { extractDir: '/frontend' });
  pyodide.runPython(`
import sys
sys.path[:0] = ['/frontend', '/frontend/src']
import torch_stub
torch_stub.install()
import tiny_voca.text as text
from js import tv_raw
def _raw_espeak(piece):
    return tv_raw(piece.rstrip("\\n") + "\\n")
text._raw_espeak = _raw_espeak
text.espeak_executable = lambda: None
import tv_plan
tv_plan.plan_json('Bonjour.')
`);
  plan = pyodide.globals.get('tv_plan').plan_json;
  if (JSON.parse(plan('Bonjour.')).length !== 1) throw new Error('Pinned French eSpeak frontend failed smoke phonemization');
  return JSON.parse(pyodide.runPython(`
import json
json.dumps({
  'vocabularyFingerprint': text.vocabulary_fingerprint(),
  'frontendRulesFingerprint': text.frontend_rules_fingerprint(),
}, sort_keys=True)
`));
}
function capPeak(source) {
  const out = Float32Array.from(source); let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.99) for (let i = 0; i < out.length; i++) out[i] *= 0.99 / peak;
  return out;
}
async function initialize(options = {}) {
  const identity = options.modelConfig;
  if (identity?.id !== 'tiny-voca-french' || identity.modelId !== 'ymelka/tiny-voca-french' ||
      identity.modelRevision !== '502ebbc0b9d442d056da1ef60926646394a2dbc8' ||
      identity.sourceId !== 'yoch/tiny-voca' || identity.sourceRevision !== '9662a249d8ced6957d9f85665468f93df84fbea8' ||
      identity.spaceId !== 'ymelka/tiny-voca-french' || identity.spaceRevision !== '8ddb95dc20e47864cc9c5c3754aac331f2db1d6b') {
    throw new Error('Ymelka French model, source, and Space identities must match the pinned candidate profile');
  }
  if (options.backend !== 'cpu') throw new Error('Ymelka Tiny Voca French is CPU/WASM only');
  if (options.fixtureId !== 'fr-article-v1' || (options.language ?? 'fr') !== 'fr') throw new Error('Requires fr-article-v1 / fr');
  if (options.voice && options.voice !== 'F1') throw new Error('This candidate supports only F1 (index 0)');
  const [graph, configBytes, frontend] = await Promise.all([
    modelAsset('assets/model.onnx'), modelAsset('assets/config.json'), loadFrontend(),
    runtimeAsset('ort-wasm-simd-threaded.mjs'), runtimeAsset('ort.wasm.min.js'), runtimeAsset('ort-wasm-simd-threaded.wasm'),
  ]);
  if (frontend.vocabularyFingerprint !== STOCK_FRONTEND.vocabularyFingerprint ||
      frontend.frontendRulesFingerprint !== STOCK_FRONTEND.frontendRulesFingerprint) {
    throw new Error('French vocabulary/rules fingerprints differ from the independent stock browser reference');
  }
  self.importScripts(ORT_ROOT + 'ort.wasm.min.js');
  config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(configBytes));
  if (config.sample_rate !== 24000 || config.step !== 90351 || config.max_tokens !== 512 ||
      JSON.stringify(config.voices) !== JSON.stringify(['F1','M1','GF2','NM','SW']) || config.symbols?.length !== 54) {
    throw new Error('Pinned Ymelka config does not match the reviewed F1 model profile');
  }
  self.ort.env.wasm.numThreads = 1;
  self.ort.env.wasm.wasmPaths = ORT_ROOT;
  self.ort.env.logLevel = 'error';
  session = await self.ort.InferenceSession.create(graph, { executionProviders: ['wasm'] });
  if (JSON.stringify(session.inputNames) !== JSON.stringify(['tokens','stress','voice','speed','pitch_shift','pitch_range']) ||
      JSON.stringify(session.outputNames) !== JSON.stringify(['audio','durations'])) throw new Error('ONNX input/output ABI differs from pinned Space worker');
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts, frontend) : null;
  active = true;
  return { status: 'measured', backendEffective: 'cpu/wasm', voice: 'F1', precision: 'FP32 ONNX',
    settings: { modelId: 'ymelka/tiny-voca-french', modelRevision: '502ebbc0b9d442d056da1ef60926646394a2dbc8',
      checkpointSha256: '2b6a78c4226211f6ac5c78d69f1aacfcb4f07bf6ad6b3508f501acc01450a0d4',
      sourceId: 'yoch/tiny-voca', sourceRevision: '9662a249d8ced6957d9f85665468f93df84fbea8',
      spaceId: 'ymelka/tiny-voca-french', spaceRevision: '8ddb95dc20e47864cc9c5c3754aac331f2db1d6b',
      fixtureId: 'fr-article-v1', fixtureSha256: '4383169bb50c860cac854434fde77b93b72bba73443a445d32764cc16688b196',
      language: 'fr', locale: 'fr-FR', voice: 'F1', voiceIndex: 0, speed: 1, pitchShift: 0, pitchRange: 1,
      sampleRate: 24000, hop: 256, maxTokens: 512, tokenLimit: 500, maxFrames: 3000, step: 90351,
      parameterCount: 4534219, precision: 'FP32 ONNX export of the released French checkpoint',
      frontend: 'Pinned Space frontend.zip and tv_plan.py; eSpeak NG 1.51 WebAssembly tv_cli; Pyodide 0.26.4',
      vocabularyFingerprint: frontend.vocabularyFingerprint,
      frontendRulesFingerprint: frontend.frontendRulesFingerprint,
      runtimeVersions: { onnxruntimeWeb: '1.20.1', pyodide: pyodide.version, espeakNg: '1.51' },
      phonemizerAssets: { jsSha256: '6d89ac1392f02cb34ef974e2091339b6c3188ed8bc699732460271ddf23c96e7', wasmSha256: '98f800f5e4879fb5feb2bafa9fc3e24b29f22043ee85c8b0ea9b132037d4888e', dataSha256: 'ec4c2a525499354d33de586f45c01e4be48459890449fc9479ff11e3aaf231d9', version: '1.51' },
      executionProviders: ['wasm'], waveformExecutionProviders: ['wasm'], wasmThreads: 1,
      waveform: 'Stock browser sentence stream: source-order sentence PCM, each sentence copied and peak-limited to 0.99 before playback; no inserted audio. Benchmark audio is the concatenation of those playable sentence pieces.',
      frontendAuditStatus: fixtureAudit ? 'matched-independent-stock-reference' : 'not-run',
      acousticComparisonStatus: fixtureAudit ? 'pending-stock-waveform-comparison' : 'not-run',
      ...(fixtureAudit ? { fixtureAudit } : {}),
      auditRequested: Boolean(options.auditTexts?.length) },
    capability: { gpuDispatchVerified: null, description: 'Official Space uses ONNX Runtime Web 1.20.1 with explicit single-thread WASM.' } };
}
async function auditFixture(texts, frontend) {
  const expected = STOCK_FRONTEND.fixtureOracle;
  if (!Array.isArray(texts) || texts.length !== expected.spans) throw new Error('French qualification audit requires all 108 ordered fixture spans');
  const rows = []; let utterances = 0, maximumTokens = 0, unknownTokens = 0;
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim()) throw new Error('Invalid or reordered French fixture span ' + id);
    if (item.sha256 && await hash(new TextEncoder().encode(item.text)) !== item.sha256) throw new Error('French fixture span hash mismatch at ' + id);
    const planned = JSON.parse(plan(item.text));
    if (!planned.length) throw new Error('French frontend returned no utterance for fixture span ' + id);
    for (const phones of planned) {
      if (!Array.isArray(phones.ids) || !Array.isArray(phones.stress) || phones.ids.length !== phones.stress.length ||
          phones.ids.length < 3 || phones.ids.length > 500 || phones.ids.some(value => !Number.isInteger(value) || value < 0 || value >= config.symbols.length) ||
          phones.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) throw new Error('Invalid French frontend plan in span ' + id);
      utterances++; maximumTokens = Math.max(maximumTokens, phones.ids.length);
      unknownTokens += phones.ids.filter(value => value === 4).length;
    }
    rows.push([id, planned.map(phones => [phones.ids, phones.stress])]);
  }
  const tokenStressSha256 = await hash(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = { spans: rows.length, utterances, maximumTokens, unknownTokens, tokenStressSha256,
    vocabularyFingerprint: frontend.vocabularyFingerprint, frontendRulesFingerprint: frontend.frontendRulesFingerprint };
  for (const key of ['spans','utterances','maximumTokens','unknownTokens','tokenStressSha256']) {
    if (actual[key] !== expected[key]) throw new Error('French stock audit mismatch: ' + JSON.stringify(actual));
  }
  if (actual.vocabularyFingerprint !== STOCK_FRONTEND.vocabularyFingerprint ||
      actual.frontendRulesFingerprint !== STOCK_FRONTEND.frontendRulesFingerprint) throw new Error('French stock frontend fingerprint mismatch');
  return { fixtureId: 'fr-article-v1', fixtureSha256: '4383169bb50c860cac854434fde77b93b72bba73443a445d32764cc16688b196',
    spans: rows.length, utterances, maximumTokens, unknownTokens, tokenStressSha256,
    vocabularyFingerprint: frontend.vocabularyFingerprint, frontendRulesFingerprint: frontend.frontendRulesFingerprint,
    reference: { spaceId: 'ymelka/tiny-voca-french', spaceRevision: '8ddb95dc20e47864cc9c5c3754aac331f2db1d6b',
      planSha256: '6e08bef514e698319f2927b75f783dc521867443a301fb039cf4812be3f05a3c' }, status: 'matched' };
}
async function generate(chunk, firstPcm) {
  if (!active || !session || !plan) throw new Error('Ymelka French worker is not initialized');
  if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid French source chunk');
  const utterances = JSON.parse(plan(chunk.text));
  if (!utterances.length) throw new Error('Ymelka French planner returned no utterances');
  const parts = [];
  for (const [index, phones] of utterances.entries()) {
    if (!Array.isArray(phones.ids) || !Array.isArray(phones.stress) || phones.ids.length !== phones.stress.length ||
        phones.ids.length < 3 || phones.ids.length > 500 || phones.ids.some(x => !Number.isInteger(x) || x < 0 || x >= config.symbols.length) ||
        phones.stress.some(x => !Number.isInteger(x) || x < 0 || x > 2)) throw new Error('Invalid French token/stress plan');
    const count = phones.ids.length;
    const integers = values => new self.ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, count]);
    const scalar = value => new self.ort.Tensor('float32', Float32Array.of(value), [1]);
    const inputs = { tokens: integers(phones.ids), stress: integers(phones.stress), voice: new self.ort.Tensor('int64', BigInt64Array.of(0n), [1]),
      speed: scalar(1), pitch_shift: scalar(0), pitch_range: scalar(1) };
    let outputs;
    try {
      outputs = await session.run(inputs);
      const samples = capPeak(outputs.audio.data);
      if (!samples.length || !samples.every(Number.isFinite) || !samples.some(x => x !== 0)) throw new Error('Model returned invalid PCM');
      parts.push(samples);
      if (index === 0) firstPcm?.();
    } finally { for (const x of [...Object.values(inputs), ...Object.values(outputs ?? {})]) x.dispose?.(); }
  }
  return { parts, sampleRate: 24000, completedChunkId: chunk.id };
}
async function dispose() { active = false; const old = session; session = null; if (old) await old.release(); try { pyodide?.globals?.destroy?.(); } catch {} pyodide = plan = config = null; }
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Ymelka French action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) { if (data.action === 'initialize') await dispose(); self.postMessage({ id: data.id, error: String(error?.message ?? error) }); }
};
