import { createRpcAdapter } from './rpc-bridge.mjs';

export function createFiatoAdapter() {
  return createRpcAdapter(new URL('../workers/fiato.mjs', import.meta.url), 'Fiato');
}
