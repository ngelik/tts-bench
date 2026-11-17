import { createRpcAdapter } from './rpc-bridge.mjs';

export function createSoproAdapter() {
  return createRpcAdapter(new URL('../workers/sopro.mjs', import.meta.url), 'Sopro v2 Turbo');
}
