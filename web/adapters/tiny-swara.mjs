import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinySwaraAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-swara.mjs', import.meta.url), 'Tiny Swara Bengali BF', {}, {}, { type: 'module' });
}
