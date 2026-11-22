import { createRpcAdapter } from './rpc-bridge.mjs';

export function createClarviaTtsTinyAdapter() {
  return createRpcAdapter(new URL('../workers/clarvia-tts-tiny.mjs', import.meta.url), 'Clarvia TTS Tiny');
}
