import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaSinhalaAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-sinhala.mjs', import.meta.url), 'Tiny Voca Sinhala');
}
