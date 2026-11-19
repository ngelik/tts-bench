import { validatePcm16Article } from '../audio8/signal.mjs';
import { createRpcAdapter } from './rpc-bridge.mjs';
export function createInflectAtomAdapter() {
  const worker = createRpcAdapter(new URL('../workers/inflect-atom.mjs', import.meta.url), 'Inflect Atom v3');
  return { ...worker, validateArticle: (pcm, rate, counts) => validatePcm16Article(pcm, rate, counts, 'Inflect Atom v3') };
}
