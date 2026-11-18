import { createRpcAdapter } from './rpc-bridge.mjs';
import { createZonos3CpuAdapter } from './zonos3-cpu.mjs';
import { ZONOS3_MODEL_CONFIG } from '../zonos3/runtime-policy.mjs';

export function createZonos3Adapter() {
  let backend = null;
  let adapter = null;
  return {
    async initialize(options) {
      await this.dispose();
      backend = options.backend;
      if (backend === 'cpu') {
        adapter = createZonos3CpuAdapter(ZONOS3_MODEL_CONFIG);
        return adapter.initialize(options);
      }
      if (backend === 'webgpu') {
        adapter = createRpcAdapter(new URL('../workers/zonos3.mjs', import.meta.url), 'ZONOS3-Mini WebGPU');
        return adapter.initialize(options);
      }
      return {
        status: 'unsupported',
        reason: 'ZONOS3-Mini supports the CPU/WASM audio.cpp route and the official WebGPU browser route only.',
        backendEffective: 'none',
        voice: ZONOS3_MODEL_CONFIG.info.voice,
        precision: 'unknown',
        settings: { ...ZONOS3_MODEL_CONFIG.info },
        capability: { gpuDispatchVerified: false, description: 'The requested backend is not supported by either pinned ZONOS3 runtime.' },
      };
    },
    async generateChunk(chunk, options) {
      if (!adapter) throw new Error('ZONOS3-Mini is not initialized.');
      return adapter.generateChunk(chunk, options);
    },
    async dispose() {
      const current = adapter;
      adapter = null;
      backend = null;
      if (current) await current.dispose();
    },
  };
}
