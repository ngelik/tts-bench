import { createRpcAdapter } from './rpc-bridge.mjs';

export function createInflectMicroV3Adapter() {
  return createRpcAdapter(new URL('../workers/inflect-micro-v3.mjs', import.meta.url), 'Inflect Micro v3');
}
