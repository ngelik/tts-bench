import { createRpcAdapter } from './rpc-bridge.mjs';

export function createApptorDeAdapter() {
  return createRpcAdapter(new URL('../workers/apptor-de.mjs', import.meta.url), 'Apptor Tiny TTS Standard German');
}
