import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaPtptAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-ptpt.mjs', import.meta.url), 'Tiny Voca European Portuguese F3',
    {}, {}, { type: 'module' });
}
