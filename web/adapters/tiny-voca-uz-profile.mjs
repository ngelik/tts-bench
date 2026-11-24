export const TINY_VOCA_UZ = Object.freeze({
  "id": "tiny-voca-uz-navoiy",
  "modelId": "Inomjonov/tiny-voca-uzbek-navoiy",
  "modelRevision": "3d960bd05c728b21fff4ec5154cada7f6b082df1",
  "sourceId": "n4ze3m/tiny-voca",
  "sourceRevision": "62e2adef158bc997042cc6234f541f1e0e4cd55d",
  "parameterCount": 4531531,
  "parameterCountKind": "exact learned parameter count, independently matching staged export receipt",
  "parameterCountSource": "https://huggingface.co/Inomjonov/tiny-voca-uzbek-navoiy/blob/3d960bd05c728b21fff4ec5154cada7f6b082df1/README.md",
  "fixtureId": "uz-article-v1",
  "fixtureSha256": "ccf5419bdd654df31cd4df1ff79707cd1e32ffc7fcf26817d8b58d6a204a0254",
  "language": "uz",
  "locale": "uz-Latn",
  "spokenLanguage": "uz",
  "sampleRate": 24000,
  "hop": 256,
  "maxTokens": 512,
  "plannerTokenLimit": 500,
  "maxFrames": 3000,
  "step": 104737,
  "voices": [
    {
      "id": "M2",
      "index": 0,
      "description": "Publisher identified one synthetic male speaker M2"
    }
  ],
  "defaultVoice": "M2",
  "defaultVoiceIndex": 0,
  "speed": 1,
  "pitchShift": 0,
  "pitchRange": 1,
  "peak": 0.99,
  "interUtteranceGapSamples": 0,
  "precision": "FP32 ONNX checkpoint",
  "frontend": "Pinned Uzbek normalization, sentence splitting and rule-based phonemizer from the model source release",
  "frontendFingerprint": "3712af88f938a03339d63500b448cb16f01d95ae66a546376100b1c44bc5891e",
  "frontendSourceHashes": {
    "frontend": "4dbf3b82305a76f3add68692235e706dacd5eeaeb02fcd5163127a2ac394e8a0",
    "tables": "cf99c4f86b1654ee304fa2eb2e646c5cc7b6a26722fb00d84add2633adf6a69e",
    "pythonParityControls": "da9fec58916e4ea15788e572ffc357f340906233fd526b5ba11461a83d8d776a"
  },
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
    "model.onnx": {
      "bytes": 21357838,
      "sha256": "7003f4334796dbc08d932cd00e08945d3285eb3b9d9df9c34da29b7b0e563052"
    },
    "model.json": {
      "bytes": 919,
      "sha256": "1b29f2c7f8a72ecc75bacecb4127667104cd65a8dfffb206aa8c0038e1b589c9"
    },
    "noise-42.f32le": {
      "bytes": 3072000,
      "sha256": "eea6f4da94ac279fc9c324187bdc38af7d8c4d9c4701617c1d5c404ed02b732f"
    },
    "noise-43.f32le": {
      "bytes": 3072000,
      "sha256": "b00694940fbc8e09afcb55445d3a1fddd22d3d78a7d1e0ecf63be16f44c9cc59"
    },
    "noise-44.f32le": {
      "bytes": 3072000,
      "sha256": "2b6065028de51b0812b968a212bcaa60eb1a8ba63b9fb272b3ec66f2d8ef48f8"
    },
    "noise-45.f32le": {
      "bytes": 3072000,
      "sha256": "ed01c002246d02270703133043e6e6415c582e8fff13fd55ea2da0ee4c7b1479"
    },
    "noise-46.f32le": {
      "bytes": 3072000,
      "sha256": "71e18ff0f9b172affdf93e837f0b63c612e863a8bf3600f4148c383f4dba11c9"
    }
  },
  "noiseIndexes": [
    {
      "index": 42,
      "asset": "noise-42.f32le",
      "bytes": 3072000,
      "sha256": "eea6f4da94ac279fc9c324187bdc38af7d8c4d9c4701617c1d5c404ed02b732f"
    },
    {
      "index": 43,
      "asset": "noise-43.f32le",
      "bytes": 3072000,
      "sha256": "b00694940fbc8e09afcb55445d3a1fddd22d3d78a7d1e0ecf63be16f44c9cc59"
    },
    {
      "index": 44,
      "asset": "noise-44.f32le",
      "bytes": 3072000,
      "sha256": "2b6065028de51b0812b968a212bcaa60eb1a8ba63b9fb272b3ec66f2d8ef48f8"
    },
    {
      "index": 45,
      "asset": "noise-45.f32le",
      "bytes": 3072000,
      "sha256": "ed01c002246d02270703133043e6e6415c582e8fff13fd55ea2da0ee4c7b1479"
    },
    {
      "index": 46,
      "asset": "noise-46.f32le",
      "bytes": 3072000,
      "sha256": "71e18ff0f9b172affdf93e837f0b63c612e863a8bf3600f4148c383f4dba11c9"
    }
  ],
  "fixtureOracle": {
    "spans": 105,
    "edgeCases": 11,
    "utterances": 345,
    "maximumTokens": 191,
    "unknownTokens": 0,
    "completeFrontendSha256": "e4be32f73dadb28f35412cdea215919e46cf81d6906bbf2a1fe389229b2741c0",
    "sourceSpanSha256": [
      "39b5918a68e087a70a634befe0d676d7e27bf27a074c0d47d2d92c3a418febed",
      "ea65c872b3082861fdbf79d1e9b85eb948c4e61d9ee31fbc5064307c7f05cc49",
      "229968f34c6117e1b450c0958c52c73059713706982480beefe95bee816b0bb1",
      "cd3d611b02fbc2e3e7eeb26d4d9ac90ed4bf18f8ae25b3267f5eb914fbafa6b9",
      "b4e3dd9cc3a8b640e7ed04854791b81fad36bade92959801a0136a0b8a6fe91b",
      "13934e030c57b3859f62fd32f378bb1e164332bbbde2c3a936fe5f0a75493f5a",
      "28407db54a292fc45647c98fd4cd037af8408ffacde9daa365245dfd5436b482",
      "b17ef812703c3be9891a716b7c32d08912a3cbe107c3c0fd6af5c59ce1aaff5d",
      "06cc2d3d33b7c63c4f624d178253b5626320bd86e6f32c648117858538b129d8",
      "c40bcf69111d6e1ffe9406756fb8fba3d4bcade3d5e314b1c6e887e403b25448",
      "2ce4fd73861313a2998f0bc191961215fe6496f61512e4ac5c5770f4c9ddd004",
      "6c418f1b51bdfd33a84f1fef8b6a8f1008c86922b2f8d182e163a446c6f7bf77",
      "afc4d988cf083842030b1869bff0455711495c48e9e94ef42af6c60245b465ab",
      "ce29cdc500d9dbbf2d5721517cd2e4f357ba50a42e6060c5cdd9a9e20146040e",
      "414b17a312f18e9f91112ea646153fb3ed535e3ac87ee083ceabb92d2924255f",
      "63fb7a8d663fa2a41913b8e7ba36c1a1d7ef4a9765faf085e12e0c5bbe769486",
      "a763f03dd92ea891e031a75cad52a5c95a0d36c26be27d4a2aa8876500152832",
      "210db11602b4e5f3a0e5f734fb6ed53cf7d8766b7b9005a0aeccf08de4671f77",
      "53e4daebad43c72d0f58efb8603591ac10514b1ad9edabd10b0a4619219b599d",
      "0b3cb179df2c1eef2ddeaf4552b9d3a8322015d5180047799173c4c26b8bd8a0",
      "21aa794353493cbd17e4a77a18bd372efae5e6dceb323d594187f707cecf3821",
      "c9b05e3ed099fff36ca53f06dc41560aae0fa347076ac07297b45c229095c14c",
      "d625f09d7bb0f7812027d5cf8573877b4d79b7b048997ef2d09b9c53419c51b0",
      "7d3b230673d435e05c0ecc9070acc61d05437c0b0fb30f4ec4c9b954937a3002",
      "a49cf623eea57e7a1a48bc01d5c9557d1cf13687e4237bb5d6188a5d51d16a14",
      "ed59e6e0459074317cd6028ca02c73393e264c9c1e3e417371a0b72a67890c83",
      "dddeba40278dc9dbc9303a3d8449d848f888ac9d17c84ed8af1eac3085e6c042",
      "3728b38d43948dee95a55aeee6c74c399b5d68f6d203847a9d79e378878625b1",
      "bb38b18f1417cb686cb6a70f1400255d6fe79a76cf9bc7a379fdaddaea7bb5d4",
      "8d4be9da3ab4324fa1fe8e215fa81327d9db1199cb46d3f3c27c205cd10f90e6",
      "f0f8ff75d46293fb7f70881476ff83da9f9f53b6625a4e53125250f61751b477",
      "f8480ad8d8bba9be61541cdd6b46657e9c3ab490cb8eec1434817d0e68e87efc",
      "13a923304c317ee2afdb15e2f5cbfa10e216fc1211252b3a97e3ce658ff35523",
      "93c4e08ce37d15560063ff89aa80d3037f21767fb59c3048e936b4f702e9800c",
      "f6cee400546c0c89d3e9dd76e2f9e6e6109d2acf7caa62004e11bf95c0d7f589",
      "9129b4727ac8010febe25e85e33120ec7ee41993cc249d6c8fbcc0ed81a0b7ed",
      "9f2a460abbf92729ae3fbc8ec3f9e984a225e21321625067b0192d35fc48b680",
      "560a4efcc1006322cee21f5e5a89f111b9c02e5b14a827cd2c882bb7145aad7c",
      "382393e4aa4cb12ba32542efe9e03b2567e2980aecf3c01a03618d57bee9c3c9",
      "4d7f272f55966783c9387f1527230a346cf58915ec9ec84d8a28e1aac730b80d",
      "4ce49ca9ffb60f529ce99bf7a77c944a4d7d299d7738bc339063ff95ee5e938a",
      "9dcc2fe39ffb068870d6384dac48f890799be0b33f9d12cb39ebf928dd68454a",
      "07dfab62d9bae69c5d6ad9ee35861f5ea55eaba60b0a2a8693e3d40e454fc289",
      "e4da80e47b0c0cba7569ce45f9dcc2360fa79aa0ddf1793d76cdace20d087eb2",
      "4ff50b26d84a0a94705b4a298deb2bf7b28df1991bfc14e564f51a0928837874",
      "6af0414523127293adad1ccd294307e6b6462260074233d954bc0a2026d860a3",
      "8eb6b7be38a247aeb0650350b380673037c3cdfd973fdb2068550a980d08d5e1",
      "69bd785bdbc220c02cd7e922ca1eee70521149e44e45cddfcc24c44bbd32df57",
      "b54431c8350084e015743218b10b48907cb6dc81875f65238c46720c622a7b3f",
      "46860cd4973f34fb620f1da72e1aaa1f937f3176ab8f0193adc3aa99e2900a81",
      "e4d68d9ec86c21535f311f11758e31ebdf66640f62091e1f6a1742c2770b1688",
      "e78ab1f44fe916cac614a5da15ec5300348e5fd519dc84713bddf5b5e12c3636",
      "26672c31f3d5d9abb997c302e1cbfe07cd3b19883bc16e37a3a73c889561a4e1",
      "fdf8a64792e39ec4e18eb47edb55fbe464e30dcce437e1d04a3439076e87094d",
      "aa0c6873bdfcde854b01f36bb3ad2affb580e2010f9fc1001392f81981676f24",
      "d8970972028cfe8c9d0355ce7e4b5913dfa14b2f22279793bf96dac76de6ef23",
      "9a5447cec3326395d3e10ad7b40376e53ee3bda6d5b851e6801bf1a2e1f79908",
      "3dc0b78f2e775e59c8df857eed4c8e4cd2ae7a1b85ea803b332f93c155cb32c9",
      "29a846ba9a34634a26a649d289e48e943cdbb97ffd152fbd27fc7a28d7245d3f",
      "b7c12611db7457d24d59dd8ecc40193beb75408901e4a8dbf2e391d70a78de21",
      "30f130d4681fa0a7b2d012e3708eac6e83ff86c9112508a1f9992292e9d71d9f",
      "f4c93a77ff296f87dc8195d6403a151b0875914b713ee62cf1c6622233dbca12",
      "ae10761402922e0dfcba63eaab227bbb5e26e8e4c3536ddfedb89624e8c9fd17",
      "cd6f26dacc5be2cca502f734a5bbb3da51c0712ca2c883939a97c2f3ac5a1f3f",
      "b8fd4dd87ed8c1179023afed5f116979040f2d26b18eb5a7857dbffec56068b8",
      "a21a8e1c26133752f1ceadf5f6aeb0e25b1c12078b372793722462bfa77f2fa1",
      "5396dfd63968395149ebac473bc2bfba2680adcadac5ee7c903c55367ce49cca",
      "c0e393411110ccf576b4a459768dfadea2894318e39f153d6d083c17f99b21ee",
      "e7323242733e8c48fecc442160aad7243ea276d8519401865de56b021aa2723c",
      "6316808bcf5e98f8d6d950cb8674372aefba88ca82f44544ff662e49efcbf5bb",
      "86a0078aa23d35fe816c1987116d1626ca16cdc2fc766ef5491ef69b39a9b18a",
      "621f2da6a39128e8e3f27c8548e31bde451688031f18946ba7b65694a06b8aea",
      "7a4c85234ebc2ccf0c885943a96ed375c2153ee8619b17f906889fe6bb3a75d8",
      "e6941737e238eb4f2c7259865ec36c0a593c2262849524758cf09cb54ce78482",
      "1c673a195295531eeea013015adcd418acae4e19a0b5bd40c3d36cb73a7ffe12",
      "25e2303b92aa4a7563d66ce64fc0ea37752a923807082a73995a7a5f6ba8af9f",
      "7a92587c62a686969f4d6212d8a08a8bfbca898ad09fafb5795a71f2c52ffd8b",
      "908dae064c7af4f30a3a0049868bf66c566b3ee44673731345161f01ec870a1b",
      "93888cf33dce509e45981fcc9adec302566eeb95bd778ca2a8124ab0c1895447",
      "d71e477a2305e1161f0202222ea6bd6c05fd5068e167c91aa23c5cf927225e1b",
      "300f044131b0717abc2e86377a3bd57dedb7327248b067d585249c4a00b46253",
      "1feceb1c6e70b1de2d22ed11b4e45ef96687173110394784e1289e065baffa60",
      "b24983b4dc9075e21fac62b90f432d713630ec11a09e4c4197b72e2188dea522",
      "b05e9e5f4799dcdd067d744e9989cedff97df8a4ec360a5e4c4d3853ac5fddfa",
      "325b3136796772ef826e0e96243eeadfd088733f685a0dd97cea0095636e2e91",
      "daad9232ed7e9eae1a17fbf43b54bf4887335a2cfce6e32345251efe2f6faed4",
      "ec027cfc8946d8849526bd0a6ba82e23a7e9ca6471a3e5d2fb67c231ea835c14",
      "a37f7636a9c2800a570f46ad2955118cb84e51aaa302fac55d40797e585248b3",
      "3597958d3d591d04b8bd6edaa84f397417b3ee54076a329d8b4dee90b71b1c6d",
      "6c3f3f40d801955793118a6435b97b1f7b31ffaf8ea9b8eb9946cf43357b66cb",
      "1a10275cd8be8c0af02cddfccd925dc8a372f0d9bcb30916d77ad7482b3a48a6",
      "cdb823d3c434f15a8fd6b5a9121b5ef268674f17f96267517df7e547b19ecf94",
      "29b8d33b8a4d7c877c5960d2446db9430b1bf5271d49f8af75f3e75a3ed683a1",
      "abe4a7d42d7df545537b8423ca98e63deaa3d45416ce55ba24c06714dbfc9817",
      "2a4c787232acc4f8f9cdfb20f75896381652b4422aa54071bbeda24f84d58b52",
      "9c78d18454289dc514ce0416e96e56e9049bf343ea0769b876f1e416ceba2f39",
      "92282883917ee45bbaf5bb88145065de3d69056e2457cce205c2ce7a2373de67",
      "eab2db60e91e5f817f16944ccda34a6c44334c18b5264bdc138a4b02c3f50368",
      "2c9cab09ba8d06e06d0e28a744878ae76d3f5d79c2a7cbce616573071c5d85b2",
      "7d8b21f12408a509c495f51c7881a52e03fab6ecefd78398623808ee4085d541",
      "7d284cd8cf30e089611e1529395bb913111989798ee0b77e7c8d291c7aa80514",
      "a0c298fabde649f2f429206192f6e100c4f638fd8227d46fc96e78083d872f51",
      "a5406527c14f90d83ecce07663deb1fd433d6dd097ebab30ee88211ada2266b9",
      "b65511c0305ecd0ec8c8d61e3f1245189047988c3cca08a1a49dd33ce3c4b5e2",
      "9c8ca53a907cb4c865a76c7790a74ebd3a516085da6d77faaa3c48d6ff0fb8a2"
    ]
  }
});
