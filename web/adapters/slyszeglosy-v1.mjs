import { createRpcAdapter } from './rpc-bridge.mjs';
import { SLYSZE_GLOSY_V1_PROFILE } from './slyszeglosy-v1-config.mjs';

export function createSlyszeglosyV1Adapter() {
  return createRpcAdapter(new URL('../workers/slyszeglosy-v1.js', import.meta.url), 'Słyszę Głosy V1',
    { modelConfig: SLYSZE_GLOSY_V1_PROFILE }, {}, { type: 'classic' });
}
