import { createRpcAdapter } from './rpc-bridge.mjs';

export function createKaleAdapter(profile) {
  return createRpcAdapter(new URL('../workers/kale.mjs', import.meta.url), 'Kale Nano', { profile });
}
