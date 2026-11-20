import { createRpcAdapter } from './rpc-bridge.mjs';
import { UA_SERHIY_CONFIG } from './ua-serhiy-config.mjs';

export function createUaSerhiyAdapter(modelConfig = UA_SERHIY_CONFIG) {
  let delegate = null;
  return {
    async initialize(options = {}) {
      await this.dispose();
      if (options.backend === 'webgpu') {
        const { createUaSerhiyWebGpuAdapter } = await import('./ua-serhiy-webgpu.mjs');
        delegate = createUaSerhiyWebGpuAdapter(modelConfig);
        return delegate.initialize(options);
      }
      delegate = createRpcAdapter(
        new URL('../workers/ua-serhiy-cpu.mjs', import.meta.url),
        'Ukrainian Serhiy CPU',
        { modelConfig },
      );
      return delegate.initialize(options);
    },
    async generateChunk(chunk, hooks) {
      if (!delegate) throw new Error('Ukrainian Serhiy has not been initialized.');
      return delegate.generateChunk(chunk, hooks);
    },
    async dispose() {
      const current = delegate;
      delegate = null;
      if (current) await current.dispose();
    },
  };
}
