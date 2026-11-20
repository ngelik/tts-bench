// Generated browser profile metadata mirrors assets.lock.json.
const revision = '1abd585d725a787b405c28a59ce1cbdfd34780bb';
const modelRoot = `/models/ua-serhiy-0p58m/${revision}/`;
const piperRoot = '/runtimes/piper-samples/da672d1157136d07365790f51da3357a17cf9650/';
const ortRoot = '/runtimes/onnxruntime-web/1.23.2/';

const graph = (name, bytes, sha256) => Object.freeze({
  url: `${modelRoot}onnx/${name}`,
  bytes,
  sha256,
});

export const UA_SERHIY_CONFIG = Object.freeze({
  id: 'ua-serhiy-0p58m',
  source: Object.freeze({
    repo: 'dmytro-m/ua-serhiy-0p58m',
    revision,
    originalWeightsBytes: 1_151_776,
    originalWeightsSha256: 'ea2599b8db3f1a1c431c3ed0e621ca28338b9edf4841dacd3f395fc8404f8090',
    manifestUrl: `${modelRoot}manifest.json`,
    weightsUrl: `${modelRoot}weights.fp16.bin`,
  }),
  phonemeConfig: Object.freeze({
    url: `${modelRoot}piper-phoneme-config.json`,
    bytes: 4_766,
    sha256: 'aa1f836148a38ca48585d171706af74e019ac966e1f9230ef1add4f945209557',
  }),
  graphs: Object.freeze({
    duration: graph('duration.onnx', 166_375, '8f8d0d8301f9c6ea7ac66a63a841ca6b3cedf90c1b31d929fbb35553fa07dbac'),
    acousticToken: graph('acoustic-token.onnx', 341_591, '9984e6f95a41ff2e3ee3b74e2ab3b008671bb06531009a426768753209b90f6a'),
    acousticFrame: graph('acoustic-frame.onnx', 487_855, 'e082d8c21bdfc1c4032fc2e90f49d6aef6165dab74894eea2025fe86c9474310'),
    decoder: graph('decoder.onnx', 1_344_164, 'a1593364ec8ed487b8be35252ee1151dc35a71c6067a1f2cc4f3e984ea75ee09'),
  }),
  runtime: Object.freeze({
    version: '1.23.2',
    ortRoot,
    piperRoot,
    espeak: Object.freeze({
      moduleUrl: `${piperRoot}resources/espeakng.worker.js`,
      moduleBytes: 134_698,
      moduleSha256: '141236dc04b79b13a417ffd10c25a9b25f93dd7cc978448dad58b9b95d2ac210',
      wasmUrl: `${piperRoot}resources/espeakng.worker.wasm`,
      dataUrl: `${piperRoot}espeakng.worker.data`,
      wasmBytes: 361_999,
      wasmSha256: 'eb0ea920003d62ed0a97f6d51a0903ff0cb6553d8d5e02eb5dce4c26e055f33f',
      dataBytes: 24_183_288,
      dataSha256: '07263c3a96e26dcea39e0d7e5001d2121f0f4fccbb8110c2ad9285e527d77e97',
    }),
  }),
  info: Object.freeze({
    voice: 'Serhiy (Ukrainian; one pinned synthetic voice)',
    precision: 'FP32 ONNX graphs generated from the pinned FP16 checkpoint tensors',
    settings: Object.freeze({
      language: 'uk',
      voiceId: 'Serhiy',
      sampleRate: 22_050,
      runtime: 'ONNX Runtime Web 1.23.2, one-thread WASM for CPU',
      graphBuild: 'Pinned ONNX 1.17.0, opset 17; FP16 source tensors converted to FP32',
      textFrontend: 'Pinned Piper eSpeak NG uk plus the model stress.py U+0301 restoration port; unknown symbols fail. Leading punctuation and Ukrainian apostrophes follow the pinned frontend normalization.',
      sentenceHandling: 'Join eSpeak sentence phonemes with spaces and use one BOS/PAD/EOS sequence per unit, matching published ID goldens. Overlong source is recursively re-phonemized at safe sentence/word boundaries; no truncation.',
      maximumPhonemeIds: 255,
      maximumOutputFrames: 20_400,
      durationLengthScale: 1,
      output: 'Unnormalized FP32 mono PCM; centered periodic-Hann iSTFT and exact frames*256 length; no clipping/fade.',
    }),
  }),
});
