export default {
  "id": "browser-voice-ml-int6",
  "modelRevision": "651bf3cbe3e9891bb298becaaff713033b0d384a",
  "immutableCheckpointRevision": "651bf3cbe3e9891bb298becaaff713033b0d384a",
  "sourceRevision": "f2977727b8baccb989f80b492ea8da00124ecba3",
  "workerUrl": "/models/browser-voice-ml-int6/651bf3cbe3e9891bb298becaaff713033b0d384a/f2977727b8baccb989f80b492ea8da00124ecba3/worker.js",
  "choice": {
    "id": "int6",
    "label": "INT6",
    "weights": "./assets/ml-int6/model.weights.gz",
    "graph": "./assets/ml-int6/voice.onnx.gz",
    "frontend": "./assets/ml-int6",
    "bytes": 795702,
    "paceScale": 0.9473172987974098
  },
  "voice": "Jahnavi",
  "spokenLanguage": "ml",
  "sampleRate": 24000,
  "maxTokens": 512,
  "parameterCount": 932352,
  "fixtures": {
    "ml-article-v1": {
      "language": "ml",
      "sha256": "ef98dc2e0c65d273b4b0514501c0b8e45022ad0e5d766beedfd60b03fa5c46fd",
      "spans": 105
    },
    "ml-latn-article-v1": {
      "language": "ml-Latn",
      "sha256": "16638b2f59789d7ce6b4cc0fe7692a6d56d413170eb8272d7002f58281366764",
      "spans": 116
    }
  }
};
