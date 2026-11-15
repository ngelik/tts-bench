import { createRpcAdapter } from './rpc-bridge.mjs';
export function createTinyVocaAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca.mjs', import.meta.url), 'Tiny Voca');
}
