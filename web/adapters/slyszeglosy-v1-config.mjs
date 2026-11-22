// Model and source assets are individually pinned;
// the binary graph is staged by the release workflow, never checked in here.
export const SLYSZE_GLOSY_V1_PROFILE = Object.freeze({
  id: 'slyszeglosy-v1',
  sourceRevision: '605a13f5d9994ad8c897dff3463ce1f339acfb5f',
  modelId: 'Damaon/slyszeglosy',
  modelRevision: '23b63ff12db5f19260985031e64c2f45b89cc609',
  graphSha256: '6d2a81bcc47589f9235452011979f641395749015a3903aaadff4558784ab087',
  graphBytes: 21365047,
  sampleRate: 24000,
  hop: 256,
  maxTokens: 512,
  maxFrames: 3000,
  frontendFingerprint: '005545ca1a524e01a2c232dfadb64a9a4dd115bc6f6161a96689217e257929a5',
  rulesFingerprint: '91e9dad4c7d4f52b6ed9ce60bcc89c7761bb5f0dc3202e0a664ee04f492ecf54',
  voices: Object.freeze({ F: 0, M: 1 }),
  fixtureOracle: Object.freeze({
    'pl-article-v1': Object.freeze({
      language: 'pl', spans: 98, utterances: 324, maximumTokens: 233,
      unknownPhonemes: 0,
      fixtureSha256: '09e2f4876dca3feaf6c40ff9631dcdad383bf359d8d1a004c28510003668631d',
      tokenStressSha256: 'fde1d51a074ed33d0c8fba076150d4045549bb9e45bc0bf9dc656e82cceb9bf1',
    }),
  }),
  // Target paths live below /models/slyszeglosy-v1/<modelRevision>/.
  assetDigests: Object.freeze({
    'assets/onnx/model.json': [842, '3f3045599d04e88c15378bff375d6525187c2f8e500f25ab244e54b7329c748c'],
    'assets/onnx/model.onnx': [21365047, '6d2a81bcc47589f9235452011979f641395749015a3903aaadff4558784ab087'],
    'assets/frontend/slyszeglosy_text.py': [4554, '7011f134be7419c893b13c7e0040361ecb782bcd4fb84b7735625eeb5940f386'],
    'assets/frontend/wymowa/__init__.py': [2367, 'f001a46fe315f68aa8481487affede58eb99bc03998facaf9c0cf94ac0c96237'],
    'assets/frontend/wymowa/g2p.py': [11719, 'c19f9de250b9f45cc3a81c1d0686f340a7047dfc9fceeb37b634309f349f3105'],
    'assets/frontend/wymowa/lexicon.py': [4255, 'a8fe062690e5f2d093b529938f8526d58d1eee4e700115c0fba2f22ab27b7ad5'],
    'assets/frontend/wymowa/normalize.py': [23708, 'd392f472101af647d8e47b0b39848dde4f2a678ecb179e76c32cb7850f00ceb5'],
    'assets/frontend/wymowa/numbers.py': [6647, '3bbcd4b3c36bca570cce5f639f942a6500a9c60d86d790e88d215f0f2e1f4aa4'],
    'assets/frontend/wymowa/symbols.py': [1937, 'e5607cbdc5b4406ac84273d42327429fab630cbee695313127486bc34bfa0416'],
  }),
  // Reuse the benchmark's existing shared runtimes. These hashes match the
  // repository's pinned runtime table; no third-party runtime is copied here.
  pyodideDigests: Object.freeze({
    'pyodide.js': [14761, 'c0069107621d5b942a659e737a12e774cc0451feaa2256f475d72e071d844ec7'],
    'pyodide.asm.js': [1229099, '919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed'],
    'pyodide.asm.wasm': [10088051, 'b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94'],
    'python_stdlib.zip': [2341872, '72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336'],
    'pyodide-lock.json': [106335, 'cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0'],
  }),
  runtimeDigests: Object.freeze({
    'ort.wasm.min.js': [49026, 'e66568724f8848e57cc2a56e4bea3a5b86ce3ff81b2da11eac8ed7ab02b27bd4'],
    'ort.webgpu.min.js': [333594, '8443389bf14b34582ea40c590b5007bb652d6ac07dd76829a5bd82d2372e6895'],
    'ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
    'ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
    'ort-wasm-simd-threaded.jsep.mjs': [46839, '2fb14505d39926e4c544de8c57fe59a2f2bc74caba6f71890be9afecc5046758'],
    'ort-wasm-simd-threaded.jsep.wasm': [21663894, '185b0861a6cd6cbdfb057289338090436483cc59e10a7bc83bd167b15531a51b'],
  }),
});
