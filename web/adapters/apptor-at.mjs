import { createRpcAdapter } from './rpc-bridge.mjs';

export function createApptorAtAdapter() {
  return createRpcAdapter(new URL('../workers/apptor-at.mjs', import.meta.url), 'Apptor Tiny TTS Austrian German');
}
