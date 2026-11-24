import { createBrowserVoiceAdapter } from './browser-voice.mjs';

const profile = {
  "id": "browser-voice-en-int6",
  "modelRevision": "c62d91d51f1bb1e80a2337ec4b0b86f6cc438c63",
  "immutableCheckpointRevision": "c62d91d51f1bb1e80a2337ec4b0b86f6cc438c63",
  "sourceRevision": "f2977727b8baccb989f80b492ea8da00124ecba3",
  "workerUrl": "/models/browser-voice-en-int6/c62d91d51f1bb1e80a2337ec4b0b86f6cc438c63/f2977727b8baccb989f80b492ea8da00124ecba3/worker.js",
  "choice": {
    "id": "int6",
    "label": "INT6",
    "weights": "./assets/en-int6/model.weights.gz",
    "graph": "./assets/en-int6/voice.onnx.gz",
    "frontend": "./assets/en-int6",
    "bytes": 796191,
    "paceScale": 1.0
  },
  "voice": "Nivedita",
  "spokenLanguage": "en",
  "sampleRate": 24000,
  "maxTokens": 512,
  "parameterCount": 932800,
  "fixtures": {
    "english-20k-v1": {
      "language": "en",
      "sha256": "4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b",
      "spans": 93
    }
  }
};

export default profile;

export function createEnglishBrowserVoiceAdapter() {
  const adapter = createBrowserVoiceAdapter(profile);
  return {
    ...adapter,
    async initialize(options) {
      const canonical = profile.fixtures['english-20k-v1'];
      const trustedOmittedTag = options?.language === undefined &&
        options.fixtureId === 'english-20k-v1' && options.sourceSha256 === canonical.sha256;
      return adapter.initialize(trustedOmittedTag ? { ...options, language: canonical.language } : options);
    },
  };
}
