import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaPtbrAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-ptbr.mjs', import.meta.url), 'Tiny Voca Brazilian Portuguese F_s4',
    {}, {}, { type: 'module' });
}
