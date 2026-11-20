import { inverseStft } from '../supratts/fft.mjs';

export const UA_SERHIY_SAMPLE_RATE = 22_050;
export const UA_SERHIY_HOP_LENGTH = 256;
export const UA_SERHIY_FFT_SIZE = 1_024;
export const UA_SERHIY_SPECTRAL_CHANNELS = 1_539;
export const UA_SERHIY_BINS = UA_SERHIY_FFT_SIZE / 2 + 1;

/**
 * Port the pinned reference decoder's spectral postprocessing and centered
 * periodic-Hann iSTFT. The graph returns channel-major `[1, 1539, frames]`:
 * 513 clamped log magnitudes followed by two 513-bin phase channels.
 *
 * `torch.istft(..., center=True, length=frames * hop)` returns `(frames-1)*hop`
 * overlap-add samples and pads the requested final hop with zeros. Keep that
 * exact length contract; do not normalize, fade, or clip the waveform here.
 */
export function uaSerhiySpectralToPcm(params, frameCount) {
  if (!(params instanceof Float32Array) && !(params instanceof Float64Array)) {
    throw new TypeError('Ukrainian Serhiy spectral parameters must be float32/float64.');
  }
  if (!Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > 20_400) {
    throw new RangeError('Ukrainian Serhiy frame count must be in [1, 20400].');
  }
  const expected = UA_SERHIY_SPECTRAL_CHANNELS * frameCount;
  if (params.length !== expected) {
    throw new Error(`Ukrainian Serhiy spectral tensor has ${params.length} values; expected ${expected}.`);
  }
  const spectrum = new Float64Array(UA_SERHIY_BINS * frameCount * 2);
  for (let bin = 0; bin < UA_SERHIY_BINS; bin++) {
    const realChannel = UA_SERHIY_BINS + bin;
    const imagChannel = UA_SERHIY_BINS * 2 + bin;
    for (let frame = 0; frame < frameCount; frame++) {
      const source = bin * frameCount + frame;
      const logMagnitude = Math.max(-12, Math.min(8, params[source]));
      const magnitude = Math.max(Math.exp(logMagnitude), 1e-7);
      const rawReal = params[realChannel * frameCount + frame];
      const rawImag = params[imagChannel * frameCount + frame];
      const phaseNorm = Math.max(Math.hypot(rawReal, rawImag), 1e-6);
      const target = source * 2;
      spectrum[target] = magnitude * rawReal / phaseNorm;
      spectrum[target + 1] = magnitude * rawImag / phaseNorm;
    }
  }

  // torch.istft uses irfft: imaginary DC and Nyquist values are ignored.
  for (let frame = 0; frame < frameCount; frame++) {
    spectrum[frame * 2 + 1] = 0;
    spectrum[(UA_SERHIY_BINS - 1) * frameCount * 2 + frame * 2 + 1] = 0;
  }

  const centered = inverseStft(spectrum, frameCount, {
    fftSize: UA_SERHIY_FFT_SIZE,
    hop: UA_SERHIY_HOP_LENGTH,
  });
  const expectedSamples = frameCount * UA_SERHIY_HOP_LENGTH;
  if (centered.length !== expectedSamples - UA_SERHIY_HOP_LENGTH) {
    throw new Error(`Ukrainian Serhiy iSTFT produced ${centered.length} centered samples before the requested tail pad.`);
  }
  const pcm = new Float32Array(expectedSamples);
  pcm.set(centered);
  return pcm;
}
