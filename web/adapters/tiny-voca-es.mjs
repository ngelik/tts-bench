import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaEsAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-es.mjs', import.meta.url), 'Tiny Voca Spanish F2',
    {}, {}, { type: 'module' });
}
