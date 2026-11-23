import {createRpcAdapter} from './rpc-bridge.mjs';

export function createAlpaSanskritAdapter() {
  return createRpcAdapter(new URL('../workers/alpa-sanskrit.mjs', import.meta.url), 'Alpa (Sanskrit)');
}
