export const modelRevision = '280f40c307acf04138a5227b6cf9b1544e5886b4';
export const browserSourceRevision = '0c57fab284e58e0bad620f21790e631d5dec17f8';
export const sampleRate = 24000;
export const hop = 256;
export const defaultVoice = 'EM4';
export const defaultVoiceIndex = 12;
export const releasedVoices = Object.freeze({ EM4: 12, EF4: 13 });
export const fixtureOracle = Object.freeze({
  fixtureId: 'it-article-v1',
  language: 'it',
  sourceSha256: '9deb44d6edb942644c0e018446040f24984e2c2a032a9665b3bb4d4bff17023a',
  spans: 107,
  utterances: 346,
  maximumTokens: 205,
  tokenStressSha256: '459fb1bd3052d810baa65c3471f352c8eb541b94ccc7b43a1023554ebf31cc1e',
  unknowns: Object.freeze([
    Object.freeze({ span: 30, symbols: Object.freeze(['h']) }),
    Object.freeze({ span: 57, symbols: Object.freeze(['d̪']) }),
    Object.freeze({ span: 79, symbols: Object.freeze(['d̪']) }),
  ]),
});

export const assetDigests = Object.freeze({
  'tiny-voca-it-preview-fp32.json': [3724, '11a0f19a683240a802d1206c2954d74526ba3d2328f6a5f3420a1ab2f5550d73'],
  'tiny-voca-it-preview-fp32.onnx': [27982441, '6b24645e827aa4ed10af33ed6cb3937acde94c2dfd7075b1634999c4d9752964'],
  'frontend.js': [6489, 'dd19204dd322ad912f8b5699a7a8309bfcc5282c4dad1f887ee1e435804ac03c'],
  'numbers.js': [4826, 'a699e108bbbf6d90878479aa1b2bb7734c16e8655b64b9f228ca873b942c0782'],
  'espeak-ng.js': [178386, '406c6655a6cacf34d84fc69dc4478c81b71518809080ce2d05df1b706d76429d'],
  'espeak-ng.wasm': [18485010, '10d24bb7e4124e983aa9cd8cd96c52c8ea4b607d81956ec70846684e2827d532'],
  'ort.wasm.min.mjs': [48904, 'f53ed4792e758e7232f779d479eb8931b97ff3ab2e3b9a33ee00d1251ffdaad6'],
  'ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
  'ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
  'ort.webgpu.min.mjs': [333468, 'e1a0817ac08d5a6ade7f229754c2aecd444bff0bd22c259ca148a04b9f9e9f65'],
  'ort-wasm-simd-threaded.jsep.mjs': [46839, '2fb14505d39926e4c544de8c57fe59a2f2bc74caba6f71890be9afecc5046758'],
  'ort-wasm-simd-threaded.jsep.wasm': [21663894, '185b0861a6cd6cbdfb057289338090436483cc59e10a7bc83bd167b15531a51b'],
});

export function validateTinyVocaItMetadata(metadata) {
  if (metadata?.language !== 'it' || metadata?.locale !== 'it-IT' || metadata?.sample_rate !== sampleRate ||
      metadata?.max_tokens !== 512 || metadata?.hop !== hop || metadata?.espeak_voice !== 'it' ||
      !Array.isArray(metadata?.voices) || metadata.voices.length !== 14 ||
      metadata.voices[defaultVoiceIndex] !== defaultVoice || metadata.voices[releasedVoices.EF4] !== 'EF4' ||
      JSON.stringify(metadata?.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'emotion', 'intensity']) ||
      metadata?.emotions?.[0] !== 'neutral') {
    throw new Error('Pinned Tiny Voca Italian metadata does not match the released FP32 profile');
  }
  return metadata;
}
