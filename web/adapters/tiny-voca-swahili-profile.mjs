export const TINY_VOCA_SWAHILI = Object.freeze({
  "id": "tiny-voca-swahili",
  "displayName": "Tiny Voca Kiswahili",
  "modelId": "adoamesh/tiny-voca-swahili",
  "modelRevision": "408b7b783b0c77ed66030521f8cec88f5c6d6e2b",
  "sourceId": "adoamesh/tiny-voca-swahili",
  "sourceRevision": "408b7b783b0c77ed66030521f8cec88f5c6d6e2b",
  "parameterCount": 4539211,
  "parameterCountKind": "exact logical scalar count across 184 FP32 ONNX initializer tensors",
  "parameterCountSource": "https://huggingface.co/adoamesh/tiny-voca-swahili/blob/408b7b783b0c77ed66030521f8cec88f5c6d6e2b/swahili.onnx",
  "fixtureId": "sw-article-v1",
  "fixtureSha256": "7ad4f4839ffb808429c538e40b08e0e6c87655a150a1ceb0d52106cce9ecd4b1",
  "language": "sw",
  "locale": "sw",
  "spokenLanguage": "sw",
  "sampleRate": 24000,
  "hop": 256,
  "maxTokens": 512,
  "maxFrames": 3000,
  "voices": [
    {
      "id": "1",
      "index": 0,
      "description": "WAXAL Swahili speaker ID 1"
    },
    {
      "id": "2",
      "index": 1,
      "description": "WAXAL Swahili speaker ID 2"
    },
    {
      "id": "3",
      "index": 2,
      "description": "WAXAL Swahili speaker ID 3"
    },
    {
      "id": "4",
      "index": 3,
      "description": "WAXAL Swahili speaker ID 4"
    },
    {
      "id": "5",
      "index": 4,
      "description": "WAXAL Swahili speaker ID 5"
    },
    {
      "id": "6",
      "index": 5,
      "description": "WAXAL Swahili speaker ID 6"
    },
    {
      "id": "8",
      "index": 6,
      "description": "WAXAL Swahili speaker ID 8"
    }
  ],
  "defaultVoice": "WAXAL speaker 1 (speaker ID 1)",
  "defaultVoiceIndex": 0,
  "speed": 1,
  "pitchShift": 0,
  "pitchRange": 1,
  "precision": "FP32 ONNX checkpoint",
  "parameterCountSourceNote": "Count is initializer logical scalar count, not a claim about trainable-only parameters.",
  "frontend": "Benchmark-owned JavaScript approximation of the documented swahili-rule G2P; pinned release custom frontend is unavailable.",
  "frontendFingerprint": "2ff4070f1d41d8350c24a78008db321d263a82c1f3e5aef2c1ca55a41e624500",
  "upstreamFrontendFingerprint": "d544985efcbde5d71ea0ce027f644b357497b4fcc79209b55cc624b9c67c99f3",
  "frontendLimitations": "Matches all four published sentence token/stress vectors. Not asserted fully publisher-equivalent. Explicit `City` place-name pronunciation override; unsupported graphemes throw. Rule cases outside published vectors remain approximate.",
  "runtimeVersion": "1.31.1",
  "runtimePackage": "onnxruntime-web-pocket",
  "runtimePackageIntegrity": "sha512-5GeH+bWQ+HxM10z7erGlsWqryrwMbSvm/1tkIsKTT48g0fI19VXVVC435t4t7VsPdSQeS7NmuZPXrQ73k82URw==",
  "runtimeFiles": {
    "ort.wasm.min.mjs": {
      "bytes": 53725,
      "sha256": "c21d9c326d453a4a61398270c804d5979e118540597cb0c07f7b3d64e6098234"
    },
    "ort.webgpu.min.mjs": {
      "bytes": 70742,
      "sha256": "329cd956772397a1aedd668e911195d39afefb182f6fc14aafa4f08ac8d8f379"
    },
    "ort-wasm-simd-threaded.mjs": {
      "bytes": 24738,
      "sha256": "30ed0b5cd1182ede931fea448afb567d4dc705ec957af09f108a2be5f770dac3"
    },
    "ort-wasm-simd-threaded.wasm": {
      "bytes": 14848852,
      "sha256": "4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d"
    },
    "ort-wasm-simd-threaded.asyncify.mjs": {
      "bytes": 53457,
      "sha256": "59cf781530e1a16df2a291d78798e3ec1152467edaec402d6f9599d85047c302"
    },
    "ort-wasm-simd-threaded.asyncify.wasm": {
      "bytes": 28747738,
      "sha256": "ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec"
    }
  },
  "modelAssets": {
    "swahili.onnx": {
      "bytes": 21394052,
      "sha256": "e65a03efa18e291550bd3718b9c54a742974d81728e48c65ba78e1e721404739"
    },
    "metadata.json": {
      "bytes": 1816,
      "sha256": "1bedce84f6d6ce326d184b178271f18afc803dbc0d42ae1772ab2ccaf62f8623"
    },
    "symbols.json": {
      "bytes": 3068,
      "sha256": "06d440a0bfbb53d11d5b33bff3d3bbbad85b28c48c2fa6734d9e4dbd35922553"
    },
    "cases.json": {
      "bytes": 1426,
      "sha256": "97c9a74480285c00862160cc425b29baee1aad04374d6a0aa479a7787decaebb"
    },
    "config.json": {
      "bytes": 105,
      "sha256": "ed6097ceaca58fa40809d1b00f5cb3485eb33c0c1e935262ed43cb21d3b145eb"
    },
    "LICENSE": {
      "bytes": 572,
      "sha256": "7847e439f2ab643921f6f95ad633532f4a40bd221ba60bfbfb2df35197d0b5b2"
    }
  },
  "fixtureOracle": {
    "spans": 109,
    "utterances": 341,
    "maximumTokens": 212,
    "minimumTokens": 4,
    "nonWhitespaceCharacters": 20210,
    "unknownTokens": 0,
    "nonzeroStress": 3682,
    "tokenStressSha256": "09d261665d5a8bc87e279885380bc4c97213b15547bb3d92380b28d7cd85ca82"
  },
  "publishedVectorDigest": "d2653ba312b9ff057c9030aecd8af2710d7fdf2879cd65d5f474045d98dfdf34",
  "symbolArrayFingerprint": "ad232f8677f6e247609227be9d3890512a51ee4bda81ad5825b76bdeef8c358c",
  "releaseCaseOutputSamples": [
    119040,
    138496,
    136704
  ]
});
