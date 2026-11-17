import { validatePcm16Article } from '../audio8/signal.mjs';
import { createRpcAdapter } from './rpc-bridge.mjs';

export function createSoproAdapter() {
  const worker = createRpcAdapter(new URL('../workers/sopro.mjs', import.meta.url), 'Sopro v2 Turbo');
  return { ...worker, validateArticle: (pcm, rate, counts) => validatePcm16Article(pcm, rate, counts, 'Sopro') };
}
