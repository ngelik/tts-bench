import { createRpcAdapter } from './rpc-bridge.mjs';

export function createAlpaEsAdapter() {
  return createRpcAdapter(new URL('../workers/alpa-es.mjs', import.meta.url), 'Alpa Spanish female',
    {}, {}, { type: 'module' });
}
