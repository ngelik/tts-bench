import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTuiVoiceMiniMlAdapter() {
  return createRpcAdapter(new URL('../workers/tui-voice-mini-ml.mjs', import.meta.url), 'Tui Voice Mini Malayalam F2');
}
