export function mergeSpanAudio(parts, peak = 0.99) {
  if (!Array.isArray(parts) || !parts.length || !Number.isFinite(peak) || peak <= 0 || peak > 1) {
    throw new Error('Uzbek span audio requires at least one PCM part and a valid peak cap');
  }
  let sampleCount = 0;
  for (const part of parts) {
    if (!(part instanceof Float32Array) || !part.length || !part.every(Number.isFinite)) {
      throw new Error('Uzbek utterance must contain finite, nonempty float32 PCM');
    }
    sampleCount += part.length;
  }
  const joined = new Float32Array(sampleCount);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  let loudest = 0;
  for (const sample of joined) loudest = Math.max(loudest, Math.abs(sample));
  if (loudest > peak) {
    const scale = peak / loudest;
    for (let index = 0; index < joined.length; index++) joined[index] *= scale;
  }
  return joined;
}

export function noiseIndexForUtterance(index, noiseIndexes) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= noiseIndexes.length) {
    throw new Error('Uzbek span exceeds the pinned per-utterance noise controls');
  }
  return noiseIndexes[index].index;
}
