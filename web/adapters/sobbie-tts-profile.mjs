export const SOBBIE_TTS = Object.freeze({
  "id": "sobbie-tts",
  "displayName": "SobbieTTS",
  "modelId": "PatnaikAshish/SobbieTTS",
  "modelRevision": "6b6132c6d34b5fc163d8f5553580678a60532ac3",
  "sourceId": "PatnaikAshish/SobbieTTS",
  "sourceRevision": "6b6132c6d34b5fc163d8f5553580678a60532ac3",
  "parameterCount": 4537291,
  "parameterCountKind": "Exact logical initializer scalars in 184 FP32 ONNX tensors; independently scanned before adapter prep.",
  "parameterCountSource": "https://huggingface.co/PatnaikAshish/SobbieTTS/blob/6b6132c6d34b5fc163d8f5553580678a60532ac3/README.md",
  "dizioneId": "n4ze3m/dizione",
  "dizioneRevision": "8cd889e4de7be6bd1dd2e6891344a0729fa14dd4",
  "dizioneVersion": "0.1.0",
  "dizioneVersionConvention": 4,
  "dizioneConfigFingerprint": "c729f235e10daa1a08ce7711169c1cb93fb552b3c24eecb16527513d7b69d4da",
  "dizioneReleaseSources": {
    "cmudict_commit": "74790861f652b15e4ac49015a90074ad62a27690",
    "cmudict_sha256": "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22",
    "homograph_commit": "8f008f021e88f8b71118a27ae655f1f3121162bc"
  },
  "fixtureId": "english-20k-v1",
  "fixtureSha256": "4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b",
  "language": "en",
  "locale": "en-US",
  "spokenLanguage": "en",
  "sampleRate": 24000,
  "hop": 256,
  "maxTokens": 512,
  "tokenLimit": 500,
  "maxFrames": 3000,
  "configStep": 104737,
  "onnxMetadataStep": 12000,
  "voices": [
    {
      "id": "F",
      "index": 0
    },
    {
      "id": "M",
      "index": 1
    }
  ],
  "defaultVoice": "F",
  "defaultVoiceIndex": 0,
  "speed": 1,
  "pitchShift": 0,
  "pitchRange": 1.15,
  "peak": 0.99,
  "precision": "FP32 ONNX checkpoint",
  "frontend": "Pinned Dizione Python frontend under Pyodide 0.26.4 + NumPy 1.26.4; browser demo sentence/finished/token-fit protocol.",
  "frontendFingerprint": "dizione:8cd889e4de7be6bd1dd2e6891344a0729fa14dd4; config:c729f235e10daa1a08ce7711169c1cb93fb552b3c24eecb16527513d7b69d4da",
  "frontendLimitations": "Publisher default female voice F (index 0); English only. Preserve released Dizione dictionary, spelling rules, number/date normalization and stress outputs. No synthesis-quality or human evaluation is claimed.",
  "runtimeVersion": "1.31.1",
  "runtimePackage": "onnxruntime-web-pocket",
  "runtimePackageIntegrity": "sha512-5GeH+bWQ+HxM10z7erGlsWqryrwMbSvm/1tkIsKTT48g0fI19VXVVC435t4t7VsPdSQeS7NmuZPXrQ73k82URw==",
  "runtimeFiles": {
    "ort.wasm.min.mjs": {
      "bytes": 53725,
      "sha256": "c21d9c326d453a4a61398270c804d5979e118540597cb0c07f7b3d64e6098234",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort.wasm.min.mjs"
    },
    "ort.webgpu.min.mjs": {
      "bytes": 70742,
      "sha256": "329cd956772397a1aedd668e911195d39afefb182f6fc14aafa4f08ac8d8f379",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort.webgpu.min.mjs"
    },
    "ort-wasm-simd-threaded.mjs": {
      "bytes": 24738,
      "sha256": "30ed0b5cd1182ede931fea448afb567d4dc705ec957af09f108a2be5f770dac3",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort-wasm-simd-threaded.mjs"
    },
    "ort-wasm-simd-threaded.wasm": {
      "bytes": 14848852,
      "sha256": "4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort-wasm-simd-threaded.wasm"
    },
    "ort-wasm-simd-threaded.asyncify.mjs": {
      "bytes": 53457,
      "sha256": "59cf781530e1a16df2a291d78798e3ec1152467edaec402d6f9599d85047c302",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort-wasm-simd-threaded.asyncify.mjs"
    },
    "ort-wasm-simd-threaded.asyncify.wasm": {
      "bytes": 28747738,
      "sha256": "ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec",
      "target": "runtimes/onnxruntime-web-pocket/1.31.1/ort-wasm-simd-threaded.asyncify.wasm"
    }
  },
  "pyodideVersion": "0.26.4",
  "numpyVersion": "1.26.4",
  "pyodideRoot": "/runtimes/pyodide/0.26.4/",
  "pyodideFiles": {
    "pyodide.js": {
      "bytes": 14761,
      "sha256": "c0069107621d5b942a659e737a12e774cc0451feaa2256f475d72e071d844ec7",
      "target": "runtimes/pyodide/0.26.4/pyodide.js"
    },
    "pyodide.asm.js": {
      "bytes": 1229099,
      "sha256": "919560652ed3dad3707cb3a394785da1e046fb13dc0defa162058ff230cb7eed",
      "target": "runtimes/pyodide/0.26.4/pyodide.asm.js"
    },
    "pyodide.asm.wasm": {
      "bytes": 10088051,
      "sha256": "b7e66a19427a55010ac3367c1b6c64b893f9826f783412945fdf0c3337f3bc94",
      "target": "runtimes/pyodide/0.26.4/pyodide.asm.wasm"
    },
    "python_stdlib.zip": {
      "bytes": 2341872,
      "sha256": "72894522b791858b9d613ac786b951d8b5094035dcf376313ea24a466810f336",
      "target": "runtimes/pyodide/0.26.4/python_stdlib.zip"
    },
    "pyodide-lock.json": {
      "bytes": 106335,
      "sha256": "cd50b49de944c579045e122fe8628b31f9ce446379f032f36c05e273d38766e0",
      "target": "runtimes/pyodide/0.26.4/pyodide-lock.json"
    },
    "numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl": {
      "bytes": 11959269,
      "sha256": "4a2f5303a88a0747c5e6c80701e0ff4ff5667e487c0c9f9c73875e4d88f4cf9a",
      "target": "runtimes/pyodide/0.26.4/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl"
    }
  },
  "modelAssets": {
    "model.onnx": {
      "bytes": 21386372,
      "sha256": "eafb38b736c17872091c0f05de87814257925a9c3c5aeff168c74afc496d9317"
    },
    "config.json": {
      "bytes": 2565,
      "sha256": "d4d01f06170711045a1b5a020f2cc392dd114b596e82739a25f1a9e875a72860"
    },
    "model.json": {
      "bytes": 1332,
      "sha256": "9649c7401ebbb999e8cf204af4ee6eee2ea152fcb99df6679f7b7cb8f866d01b"
    },
    "README.md": {
      "bytes": 4801,
      "sha256": "1f349ad106c88c9d5b932ab66ffb4fe7466e2fcdd6ab87a0f3291d43f01686d9"
    },
    "web/README.md": {
      "bytes": 391,
      "sha256": "63fcb4da06f1d4b5c999d7d833da3f6d1aaf93ab62b29bdfce49e2855b389fbb"
    },
    "dizione/source.zip": {
      "bytes": 135578,
      "sha256": "f7773c30fef90ed3c2f1daa973868b2b26ab4efd82c08340d0e1815a98fca09a"
    },
    "phonemizer/lexicon.tsv": {
      "bytes": 3454357,
      "sha256": "3fc930345c6b3cabc533981c4b212fa309eec83913fcdbd42919338270d64b06"
    },
    "phonemizer/align.json": {
      "bytes": 29729,
      "sha256": "864763dbd558a864950266b2c30627f1cad203e75062ee842ee63c653e823b75"
    },
    "phonemizer/g2p.json": {
      "bytes": 834,
      "sha256": "c518fd839ea0109c0b2b4f778c17506bf0d7653557b8b8c97a4c8dd9883d4432"
    },
    "phonemizer/g2p.npz": {
      "bytes": 1840104,
      "sha256": "eb3fd519ff00e72d850928d2fccb968adc36134bca2f3bda09de7e794c2ed01b"
    },
    "phonemizer/homographs.json": {
      "bytes": 51956,
      "sha256": "9c3a96fcdf79fa27d1b3686dc6a507c37e4f754966928608ee9ddb617ba39192"
    },
    "phonemizer/sources.json": {
      "bytes": 213,
      "sha256": "f4c54924d30a5bc0bc1e3d7b058adb924484b3fab8541bc8d8bcecfb028fdbad"
    },
    "phonemizer/LICENSE.cmudict": {
      "bytes": 1754,
      "sha256": "bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a"
    },
    "phonemizer/LICENSE.homograph-data": {
      "bytes": 11358,
      "sha256": "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30"
    }
  },
  "modelRoot": "/models/sobbie-tts/6b6132c6d34b5fc163d8f5553580678a60532ac3/",
  "fixtureOracle": null
});
