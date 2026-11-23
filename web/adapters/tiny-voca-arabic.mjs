import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_ARABIC } from './tiny-voca-arabic-profile.mjs';

export function createTinyVocaArabicAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-arabic.js', import.meta.url),
    'Tiny Voca Arabic CATT a000', { modelConfig: TINY_VOCA_ARABIC }, {}, { type: 'classic' });
}
