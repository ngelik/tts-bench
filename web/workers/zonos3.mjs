import { createRpcAdapter } from '../adapters/rpc-bridge.mjs';
import { engine, localFetch, dispose as disposeEngine, getLastDispatchProbe, getSelectedAdapterInfo } from '../zonos3/runtime/engine.js';
import {
  ZONOS3_MODEL_CONFIG, ZONOS3_REQUEST_SETTINGS, ZONOS3_VOICE_ID, ZONOS3_VOICE_LABEL, ZONOS3_WEB_BASE,
} from '../zonos3/runtime-policy.mjs';

const SAMPLE_RATE = 44100;
let initialized = false;

function unsupported(reason) {
  return {
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    voice: ZONOS3_VOICE_LABEL,
    precision: 'not initialized',
    settings: { ...ZONOS3_MODEL_CONFIG.info },
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

function makeRequest(chunk) {
  return {
    ...ZONOS3_REQUEST_SETTINGS,
    text: chunk.text,
    format: 'pcm',
    seed: 42 + Number(chunk.id),
  };
}

async function generate(chunk, onFirstPcm, { probeDispatch = false } = {}) {
  if (!initialized) throw new Error('ZONOS3-Mini WebGPU runtime is not initialized.');
  if (!Number.isSafeInteger(Number(chunk.id)) || Number(chunk.id) < 0) throw new Error('ZONOS3 requires a nonnegative canonical chunk id.');
  const response = await localFetch('/v2/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(probeDispatch ? { 'x-benchmark-dispatch-probe': '1' } : {}),
    },
    body: JSON.stringify(makeRequest(chunk)),
  });
  if (!response.ok) throw new Error(`ZONOS3 generation failed: HTTP ${response.status} ${await response.text()}`);
  const sampleRate = Number(response.headers.get('x-audio-sample-rate'));
  if (sampleRate !== SAMPLE_RATE || response.headers.get('x-audio-format') !== 'float32') {
    throw new Error(`ZONOS3 returned an unexpected PCM format (${sampleRate} Hz, ${response.headers.get('x-audio-format')}).`);
  }
  if (Number(response.headers.get('x-seed')) !== 42 + Number(chunk.id)) {
    throw new Error('ZONOS3 did not preserve the benchmark chunk seed.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ZONOS3 returned no streamed PCM body.');
  const parts = [];
  let remainder = new Uint8Array(0);
  let firstPcmReported = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    const joined = new Uint8Array(remainder.length + value.length);
    joined.set(remainder);
    joined.set(value, remainder.length);
    const usableLength = joined.length - (joined.length % Float32Array.BYTES_PER_ELEMENT);
    remainder = joined.slice(usableLength);
    if (usableLength === 0) continue;
    const floats = new Float32Array(usableLength / Float32Array.BYTES_PER_ELEMENT);
    const view = new DataView(joined.buffer, joined.byteOffset, usableLength);
    for (let index = 0; index < floats.length; index++) floats[index] = view.getFloat32(index * 4, true);
    parts.push(floats);
    if (!firstPcmReported && floats.length) {
      firstPcmReported = true;
      onFirstPcm?.();
    }
  }
  if (remainder.length) throw new Error(`ZONOS3 ended with ${remainder.length} trailing byte(s) after float32 PCM.`);
  if (!parts.length || !parts.some(part => part.length)) throw new Error('ZONOS3 returned an empty audio stream.');
  return { parts, sampleRate, completedChunkId: chunk.id,
    ...(probeDispatch ? { dispatchProbe: getLastDispatchProbe() } : {}) };
}

async function initialize({ backend, probe = false, probeText = 'A short local speech check.' }) {
  initialized = false;
  if (backend !== 'webgpu') return unsupported('The official ZONOS3 browser runtime requires a WebGPU backend.');
  try {
    await engine.init(() => {}, { base: ZONOS3_WEB_BASE, cache: true, voiceIds: [ZONOS3_VOICE_ID] });
    initialized = true;
    const dispatches = probe ? await (async () => {
      const out = await generate({ id: 0, text: probeText }, null, { probeDispatch: true });
      if (out.parts.some(part => !part.every(Number.isFinite))) throw new Error('ZONOS3 WebGPU probe returned nonfinite PCM.');
      const evidence = out.dispatchProbe;
      if (!evidence || !Number.isSafeInteger(evidence.dispatches) || typeof evidence.restored !== 'boolean') {
        throw new Error('ZONOS3 engine worker returned no complete dispatch-probe evidence.');
      }
      if (!evidence.restored) throw new Error('ZONOS3 could not confirm that dispatch instrumentation was removed after the probe.');
      const count = evidence.dispatches;
      if (!count) throw new Error('ZONOS3 probe synthesized audio but no WebGPU compute dispatch was observed.');
      return count;
    })() : null;
    const selectedAdapter = getSelectedAdapterInfo();
    if (!selectedAdapter) throw new Error('ZONOS3 engine worker did not report the selected WebGPU adapter.');
    const gpu = [selectedAdapter.description, selectedAdapter.vendor, selectedAdapter.architecture, selectedAdapter.device]
      .filter(Boolean).join(' / ') || 'Hardware WebGPU adapter';
    return {
      status: 'measured',
      backendEffective: 'webgpu+cpu-codec-host',
      gpu,
      voice: ZONOS3_VOICE_LABEL,
      precision: 'Pinned official Web export; tensor formats are declared per-tensor in its manifests.',
      settings: {
        ...ZONOS3_MODEL_CONFIG.info,
        selectedVoiceIds: [ZONOS3_VOICE_ID],
        selectedAdapter,
        gpuExecution: 'Official ZONOS3 backbone and keep2_plain decoder WebGPU kernels.',
        cpuExecution: 'Host iSTFT, FIR mixing, resampling, benchmark text pass-through, streamed float32 readback.',
        loadedVoiceAssets: 'The official client loads Imogen preview audio; the worker loads its reference codes and embedding. CPU/WASM uses only the same embedding sidecar.',
        dispatchProbe: 'Separate untimed generation; hooks are removed before scored generation.',
      },
      capability: {
        gpuDispatchVerified: dispatches === null ? null : dispatches > 0,
        description: dispatches === null
          ? `Selected hardware WebGPU adapter ${gpu}; no dispatch probe was requested.`
          : `Selected hardware adapter ${gpu}; observed ${dispatches} compute dispatches during separate untimed generation. The neural backbone and decoder use WebGPU; codec host iSTFT/FIR/resampling and PCM readback use CPU.`,
      },
    };
  } catch (error) {
    initialized = false;
    disposeEngine();
    const message = String(error?.message ?? error);
    if (message.includes('ZONOS3_UNSUPPORTED_WEBGPU:')) {
      return unsupported(message.replace(/^.*?ZONOS3_UNSUPPORTED_WEBGPU:\s*/s, ''));
    }
    throw error;
  }
}

async function dispose() {
  initialized = false;
  disposeEngine();
}

self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.action === 'initialize') value = await initialize(data.options);
    else if (data.action === 'generate') value = await generate(data.chunk, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
    else if (data.action === 'dispose') { await dispose(); value = null; }
    else throw new Error('Unknown ZONOS3 action');
    self.postMessage({ id: data.id, value }, value?.parts?.map(part => part.buffer) ?? []);
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.stack ?? error?.message ?? error) });
  }
};
