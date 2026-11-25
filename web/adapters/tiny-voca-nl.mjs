import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_NL } from './tiny-voca-nl-profile.mjs';

export function createTinyVocaNlAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-nl.mjs', import.meta.url),
    'Tiny Voca Dutch Alex', { modelConfig: TINY_VOCA_NL }, {}, { type: 'module' });
}
