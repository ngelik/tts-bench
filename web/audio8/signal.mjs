// Evaluate the signal users actually receive after the benchmark's PCM16 WAV conversion.
export function pcmSignal(pcm) {
  if (!pcm.length) throw new Error('Audio8 returned empty PCM');
  let previous, run = 0, longest = 0, longestValue;
  for (const sample of pcm) {
    if (!Number.isFinite(sample)) throw new Error('Audio8 returned nonfinite PCM');
    const clipped = Math.min(1, Math.max(-1, sample));
    const value = Math.trunc(clipped * (clipped < 0 ? 32768 : 32767));
    run = value === previous ? run + 1 : 1;
    if (run > longest) { longest = run; longestValue = value; }
    previous = value;
  }
  return { samples: pcm.length, longestConstantSamples: longest, constantValue: longestValue };
}

export function checkSignal(signal, sampleRate) {
  const { samples, longestConstantSamples: flat } = signal;
  // In the bad GPU codec, utterances start with variable PCM and collapse to
  // an identical PCM16 value for the rest. A nonzero RMS or peak misses this.
  if (flat === samples || (flat >= sampleRate && flat >= samples / 2)) {
    throw new Error(`Audio8 waveform collapsed: ${flat}/${samples} samples at constant PCM16 ${signal.constantValue}`);
  }
}

export function validateAudio8Article(pcm, sampleRate, sampleCounts) {
  let offset = 0;
  for (const [index, count] of sampleCounts.entries()) {
    const samples = pcm.subarray(offset, offset + count);
    try { checkSignal(pcmSignal(samples), sampleRate); }
    catch (error) { throw new Error(`Audio8 source span ${index + 1}: ${error.message}`); }
    offset += count;
  }
  if (offset !== pcm.length) throw new Error('Audio8 source spans do not cover the recording');
  return { samplesPerChunk: sampleCounts };
}
