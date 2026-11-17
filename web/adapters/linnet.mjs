import { createRpcAdapter } from './rpc-bridge.mjs';

export function createLinnetAdapter() {
  return createRpcAdapter(new URL('../workers/linnet.mjs', import.meta.url), 'LinnetTTS');
}
