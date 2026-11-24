export default {
  "id": "browser-voice-hi-int7",
  "modelRevision": "04e39413827f3d45af54ceb480cb77e732983c1b",
  "immutableCheckpointRevision": "04e39413827f3d45af54ceb480cb77e732983c1b",
  "sourceRevision": "f2977727b8baccb989f80b492ea8da00124ecba3",
  "workerUrl": "/models/browser-voice-hi-int7/04e39413827f3d45af54ceb480cb77e732983c1b/f2977727b8baccb989f80b492ea8da00124ecba3/worker.js",
  "choice": {
    "id": "int7",
    "label": "INT7",
    "weights": "./assets/hi-int7/model.weights.gz",
    "graph": "./assets/hi-int7/voice.onnx.gz",
    "frontend": "./assets/hi-int7",
    "bytes": 882200,
    "paceScale": 0.9333333333333333
  },
  "voice": "Ishwari",
  "spokenLanguage": "hi",
  "sampleRate": 24000,
  "maxTokens": 512,
  "parameterCount": 934704,
  "fixtures": {
    "hi-article-v1": {
      "language": "hi",
      "sha256": "c580f52a713c3bc5133a0c4e0ec7106623febbc4160944c2168a83964db08128",
      "spans": 91
    },
    "hi-latn-article-v1": {
      "language": "hi-Latn",
      "sha256": "acce9de48b72daf86d6fc4126497f55977c64dafa3e7a3d84809051df1298d9e",
      "spans": 107
    }
  }
};
