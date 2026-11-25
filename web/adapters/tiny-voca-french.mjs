import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_FRENCH } from './tiny-voca-french-profile.mjs';

export function createTinyVocaFrenchAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-french.js', import.meta.url), 'Tiny Voca French F1',
    { modelConfig: TINY_VOCA_FRENCH }, {}, { type: 'classic' });
}
