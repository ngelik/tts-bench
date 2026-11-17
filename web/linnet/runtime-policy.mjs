export const LINNET_WEBGPU_RUNTIME = Object.freeze({
  sourceRepository: 'https://github.com/VoxRT/LinnetTTS',
  sourceCommit: '29dfdd503a3930e4e36c1130e4c9aab0592201ca',
  license: 'Apache-2.0',
  rustToolchain: '1.95.0',
  minimumMacs: 32 * 1024,
  target: 'runtimes/linnet-tts/0.1.1/linnet-tts-webgpu-hybrid.wasm',
  sha256: 'ccc548d95dd11ab2b05798b2712f9163b3f8444ff6c5e6c9dbc448dda2cf2bcf',
  bytes: 402265,
});

const SOFTWARE_ADAPTER = /swiftshader|llvmpipe|lavapipe|software|microsoft warp|basic render driver/i;

export function isSoftwareWebGpuAdapter(adapter, info = null) {
  const identity = [info?.vendor, info?.architecture, info?.device, info?.description].filter(Boolean).join(' ');
  return adapter?.isFallbackAdapter === true || info?.isFallbackAdapter === true || SOFTWARE_ADAPTER.test(identity);
}

export function shouldDispatchDenseMacs(m, k, n) {
  if (![m, k, n].every(value => Number.isSafeInteger(value) && value > 0)) return false;
  const macs = m * k * n;
  return Number.isSafeInteger(macs) && macs >= LINNET_WEBGPU_RUNTIME.minimumMacs;
}
