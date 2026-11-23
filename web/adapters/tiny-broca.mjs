import { createRpcAdapter } from './rpc-bridge.mjs';
import { TINY_BROCA } from './tiny-broca-profile.mjs';
export function createTinyBrocaAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-broca.js', import.meta.url), 'Tiny Broca Brazilian Portuguese F1', { modelConfig: TINY_BROCA }, {}, { type: 'classic' });
}
