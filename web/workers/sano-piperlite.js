// Original worker adapter around the official sanotts-web 0.3.0 piperlite ABI.
// Runtime files and weights are staged from immutable, hash-locked assets.
const RUNTIME_ROOT = '/runtimes/sanotts-web/0.3.0/dist/';
const MAX_SECONDS = 120;
const MAX_PHONEME_IDS = 1024;

const PROFILES = Object.freeze({
  'sano-hfc': Object.freeze({
    modelRevision: 'bc04c49fd137607b60294b3894441bbfbe5c6659', voiceKey: 'hfc', label: 'HFC',
    espeakVoice: 'en-us', g2pVoiceSlot: 2, sampleRate: 22050, lengthScale: 1.08,
    frontBytes: 3336804, decBytes: 4001700,
    frontSha256: 'c3f4631101e8db147cc42f4a6be894bb9c701f265cf602f843e785f143d67582',
    decSha256: '922e0d4210f606f9bf6e9ef26c8276b9880aea0352881df67a6bca71f1165f9a',
    metaBytes: 1208, metaSha256: 'a8b068eb1c3753b378a487abc92c331180383fe812f1ef6a05e6cddb788ed2a1',
    params: 1834380, precision: 'FP32 official browser voice bundle',
  }),
  'sano-kristin': Object.freeze({
    modelRevision: 'bc04c49fd137607b60294b3894441bbfbe5c6659', voiceKey: 'kristin', label: 'Kristin',
    espeakVoice: 'en', g2pVoiceSlot: 0, sampleRate: 22050, lengthScale: 1.08,
    frontBytes: 1581712, decBytes: 4003988,
    frontSha256: 'b1b099ae95e9e30c04559023dd92027780ef937179d317e974beaf17526beab6',
    decSha256: '87e061c82b467cd2c6729d292298614189e45dc7a3c2777c0aa30ecf812242a3',
    metaBytes: 1035, metaSha256: 'c2847a3886e483aea48e93f60a51afd710b62b32b7396046b8714025fe7ade1b',
    params: 1396151, precision: 'FP32 official browser voice bundle',
  }),
  'sano-amy-small': Object.freeze({
    modelRevision: '25410576d005d7f08d186990fd91f6a2651243de', voiceKey: 'amy-en-1p1m', label: 'Amy-small',
    espeakVoice: 'en-us', g2pVoiceSlot: 1, sampleRate: 22050, lengthScale: 1.08,
    frontBytes: 1417572, decBytes: 2923300,
    frontSha256: 'f02528441a16dedb3ba9b6b283ed3193973af09f686e71b48ce0faaf11917836',
    decSha256: '754d79420be131780ae4e4d6742231f92624c1a5f567bb520949a8da83724a10',
    metaBytes: 175, metaSha256: '15088da1a5cfb37eec5a2ece93bca87e0244afda8ea89a0bc44c2299d5759574',
    params: 1084972, precision: 'FP32 browser bundle rebuilt from pinned official FP16 package',
  }),
  'sano-amy-1p8m': Object.freeze({
    modelRevision: '25410576d005d7f08d186990fd91f6a2651243de', voiceKey: 'amy-en-1p8m', label: 'Amy 1.8M',
    espeakVoice: 'en-us', g2pVoiceSlot: 1, sampleRate: 22050, lengthScale: 1.08,
    frontBytes: 3336804, decBytes: 4001700,
    frontSha256: '38fcc6ddb4aab9cd5b4dc0f87467f9e9160a1a3917ab4af7d758aee4d98c3a53',
    decSha256: 'fa1ee442380f9090562c22e1d723daeb828688a3a02068cc922b0d188d97fbd7',
    metaBytes: 175, metaSha256: '930aef9150b2a9a5164d7d04d11e61748d901a733f93359fad5ddb5b78c3a5a2',
    params: 1834380, precision: 'FP32 browser bundle rebuilt from pinned official FP16 package',
  }),
});

let model = null;
let engine = null;
let voiceMeta = null;
let restoreFetch = null;
let removeDocumentShim = null;

function profileFor(modelId) {
  const profile = PROFILES[modelId];
  if (!profile) throw new Error('Sano piperlite worker rejected an unregistered model id.');
  return profile;
}

function modelRoot(profile) {
  return `/models/${model.id}/${profile.modelRevision}/web/`;
}

function localAssetUrl(path) {
  const url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin) throw new Error(`Sano piperlite rejected a non-local asset URL: ${url.href}`);
  return url.href;
}

function installLocalFetch() {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const requested = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const url = new URL(requested, self.location.href);
    if (url.origin !== self.location.origin) throw new Error(`Sano piperlite attempted a non-local fetch: ${url.origin}`);
    return nativeFetch(input, init);
  };
  restoreFetch = () => { globalThis.fetch = nativeFetch; };
}

function installClassicScriptDocument() {
  const runtimeBase = new URL(RUNTIME_ROOT, self.location.origin);
  const allowedScripts = new Set([
    new URL('snt_g2p.js', runtimeBase).href,
    new URL('snt_voice.js', runtimeBase).href,
  ]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (previous) throw new Error('Sano piperlite expected a dedicated worker without a document global.');
  const documentShim = {
    currentScript: null,
    createElement(tagName) {
      if (tagName !== 'script') throw new Error(`Sano piperlite requested unsupported worker DOM element: ${tagName}`);
      return { src: '', async: false, onload: null, onerror: null };
    },
    head: {
      appendChild(script) {
        const url = new URL(script.src, self.location.href);
        if (url.origin !== self.location.origin || !allowedScripts.has(url.href)) {
          throw new Error(`Sano piperlite attempted an unpinned or non-local script load: ${url.href}`);
        }
        importScripts(url.href);
        script.onload?.();
        return script;
      },
    },
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true, enumerable: false, writable: true, value: documentShim,
  });
  removeDocumentShim = () => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function readPinnedAsset(url, expectedBytes, expectedSha256, label) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Sano piperlite could not load ${label}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expectedBytes) throw new Error(`${label} length mismatch: expected ${expectedBytes}, received ${bytes.byteLength}.`);
  const digest = await sha256(bytes);
  if (digest !== expectedSha256) throw new Error(`${label} SHA-256 mismatch: expected ${expectedSha256}, received ${digest}.`);
  return bytes;
}

function baseInfo(backend = 'cpu') {
  const profile = model.profile;
  const front = voiceMeta?.front || 'front_f32.bin';
  const decoder = voiceMeta?.dec || 'dec_f32.bin';
  const precision = /_f32\.bin$/.test(front) && /_f32\.bin$/.test(decoder)
    ? profile.precision : 'Voice bundle precision from pinned meta.json';
  return {
    voice: `${profile.label} (English, eSpeak ${profile.espeakVoice})`,
    precision,
    settings: {
      runtime: 'sanotts-web@0.3.0',
      runtimeSourceRevision: 'c0584a51213721faba98135821faab71bae888f0',
      modelRevision: profile.modelRevision,
      voiceKey: profile.voiceKey,
      language: 'en',
      espeakVoice: voiceMeta?.espeak_voice ?? profile.espeakVoice,
      g2pVoiceSlot: voiceMeta?.g2p_voice_slot ?? profile.g2pVoiceSlot,
      lengthScale: voiceMeta?.length_scale ?? profile.lengthScale,
      sampleRate: voiceMeta?.sample_rate ?? profile.sampleRate,
      parameterCount: profile.params,
      maxSeconds: MAX_SECONDS,
      maxPhonemeIds: MAX_PHONEME_IDS,
      executionProviders: backend === 'cpu' ? ['wasm'] : [],
      callPattern: 'One official SanoTTS.synthesize call per canonical source span; no harness text splitting.',
      assetOrigins: 'Explicit same-origin assetBase and voiceBase; cross-origin fetches and script loads are rejected.',
      disposal: 'The official wrapper has no dispose method; the dedicated worker is terminated to release its WebAssembly modules.',
    },
  };
}

function unsupported(reason) {
  return {
    ...baseInfo('unsupported'), status: 'unsupported', reason, backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function localVoiceBase() {
  return localAssetUrl(modelRoot(model.profile));
}

function requireMetadata(meta) {
  const profile = model.profile;
  if (!meta || typeof meta !== 'object') throw new Error(`Pinned Sano ${profile.label} meta.json is missing or invalid.`);
  if (meta.runtime === 'snt_nano') throw new Error(`Pinned Sano ${profile.label} selected the wrong runtime family.`);
  if (meta.key !== profile.voiceKey) throw new Error(`Pinned Sano voice key was ${String(meta.key)}; expected ${profile.voiceKey}.`);
  if (meta.espeak_voice !== profile.espeakVoice) throw new Error(`Pinned Sano eSpeak voice was ${String(meta.espeak_voice)}; expected ${profile.espeakVoice}.`);
  if (meta.g2p_voice_slot !== profile.g2pVoiceSlot) throw new Error(`Pinned Sano G2P slot was ${String(meta.g2p_voice_slot)}; expected ${profile.g2pVoiceSlot}.`);
  if (meta.sample_rate !== profile.sampleRate || meta.length_scale !== profile.lengthScale) {
    throw new Error(`Pinned Sano ${profile.label} sample rate or length scale differs from its registered profile.`);
  }
  if (meta.front_bytes !== profile.frontBytes || meta.dec_bytes !== profile.decBytes) {
    throw new Error(`Pinned Sano ${profile.label} metadata weight lengths differ from its registered profile.`);
  }
  return meta;
}

async function initialize({ backend, modelId, probe = false, probeText = 'A short browser speech check.' }) {
  if (typeof modelId !== 'string') throw new Error('Sano piperlite model id is required.');
  model = { id: modelId, profile: profileFor(modelId) };
  if (backend !== 'cpu') return unsupported('Official Sano piperlite inference is CPU WebAssembly; no WebGPU execution provider is available.');

  const rpcHandler = self.onmessage;
  try {
    installLocalFetch();
    installClassicScriptDocument();
    const { SanoTTS } = await import(localAssetUrl(RUNTIME_ROOT + 'index.js'));
    if (typeof SanoTTS?.load !== 'function') throw new Error('Pinned sanotts-web runtime did not export SanoTTS.load().');
    engine = await SanoTTS.load({ assetBase: localAssetUrl(RUNTIME_ROOT) });
    const bundle = await engine.loadVoice(model.profile.voiceKey, { voiceBase: localVoiceBase() });
    const metaBytes = await readPinnedAsset(localAssetUrl(modelRoot(model.profile) + `voices/${model.profile.voiceKey}/meta.json`),
      model.profile.metaBytes, model.profile.metaSha256, 'voice metadata');
    const parsedMeta = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metaBytes));
    voiceMeta = requireMetadata(parsedMeta);
    if (bundle?.meta) requireMetadata(bundle.meta);
    if (probe) {
      const result = await synthesize({ id: 'sano-probe', text: probeText });
      if (!result.parts[0].length) throw new Error('Sano piperlite CPU capability probe returned empty PCM.');
    }
  } catch (error) {
    await dispose();
    throw error;
  } finally {
    self.onmessage = rpcHandler;
  }

  return {
    ...baseInfo('cpu'), status: 'measured', backendEffective: 'cpu/wasm',
    capability: {
      gpuDispatchVerified: null,
      description: probe
        ? 'Official Sano piperlite Emscripten WebAssembly in a headed Chrome classic worker; an untimed CPU utterance passed; no GPU execution.'
        : 'Official Sano piperlite Emscripten WebAssembly in a headed Chrome classic worker; no GPU execution.',
    },
  };
}

async function synthesize(chunk) {
  if (!engine || !voiceMeta) throw new Error('Sano piperlite has not been initialized.');
  if (typeof chunk?.text !== 'string' || chunk.text.length === 0) throw new Error('Sano piperlite received an empty source span.');
  const result = await engine.synthesize(chunk.text, {
    voice: model.profile.voiceKey,
    voiceBase: localVoiceBase(),
    maxSeconds: MAX_SECONDS,
  });
  if (!(result?.samples instanceof Float32Array) || result.samples.length === 0) throw new Error('Official Sano runtime returned empty or non-Float32 PCM.');
  if (result.sampleRate !== model.profile.sampleRate) throw new Error(`Official Sano returned sample rate ${String(result.sampleRate)}; expected ${model.profile.sampleRate}.`);
  if (!Number.isInteger(result.phonemeCount) || result.phonemeCount < 1 || result.phonemeCount >= MAX_PHONEME_IDS) {
    throw new Error(`Official Sano returned phonemeCount=${String(result.phonemeCount)}; expected 1..${MAX_PHONEME_IDS - 1}.`);
  }
  if (result.samples.length >= model.profile.sampleRate * MAX_SECONDS) throw new Error(`Official Sano output reached its ${MAX_SECONDS}-second cap; refusing possibly clipped audio.`);
  return { parts: [result.samples], sampleRate: result.sampleRate, completedChunkId: chunk.id };
}

async function dispose() {
  engine = null;
  voiceMeta = null;
  model = null;
  restoreFetch?.();
  restoreFetch = null;
  removeDocumentShim?.();
  removeDocumentShim = null;
}

const rpcHandler = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options ?? {});
    else if (data.action === 'generate') value = await synthesize(data.chunk);
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown Sano piperlite worker action.');
    const buffers = value?.parts?.map(part => part.buffer) ?? [];
    self.postMessage({ id: data.id, value }, buffers);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  } finally {
    self.onmessage = rpcHandler;
  }
};
self.onmessage = rpcHandler;
