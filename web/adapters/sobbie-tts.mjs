import {createRpcAdapter} from './rpc-bridge.mjs';

export function createSobbieTTSAdapter() {
  return createRpcAdapter(new URL('../workers/sobbie-tts.mjs', import.meta.url), 'SobbieTTS');
}
