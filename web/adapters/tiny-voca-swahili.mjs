import {createRpcAdapter} from './rpc-bridge.mjs';

export function createTinyVocaSwahiliAdapter(){
  return createRpcAdapter(new URL('../workers/tiny-voca-swahili.mjs',import.meta.url),'Tiny Voca Kiswahili');
}
