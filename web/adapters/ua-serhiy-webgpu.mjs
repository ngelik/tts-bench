import { createRpcAdapter } from './rpc-bridge.mjs';

export function createUaSerhiyWebGpuAdapter(modelConfig) {
  if (!modelConfig || modelConfig.id !== 'ua-serhiy-0p58m' ||
      modelConfig.source?.revision !== '1abd585d725a787b405c28a59ce1cbdfd34780bb') {
    throw new Error('Ukrainian Serhiy WebGPU adapter requires its pinned model configuration.');
  }
  return createRpcAdapter(
    new URL('../workers/ua-serhiy-0p58m-webgpu.mjs', import.meta.url),
    'Ukrainian Serhiy WebGPU',
    { modelConfig },
    { terminateOnFailure: true },
  );
}
