import { createRpcAdapter } from './rpc-bridge.mjs';

export function createKleinAdapter() {
  return createRpcAdapter(new URL('../workers/klein.mjs', import.meta.url), 'Klein-TTS X1.5 Pro');
}
