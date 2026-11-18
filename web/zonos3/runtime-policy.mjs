export const ZONOS3_ID = 'zonos3-mini';
export const ZONOS3_MODEL_REVISION = '2921b8821772b0bd10a04456863d21abf9d2f283';
export const ZONOS3_WEB_RUNTIME_REVISION = 'a50e14117d99181ba7f28047b451ba03ba1a09a9';
export const ZONOS3_VOICE_ID = 'default_b78b28baf5c31a1d';
export const ZONOS3_VOICE_LABEL = 'Imogen (English, British female)';

const modelBase = `/models/${ZONOS3_ID}/${ZONOS3_MODEL_REVISION}`;
const ggufBase = `${modelBase}/gguf`;
const speakerEmbedding = {
  modelUrl: `${modelBase}/web/voices/English/Imogen_en-British_F_1.embedding.npy`,
  bytes: 896,
  sha256: '683424b91faeade48c8a92e05e1c3679366abbba443ef62eccba8dc40de48e9e',
  filename: 'Imogen_en-British_F_1.embedding.npy',
};

export const ZONOS3_MODEL_CONFIG = Object.freeze({
  id: ZONOS3_ID,
  name: 'Zyphra ZONOS3-Mini',
  family: 'zonos3',
  modelRevision: ZONOS3_MODEL_REVISION,
  info: Object.freeze({
    voice: ZONOS3_VOICE_LABEL,
    voiceId: ZONOS3_VOICE_ID,
    language: 'en_us',
    sampleRate: 44100,
    seed: '42 + canonical chunk id',
    textFrontend: 'Official browser tokenizer; each canonical text span is passed unchanged, without phonemization or text normalization.',
    sampling: Object.freeze({ temperature: 0.75, topk: 80, top_p: 0.69, min_p: 0, repetition_penalty: 2.4, repetition_window: 96, repetition_codebooks: 6 }),
    decoder: 'keep2_plain',
    silencePrefillFrames: 3,
    streamDecode: 'prefix; decode after one codebook for the first prefix only',
  }),
  cpuRuntimeVersion: 'audio-cpp-zonos3-cpu-wasm-v1',
  cpuRuntimeFiles: Object.freeze({
    jsUrl: '/runtimes/audio-cpp-zonos3-cpu-wasm-v1/bench_zonos3_cpu.js',
    wasmUrl: '/runtimes/audio-cpp-zonos3-cpu-wasm-v1/bench_zonos3_cpu.wasm',
  }),
  cpuAssets: Object.freeze({
    backbone: Object.freeze({
      modelUrl: `${ggufBase}/backbone-ptq.gguf`,
      bytes: 663150624,
      sha256: '66fceb6d73a8c30bde80249e4112bb308380ab7f3384fa11c8e4048115e4ceec',
      filename: 'backbone-ptq.gguf',
    }),
    decoder: Object.freeze({
      modelUrl: `${ggufBase}/zac-keep2.gguf`,
      bytes: 452325440,
      sha256: '834e5b70b88294afc3c702a478487e0664dcc6b574c16fc6167d72444aabeafd',
      filename: 'zac-keep2.gguf',
    }),
    speakerEncoder: Object.freeze({
      modelUrl: `${ggufBase}/spk-encoder.gguf`,
      bytes: 45385728,
      sha256: '9539f340b70be246005403b9c254732e180e85e0b3c57fb1973f0d6bc6c59bdc',
      filename: 'spk-encoder.gguf',
    }),
    speakerEmbedding: Object.freeze(speakerEmbedding),
  }),
});

export const ZONOS3_WEB_BASE = `${modelBase}/web/`;
export const ZONOS3_REQUEST_SETTINGS = Object.freeze({
  language: 'en_us',
  speaker_mode: 'embedding',
  speaker_embedding_id: ZONOS3_VOICE_ID,
  speaker_cfg_scale: 1,
  controls_cfg_scale: 1,
  decoder: 'keep2_plain',
  stream: true,
  stream_decode: 'prefix',
  stream_codebooks: 1,
  stream_codebooks_scope: 'first',
  silence_prefill_frames: 3,
  short_text: 'off',
  temperature: 0.75,
  topk: 80,
  top_p: 0.69,
  min_p: 0,
  repetition_penalty: 2.4,
  repetition_window: 96,
  repetition_codebooks: 6,
});
