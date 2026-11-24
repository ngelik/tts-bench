import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaUzAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-uz.mjs', import.meta.url), 'Tiny Voca Uzbek Navoiy M2', {}, {}, { type: 'module' });
}
