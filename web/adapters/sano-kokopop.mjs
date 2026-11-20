import { createRpcAdapter } from './rpc-bridge.mjs';

const WORKER_URL = new URL('../workers/sano-kokopop.mjs', import.meta.url);

function unsupported(model, reason) {
  return {
    ...(model?.info || {}),
    status: 'unsupported',
    reason,
    backendEffective: 'none',
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

export function createSanoKokopopAdapter(modelConfig) {
  if (!modelConfig || !/^sano-(?:heart-nano-gguf-f32|heart-gguf|amy-gguf|amy-small-gguf|amy-1p8m-gguf|hfc-gguf|kristin-gguf)$/.test(modelConfig.id) || !modelConfig.model ||
      !modelConfig.runtime || !modelConfig.info || ![22050, 24000].includes(modelConfig.info.settings?.sampleRate)) {
    throw new Error('Kokopop adapter requires the separately locked Sano GGUF profile.');
  }
  let workerAdapter = null;
  let initialized = false;

  return {
    async initialize(options = {}) {
      if (initialized) throw new Error('Kokopop adapter instances initialize only once.');
      const backend = options.backend;
      if (backend !== 'cpu' && backend !== 'webgpu') {
        return unsupported(modelConfig, 'This Kokopop profile requires an explicit CPU or WebGPU backend.');
      }
      workerAdapter = createRpcAdapter(WORKER_URL, 'Kokopop Sano GGUF');
      try {
        const report = await workerAdapter.initialize({
          ...options,
          backend,
          modelConfig,
        });
        if (report?.status === 'unsupported') {
          await workerAdapter.dispose().catch(() => {});
          workerAdapter = null;
          return report;
        }
        if (report?.status !== 'measured' ||
            report.backendEffective !== (backend === 'webgpu' ? 'webgpu+wasm' : 'cpu/wasm')) {
          throw new Error('Kokopop returned an unexpected effective backend or initialization status.');
        }
        if (backend === 'webgpu' && options.probe === true && report.capability?.gpuDispatchVerified !== true) {
          throw new Error('Kokopop WebGPU probe did not verify real device dispatch.');
        }
        initialized = true;
        return report;
      } catch (error) {
        await workerAdapter.dispose().catch(() => {});
        workerAdapter = null;
        throw error;
      }
    },

    async generateChunk(chunk, options = {}) {
      if (!initialized || !workerAdapter) throw new Error('Kokopop adapter is not initialized.');
      if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 ||
          !Number.isSafeInteger(chunk.start) || !Number.isSafeInteger(chunk.end) ||
          typeof chunk.text !== 'string' || chunk.end - chunk.start !== chunk.text.length) {
        throw new Error('Kokopop requires an exact canonical source-text chunk.');
      }
      const response = await workerAdapter.generateChunk(chunk, options);
      if (!response || response.completedChunkId !== chunk.id || response.sampleRate !== modelConfig.info.settings.sampleRate ||
          !Array.isArray(response.parts) || response.parts.length !== 1 ||
          !(response.parts[0] instanceof Float32Array) || !response.parts[0].length) {
        throw new Error('Kokopop returned invalid PCM or a sample rate that differs from the selected Sano profile.');
      }
      return response;
    },

    async dispose() {
      const current = workerAdapter;
      workerAdapter = null;
      initialized = false;
      if (current) await current.dispose();
    },
  };
}
