import { createRpcAdapter } from './rpc-bridge.mjs';

export function createSupraTTSAdapter() {
  return createRpcAdapter(new URL('../workers/supratts.mjs', import.meta.url), 'SupraTTS-1.0-Preview');
}
