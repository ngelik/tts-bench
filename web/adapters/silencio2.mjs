import { createRpcAdapter } from './rpc-bridge.mjs';

export function createSilencio2Adapter() {
  return createRpcAdapter(new URL('../workers/silencio2.mjs', import.meta.url), 'Silencio-2');
}
