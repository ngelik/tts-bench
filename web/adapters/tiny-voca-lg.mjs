import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaLgAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-lg.mjs', import.meta.url), 'Tiny Voca Luganda F2', {}, {}, { type: 'module' });
}
