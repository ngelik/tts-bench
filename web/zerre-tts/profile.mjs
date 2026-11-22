export const modelRevision = '55753a04ae624998cba86f7c17625616e318124e';
export const browserSourceRevision = 'cf3cdfaaa54a9e8ec541081bb5c2e97c3d563db4';
export const fixtureOracle = Object.freeze({
  fixtureId: 'tr-article-v1',
  language: 'tr',
  sourceSha256: '95e1958fe7385da7aa79d54c30230518e8be360848f2c824ce7639414ce8f3d3',
  spans: 94,
  plans: 307,
  maximumTokens: 204,
  tokenStressIncludedSha256: 'dc815086a7cf78ec351cbc7e2e33de2254e08e7413eb45761fadce630c6c063c',
  digitPieces: 39,
  digitSpanIds: Object.freeze([3, 5, 10, 11, 12, 13, 15, 16, 19, 20, 28, 32, 33, 34, 37, 41, 42, 43, 45, 49, 50, 55, 56, 58, 59, 60, 63, 69, 70, 76, 79, 82, 86, 92, 93]),
});

export const defaultVoice = 'SES-A';
export const defaultVoiceIndex = 0;
export const releasedVoices = Object.freeze({ 'SES-A': 0, 'SES-B': 1 });
export const sampleRate = 24000;
export const hop = 256;
export const maxTokens = 512;
export const maxFrames = 3000;
export const symbolCount = 62;
export const lexiconWordCount = 25344;

export const assetDigests = Object.freeze({
  'model.json': [893, '6676fda5a30fa4a3aefe6b7a453bec8ae92d2128be0646706ac262b267ca9ec9'],
  'model.onnx': [8549070, '4c3d0d989a0376675f27645e4a6116bbff0dd8cd12208185c8069b6f7330115e'],
  'lexicon-tr.json': [1174675, '31ea64f92811e555885f4d80dba01444db078ef45963f3cf67e86ffffeb64e8f'],
  'phonemize-tr.js': [2774, '5428b2272d85a436384a8a23425a9b7fff804df57fc7459bf832874151626b2e'],
  'ort.wasm.min.mjs': [48904, 'f53ed4792e758e7232f779d479eb8931b97ff3ab2e3b9a33ee00d1251ffdaad6'],
  'ort.webgpu.min.mjs': [333468, 'e1a0817ac08d5a6ade7f229754c2aecd444bff0bd22c259ca148a04b9f9e9f65'],
  'ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
  'ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
  'ort-wasm-simd-threaded.jsep.mjs': [46839, '2fb14505d39926e4c544de8c57fe59a2f2bc74caba6f71890be9afecc5046758'],
  'ort-wasm-simd-threaded.jsep.wasm': [21663894, '185b0861a6cd6cbdfb057289338090436483cc59e10a7bc83bd167b15531a51b'],
});

export function validateZerreMetadata(metadata, lexicon) {
  const requiredInputs = ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'];
  if (metadata?.sample_rate !== sampleRate || metadata?.hop !== hop || metadata?.max_tokens !== maxTokens ||
      metadata?.max_frames !== maxFrames || metadata?.step !== 65000 || metadata?.frontend !== 'espeak' ||
      metadata?.frontend_fingerprint !== '9c85175f6d2d1d6317bf822b3d959de993df257e2b515c971d439fdab343cd3a' ||
      JSON.stringify(metadata?.voices) !== JSON.stringify(['MK', 'NK']) ||
      JSON.stringify(metadata?.inputs) !== JSON.stringify(requiredInputs) ||
      JSON.stringify(metadata?.outputs) !== JSON.stringify(['audio', 'durations']) ||
      !Array.isArray(metadata?.symbols) || metadata.symbols.length !== symbolCount ||
      !Array.isArray(lexicon?.symbols) || JSON.stringify(lexicon.symbols) !== JSON.stringify(metadata.symbols) ||
      !lexicon?.words || Object.keys(lexicon.words).length !== lexiconWordCount) {
    throw new Error('Pinned Zerre browser metadata, lexicon or model symbol inventory is inconsistent.');
  }
  return metadata;
}
