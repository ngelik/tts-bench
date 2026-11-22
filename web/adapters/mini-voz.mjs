import { createRpcAdapter } from './rpc-bridge.mjs';

export function createMiniVozAdapter() {
  return createRpcAdapter(new URL('../workers/mini-voz.mjs', import.meta.url), 'Mini Voz Spanish (Spain)');
}
