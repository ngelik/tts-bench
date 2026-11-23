export const TINY_VOCA_HE = Object.freeze({
  id: 'tiny-voca-he', modelId: 'buzagloidan/tiny-voca-he',
  modelRevision: 'fdc9b3080984c94768239989391fbaddcf9b5519',
  sourceId: 'buzagloidan/tiny-voca-he', sourceRevision: 'fdc9b3080984c94768239989391fbaddcf9b5519',
  fixtureId: 'he-article-v1', fixtureSha256: '1f2ac7f4c6f81f21cea8262a64f6893440d49f8b97824c77a59dc8a831b8d3d7',
  fixtureCodePoints: 15513, fixtureBytes: 27819, fixtureSpans: 71, language: 'he', locale: 'he-IL',
  sampleRate: 24000, hop: 256, maxTokens: 512, tokenLimit: 140, maxFrames: 3000, step: 104000,
  parameterCount: 4531147, defaultVoice: 'AH', defaultVoiceIndex: 0,
  speed: 1, pitchShift: 0, pitchRange: 1, peak: 0.99, interUtteranceGapSamples: 0,
  precision: 'FP32 ONNX checkpoint',
  frontendFingerprint: '976311b70e17726c030a7f48842575a13f6666cfa05474073dc92d41cf4fa666',
  frontend: 'Pinned Tiny Voca text frontend, RenikudPlus default MAP G2P, Hebrew number expansion, and extracted stock sentence/shorter planner.',
  g2pModelId: 'notmax123/RenikudPlus', g2pModelRevision: '679c56ca449d41873fb8ff7711ddf7563d28198f',
  pyodideVersion: '0.26.4', onnxruntimeWebVersion: '1.20.1', numpyVersion: '1.26.4',
  assets: {
    'tiny-voca-he.json': { bytes: 756, sha256: '5d7972962b02f6907a272f798b35ca2752aed08367af50573983617f6f283eb9' },
    'tiny-voca-he.onnx': { bytes: 21361734, sha256: '9011edf6078fdfb9acbfc1c275f753d7f8f5fc4d741abe09007747af648f2647' },
    'renikud-plus-model-int8.onnx': { bytes: 311605741, sha256: '0337468fad56eadf5ecc7becfdf21648a4d668de41de5bc27e860141b5afcadd' },
    'renikud_plus-0.6.0-py3-none-any.whl': { bytes: 22510, sha256: 'c5390ec31c2d5e4e25140f9205f6f3a5bb00f3a70454d7799fe35adef272fb42' },
    'hebrew_num2words-0.1.0-py3-none-any.whl': { bytes: 15006, sha256: 'e63bae884cc4aafce01ce4d5dc0e7fb747ede824b15820d20dacde7fdab432b9' },
    'tiny_voca_text.py': { bytes: 10108, sha256: '7c5615702b19d13e5c5eaf734c3c5d63c5a39217dc608392aeafef8bbee95501' },
    'stock_planner.py': { bytes: 2248, sha256: '70631cafa0303596344b8ed3a8755d4a9c8941649fc6cf798aae779a79c9c294' },
    'hebrew_bridge.py': { bytes: 2564, sha256: '8aef7d0c75912b5b5205fd096b55b2136020e59fce1a8865948452b815572fd1' }
  },
  fixtureOracle: { spans: 71, utterances: 320, maximumTokens: 140, unknownTokens: 0, unknownWords: 0, tokenStressSha256: '4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7' },
  smokeOracle: { spans: 3, utterances: 16, maximumTokens: 107, unknownTokens: 0, unknownWords: 0, tokenStressSha256: '78412e106e2a9df78c8669beed49f169b5c08ec55a34727d87b6695c162fd1f2' },
  controls: {
    numbers: { left: 'הלחץ שלך היום 130 על 85.', right: 'הלחץ שלך היום מאה ושלושים על שמונים וחמש.' },
    niqqud: { left: 'שלום עולם.', right: 'שָׁלוֹם עוֹלָם.' },
    repeat: 'שלום, מה שלומך היום?', english: 'The harbor bell rang once.'
  },
  numpyWheel: { bytes: 11959269, sha256: '4a2f5303a88a0747c5e6c80701e0ff4ff5667e487c0c9f9c73875e4d88f4cf9a' },
  pyodideDigests: {
    'pyodide.js': [14761, 'c0069107621d5b942a659e737a12e774cc0451feaa2256f475d72e071d844ec7'],
    'pyodide.asm.js': [1229099, '919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed'],
    'pyodide.asm.wasm': [10088051, 'b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94'],
    'python_stdlib.zip': [2341872, '72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336'],
    'pyodide-lock.json': [106335, 'cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0']
  },
  runtimeDigests: {
    'ort.wasm.min.js': [49026, 'e66568724f8848e57cc2a56e4bea3a5b86ce3ff81b2da11eac8ed7ab02b27bd4'],
    'ort.webgpu.min.js': [333594, '8443389bf14b34582ea40c590b5007bb652d6ac07dd76829a5bd82d2372e6895'],
    'ort-wasm-simd-threaded.mjs': [24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'],
    'ort-wasm-simd-threaded.wasm': [11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'],
    'ort-wasm-simd-threaded.jsep.mjs': [46839, '2fb14505d39926e4c544de8c57fe59a2f2bc74caba6f71890be9afecc5046758'],
    'ort-wasm-simd-threaded.jsep.wasm': [21663894, '185b0861a6cd6cbdfb057289338090436483cc59e10a7bc83bd167b15531a51b']
  }
});
