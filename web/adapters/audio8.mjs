import { validateAudio8Article } from '../audio8/signal.mjs';
import { createRpcAdapter } from './rpc-bridge.mjs';

export function createAudio8Adapter() {
  const engine = createRpcAdapter(new URL('../workers/audio8.mjs', import.meta.url), 'Audio8 Realistic');
  return { ...engine, validateArticle: validateAudio8Article };
}
