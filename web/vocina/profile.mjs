export const modelRevision = '8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34';
export const sampleRate = 24000;
export const hop = 256;
export const maxTokens = 512;
export const defaultVoice = 'I1';
export const defaultVoiceIndex = 0;
export const fixtureOracle = Object.freeze({
  fixtureId: 'it-article-v1',
  language: 'it',
  sourceSha256: '9deb44d6edb942644c0e018446040f24984e2c2a032a9665b3bb4d4bff17023a',
  spans: 107,
  plans: 336,
  maximumTokens: 185,
  unknownSpans: 0,
  tokenStressPauseSha256: '747da1dc5adadd77a003f2f481a2af9065ba6fb71d320bac537ccfc352b83916',
});

export const assetDigests = Object.freeze({
  'vocina-int8.onnx': [8536789, 'a899c64c380fd3ca6460b13b8162da0d9931c25326567c1e87e140a2aa1b743d'],
  'vocina-int8.json': [926, '2f07dbe350d2fdc891126d4847fe251e7ab48d04c3d87836123030d5a3e1a3f8'],
  'g2p_it.js': [22989, '9a0a5bdd9feddd45d1ed32db2cad2a431a7b3f70b0f5a33bd45d24e934b4c825'],
  'dati.json': [31675, 'a55faf08a98001f62db30780f593a2bd00cb9acf4cb6fb73a9bd06a4723d0ced'],
  'lessico_wikizionario.json': [517343, '2ac11cdd7d6ad2b001d1719e504f80807cb0b517ab506154744111257d987f39'],
  'ort.wasm.bundle.min.mjs': [72799, '1db5e1c5cd2b860eed85e6eeff23e2aaa7cffcc407f67093bcc888f631b94ba9'],
  'ort-wasm-simd-threaded.wasm': [13479978, 'd1ab1b94b16a65b29d710d0b587b29e7bed336827577623913479b8afe8113e6'],
  'ort.webgpu.bundle.min.mjs': [113035, '3a18c7f261e05d44a15b2eef18a28e5f53c044d5d140bcea6066baf1f09c8b53'],
  'ort-wasm-simd-threaded.asyncify.wasm': [24254953, '7e83cd6cee77e478bc96a7e91b198144fb5e4126287daf1f9b54bb195ebcd55a'],
});

export function validateVocinaMetadata(metadata) {
  const symbols = [
    '<pad>', '<bos>', '<eos>', '<sp>', '<unk>', ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…',
    'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 's', 'z', 'ʃ', 'm', 'n', 'ɲ', 'ŋ', 'l', 'ʎ', 'r', 'ɾ', 'j', 'w',
    'ts', 'dz', 'tʃ', 'dʒ', 'a', 'e', 'ɛ', 'i', 'o', 'ɔ', 'u', '<riservato1>', '<riservato2>', '<riservato3>',
    '<riservato4>', '<riservato5>', '<riservato6>', '<riservato7>', '<riservato8>',
  ];
  if (metadata?.sample_rate !== sampleRate || metadata?.hop !== hop || metadata?.max_tokens !== maxTokens ||
      metadata?.step !== 100000 || metadata?.frontend !== 'g2p_it' ||
      metadata?.frontend_fingerprint !== '60b58eaafeffe34b40284485cfac143ed3df1d8ec718b67b4f58bc46cd002a6b' ||
      JSON.stringify(metadata?.voices) !== JSON.stringify(['I1', 'I2']) ||
      JSON.stringify(metadata?.symbols) !== JSON.stringify(symbols) ||
      JSON.stringify(metadata?.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(metadata?.outputs) !== JSON.stringify(['audio', 'durations'])) {
    throw new Error('Pinned Vocina v1.0 metadata does not match the released INT8 profile.');
  }
  return metadata;
}
