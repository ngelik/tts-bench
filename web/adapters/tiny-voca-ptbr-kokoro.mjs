import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaPtbrKokoroAdapter() {
  return createRpcAdapter(new URL('../workers/tiny-voca-ptbr-kokoro.mjs', import.meta.url), 'Tiny Voca Brazilian Portuguese Kokoro F');
}
