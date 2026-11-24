import { createRpcAdapter } from './rpc-bridge.mjs';

export function createBlueBuffAdapter() {
  return createRpcAdapter(new URL('../workers/blue-buff.mjs', import.meta.url), 'Blue-Buff Tiny Voca Mandarin F');
}
