import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaDeEnAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-de-en.mjs', import.meta.url), 'Tiny Voca DE/EN');
}
