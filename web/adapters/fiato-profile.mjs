export const FIATO = Object.freeze({
  id: 'fiato',
  displayName: 'Fiato',
  modelId: 'cfahlgren1/fiato',
  modelRevision: '967de50b6a9ab673ef7de9f8f276fa93a8c0db81',
  sourceId: 'cfahlgren1/fiato',
  sourceRevision: '967de50b6a9ab673ef7de9f8f276fa93a8c0db81',
  modelRoot: '/models/fiato/967de50b6a9ab673ef7de9f8f276fa93a8c0db81/',
  fixtureId: 'english-20k-v1',
  fixtureSha256: '4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b',
  language: 'en',
  locale: 'en-US',
  sampleRate: 24000,
  hop: 256,
  voices: Object.freeze([{id: 'F1', index: 0}, {id: 'M1', index: 1}]),
  defaultVoice: 'F1',
  defaultVoiceIndex: 0,
  fixtureOracle: Object.freeze({
    spans: 93,
    utterances: 266,
    maximumTokens: 165,
    unknownTokens: 0,
    droppedSentences: 0,
    tokenStressSha256: '48ff70abf8dec2e64f3c334f5b114464b54ec2cbef9e51139ff6882c3ddf6ade',
  }),
  speed: 1,
  pitchShift: 0,
  pitchRange: 1,
  peak: 0.99,
  maxTokens: 512,
  maxFrames: 3000,
  parameterCount: 4537867,
  precision: 'FP32 ONNX checkpoint',
  runtimeVersion: '1.31.1',
  runtimePackage: 'onnxruntime-web-pocket',
  pyodideVersion: '0.26.4',
  numpyVersion: '1.26.4',
  pyodideRoot: '/runtimes/pyodide/0.26.4/',
  phonemizerVersion: '0.1.0',
  phonemizerConvention: 4,
  configDizioneFingerprint: 'f41b6f9dac16c0b3ac492e255fcbebf6b73f737b20a62dfba7576ceb208f9190',
  graphFrontendFingerprint: 'ec7ee6f521ecf6ad031b9d179a99c29bbbf7ddc70b58e25a03a3db0020712d7f',
  configStep: 104000,
  expressions: Object.freeze(['<sigh>', '<exhale>', '<gasp>']),
  expressionTokenIds: Object.freeze({ '<sigh>': 76, '<exhale>': 77, '<gasp>': 78 }),
  diagnosticSamples: Object.freeze({
    sigh: 'Well, <sigh> I guess we should start over from the beginning.',
    exhale: 'That was the last box, <exhale> and now we can finally sit down.',
    gasp: 'Wait, <gasp> you are telling me the tickets were free?',
  }),
  officialWorkerSource: {bytes: 6758, sha256: 'ba5a81905b1ebdc560078e5372c39e77be88858bdb5561d9a0392f91f09e2aeb'},
  modelAssets: Object.freeze({
    'onnx/model.onnx': [21388682, '179df2e1ede3935d4f928c0757947b25eb1f678ff347aef90e2efdf7ffb0048c'],
    'config.json': [2262, 'e07c1829084f87770cc1b0659053310dac8070aef222b53be71081ff1ebf80e1'],
    'onnx/model.json': [1083, '8bd17418a0f830868a5bf0752af70a6849fd1e7f73c09aab380356bd109388dd'],
    'demo/assets/dizione.zip': [68485, '7636962ad7370fc186a912a48e6493890f2121582925e718d60a5b4369b27166'],
    'phonemizer/lexicon.tsv': [3454357, '3fc930345c6b3cabc533981c4b212fa309eec83913fcdbd42919338270d64b06'],
    'phonemizer/align.json': [29729, '864763dbd558a864950266b2c30627f1cad203e75062ee842ee63c653e823b75'],
    'phonemizer/g2p.json': [834, 'c518fd839ea0109c0b2b4f778c17506bf0d7653557b8b8c97a4c8dd9883d4432'],
    'phonemizer/g2p.npz': [1840104, 'eb3fd519ff00e72d850928d2fccb968adc36134bca2f3bda09de7e794c2ed01b'],
    'phonemizer/homographs.json': [51956, '9c3a96fcdf79fa27d1b3686dc6a507c37e4f754966928608ee9ddb617ba39192'],
  }),
  phonemizerLicenses: Object.freeze({
    'phonemizer/LICENSE.cmudict': [1754, 'bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a'],
    'phonemizer/LICENSE.homograph-data': [11358, 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'],
  }),
  runtimeFiles: Object.freeze({
    'ort.wasm.min.mjs': [53725, 'c21d9c326d453a4a61398270c804d5979e118540597cb0c07f7b3d64e6098234'],
    'ort-wasm-simd-threaded.mjs': [24738, '30ed0b5cd1182ede931fea448afb567d4dc705ec957af09f108a2be5f770dac3'],
    'ort-wasm-simd-threaded.wasm': [14848852, '4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d'],
    'ort.webgpu.min.mjs': [70742, '329cd956772397a1aedd668e911195d39afefb182f6fc14aafa4f08ac8d8f379'],
    'ort-wasm-simd-threaded.asyncify.mjs': [53457, '59cf781530e1a16df2a291d78798e3ec1152467edaec402d6f9599d85047c302'],
    'ort-wasm-simd-threaded.asyncify.wasm': [28747738, 'ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec'],
  }),
  pyodideFiles: Object.freeze({
    'pyodide.js': [14761, 'c0069107621d5b942a659e737a12e774cc0451feaa2256f475d72e071d844ec7'],
    'pyodide.asm.js': [1229099, '919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed'],
    'pyodide.asm.wasm': [10088051, 'b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94'],
    'python_stdlib.zip': [2341872, '72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336'],
    'pyodide-lock.json': [106335, 'cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0'],
    'numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl': [11959269, '4a2f5303a88a0747c5e6c80701e0ff4ff5667e487c0c9f9c73875e4d88f4cf9a'],
  }),
});

export function resolveFiatoLanguage(language, locale) {
  const resolved = language ?? FIATO.language;
  if (resolved !== FIATO.language) throw new Error(`Fiato supports ${FIATO.language} only`);
  if (locale !== undefined && locale !== FIATO.locale) throw new Error(`Fiato supports ${FIATO.locale} only`);
  return resolved;
}

export function resolveFiatoVoice(voice) {
  const resolved = voice ?? FIATO.defaultVoice;
  if (resolved !== FIATO.defaultVoice) {
    throw new Error(`Unsupported Fiato voice: ${resolved}`);
  }
  return FIATO.voices.find((item) => item.id === resolved);
}

export function supportsFiatoFixture(fixtureId) {
  return (fixtureId ?? FIATO.fixtureId) === FIATO.fixtureId;
}
