import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaFrAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-fr.mjs', import.meta.url), 'Tiny Voca French FR_F1', {}, {}, { type: 'module' });
}
