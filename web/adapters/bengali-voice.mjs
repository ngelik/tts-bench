import { createRpcAdapter } from './rpc-bridge.mjs';

export function createBengaliVoiceAdapter() {
  return createRpcAdapter(new URL('../workers/bengali-voice.mjs', import.meta.url), 'Bengali Voice CPU');
}
