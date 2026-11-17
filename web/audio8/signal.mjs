// Evaluate the signal users actually receive after the benchmark's PCM16 WAV conversion.
export function pcmSignal(pcm, label = 'Audio8') {
  if (!pcm.length) throw new Error(label + ' returned empty PCM');
  let previous, run = 0, longest = 0, longestValue;
  for (const sample of pcm) {
    if (!Number.isFinite(sample)) throw new Error(label + ' returned nonfinite PCM');
    const clipped = Math.min(1, Math.max(-1, sample));
    const value = Math.trunc(clipped * (clipped < 0 ? 32768 : 32767));
    run = value === previous ? run + 1 : 1;
    if (run > longest) { longest = run; longestValue = value; }
    previous = value;
  }
  return { samples: pcm.length, longestConstantSamples: longest, constantValue: longestValue };
}

export function checkSignal(signal, sampleRate, label = 'Audio8') {
  const { samples, longestConstantSamples: flat } = signal;
  // In the bad GPU codec, utterances start with variable PCM and collapse to
  // an identical PCM16 value for the rest. A nonzero RMS or peak misses this.
  if (flat === samples || (flat >= sampleRate && flat >= samples / 2)) {
    throw new Error(`${label} waveform collapsed: ${flat}/${samples} samples at constant PCM16 ${signal.constantValue}`);
  }
}

export function validatePcm16Article(pcm, sampleRate, sampleCounts, label) {
  let offset = 0;
  const spans = [];
  const failedSpanIds = [];
  let firstFailure;
  for (const [index, count] of sampleCounts.entries()) {
    const samples = pcm.subarray(offset, offset + count);
    const signal = pcmSignal(samples, label);
    try { checkSignal(signal, sampleRate, label); }
    catch (error) {
      failedSpanIds.push(index);
      firstFailure ??= `${label} source span ${index + 1}: ${error.message}`;
    }
    spans.push({ id: index, ...signal });
    offset += count;
  }
  if (offset !== pcm.length) throw new Error(label + ' source spans do not cover the recording');
  if (firstFailure) {
    const error = new Error(firstFailure);
    error.waveform = { gate: 'pcm16-constant-run-v1', passed: false, failedSpanIds, spans };
    throw error;
  }
  return { waveform: { gate: 'pcm16-constant-run-v1', passed: true, spans } };
}

export function validateAudio8Article(pcm, sampleRate, sampleCounts) {
  return validatePcm16Article(pcm, sampleRate, sampleCounts, 'Audio8');
}
