import { createRpcAdapter } from './rpc-bridge.mjs';
export function createInflectAtomAdapter() {
  return createRpcAdapter(new URL('../workers/inflect-atom.mjs', import.meta.url), 'Inflect Atom v3');
}
