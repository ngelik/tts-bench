import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_HINDI } from './tiny-voca-hindi-profile.mjs';

export function createTinyVocaHindiAdapter() {
  return createRpcAdapter(
    new URL('../workers/tiny-voca-hindi.mjs', import.meta.url),
    'Tiny Voca Hindi Rasa',
    { modelConfig: TINY_VOCA_HINDI },
    {},
    { type: 'module' },
  );
}
