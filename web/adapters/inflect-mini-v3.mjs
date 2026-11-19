import { createRpcAdapter } from './rpc-bridge.mjs';

export function createInflectMiniV3Adapter() {
  return createRpcAdapter(new URL('../workers/inflect-mini-v3.mjs', import.meta.url), 'Inflect Mini v3');
}
