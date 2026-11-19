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
