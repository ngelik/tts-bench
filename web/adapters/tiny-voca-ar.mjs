import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_AR } from './tiny-voca-ar-profile.mjs';

export function createTinyVocaArAdapter() {
  return createRpcAdapter(
    new URL('../workers/tiny-voca-ar.js', import.meta.url),
    'Tiny Voca Arabic M2',
    { modelConfig: TINY_VOCA_AR },
    {},
    { type: 'classic' },
  );
}
