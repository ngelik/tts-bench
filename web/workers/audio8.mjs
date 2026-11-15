import {observeComputeDispatches, requestHardwareWebGpuAdapter} from '../piper/webgpu.mjs';
import {fetchModelAsset} from '../cache-model-asset.mjs';
import {promptTokens, generateCodes, decodeCodes} from '../audio8/generation.mjs';

import {pcmSignal, checkSignal} from '../audio8/signal.mjs';

const modelRoot = '/models/audio8-realistic/';
const modelRevision = '04313606782af6b9a1aa93724555bc7b64ba9197';
const ortRoot = '/runtimes/onnxruntime-web/1.31.1/';
const sessions = {};
let ort, tokenizer;
const voice = 'Reference-free English synthesis';
const wasmThreads = 6;
const precision = 'INT4 slow/fast AR, FP16 codec';
async function dispose() {
  for (const [key, session] of Object.entries(sessions)) { await session.release(); delete sessions[key]; }
  tokenizer = null;
}
async function loadSession(file, providers) {
  const external = `${file}.onnx.data`;
  const graph = await fetchModelAsset(modelRoot + file + '.onnx', modelRevision);
  const weights = await fetchModelAsset(modelRoot + external, modelRevision);
  return ort.InferenceSession.create(new Uint8Array(await graph.arrayBuffer()), {
    executionProviders:providers, externalData:[{path:external, data:new Uint8Array(await weights.arrayBuffer())}],
  });
}
async function initialize({backend, probe, probeText}) {
  const gpu = backend === 'webgpu';
  const policy = await (await fetchModelAsset(modelRoot + 'provider-policy-v2.json', '340c0a5e706f3029febd1600181a6b7cf88a2fd65fd181d81d7388160ba02b33')).json();
  const providers = policy.autoregressive[backend];
  const settings = {executionProviders:providers, codecExecutionProviders:policy.codec, providerPolicyVersion:policy.version, language:'en', sampleRate:44100, temperature:0.7, topP:0.9, topK:50,
    seed:42, wasmThreads, maxFrames:1024, voiceSelection:voice, sampling:'Seeded JS categorical draw with upstream top-p-before-temperature and ten-frame repetition resampling.',
    chunking:'One complete source span per reference-free prompt, one full decoder call after EOS.'};
  let adapter, description;
  if (gpu) {
    const hardware = await requestHardwareWebGpuAdapter(navigator.gpu);
    if (hardware.reason) return {status:'unsupported', reason:hardware.reason, backendEffective:'none', voice, precision, settings, capability:{gpuDispatchVerified:false, description:hardware.reason}};
    adapter = hardware.adapter; description = hardware.description;
  }
  const bundle = 'ort-wasm-simd-threaded' + (gpu ? '.asyncify' : '');
  ort = await import(ortRoot + (gpu ? 'ort.webgpu.min.mjs' : 'ort.wasm.min.mjs'));
  ort.env.wasm.numThreads = wasmThreads;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {mjs:ortRoot + bundle + '.mjs', wasm:ortRoot + bundle + '.wasm'};
  const wasmSha256 = gpu ? 'ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec'
                         : '4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d';
  const wasm = await fetchModelAsset(ortRoot + bundle + '.wasm', wasmSha256);
  ort.env.wasm.wasmBinary = await wasm.arrayBuffer();
  if (gpu) ort.env.webgpu.adapter = adapter;
  const transformers = await import('/runtimes/transformers/3.5.1/transformers.min.js');
  transformers.env.allowRemoteModels = false;
  const data = await (await fetchModelAsset(modelRoot + 'tokenizer/tokenizer.json', modelRevision)).json();
  tokenizer = new transformers.PreTrainedTokenizer(data, {tokenizer_class:'PreTrainedTokenizer', unk_token:'<|endoftext|>'});
  sessions.slow = await loadSession('slow_ar_int4', providers);
  sessions.fast = await loadSession('fast_ar_int4', providers);
  sessions.decoder = await loadSession('codec_decoder_fp16', policy.codec);
  let dispatchCount = 0;
  if (probe) {
    const observation = gpu ? observeComputeDispatches(self) : null;
    let codes;
    try { codes = await generateCodes(ort, sessions, promptTokens(tokenizer, probeText || 'Hello.')); }
    finally { dispatchCount = observation?.stop() ?? 0; }
    const codecObservation = gpu ? observeComputeDispatches(self) : null;
    let codecDispatches;
    try {
      const pcm = await decodeCodes(ort, sessions.decoder, codes);
      checkSignal(pcmSignal(pcm), 44100);
    } finally { codecDispatches = codecObservation?.stop() ?? 0; }
    if (codecDispatches) throw new Error('Audio8 WASM-only codec submitted GPU dispatches');
    if (gpu && !dispatchCount) throw new Error('Audio8 compatibility probe observed zero GPU dispatches');
  }
  return {status:'measured', backendEffective:gpu ? 'webgpu+wasm' : 'cpu/wasm', voice, precision, settings,
    capability:{gpuDispatchVerified:dispatchCount>0, description:gpu ? `${dispatchCount} autoregressive dispatches in separate capability probe; WASM-only codec (0 dispatches).` : 'Six-thread WebAssembly.'}, ...(gpu ? {gpu:description} : {})};
}
// Diagnostic only. Replay the identical GPU-generated codebooks through both
// decoder placements, with counters scoped to each stage and CPU-readable PCM.
async function replayCodecs(text) {
  const observation = observeComputeDispatches(self);
  let codes, arDispatches;
  try { codes = await generateCodes(ort, sessions, promptTokens(tokenizer, text)); }
  finally { arDispatches = observation.stop(); }
  if (!arDispatches) throw new Error('Diagnostic requires hardware autoregressive dispatch');
  const digest = async data => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  async function capture(session) {
    const counter = observeComputeDispatches(self);
    let pcm, dispatches;
    try { pcm = await decodeCodes(ort, session, codes); }
    finally { dispatches = counter.stop(); }
    return { pcm, stage: { dispatches, pcmSha256: await digest(pcm), ...pcmSignal(pcm) } };
  }
  const legacyDecoder = await loadSession('codec_decoder_fp16', ['webgpu', 'wasm']);
  let legacy;
  try { legacy = (await capture(legacyDecoder)).stage; }
  finally { await legacyDecoder.release(); }
  const corrected = await capture(sessions.decoder);

  return { arDispatches, codesSha256: await digest(codes), frames: codes.length / 10,
    legacy, corrected: corrected.stage, parts: [corrected.pcm] };
}

self.onmessage = async ({data}) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'replay-codecs') value = await replayCodecs(data.text);
    else if (data.action === 'audit') value = promptTokens(tokenizer, data.text);
    else if (data.action === 'generate') {
      const {chunk} = data;
      if (!chunk.text || chunk.end - chunk.start !== chunk.text.length) throw new Error('Invalid Audio8 source span');
      const codes = await generateCodes(ort, sessions, promptTokens(tokenizer, chunk.text));
      const pcm = await decodeCodes(ort, sessions.decoder, codes);
      self.postMessage({id:data.id, event:'first-pcm'});
      value = {parts:[pcm], sampleRate:44100, completedChunkId:chunk.id};
    } else if (data.action === 'dispose') {await dispose(); value = true;}
    else throw new Error('Unknown Audio8 worker request');
    self.postMessage({id:data.id, value}, value?.parts?.map(part=>part.buffer) ?? []);
  } catch(e) {
    if (data.action === 'initialize') await dispose();
    self.postMessage({id:data.id, error:String(e.message || e)});
  }
};
