import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_HE } from './tiny-voca-he-profile.mjs';

export function createTinyVocaHeAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-he.js', import.meta.url),
    'Tiny Voca Hebrew AH', { modelConfig: TINY_VOCA_HE }, {}, { type: 'classic' });
}
