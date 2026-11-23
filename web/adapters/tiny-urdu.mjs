import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyUrduAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-urdu.mjs', import.meta.url), 'Tiny Urdu M2');
}
