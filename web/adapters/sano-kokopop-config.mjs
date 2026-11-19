// Generated browser profile metadata mirrors assets.lock.json and is checked by
// tests/assets.test.mjs. Generated binaries are imported from the pinned
// build-workflow artifact; they are not publicly rehosted.
const runtimeVersion = 'kokopop-sano-heartnano-v1';

export const SANO_HEART_NANO_F32 = Object.freeze({
  id: 'sano-heart-nano-gguf-f32',
  model: {
    url: '/models/sano-heart-nano-gguf-f32/4a8194aa1dd958033ee449b3ad30c37e536b216e/heartnano-f32.gguf',
    bytes: 1_462_248,
    sha256: '5e4389e27a9db6d18c5e7d479374f0bdb6eb97ab22273edb8d89c879cc97af1e',
  },
  runtime: {
    version: runtimeVersion,
    files: [
      ['kokopop-runtime.js', 115_452, '265aeb2be06ed0f8361cd791aa419b31379c57f59447044694df12f4d99ef8ab'],
      ['kokopop-runtime.wasm', 4_170_114, '8033619c686c11bd737de88636f6a1145e4170d25c248cb6d16823ee25790e4a'],
      ['kokopop-runtime.data', 880_605, '525df9e3f5126afaf5b8b65626833e7850073e92ead87a39a085a9992838bca2'],
    ].map(([name, bytes, sha256]) => ({
      path: name,
      target: `runtimes/${runtimeVersion}/${name}`,
      url: `/runtimes/${runtimeVersion}/${name}`,
      bytes,
      sha256,
    })),
  },
  info: {
    voice: 'heartnano (US English; upstream Misaki-normalized eSpeak IPA frontend)',
    precision: 'F32 GGUF expanded from the exact upstream heartnano Q8 front/model blobs; distinct from the official int8 browser profile.',
    settings: {
      selectedVoice: 'heartnano',
      sampleRate: 24_000,
      speed: 1,
      seed: 'Base seed = 42 + zero-based canonical span ID (uint32); Kokopop derives internal long-form chunk seeds.',
      textInput: 'Harness passes each raw canonical span to Kokopop LONG_FORM synthesis without pre-splitting it.',
      textNormalization: 'Kokopop long-form preparation normalizes text and punctuation before the pinned sanoTTS Misaki/eSpeak English phoneme frontend.',
      internalLongFormChunking: 'Kokopop chunks to the voice-adjusted model token budget; it may trim/crossfade chunks and insert pauses.',
      streamDecode: 'Offline synthesis returns PCM after Kokopop collects the internally generated long-form chunks.',
      runtime: runtimeVersion,
      espeakLanguageData: 'English (US) only, from the matching Kokopop Emscripten bundle.',
    },
  },
});
// Individual additional profiles. Runtime bytes are identical; each model contains only its selected voice.
const additional = {
  "sano-heart-gguf": {
    "model": {
      "url": "/models/sano-heart-gguf/25410576d005d7f08d186990fd91f6a2651243de/heart.gguf",
      "bytes": 9375272,
      "sha256": "4f2b1ca6e8f3962b3feb0b712cde68208e3a2565d34fdb6388a8e565f46bfb9d"
    },
    "info": {
      "voice": "heart (US English; Misaki-normalized eSpeak IPA)",
      "precision": "F32 GGUF from pinned Heart F32 source; Kokopop Vocos.",
      "settings": {
        "selectedVoice": "heart",
        "sampleRate": 24000,
        "textNormalization": "Kokopop long-form preparation normalizes text and punctuation before the pinned sanoTTS Misaki/eSpeak English phoneme frontend.",
        "sourcePackage": "heart",
        "sourceParameterCount": 2272145,
        "espeakVoice": "en-us",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en-us"
      }
    }
  },
  "sano-amy-gguf": {
    "model": {
      "url": "/models/sano-amy-gguf/25410576d005d7f08d186990fd91f6a2651243de/amy.gguf",
      "bytes": 3236900,
      "sha256": "4e89c02b3548bc632ed33b1d3ded9f893f524639a0362a093e4329688a0e6f5f"
    },
    "info": {
      "voice": "amy (US English; Piper NFD phonemes with interleaved PAD)",
      "precision": "Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU.",
      "settings": {
        "selectedVoice": "amy",
        "sampleRate": 22050,
        "textNormalization": "Kokopop LONG_FORM normalizes text, then the pinned Piper eSpeak/NFD frontend emits phoneme IDs with interleaved PAD.",
        "sourcePackage": "amy-en-1p46m",
        "sourceParameterCount": 1454284,
        "espeakVoice": "en-us",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en-us"
      }
    }
  },
  "sano-amy-small-gguf": {
    "model": {
      "url": "/models/sano-amy-small-gguf/25410576d005d7f08d186990fd91f6a2651243de/amy-1p1m.gguf",
      "bytes": 2489188,
      "sha256": "b8bd823de3ac17e4dc79017a39cf526118ffaba6b3962fdf9da182598d5e9140"
    },
    "info": {
      "voice": "amy-1p1m (US English; Piper NFD phonemes with interleaved PAD)",
      "precision": "Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU.",
      "settings": {
        "selectedVoice": "amy-1p1m",
        "sampleRate": 22050,
        "textNormalization": "Kokopop LONG_FORM normalizes text, then the pinned Piper eSpeak/NFD frontend emits phoneme IDs with interleaved PAD.",
        "sourcePackage": "amy-en-1p1m",
        "sourceParameterCount": 1084972,
        "espeakVoice": "en-us",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en-us"
      }
    }
  },
  "sano-amy-1p8m-gguf": {
    "model": {
      "url": "/models/sano-amy-1p8m-gguf/25410576d005d7f08d186990fd91f6a2651243de/amy-1p8m.gguf",
      "bytes": 4007428,
      "sha256": "d904e96762ef2a255349a5ddb327427be69168dc1e9b5796a39dc76a60b072e8"
    },
    "info": {
      "voice": "amy-1p8m (US English; Piper NFD phonemes with interleaved PAD)",
      "precision": "Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU.",
      "settings": {
        "selectedVoice": "amy-1p8m",
        "sampleRate": 22050,
        "textNormalization": "Kokopop LONG_FORM normalizes text, then the pinned Piper eSpeak/NFD frontend emits phoneme IDs with interleaved PAD.",
        "sourcePackage": "amy-en-1p8m",
        "sourceParameterCount": 1834380,
        "espeakVoice": "en-us",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en-us"
      }
    }
  },
  "sano-hfc-gguf": {
    "model": {
      "url": "/models/sano-hfc-gguf/25410576d005d7f08d186990fd91f6a2651243de/hfc.gguf",
      "bytes": 4007492,
      "sha256": "783ccaad326143ef70e5cb79e89fc6d5fa17d510c97cd8027ed2391656b33f8d"
    },
    "info": {
      "voice": "hfc (US English; Piper NFD phonemes with interleaved PAD)",
      "precision": "Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU.",
      "settings": {
        "selectedVoice": "hfc",
        "sampleRate": 22050,
        "textNormalization": "Kokopop LONG_FORM normalizes text, then the pinned Piper eSpeak/NFD frontend emits phoneme IDs with interleaved PAD.",
        "sourcePackage": "hfc-en-1p8m",
        "sourceParameterCount": 1834380,
        "espeakVoice": "en-us",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en-us"
      }
    }
  },
  "sano-kristin-gguf": {
    "model": {
      "url": "/models/sano-kristin-gguf/25410576d005d7f08d186990fd91f6a2651243de/kristin.gguf",
      "bytes": 3115300,
      "sha256": "0d24d22ddbcef76544f5b8f9c3604265741d1f025a1ef4a7540e13a1e9304c85"
    },
    "info": {
      "voice": "kristin (US English; Piper NFD phonemes with interleaved PAD)",
      "precision": "Mixed F16/F32 GGUF from pinned Piperlite FP16 source; precision preserved across CPU and WebGPU.",
      "settings": {
        "selectedVoice": "kristin",
        "sampleRate": 22050,
        "textNormalization": "Kokopop LONG_FORM normalizes text, then the pinned Piper eSpeak/NFD frontend emits phoneme IDs with interleaved PAD.",
        "sourcePackage": "kristin-en-1p4m",
        "sourceParameterCount": 1396151,
        "espeakVoice": "en",
        "espeakLanguageData": "English data from the matching Kokopop bundle; selected upstream eSpeak voice en"
      }
    }
  }
};

export const SANO_KOKOPOP_PROFILES = Object.freeze({
  [SANO_HEART_NANO_F32.id]: SANO_HEART_NANO_F32,
  ...Object.fromEntries(Object.entries(additional).map(([id, profile]) => [id, Object.freeze({
    id, model: profile.model, runtime: SANO_HEART_NANO_F32.runtime,
    info: { ...SANO_HEART_NANO_F32.info, ...profile.info, settings: { ...SANO_HEART_NANO_F32.info.settings, ...profile.info.settings } },
  })])),
});
