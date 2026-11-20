export const MICRO_SPEED = 1;
export const MICRO_MAX_FRAMES = 1_200;
export const MICRO_MAX_PHONEME_IDS = 512;

export function assertMicroTokenIdCount(tokenCount) {
  if (!Number.isSafeInteger(tokenCount) || tokenCount < 3 || tokenCount > MICRO_MAX_PHONEME_IDS) {
    throw new Error(`Micro padded token sequence must contain 3..${MICRO_MAX_PHONEME_IDS} positions.`);
  }
  return tokenCount;
}

export function assertMicroTextFeatureDimensions(durations, durationFeatures, asrTokens, tokenCount) {
  assertMicroTokenIdCount(tokenCount);
  const validDimensions = dimensions => Array.isArray(dimensions)
    && dimensions.every(value => Number.isSafeInteger(value) && value > 0);
  if (!validDimensions(durations) || durations.length !== 2
    || durations[0] !== 1 || durations[1] !== tokenCount
    || !validDimensions(durationFeatures) || durationFeatures.length !== 3
    || durationFeatures[0] !== 1 || durationFeatures[1] !== tokenCount
    || !validDimensions(asrTokens) || asrTokens.length !== 3
    || asrTokens[0] !== 1 || asrTokens[1] !== 512 || asrTokens[2] !== tokenCount) {
    throw new Error('Inflect Micro v3 text feature graph returned unexpected token dimensions.');
  }
}

function roundTiesToEven(value) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

export function buildMicroFramePlan(durationValues, tokenCount, {
  speed = MICRO_SPEED,
  maxFrames = MICRO_MAX_FRAMES,
} = {}) {
  if (!(durationValues instanceof Float32Array) || !Number.isSafeInteger(tokenCount)
    || tokenCount < 1 || durationValues.length !== tokenCount
    || !durationValues.every(Number.isFinite)) {
    throw new Error('Micro duration output is malformed or nonfinite.');
  }
  if (!(Number.isFinite(speed) && speed > 0) || !Number.isSafeInteger(maxFrames) || maxFrames < 2) {
    throw new Error('Micro frame-plan settings are invalid.');
  }
  const counts = Array.from(durationValues, value => Math.max(1, roundTiesToEven(value / speed)));
  let frameCount = counts.reduce((sum, count) => sum + count, 0);
  if (frameCount < 2) {
    counts[0] += 2 - frameCount;
    frameCount = 2;
  }
  if (!Number.isSafeInteger(frameCount) || frameCount > maxFrames) {
    throw new Error(`Micro predicted ${frameCount} frames; the configured maximum is ${maxFrames}. No crop is allowed.`);
  }
  const alignment = new Float32Array(tokenCount * frameCount);
  let frame = 0;
  for (let token = 0; token < tokenCount; token++) {
    for (let repeat = 0; repeat < counts[token]; repeat++) alignment[token * frameCount + frame++] = 1;
  }
  if (frame !== frameCount || !alignment.every(Number.isFinite)) throw new Error('Micro alignment plan is inconsistent.');
  return { counts, frameCount, alignment };
}

export function microStyleRow(phonemeCount, rows = 510) {
  if (!Number.isSafeInteger(phonemeCount) || phonemeCount < 1 || phonemeCount > rows
    || !Number.isSafeInteger(rows) || rows < 1) {
    throw new Error('Micro style index is outside the exported speaker bank.');
  }
  return phonemeCount - 1;
}
