/* SPDX-License-Identifier: Apache-2.0
 * Local-source benchmark port of Tiny Ava's Persian frontend.
 * Source: mallahyari/tiny-ava@d4bd268a5386c60f15d1abb7e706df02b6ba4d32
 * Model weights: CC BY 4.0; attribution is in tiny-voca-fa/NOTICE.md.
 */
const MODEL_REV = 'cd2a2217ac31447763cbb500bdc2433973e6e4f4';
const SOURCE_REV = 'd4bd268a5386c60f15d1abb7e706df02b6ba4d32';
const ROOT = '/models/tiny-voca-fa/' + MODEL_REV + '/' + SOURCE_REV + '/';
const RUNTIME = '/runtimes/onnxruntime-web/1.20.1/';
const SAMPLE_RATE = 24000,
  HOP = 256,
  MAX_TOKENS = 512,
  MAX_FRAMES = 3000;
const PEAK = 0.99,
  GAP = Math.round(SAMPLE_RATE * 0.12),
  MAX_G2P_STEPS = 256;
const CACHE_NAME = 'tiny-voca-fa-' + MODEL_REV + '-' + SOURCE_REV;
const SYMBOLS = [
  '<pad>',
  '<bos>',
  '<eos>',
  '<sp>',
  '<unk>',
  '،',
  '.',
  '؟',
  '!',
  '؛',
  ':',
  '«',
  '»',
  '(',
  ')',
  '—',
  '…',
  'p',
  'b',
  't',
  'd',
  'k',
  'ɡ',
  'q',
  'ʔ',
  'f',
  'v',
  's',
  'z',
  'ʃ',
  'ʒ',
  'x',
  'h',
  'tʃ',
  'dʒ',
  'm',
  'n',
  'l',
  'r',
  'j',
  'a',
  'e',
  'o',
  'i',
  'u',
  'ɑ',
];
const SYMBOL_TO_ID = Object.fromEntries(SYMBOLS.map((s, i) => [s, i]));
const PHONE_SET = new Set(SYMBOLS.slice(17));
const VOWELS = new Set(['a', 'e', 'o', 'i', 'u', 'ɑ']);
const PUNCTUATION = new Set(['،', '.', '؟', '!', '؛', ':', '«', '»', '(', ')', '—', '…']);
const REPR1_TO_IPA = {
  a: 'a',
  A: 'ɑ',
  e: 'e',
  o: 'o',
  i: 'i',
  u: 'u',
  p: 'p',
  b: 'b',
  t: 't',
  d: 'd',
  k: 'k',
  g: 'ɡ',
  q: 'q',
  '?': 'ʔ',
  f: 'f',
  v: 'v',
  s: 's',
  z: 'z',
  S: 'ʃ',
  Z: 'ʒ',
  x: 'x',
  h: 'h',
  C: 'tʃ',
  j: 'dʒ',
  m: 'm',
  n: 'n',
  l: 'l',
  r: 'r',
  y: 'j',
};
const CHAR_MAP = {
  '\u064a': '\u06cc',
  '\u0649': '\u06cc',
  '\u0643': '\u06a9',
  '\u0629': '\u0647',
  '\u06c0': '\u0647',
  '\u0623': '\u0627',
  '\u0625': '\u0627',
  '\u0671': '\u0627',
  '\u0640': '',
  '\u200b': '',
  '\u200d': '',
  '\ufeff': '',
  '\u00a0': ' ',
  ',': '،',
  '?': '؟',
  ';': '؛',
  '–': '—',
  '―': '—',
  '"': '«',
};
const utf8Enc = new TextEncoder(),
  utf8Dec = new TextDecoder('utf-8', { fatal: true });
let profile,
  ortRuntime,
  tts,
  g2pEnc,
  g2pDec,
  backend,
  gpuName,
  fixtureId,
  language,
  cacheEnabled = true;
let dispatchCount = 0;
const cacheStats = { hits: 0, misses: 0, verifiedBytes: 0 };
const sha256 = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

async function pinned(urlText, spec) {
  const url = new URL(urlText, self.location.href);
  if (url.origin !== self.location.origin || !/^\/models\/|^\/runtimes\//.test(url.pathname))
    throw Error('Tiny Ava asset must be same-origin and pinned.');
  const request = new Request(url.href);
  if (cacheEnabled && self.caches)
    try {
      const store = await caches.open(CACHE_NAME),
        hit = await store.match(request);
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (bytes.byteLength === spec[0] && (await sha256(bytes)) === spec[1]) {
          cacheStats.hits++;
          cacheStats.verifiedBytes += bytes.length;
          return bytes;
        }
        await store.delete(request);
      }
    } catch {}
  cacheStats.misses++;
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) throw Error('Tiny Ava pinned asset HTTP ' + response.status + ': ' + url.pathname);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== spec[0] || (await sha256(bytes)) !== spec[1])
    throw Error('Tiny Ava asset size or SHA-256 mismatch: ' + url.pathname);
  if (cacheEnabled && self.caches)
    try {
      await (await caches.open(CACHE_NAME)).put(request, new Response(bytes.slice()));
    } catch {}
  return bytes;
}
function int64(values, dims = [1, values.length]) {
  return new ortRuntime.Tensor('int64', BigInt64Array.from(values, BigInt), dims);
}
function scalar(value) {
  return new ortRuntime.Tensor('float32', Float32Array.of(value), [1]);
}
function sendFirst(id) {
  self.postMessage({ id, event: 'first-pcm' });
}
function dispatchProbe() {
  const proto = self.GPUComputePassEncoder?.prototype;
  if (!proto || typeof proto.dispatchWorkgroups !== 'function')
    throw Error('WebGPU dispatch instrumentation unavailable');
  const original = proto.dispatchWorkgroups;
  dispatchCount = 0;
  proto.dispatchWorkgroups = function (...args) {
    dispatchCount++;
    return original.apply(this, args);
  };
  return () => {
    proto.dispatchWorkgroups = original;
    return dispatchCount;
  };
}
function normalizePersian(text) {
  let s = text.normalize('NFC'),
    mapped = '';
  for (const ch of s) mapped += Object.prototype.hasOwnProperty.call(CHAR_MAP, ch) ? CHAR_MAP[ch] : ch;
  mapped = mapped
    .replace(/[\u064b-\u064d\u0652-\u065f\u0670]/g, '')
    .replace(/\.{3,}/g, '…')
    .replace(/-{2,}|\s-\s/g, '—');
  mapped = mapped.replace(/\u200c+/g, '\u200c').replace(/\s+\u200c|\u200c\s+/g, ' ');
  return mapped.replace(/\s+/g, ' ').trim();
}
function splitSentences(text) {
  const s = text.replace(/[\s\ufeff]+/g, ' ').trim();
  return s
    ? s
        .split(/(?<=[.!؟?…]["')\]»]?)\s+/)
        .map((x) => x.trim())
        .filter((x) => /[\p{L}\p{N}]/u.test(x))
    : [];
}
function terminal(text) {
  const s = text.trim();
  return !s || '.!؟?…،,;؛:'.includes(s.slice(-1)) ? s : s + '.';
}
function punctChunks(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++)
    if (PUNCTUATION.has(text[i])) {
      const piece = text.slice(start, i).trim();
      if (piece) out.push([false, piece]);
      out.push([true, text[i]]);
      start = i + 1;
    }
  const tail = text.slice(start).trim();
  if (tail) out.push([false, tail]);
  return out;
}
function byt5Encode(text) {
  const bytes = utf8Enc.encode(text),
    ids = new BigInt64Array(bytes.length + 1);
  for (let i = 0; i < bytes.length; i++) ids[i] = BigInt(bytes[i] + 3);
  ids[bytes.length] = 1n;
  return ids;
}
function byt5Decode(ids) {
  const bytes = [];
  for (const id of ids) {
    const token = typeof id === 'bigint' ? Number(id) : id;
    if (Number.isInteger(token) && token >= 3 && token <= 258) bytes.push(token - 3);
  }
  return utf8Dec.decode(new Uint8Array(bytes)).trim();
}
async function runG2PClause(text, depth = 0) {
  if (depth > 16) throw Error('Tiny Ava G2P reached its safe recursive split limit.');
  const ids = byt5Encode(text),
    len = ids.length,
    mask = new BigInt64Array(len).fill(1n);
  const encInputs = { input_ids: int64(ids, [1, len]), attention_mask: int64(mask, [1, len]) };
  let encOut,
    hidden,
    attention,
    decoder = [0n],
    ended = false;
  try {
    encOut = await g2pEnc.run(encInputs);
    hidden = encOut.encoder_hidden_states;
    attention = int64(mask, [1, len]);
    for (let step = 0; step < MAX_G2P_STEPS; step++) {
      const input = int64(decoder, [1, decoder.length]);
      let result;
      try {
        result = await g2pDec.run({
          decoder_input_ids: input,
          encoder_hidden_states: hidden,
          encoder_attention_mask: attention,
        });
      } finally {
        input.dispose?.();
      }
      const logits = result.logits.data,
        vocab = result.logits.dims[2],
        offset = (decoder.length - 1) * vocab;
      let choice = 0,
        score = -Infinity;
      for (let v = 0; v < vocab; v++)
        if (logits[offset + v] > score) {
          score = logits[offset + v];
          choice = v;
        }
      for (const item of Object.values(result)) item.dispose?.();
      if (choice === 1) {
        ended = true;
        break;
      }
      decoder.push(BigInt(choice));
    }
  } finally {
    for (const x of Object.values(encInputs)) x.dispose?.();
    if (encOut) for (const x of Object.values(encOut)) x.dispose?.();
    attention?.dispose?.();
  }
  if (!ended) {
    const words = text.trim().split(/\s+/);
    if (words.length < 2)
      throw Error('Tiny Ava G2P exceeded 256 tokens on a single word; refusing partial pronunciation.');
    const middle = Math.ceil(words.length / 2);
    return (
      (await runG2PClause(words.slice(0, middle).join(' '), depth + 1)) +
      ' ' +
      (await runG2PClause(words.slice(middle).join(' '), depth + 1))
    );
  }
  const result = byt5Decode(decoder.slice(1));
  if (!result.trim()) throw Error('Tiny Ava G2P returned no pronounceable tokens for a nonempty clause.');
  return result;
}
let omittedDecoderSymbols = new Map();
function repr1Words(repr) {
  const words = [];
  for (const raw of repr.trim().split(/\s+/)) {
    if (!raw) continue;
    const match = raw.match(/^(.*?)-(ye|e)$/);
    let stem = match && match[1] ? match[1].replace(/-/g, '') : raw.replace(/-/g, '');
    const ez = match && match[1] ? match[2] : '';
    if (stem.length >= 2 && stem[0] === '?' && 'aAeoiu'.includes(stem[1])) stem = stem.slice(1);
    const phones = [];
    for (const ch of stem) {
      const ipa = REPR1_TO_IPA[ch];
      // Match the publisher's Repr1 conversion. Source punctuation has already
      // been tokenized separately. Keep a count of each unmapped decoder symbol.
      if (!ipa) {
        omittedDecoderSymbols.set(ch, (omittedDecoderSymbols.get(ch) ?? 0) + 1);
        continue;
      }
      phones.push([ipa, 0]);
    }
    for (let i = phones.length - 1; i >= 0; i--)
      if (VOWELS.has(phones[i][0])) {
        phones[i][1] = 1;
        break;
      }
    for (const ch of ez) {
      const ipa = REPR1_TO_IPA[ch];
      if (!ipa) throw Error('Tiny Ava frontend returned unmapped ezafe symbol ' + JSON.stringify(ch));
      phones.push([ipa, VOWELS.has(ipa) ? 2 : 0]);
    }
    if (phones.length) words.push(phones);
  }
  return words;
}
async function phonemizeSentence(sentence) {
  const normalized = normalizePersian(terminal(sentence)),
    chunks = punctChunks(normalized),
    symbols = ['<bos>'],
    stress = [0];
  for (const [isPunctuation, value] of chunks) {
    if (isPunctuation) {
      if (symbols[symbols.length - 1] !== value && value in SYMBOL_TO_ID) {
        symbols.push(value);
        stress.push(0);
      }
      continue;
    }
    const repr = await runG2PClause(value);
    for (const word of repr1Words(repr)) {
      if (PHONE_SET.has(symbols[symbols.length - 1]) || symbols[symbols.length - 1] === '<unk>') {
        symbols.push('<sp>');
        stress.push(0);
      }
      for (const [phone, level] of word) {
        if (!PHONE_SET.has(phone))
          throw Error('Tiny Ava returned a phone outside its pinned inventory: ' + phone);
        symbols.push(phone);
        stress.push(level);
      }
    }
  }
  symbols.push('<eos>');
  stress.push(0);
  if (!symbols.some((x) => PHONE_SET.has(x))) throw Error('Tiny Ava frontend produced an empty utterance.');
  return { symbols, ids: symbols.map((x) => SYMBOL_TO_ID[x]), stress };
}
function splitLongSentence(sentence) {
  if (sentence.length <= 180) return [sentence];
  const clauses = sentence.split(/(?<=[،,؛;:—])\s+/).filter(Boolean);
  if (clauses.length > 1) return clauses;
  const words = sentence.split(/\s+/);
  if (words.length < 2) throw Error('Tiny Ava cannot split an overlong single word.');
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}
async function fit(sentence, depth = 0) {
  if (depth > 20) throw Error('Tiny Ava token fitting reached its safe recursion limit.');
  const result = [];
  for (const part of splitLongSentence(sentence)) result.push(...(await fitOne(part, depth)));
  return result;
}
async function fitOne(sentence, depth) {
  const phones = await phonemizeSentence(sentence);
  if (phones.ids.length <= MAX_TOKENS) return [phones];
  const clauses = sentence.split(/(?<=[،,؛;:—])\s+/).filter(Boolean);
  const words = sentence.split(/\s+/);
  const pieces =
    clauses.length > 1
      ? clauses
      : words.length > 1
        ? [
            words.slice(0, Math.ceil(words.length / 2)).join(' '),
            words.slice(Math.ceil(words.length / 2)).join(' '),
          ]
        : [];
  if (!pieces.length) throw Error('A single Persian word exceeds Tiny Ava token capacity.');
  const result = [];
  for (const p of pieces) result.push(...(await fit(p, depth + 1)));
  return result;
}
async function synth(phones) {
  if (phones.ids.length > MAX_TOKENS) throw Error('Tiny Ava acoustic token ceiling exceeded.');
  const inputs = {
    tokens: int64(phones.ids),
    stress: int64(phones.stress),
    voice: int64([0], [1]),
    speed: scalar(1),
    pitch_shift: scalar(0),
    pitch_range: scalar(1.05),
  };
  let outputs;
  try {
    outputs = await tts.run(inputs);
    const audio = Float32Array.from(outputs.audio.data),
      frames = Array.from(outputs.durations.data, Number).reduce((a, b) => a + b, 0);
    if (
      !audio.length ||
      audio.length !== frames * HOP ||
      frames > MAX_FRAMES ||
      !audio.every(Number.isFinite) ||
      !audio.some((x) => x !== 0)
    )
      throw Error('Tiny Ava returned invalid or duration-mismatched PCM.');
    let peak = 0;
    for (const x of audio) peak = Math.max(peak, Math.abs(x));
    if (!peak) throw Error('Tiny Ava returned silent PCM.');
    if (peak > PEAK) {
      const scale = PEAK / peak;
      for (let i = 0; i < audio.length; i++) audio[i] *= scale;
    }
    return audio;
  } finally {
    for (const x of Object.values(inputs)) x.dispose?.();
    if (outputs) for (const x of Object.values(outputs)) x.dispose?.();
  }
}
async function plan(text) {
  const result = [];
  for (const sentence of splitSentences(text)) result.push(...(await fit(sentence)));
  if (!result.length) throw Error('Tiny Ava received a source span with no speakable Persian content.');
  return result;
}
async function auditFixture(texts) {
  omittedDecoderSymbols = new Map();
  if (!Array.isArray(texts) || texts.length !== 86)
    throw Error('Tiny Ava audit requires the accepted ordered 86-span fa-article-v1 fixture.');
  const fixtureSha = await sha256(utf8Enc.encode(texts.map((item) => item?.text).join('')));
  if (fixtureSha !== profile.fixtureSha256) throw Error('Persian fixture text SHA-256 mismatch.');
  const rows = [];
  let utterances = 0,
    maximumTokens = 0;
  for (let id = 0; id < texts.length; id++) {
    const item = texts[id];
    if (!item || item.id !== id || typeof item.text !== 'string' || !item.text.trim())
      throw Error('Invalid or reordered Persian fixture span ' + id);
    const plans = await plan(item.text);
    utterances += plans.length;
    maximumTokens = Math.max(maximumTokens, ...plans.map((x) => x.ids.length));
    if (plans.some((x) => x.ids.length > MAX_TOKENS || x.ids.length !== x.stress.length))
      throw Error('Invalid token/stress shape at Persian span ' + id);
    rows.push([id, plans.map(({ ids, stress }) => [ids, stress])]);
  }
  const digest = await sha256(new TextEncoder().encode(JSON.stringify(rows)));
  const actual = {
    fixtureId: profile.fixtureId,
    fixtureSha256: fixtureSha,
    spans: texts.length,
    utterances,
    maximumTokens,
    tokenStressSha256: digest,
    omittedDecoderSymbols: Object.fromEntries(omittedDecoderSymbols),
  };
  const expected = profile.fixtureOracle;
  if (
    expected &&
    (actual.utterances !== expected.utterances ||
      actual.maximumTokens !== expected.maximumTokens ||
      digest !== expected.tokenStressSha256)
  )
    throw Error('Tiny Ava full-fixture frontend oracle mismatch: ' + JSON.stringify(actual));
  return { ...actual, status: expected ? 'matched' : 'oracle-pending' };
}
async function generate(chunk, onFirst) {
  if (!tts || fixtureId !== 'fa-article-v1' || language !== 'fa' || !backend)
    throw Error('Tiny Ava Persian adapter is not initialized.');
  if (!chunk || !Number.isSafeInteger(chunk.id) || typeof chunk.text !== 'string' || !chunk.text.trim())
    throw Error('Invalid Persian source span.');
  const pieces = [];
  let emitted = false;
  for (const sentence of splitSentences(chunk.text))
    for (const phones of await fit(sentence)) {
      if (emitted) pieces.push(new Float32Array(GAP));
      const pcm = await synth(phones);
      if (!emitted) onFirst?.();
      pieces.push(pcm);
      emitted = true;
    }
  if (!emitted) throw Error('Tiny Ava produced no audio for fixture span ' + chunk.id);
  const joined = new Float32Array(pieces.reduce((n, x) => n + x.length, 0));
  let offset = 0;
  for (const p of pieces) {
    joined.set(p, offset);
    offset += p.length;
  }
  return { parts: [joined], sampleRate: SAMPLE_RATE, completedChunkId: chunk.id };
}
async function initialize(options = {}) {
  profile = options.modelConfig;
  if (
    profile?.id !== 'tiny-voca-fa' ||
    profile.modelRevision !== MODEL_REV ||
    profile.sourceRevision !== SOURCE_REV ||
    profile.fixtureSha256 !== '17d9ce8d7038eb0be3f6b772e8dd47c0acc68bcad6bf64616b9c84bafa2c204a'
  )
    throw Error('Exact Tiny Ava Persian candidate profile required.');
  if (options.fixtureId !== profile.fixtureId || (options.language ?? profile.language) !== profile.language)
    return {
      status: 'unsupported',
      reason: 'Only the accepted fa-article-v1 Persian fixture is supported.',
      backendEffective: 'none',
    };
  if (options.sourceSha256 !== undefined && options.sourceSha256 !== profile.fixtureSha256)
    throw Error('Persian source SHA-256 differs from the registered profile.');
  if (options.voice && options.voice !== 'parisa')
    return { status: 'unsupported', reason: 'Tiny Ava has only the Parisa voice.', backendEffective: 'none' };
  backend = options.backend;
  fixtureId = options.fixtureId;
  language = options.language ?? profile.language;
  if (!['cpu', 'webgpu'].includes(backend)) throw Error('Explicit cpu or webgpu backend required.');
  const gpu = backend === 'webgpu';
  if (gpu) {
    const a = await navigator.gpu?.requestAdapter();
    if (!a || a.isFallbackAdapter || a.info?.isFallbackAdapter)
      return { status: 'unsupported', reason: 'Hardware WebGPU unavailable.', backendEffective: 'none' };
    gpuName = a.info?.description || a.info?.vendor || null;
  }
  const runtimeFiles = gpu
    ? ['ort.webgpu.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
    : ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  await Promise.all(runtimeFiles.map((name) => pinned(RUNTIME + name, profile.runtimeDigests[name])));
  const assets = ['tiny-ava-parisa.json', 'tiny-ava-parisa.onnx', 'g2p_encoder.onnx', 'g2p_decoder.onnx'];
  const bytes = await Promise.all(assets.map((name) => pinned(ROOT + name, profile.assetDigests[name])));
  const config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes[0]));
  if (
    config.sample_rate !== SAMPLE_RATE ||
    config.hop !== HOP ||
    config.max_tokens !== MAX_TOKENS ||
    config.max_frames !== MAX_FRAMES ||
    config.step !== 104000 ||
    config.frontend !== 'persian-g2p' ||
    config.frontend_fingerprint !== profile.frontendFingerprint ||
    JSON.stringify(config.symbols) !== JSON.stringify(SYMBOLS) ||
    JSON.stringify(config.inputs) !==
      JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
    JSON.stringify(config.outputs) !== JSON.stringify(['audio', 'durations'])
  )
    throw Error('Tiny Ava metadata mismatch.');
  importScripts(RUNTIME + (gpu ? 'ort.webgpu.min.js' : 'ort.wasm.min.js'));
  ortRuntime = self.ort || globalThis.ort;
  ortRuntime.env.logLevel = 'error';
  ortRuntime.env.wasm.numThreads = 1;
  ortRuntime.env.wasm.proxy = false;
  ortRuntime.env.wasm.wasmPaths = new URL(RUNTIME, self.location.origin).href;
  tts = await ortRuntime.InferenceSession.create(bytes[1], {
    executionProviders: gpu ? ['webgpu', 'wasm'] : ['wasm'],
    graphOptimizationLevel: 'all',
  });
  g2pEnc = await ortRuntime.InferenceSession.create(bytes[2], {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  g2pDec = await ortRuntime.InferenceSession.create(bytes[3], {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  if (
    [...tts.inputNames].sort().join(',') !== 'pitch_range,pitch_shift,speed,stress,tokens,voice' ||
    [...tts.outputNames].sort().join(',') !== 'audio,durations' ||
    [...g2pEnc.inputNames].sort().join(',') !== 'attention_mask,input_ids' ||
    [...g2pDec.inputNames].sort().join(',') !==
      'decoder_input_ids,encoder_attention_mask,encoder_hidden_states' ||
    g2pEnc.outputNames.join(',') !== 'encoder_hidden_states' || g2pDec.outputNames.join(',') !== 'logits'
  )
    throw Error('Tiny Ava ONNX input/output ABI mismatch.');
  const fixtureAudit = options.auditTexts?.length ? await auditFixture(options.auditTexts) : null;
  let dispatches = 0;
  if (gpu && options.probe) {
    const restore = dispatchProbe();
    try {
      const probe = await plan(options.probeText || 'سلام، این یک آزمون است.');
      await synth(probe[0]);
    } finally {
      dispatches = restore();
    }
    if (!dispatches) {
      await dispose();
      return {
        status: 'unsupported',
        backendEffective: 'none',
        reason: 'The acoustic probe completed without a hardware WebGPU compute dispatch.',
      };
    }
  }
  return {
    status: 'measured',
    backendEffective: gpu ? 'webgpu+wasm' : 'cpu/wasm',
    voice: 'parisa',
    precision: 'FP32',
    ...(gpu ? { gpu: gpuName } : {}),
    settings: {
      modelId: profile.modelId,
      modelRevision: MODEL_REV,
      sourceRevision: SOURCE_REV,
      fixtureId: profile.fixtureId,
      fixtureSha256: profile.fixtureSha256,
      language: 'fa',
      locale: 'fa-IR',
      voice: 'parisa',
      voiceIndex: 0,
      speed: 1,
      pitchShift: 0,
      pitchRange: 1.05,
      sampleRate: SAMPLE_RATE,
      hop: HOP,
      maxTokens: MAX_TOKENS,
      maxFrames: MAX_FRAMES,
      step: 104000,
      frontend: profile.frontend,
      frontendFingerprint: profile.frontendFingerprint,
      g2p: {
        encoderSha256: profile.assetDigests['g2p_encoder.onnx'][1],
        decoderSha256: profile.assetDigests['g2p_decoder.onnx'][1],
        executionProviders: ['wasm'],
        maxSteps: MAX_G2P_STEPS,
        overflowPolicy:
          'split at whitespace midpoint and retry complete input; fail if a single word still reaches max steps',
      },
      executionProviders: gpu ? ['webgpu', 'wasm'] : ['wasm'],
      g2pExecutionProviders: ['wasm'],
      wasmThreads: 1,
      withinSpanPauseMs: 120,
      peakLimit: PEAK,
      waveform:
        'Tiny Ava stock Parisa graph; 0.99 per-utterance peak cap; 120 ms silence only between utterances in a canonical span.',
      ...(fixtureAudit ? { fixtureAudit } : {}),
    },
    assetCache: { enabled: cacheEnabled, ...cacheStats },
    capability: {
      gpuDispatchVerified: gpu && options.probe ? dispatches > 0 : null,
      description: gpu
        ? options.probe
          ? 'Observed ' + dispatches + ' WebGPU dispatches; G2P uses WASM.'
          : 'Acoustic WebGPU configured; G2P uses WASM.'
        : 'Acoustic and G2P inference use ONNX Runtime Web 1.20.1 single-thread SIMD WASM.',
    },
  };
}
async function dispose() {
  for (const s of [tts, g2pEnc, g2pDec]) if (s) await s.release();
  tts = g2pEnc = g2pDec = ortRuntime = profile = backend = fixtureId = language = gpuName = null;
}
self.onmessage = async ({ data: { id, action, options, chunk } }) => {
  try {
    let value;
    switch (action) {
      case 'initialize':
        value = await initialize(options);
        break;
      case 'generate':
        value = await generate(chunk, () => sendFirst(id));
        break;
      case 'diagnostic':
        if (options?.auditTexts) value = await auditFixture(options.auditTexts);
        else throw Error('Unknown Tiny Ava diagnostic.');
        break;
      case 'dispose':
        await dispose();
        value = null;
        break;
      default:
        throw Error('Unknown Tiny Ava RPC action: ' + action);
    }
    self.postMessage({ id, value }, value?.parts?.map((x) => x.buffer) ?? []);
  } catch (error) {
    if (action === 'initialize')
      try {
        await dispose();
      } catch {}
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
};
