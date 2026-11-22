import { createRpcAdapter } from './rpc-bridge.mjs';

export function createVocinaAdapter() {
  return createRpcAdapter(new URL('../workers/vocina.mjs', import.meta.url), 'Vocina Italian');
}
