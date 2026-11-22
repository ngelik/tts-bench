import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaItAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-it.mjs', import.meta.url), 'Tiny Voca Italian');
}
