import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_VOCA_GR } from './tiny-voca-gr-profile.mjs';

export function createTinyVocaGrAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-gr.mjs', import.meta.url), 'Tiny Voca Greek M',
    { modelConfig: TINY_VOCA_GR }, {}, { type: 'module' });
}
