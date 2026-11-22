import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_RU } from './tiny-voca-ru-profile.mjs';

export function createTinyVocaRuAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-ru.js', import.meta.url), 'Tiny Voca Russian',
    { modelConfig: TINY_VOCA_RU }, {}, { type: 'classic' });
}
