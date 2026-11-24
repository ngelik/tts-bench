export function assembleStockPlayback(plans, utterancePcm, sampleRate, { pauseSeconds = 0.35, peak = 0.99 } = {}) {
  if (!Array.isArray(plans) || !Array.isArray(utterancePcm) || plans.length !== utterancePcm.length ||
      !Number.isSafeInteger(sampleRate) || sampleRate <= 0 || !Number.isFinite(pauseSeconds) || pauseSeconds < 0 ||
      !Number.isFinite(peak) || peak <= 0 || peak > 1) {
    throw new TypeError('Sinhala playback assembly received invalid plans, PCM or limits');
  }
  const pauseSamples = Math.round(pauseSeconds * sampleRate);
  const silence = new Float32Array(pauseSamples);
  const parts = [];
  let total = 0;
  for (let index = 0; index < plans.length; index++) {
    const pcm = utterancePcm[index];
    if (!(pcm instanceof Float32Array) || !pcm.length) throw new Error('Sinhala playback contains an empty utterance');
    parts.push(pcm); total += pcm.length;
    if (plans[index].sentenceEnd && index < plans.length - 1 && pauseSamples) {
      parts.push(silence); total += silence.length;
    }
  }
  const samples = new Float32Array(total);
  let offset = 0, rawPeak = 0;
  for (const part of parts) {
    samples.set(part, offset); offset += part.length;
  }
  for (const sample of samples) {
    if (!Number.isFinite(sample)) throw new Error('Sinhala model returned non-finite PCM');
    rawPeak = Math.max(rawPeak, Math.abs(sample));
  }
  if (!samples.length || rawPeak === 0) throw new Error('Sinhala model returned empty or silent PCM');
  if (rawPeak > peak) {
    const gain = peak / rawPeak;
    for (let index = 0; index < samples.length; index++) samples[index] *= gain;
  }
  return { samples, rawPeak, normalizedPeak: Math.min(rawPeak, peak), pauseSamples };
}
