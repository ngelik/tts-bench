import { createRpcAdapter } from './rpc-bridge.mjs';
import { KOREAN_TTS_PROFILE } from './korean-tts-config.mjs';

export function createKoreanTtsAdapter() {
  return createRpcAdapter(new URL('../workers/korean-tts.js', import.meta.url), 'Korean TTS',
    { modelConfig: KOREAN_TTS_PROFILE }, {}, { type: 'classic' });
}
