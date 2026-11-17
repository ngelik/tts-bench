import { createRpcAdapter } from './rpc-bridge.mjs';
import { LinnetGpuPool } from '../linnet/model-gpu-pool.mjs';

export function createLinnetAdapter() {
  let adapter = null;
  let gpuPool = null;
  const ensureAdapter = () => {
    if (adapter) return adapter;
    adapter = createRpcAdapter(new URL('../workers/linnet.mjs', import.meta.url), 'LinnetTTS', {}, {
      terminateOnFailure: true,
      onMessage(data) {
        if (data?.type !== 'linnet-gpu-request') return false;
        gpuPool?.dispatch(data.request).catch(error => adapter?.abort(error));
        return true;
      },
      onFailure() { gpuPool?.terminate(); },
      onDispose() { gpuPool?.terminate(); },
    });
    return adapter;
  };
  return {
    async initialize(options = {}) {
      const selected = ensureAdapter();
      if (options.backend === 'webgpu') {
        gpuPool = new LinnetGpuPool({ onCrash: error => selected.abort(error) });
        const gpuAdapterInfo = await gpuPool.initialize({ allowSoftwareGpu: options.allowSoftwareGpu === true });
        return selected.initialize({ ...options, gpuAdapterInfo });
      }
      return selected.initialize(options);
    },
    generateChunk(...args) { return ensureAdapter().generateChunk(...args); },
    dispose() { return adapter?.dispose() ?? Promise.resolve(); },
    abort(error) { adapter?.abort(error); gpuPool?.terminate(); },
    gpuDiagnostics() { return gpuPool?.diagnostics() ?? null; },
  };
}
