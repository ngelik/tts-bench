export const TINY_VOCA_ES = Object.freeze({
  "id": "tiny-voca-es",
  "modelId": "marcosmaceo/tiny-voca-es",
  "modelRevision": "9898eaef9b245d7a5240156eed919ee1bd2a9b84",
  "sourceId": "stdevMac/tiny-voca",
  "sourceRevision": "a4bf2bd979fc40b1bd7e34e13c0164db627d14ec",
  "fixtureId": "es-es-article-v1",
  "fixtureSha256": "8acee2d2fe70fb184d7a3f30e000d4a7cf5a9e09fc7523f32e958e7b1451653e",
  "language": "es-ES",
  "locale": "es-ES",
  "sampleRate": 24000,
  "hop": 256,
  "maxTokens": 512,
  "tokenLimit": 500,
  "maxFrames": 3000,
  "step": 142000,
  "voices": [
    {
      "id": "F2",
      "index": 0
    },
    {
      "id": "M2",
      "index": 1
    }
  ],
  "defaultVoice": "F2",
  "defaultVoiceIndex": 0,
  "speed": 1,
  "pitchShift": 0,
  "pitchRange": 1,
  "peak": 0.99,
  "precision": "FP32 ONNX export of the released Spanish checkpoint",
  "frontendFingerprint": "54572700c27c1563f4a58567cd3ec1b8b26e14b77ec670bf912b612b9e7623fa",
  "frontend": "Stock site/frontend.js and site/sentences.js at a4bf2bd979fc40b1bd7e34e13c0164db627d14ec; eSpeak NG 1.52.0 voice es",
  "runtimeVersion": "1.22.0",
  "runtimePackageIntegrity": "sha512-Ud/+EBo6mhuaQWt/OjaOk0iNWjXqJoeeMFr6xQEERZdIZH2OWpGzuujz7lfuOBjUa6TEE/sc4nb7Da5dNL34fg==",
  "noiseAbove": [
    2,
    33
  ],
  "fixtureOracle": {
    "spans": 105,
    "utterances": 334,
    "maximumTokens": 180,
    "unknownPhones": 0,
    "tokenStressSha256": "8fb2b2b0e26412f8301606488ed6cbfd00ce7c641e908f10c3c22fbbac492119"
  },
  "assets": {
    "models/tiny-voca-es.onnx": [
      21383998,
      "b4a9ca3becb9c7e6138c96ca8f7dceae760ccccf9305fbea9a6990667ff23a6c"
    ],
    "models/tiny-voca-es.json": [
      920,
      "bec46d85ccf80f746f7052c8532c9e74d04c00763831620c47f5442b52afc05f"
    ],
    "site/frontend.js": [
      14776,
      "ba9b1ff1608e096d91c8ad2eee39e70a00559f629c29a945a4d01989c4b34c0a"
    ],
    "site/sentences.js": [
      3037,
      "2786f1d142d145ccd3cf62c3c6756a75f1a0010bd7ecffa8a08af65e05324776"
    ],
    "site/espeak/espeak.js": [
      4317,
      "55649396d1c62b9b3104b9bec9276bb7d7b9fa3fafc268bf2970380a3170e129"
    ],
    "site/espeak/espeak-ng-core.mjs": [
      64453,
      "1ae24e0310d577f31416f3113c8b3c6846a13c1f7587e08f7085dfb8ae8d7260"
    ],
    "site/espeak/espeak-ng-core.wasm": [
      361806,
      "388303d255bd1191ed2c0b606f0ed673c051eccfb6e37c2b8d29941d3f65bfda"
    ],
    "site/espeak/espeak-ng-data.pack": [
      797905,
      "0b7a4de9ff9b50b4d68aa7c555f0f45b55ae084b3e59018825d4fb4a039e6842"
    ],
    "legal/LICENSE-MODEL": [
      11358,
      "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30"
    ],
    "legal/CITATION.cff": [
      357,
      "c7c8b556a126f5815d39d302631d5566480e3165a81b925723815588fbc82cde"
    ],
    "site/espeak/LICENSE-espeak-ng.txt": [
      35147,
      "8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903"
    ],
    "runtime/ort-wasm-simd-threaded.jsep.mjs": [
      44677,
      "1cbcba8f2c769c1eecbab66a1b1e55ef11704515bf4306373e3db3c37cf6dcd8"
    ],
    "runtime/ort-wasm-simd-threaded.jsep.wasm": [
      21872216,
      "b45970d0632383a057c27ca5b660b216f8e00c17cf8db9f6207b5e4abc839368"
    ],
    "runtime/ort-wasm-simd-threaded.mjs": [
      20856,
      "30dd851d9c00622940500f71ddd2ff8820c5cb65270816080175b958705385a8"
    ],
    "runtime/ort-wasm-simd-threaded.wasm": [
      11210254,
      "71aef04959c5c1b6de461b6538e2058e306610034a85aad2742d0c7fd4533fe4"
    ],
    "runtime/ort.wasm.min.mjs": [
      48259,
      "6ef726f355b791129f7ddf3f62e7877a16b9b777abe87004b8ab306e6b9cf265"
    ],
    "runtime/ort.webgpu.min.mjs": [
      357582,
      "e131e81c9324807e1e6f9103e8f8e936112827dcc9993cde9407a333b1f07ae0"
    ]
  }
});
