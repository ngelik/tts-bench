import { createRpcAdapter } from './rpc-bridge.mjs';

export function createTinyVocaJaTsukuyomiChanAdapter() {
  return createRpcAdapter(
    new URL('../workers/tiny-voca-ja-tsukuyomi-chan.mjs', import.meta.url),
    'Tiny Voca Japanese Tsukuyomi-chan',
  );
}
