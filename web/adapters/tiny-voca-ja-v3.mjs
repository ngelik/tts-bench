import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaJaV3Adapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-ja-v3.mjs', import.meta.url), 'Tiny Voca Japanese v3 F2');
}
