import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_FA } from './tiny-voca-fa-profile.mjs';

export function createTinyVocaFaAdapter() {
  return createRpcAdapter(
    new URL('../workers/tiny-voca-fa.js', import.meta.url),
    'Tiny Ava Persian Parisa',
    { modelConfig: TINY_VOCA_FA },
    {},
    { type: 'classic' },
  );
}
