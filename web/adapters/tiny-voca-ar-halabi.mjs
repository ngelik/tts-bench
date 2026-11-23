import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_AR_HALABI } from './tiny-voca-ar-halabi-profile.mjs';

export function createTinyVocaArHalabiAdapter() {
  return createRpcAdapter(
    new URL('../workers/tiny-voca-ar-halabi.js', import.meta.url),
    'Tiny Voca Arabic Halabi F2',
    { modelConfig: TINY_VOCA_AR_HALABI },
    {},
    { type: 'classic' },
  );
}
