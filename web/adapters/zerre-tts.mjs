import { createRpcAdapter } from './rpc-bridge.mjs';

export function createZerreTtsAdapter() {
  return createRpcAdapter(new URL('../workers/zerre-tts.mjs', import.meta.url), 'Zerre TTS');
}
