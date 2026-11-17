// Read the benchmark's canonical mono PCM16 WAV without requiring AudioContext in a worker.
export function referencePcm(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength !== 44 + 24000 * 30 * 2 ||
      view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57415645 ||
      view.getUint32(12) !== 0x666d7420 || view.getUint32(16, true) !== 16 ||
      view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1 ||
      view.getUint32(24, true) !== 24000 || view.getUint16(34, true) !== 16 ||
      view.getUint32(36) !== 0x64617461 || view.getUint32(40, true) !== buffer.byteLength - 44) {
    throw new Error('Expected the pinned Tiny Voca mono PCM16 24 kHz reference');
  }
  const samples = new Float32Array((buffer.byteLength - 44) / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(44 + 2 * i, true) / 32768;
  return samples;
}

export function rejectTruncation(tokenizer) {
  const original = tokenizer.encode.bind(tokenizer);
  tokenizer.encode = (text, language) => {
    const ids = original(text, language);
    if (ids.at(-1) !== tokenizer.spec.eosId) throw new Error('Sopro source text exceeds the tokenizer budget');
    return ids;
  };
}
