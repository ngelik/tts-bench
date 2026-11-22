export const modelRevision = '51023684a0a39742455c838e9d1d8714d3ae7289';
export const frontendRevision = 'bf1b1aab40e24ca3f6700980427c386f4f171f6f';
export const sampleRate = 24000;
export const hop = 256;
export const defaultVoice = 'female_1';
export const defaultVoiceIndex = 2;
export const frontendFingerprint = 'c2b27d282efbd492c5bf9a7df640e909ba913d744e4e2115896a8fefd98fdb68';
export const fixtureOracle = Object.freeze({
  fixtureId: 'tr-article-v1',
  language: 'tr',
  sourceSha256: '95e1958fe7385da7aa79d54c30230518e8be360848f2c824ce7639414ce8f3d3',
  spans: 94,
  utterances: 304,
  maximumTokens: 230,
  tokenStressSha256: 'd2f501f0fc31ebe553c7c605f4ea36fb5b4a05e0a635108743c9e5dde13559db',
  identityFingerprint: frontendFingerprint,
});

export const assetDigests = Object.freeze({
  'config.json': [1873, 'e84e28b96a5b7907dcf6601f28d45b41c21c9e58ac0ad3f36a29c17a82d3bf2e'],
  'model.onnx': [21378871, '2b832f9fa46ed9782b2fe32b8c83c5389315ed3cd8c285242dcc61a7c39dd49c'],
  'frontend-init.py': [2389, '0f98cc8063eca39786a419fcb181b52f0429dfae7ffbcaf34b5c68a2a4543890'],
  'frontend-main.py': [303, 'ab195accd19bfd023009be847f730549af7890a7c87fe07664d09cdda3fba558'],
  'frontend-engine.py': [5973, 'd6291d558b7cdcbc3411fe9434dbece44f4e286c2e0e8e89faf898a788920366'],
  'frontend-g2p.py': [5602, '0becf612008b17d2036da1c0aaad6bd003bdacc8376d65d4cee32ee22fd3fd18'],
  'frontend-rules.py': [34478, '6b464ac9a28d913d815b6191cf5553b45da046a661402d4621b0d379827eca80'],
  'frontend-stress.py': [3776, '04820b9973bab5a15ffc6a502721ecea84eebcf6c1736e956e628f3f13cd295b'],
  'frontend-symbols.py': [3294, '6432c2c0296a150079e71133b9f0461190e8489baa4662ba95a4ce4756ed658e'],
  'frontend-tables.py': [1533, 'f43e12e211d612316f4847309efb34b51e48b06c8582cd735ace6e1c472554a7'],
  'frontend-turkish.py': [7840, '2896fcbb27d413c14e85aa2aaaea0529eb16792ced27d632f0d98e516cb749d8'],
  'exceptions.txt': [2489, 'fc7692b80abc8e611f372bca2c1ccdd620ebbd0d7a77b0054f1f2586c6f1378b'],
  'function_words.txt': [258, '51d9f34fdbee2480e55433c7c165086c39af30c3c85e40105bea0699efeb9b76'],
  'places.txt': [1358, '9560132be4996b1f72dd11934571fa85bb541de5a3d2dcefc442ed4e23facca4'],
  'ort.wasm.min.mjs': [48904, 'f53ed4792e758e7232f779d479eb8931b97ff3ab2e3b9a33ee00d1251ffdaad6'],
  'ort.webgpu.min.mjs': [333468, 'e1a0817ac08d5a6ade7f229754c2aecd444bff0bd22c259ca148a04b9f9e9f65'],
  'ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
  'ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
  'ort-wasm-simd-threaded.jsep.mjs': [46839, '2fb14505d39926e4c544de8c57fe59a2f2bc74caba6f71890be9afecc5046758'],
  'ort-wasm-simd-threaded.jsep.wasm': [21663894, '185b0861a6cd6cbdfb057289338090436483cc59e10a7bc83bd167b15531a51b'],
  'pyodide.mjs': [17758, '1bb8cc14f9405aaa7cd4e00c12edd0a8539de9cc026618d6ee5a9663f367dc70'],
  'pyodide.asm.mjs': [1250259, '22514b8be6980e28a02c8b1d6387ce8dfe666fc4edf8d547cff5dce29ff4d972'],
  'pyodide.asm.wasm': [9597892, 'e14d49ceca9b4a0e274ea918f3a898de2d3880b6e5573a6cfe1a2267ecc70329'],
  'python_stdlib.zip': [2545550, '2bd3394a145bfbbe5bbc9d9d6ab9136abbb986c6fef6c142b3a2962227aa5c28'],
  'pyodide-lock.json': [119077, '5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010'],
});

export function validateMetadata(config) {
  const voices = ['male_1', 'male_2', 'female_1', 'female_2', 'female_3', 'female_4', 'female_5', 'male_3', 'male_4', 'male_5'];
  if (config?.sample_rate !== sampleRate || config?.hop !== hop || config?.max_tokens !== 512 ||
      config?.max_frames !== 3000 || config?.step !== 190000 || config?.frontend !== 'clarvia-phonemizer 0.1.0' ||
      config?.public_voices?.length !== voices.length || config.public_voices.some((voice, index) => voice !== voices[index]) ||
      config?.voices?.length !== voices.length + 1 || config.voices[defaultVoiceIndex] !== defaultVoice ||
      JSON.stringify(config?.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(config?.outputs) !== JSON.stringify(['audio', 'durations']) || config?.symbols?.length !== 56) {
    throw new Error('Pinned Clarvia TTS Tiny metadata does not match the Turkish browser profile.');
  }
  return config;
}
