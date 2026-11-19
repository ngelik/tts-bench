// Real-valued implementation of Inflect Micro v3's pinned SourceFilterHead2.
// The network predicts source gains; this module reproduces the 600/150 and
// 150/75 centered Hann STFT/iSTFT path without complex-valued ONNX operators.

const SAMPLE_RATE = 24_000;
const FRAME_SAMPLES = 300;
const MAIN_FFT = 600;
const MAIN_HOP = 150;
const BURST_FFT = 150;
const BURST_HOP = 75;
const HARMONICS = 64;
const MAX_FRAMES = 1_200;
const TAU = 2 * Math.PI;

function smallestFactor(value) {
  for (const factor of [2, 3, 5]) if (value % factor === 0) return factor;
  return value;
}

function buildPlan(size) {
  const roots = new Map();
  const workReal = [];
  const workImag = [];
  const prepare = (n, level = 0) => {
    if (n <= 1) return;
    if (!roots.has(n)) {
      const real = new Float64Array(n);
      const imag = new Float64Array(n);
      for (let index = 0; index < n; index++) {
        const angle = TAU * index / n;
        real[index] = Math.cos(angle);
        imag[index] = Math.sin(angle);
      }
      roots.set(n, { real, imag });
    }
    workReal[level] ??= new Float64Array(n);
    workImag[level] ??= new Float64Array(n);
    const radix = smallestFactor(n);
    if (radix !== n) prepare(n / radix, level + 1);
  };
  prepare(size);

  function recursive(inputReal, inputImag, inputOffset, inputStride, n, outputReal, outputImag, outputOffset, level, inverse) {
    if (n === 1) {
      outputReal[outputOffset] = inputReal[inputOffset];
      outputImag[outputOffset] = inputImag[inputOffset];
      return;
    }
    const radix = smallestFactor(n);
    if (radix === n) {
      // The current runtime only requests lengths composed of 2, 3 and 5.
      // Keep a correct direct fallback for any unexpected prime length.
      for (let k = 0; k < n; k++) {
        let sumReal = 0;
        let sumImag = 0;
        for (let j = 0; j < n; j++) {
          const angle = TAU * j * k / n * (inverse ? 1 : -1);
          const c = Math.cos(angle), s = Math.sin(angle);
          const re = inputReal[inputOffset + j * inputStride];
          const im = inputImag[inputOffset + j * inputStride];
          sumReal += re * c - im * s;
          sumImag += re * s + im * c;
        }
        outputReal[outputOffset + k] = sumReal;
        outputImag[outputOffset + k] = sumImag;
      }
      return;
    }
    const childSize = n / radix;
    const scratchReal = workReal[level];
    const scratchImag = workImag[level];
    for (let branch = 0; branch < radix; branch++) {
      recursive(inputReal, inputImag, inputOffset + branch * inputStride, inputStride * radix,
        childSize, scratchReal, scratchImag, branch * childSize, level + 1, inverse);
    }
    const table = roots.get(n);
    for (let k = 0; k < childSize; k++) {
      for (let branch = 0; branch < radix; branch++) {
        const outputIndex = k + branch * childSize;
        let sumReal = 0;
        let sumImag = 0;
        for (let inputBranch = 0; inputBranch < radix; inputBranch++) {
          const rootIndex = (inputBranch * outputIndex) % n;
          const c = table.real[rootIndex];
          const s = table.imag[rootIndex] * (inverse ? 1 : -1);
          const inputRe = scratchReal[inputBranch * childSize + k];
          const inputIm = scratchImag[inputBranch * childSize + k];
          sumReal += inputRe * c - inputIm * s;
          sumImag += inputRe * s + inputIm * c;
        }
        outputReal[outputOffset + outputIndex] = sumReal;
        outputImag[outputOffset + outputIndex] = sumImag;
      }
    }
  }

  return (inputReal, inputImag, outputReal, outputImag, inverse = false) => {
    if (inputReal.length !== size || inputImag.length !== size || outputReal.length !== size || outputImag.length !== size) {
      throw new Error(`FFT length mismatch; expected ${size}.`);
    }
    recursive(inputReal, inputImag, 0, 1, size, outputReal, outputImag, 0, 0, inverse);
    if (inverse) for (let index = 0; index < size; index++) {
      outputReal[index] /= size;
      outputImag[index] /= size;
    }
  };
}

const FFT_600 = buildPlan(MAIN_FFT);
const FFT_150 = buildPlan(BURST_FFT);

export function fftComplex(real, imag, inverse = false) {
  if (!(real instanceof Float64Array) || !(imag instanceof Float64Array) || real.length !== imag.length) {
    throw new Error('FFT expects equal-length Float64Array inputs.');
  }
  const outputReal = new Float64Array(real.length);
  const outputImag = new Float64Array(imag.length);
  const plan = real.length === MAIN_FFT ? FFT_600 : real.length === BURST_FFT ? FFT_150 : buildPlan(real.length);
  plan(real, imag, outputReal, outputImag, inverse);
  return { real: outputReal, imag: outputImag };
}

export function hannWindow(size) {
  if (!Number.isSafeInteger(size) || size < 2) throw new Error('Hann window size must be an integer >= 2.');
  const window = new Float64Array(size);
  for (let index = 0; index < size; index++) window[index] = 0.5 - 0.5 * Math.cos(TAU * index / size);
  return window;
}

export function harmonicSine(cycles, frequency) {
  if (!Number.isFinite(cycles) || !Number.isFinite(frequency)) throw new Error('Nonfinite source-filter input.');
  if (frequency <= 10) return 0;
  const count = Math.min(HARMONICS, Math.max(0, Math.ceil(11_000 / frequency) - 1));
  if (!count) return 0;
  const halfAngle = Math.PI * cycles;
  const denominator = Math.sin(halfAngle);
  if (Math.abs(denominator) < 1e-12) return 0;
  // Closed form of sum(sin(2*pi*k*cycles), k=1..count), matching sine_bank's
  // strict f0*k < 11000 mask without a 64-iteration inner loop per sample.
  return 0.1 * Math.sin(count * halfAngle) * Math.sin((count + 1) * halfAngle) / denominator;
}

export function seededGaussian(length, seed) {
  if (!Number.isSafeInteger(length) || length < 1 || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Micro noise requires a positive length and uint32 seed.');
  }
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const values = new Float32Array(length);
  for (let index = 0; index < length; index += 2) {
    const u = Math.max(random(), 1e-12);
    const v = random();
    const radius = Math.sqrt(-2 * Math.log(u));
    values[index] = radius * Math.cos(TAU * v);
    if (index + 1 < length) values[index + 1] = radius * Math.sin(TAU * v);
  }
  return values;
}

function periodicHann(size) {
  return hannWindow(size);
}

function reflectIndex(index, length) {
  if (length < 2) throw new Error('Centered STFT requires at least two input samples.');
  const period = 2 * (length - 1);
  let wrapped = index % period;
  if (wrapped < 0) wrapped += period;
  return wrapped < length ? wrapped : period - wrapped;
}

function fillWindowedFrame(signal, start, nfft, window, real, imag, reverse = false) {
  const center = Math.floor(nfft / 2);
  const length = signal.length;
  for (let index = 0; index < nfft; index++) {
    const sampleIndex = reflectIndex(start + index - center, length);
    const sourceIndex = reverse ? length - 1 - sampleIndex : sampleIndex;
    real[index] = signal[sourceIndex] * window[index];
    imag[index] = 0;
  }
}

function centeredIfftFrame(realHalf, imagHalf, nfft, inverse, outputReal, outputImag, fullReal, fullImag) {
  const bins = nfft / 2 + 1;
  for (let bin = 0; bin < bins; bin++) {
    fullReal[bin] = realHalf[bin];
    fullImag[bin] = bin === 0 || bin === nfft / 2 ? 0 : imagHalf[bin];
  }
  for (let bin = bins; bin < nfft; bin++) {
    const mirror = nfft - bin;
    fullReal[bin] = realHalf[mirror];
    fullImag[bin] = -imagHalf[mirror];
  }
  inverse(fullReal, fullImag, outputReal, outputImag, true);
}

function seededSource(f0, seed) {
  const frameCount = f0.length;
  if (!Number.isSafeInteger(frameCount) || frameCount < 2) throw new Error('Micro f0 curve must contain at least two frames.');
  const sampleCount = frameCount * FRAME_SAMPLES;
  if (sampleCount > MAX_FRAMES * 2 * FRAME_SAMPLES) throw new Error('Micro utterance exceeds the source-filter frame bound.');
  const white = seededGaussian(sampleCount, seed);
  const phaseStart = new Float64Array(frameCount);
  const phaseAdvance = new Float64Array(frameCount);
  let cumulative = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    const increment = Number(f0[frame]) * FRAME_SAMPLES / SAMPLE_RATE;
    if (!Number.isFinite(increment)) throw new Error('Micro f0 curve contains nonfinite values.');
    cumulative += increment;
    phaseStart[frame] = cumulative - Math.floor(cumulative);
    phaseAdvance[frame] = frame + 1 < frameCount ? Number(f0[frame + 1]) * FRAME_SAMPLES / SAMPLE_RATE : 0;
  }
  const sine = new Float32Array(sampleCount);
  const voiced = new Uint8Array(sampleCount);
  const cycles = new Float64Array(sampleCount);
  for (let sample = 0; sample < sampleCount; sample++) {
    const position = (sample + 0.5) / FRAME_SAMPLES - 0.5;
    const frame = Math.max(0, Math.min(frameCount - 1, Math.floor(position)));
    const fraction = Math.max(0, Math.min(1, position - frame));
    const cycle = phaseStart[frame] + fraction * phaseAdvance[frame];
    const hz = Number(f0[Math.floor(sample / FRAME_SAMPLES)]);
    cycles[sample] = cycle;
    voiced[sample] = hz > 10 ? 1 : 0;
    sine[sample] = harmonicSine(cycle, hz);
  }
  return { white, sine, voiced, cycles };
}

function sourceSample(source, index, mod = 0, kind = 'plain') {
  const white = source.white[index];
  if (kind === 'sine') return source.sine[index];
  if (kind === 'plain') return white;
  const cycle = source.cycles[index];
  const voiced = source.voiced[index];
  const angle = TAU * mod * cycle;
  return white * voiced * (kind === 'cos' ? Math.cos(angle) : Math.sin(angle));
}

function stftFrame(getSample, signalLength, frameIndex, nfft, hop, window, real, imag, fft, outReal, outImag, reverse = false) {
  const start = frameIndex * hop;
  const center = Math.floor(nfft / 2);
  for (let index = 0; index < nfft; index++) {
    const sourceIndex = reflectIndex(start + index - center, signalLength);
    real[index] = getSample(reverse ? signalLength - 1 - sourceIndex : sourceIndex) * window[index];
    imag[index] = 0;
  }
  fft(real, imag, outReal, outImag, false);
}

function overlapAdd(specReal, specImag, frameIndex, nfft, hop, window, inverse, accum, denom, frameReal, frameImag, fullReal, fullImag) {
  centeredIfftFrame(specReal, specImag, nfft, inverse, frameReal, frameImag, fullReal, fullImag);
  const offset = frameIndex * hop;
  for (let index = 0; index < nfft; index++) {
    const windowValue = window[index];
    accum[offset + index] += frameReal[index] * windowValue;
    denom[offset + index] += windowValue * windowValue;
  }
}

function finishOverlap(accum, denom, nfft, desiredLength) {
  const output = new Float32Array(desiredLength);
  const start = Math.floor(nfft / 2);
  for (let index = 0; index < desiredLength; index++) {
    const denominator = denom[start + index];
    if (!(denominator > 1e-12)) throw new Error('Micro iSTFT encountered a zero-overlap sample.');
    const value = accum[start + index] / denominator;
    if (!Number.isFinite(value)) throw new Error('Micro iSTFT returned nonfinite audio.');
    output[index] = value;
  }
  return output;
}

function tensorChannel(data, dims, channel, bin, frame) {
  const frames = dims[3];
  const bins = dims[2];
  return data[(channel * bins + bin) * frames + frame];
}

function clampLogGain(value) {
  return Math.exp(Math.min(value, 6));
}

function signalStats(length, read) {
  let minimum = Infinity;
  let maximum = -Infinity;
  let maxAbs = 0;
  let nonfiniteSamples = 0;
  let clippedSamples = 0;
  let firstInvalidSample = null;
  for (let index = 0; index < length; index++) {
    const value = read(index);
    if (!Number.isFinite(value)) {
      nonfiniteSamples++;
      firstInvalidSample ??= index;
      continue;
    }
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    maxAbs = Math.max(maxAbs, Math.abs(value));
    if (Math.abs(value) >= 1) {
      clippedSamples++;
      firstInvalidSample ??= index;
    }
  }
  return {
    min: Number.isFinite(minimum) ? minimum : null,
    max: Number.isFinite(maximum) ? maximum : null,
    maxAbs,
    nonfiniteSamples,
    clippedSamples,
    firstInvalidSample,
  };
}

function synthesizeMain(f0, source, coeffs, frames, seed) {
  const dims = coeffs.gains.dims;
  // The decoder trunk expands duration frames 2x before its two-frame-per-
  // trunk main head, then adds the centered-STFT terminal frame.
  if (dims.length !== 4 || dims[0] !== 1 || dims[1] !== 8 || dims[2] !== 301 || dims[3] !== frames * 4 + 1) {
    throw new Error('Micro main source-filter coefficient dimensions differ.');
  }
  // The short burst head emits four 75-sample frames per expanded trunk frame.
  const burstFrames = frames * 8 + 1;
  if (coeffs.pulseShift.length !== frames * 4 + 1 || coeffs.burstGains.dims[0] !== 1
    || coeffs.burstGains.dims[1] !== 76 || coeffs.burstGains.dims[2] !== burstFrames) {
    throw new Error('Micro pulse or burst coefficient dimensions differ.');
  }
  const waveformLength = frames * 600;
  const sourceLength = source.white.length;
  if (sourceLength !== waveformLength || f0.length !== frames * 2) throw new Error('Micro source/f0 sample clocks differ.');
  const mainFrames = frames * 4 + 1;
  const mainWindow = periodicHann(MAIN_FFT);
  const mainAccum = new Float64Array((mainFrames - 1) * MAIN_HOP + MAIN_FFT);
  const mainDenom = new Float64Array(mainAccum.length);
  const mainFrame = new Float64Array(MAIN_FFT), mainImag = new Float64Array(MAIN_FFT);
  const fftReal = new Float64Array(MAIN_FFT), fftImag = new Float64Array(MAIN_FFT);
  const inverseReal = new Float64Array(MAIN_FFT), inverseImag = new Float64Array(MAIN_FFT);
  const halfReal = new Float64Array(MAIN_FFT / 2 + 1), halfImag = new Float64Array(MAIN_FFT / 2 + 1);
  const spectrumReal = new Float64Array(MAIN_FFT / 2 + 1), spectrumImag = new Float64Array(MAIN_FFT / 2 + 1);
  const eReal = new Float64Array(MAIN_FFT / 2 + 1), eImag = new Float64Array(MAIN_FFT / 2 + 1);
  const nReal = new Float64Array(MAIN_FFT / 2 + 1), nImag = new Float64Array(MAIN_FFT / 2 + 1);
  const getSine = index => source.sine[index];
  const getNoise = index => source.white[index];
  const modGetters = [
    index => sourceSample(source, index, 1, 'cos'),
    index => sourceSample(source, index, 1, 'sin'),
    index => sourceSample(source, index, 2, 'cos'),
    index => sourceSample(source, index, 2, 'sin'),
  ];

  for (let frame = 0; frame < mainFrames; frame++) {
    stftFrame(getSine, sourceLength, frame, MAIN_FFT, MAIN_HOP, mainWindow, mainFrame, mainImag, FFT_600, fftReal, fftImag);
    for (let bin = 0; bin <= MAIN_FFT / 2; bin++) { eReal[bin] = fftReal[bin]; eImag[bin] = fftImag[bin]; }
    stftFrame(getNoise, sourceLength, frame, MAIN_FFT, MAIN_HOP, mainWindow, mainFrame, mainImag, FFT_600, fftReal, fftImag);
    for (let bin = 0; bin <= MAIN_FFT / 2; bin++) { nReal[bin] = fftReal[bin]; nImag[bin] = fftImag[bin]; }
    for (let modIndex = 0; modIndex < 4; modIndex++) {
      stftFrame(modGetters[modIndex], sourceLength, frame, MAIN_FFT, MAIN_HOP, mainWindow, mainFrame, mainImag, FFT_600, fftReal, fftImag);
      for (let bin = 0; bin <= MAIN_FFT / 2; bin++) {
        const gain = tensorChannel(coeffs.gains.data, dims, 4 + modIndex, bin, frame);
        nReal[bin] += gain * fftReal[bin];
        nImag[bin] += gain * fftImag[bin];
      }
    }
    const f0Frame = Math.min(Math.floor(frame / 2), f0.length - 1);
    const f0Hz = Math.max(60, Number(f0[f0Frame]));
    const shift = 0.5 * Math.tanh(Number(coeffs.pulseShift[frame]));
    for (let bin = 0; bin <= MAIN_FFT / 2; bin++) {
      const gainHarmonic = clampLogGain(Number(tensorChannel(coeffs.gains.data, dims, 0, bin, frame)));
      const phaseRe = Number(tensorChannel(coeffs.gains.data, dims, 1, bin, frame));
      const phaseIm = Number(tensorChannel(coeffs.gains.data, dims, 2, bin, frame));
      const norm = Math.max(Math.hypot(phaseRe, phaseIm), 1e-4);
      const unitRe = phaseRe / norm;
      const unitIm = phaseIm / norm;
      const ratio = (bin * SAMPLE_RATE / MAIN_FFT) / f0Hz;
      const angle = TAU * ratio * shift;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const hRe = gainHarmonic * (unitRe * cos - unitIm * sin);
      const hIm = gainHarmonic * (unitRe * sin + unitIm * cos);
      const gainNoise = clampLogGain(Number(tensorChannel(coeffs.gains.data, dims, 3, bin, frame)));
      spectrumReal[bin] = eReal[bin] * hRe - eImag[bin] * hIm + gainNoise * nReal[bin];
      spectrumImag[bin] = eReal[bin] * hIm + eImag[bin] * hRe + gainNoise * nImag[bin];
    }
    for (let bin = 0; bin < spectrumReal.length; bin++) {
      halfReal[bin] = spectrumReal[bin];
      halfImag[bin] = spectrumImag[bin];
    }
    overlapAdd(halfReal, halfImag, frame, MAIN_FFT, MAIN_HOP, mainWindow, FFT_600,
      mainAccum, mainDenom, inverseReal, inverseImag, fftReal, fftImag);
  }

  const main = finishOverlap(mainAccum, mainDenom, MAIN_FFT, waveformLength);
  return synthesizeBurst(source, coeffs.burstGains, frames, waveformLength, main, seed);
}

function synthesizeBurst(source, burstGains, frames, waveformLength, main, seed) {
  const burstFrames = frames * 8 + 1;
  const window = periodicHann(BURST_FFT);
  const accum = new Float64Array((burstFrames - 1) * BURST_HOP + BURST_FFT);
  const denom = new Float64Array(accum.length);
  const frame = new Float64Array(BURST_FFT), frameImag = new Float64Array(BURST_FFT);
  const fftReal = new Float64Array(BURST_FFT), fftImag = new Float64Array(BURST_FFT);
  const inverseReal = new Float64Array(BURST_FFT), inverseImag = new Float64Array(BURST_FFT);
  const halfReal = new Float64Array(BURST_FFT / 2 + 1), halfImag = new Float64Array(BURST_FFT / 2 + 1);
  const signal = index => source.white[index];

  for (let index = 0; index < burstFrames; index++) {
    stftFrame(signal, source.white.length, index, BURST_FFT, BURST_HOP, window, frame, frameImag, FFT_150, fftReal, fftImag, true);
    for (let bin = 0; bin <= BURST_FFT / 2; bin++) {
      const gain = clampLogGain(Number(burstGains.data[bin * burstFrames + index]));
      halfReal[bin] = fftReal[bin] * gain;
      halfImag[bin] = fftImag[bin] * gain;
    }
    overlapAdd(halfReal, halfImag, index, BURST_FFT, BURST_HOP, window, FFT_150,
      accum, denom, inverseReal, inverseImag, fftReal, fftImag);
  }
  const burst = finishOverlap(accum, denom, BURST_FFT, waveformLength);
  const output = new Float32Array(waveformLength);
  let firstInvalidSample = null;
  for (let index = 0; index < waveformLength; index++) {
    const value = main[index] + burst[index];
    if (!Number.isFinite(value) || Math.abs(value) >= 1) {
      firstInvalidSample = index;
      break;
    }
    output[index] = value;
  }
  if (firstInvalidSample !== null) {
    const mainStats = signalStats(main.length, index => main[index]);
    const burstStats = signalStats(burst.length, index => burst[index]);
    const combinedStats = signalStats(waveformLength, index => main[index] + burst[index]);
    const excitation = {
      noise: signalStats(source.white.length, index => source.white[index]),
      harmonic: signalStats(source.sine.length, index => source.sine[index]),
    };
    throw new Error(`Micro source-filter waveform failed validation: ${JSON.stringify({
      stage: 'main-plus-burst', seed, firstInvalidSample,
      main: mainStats, burst: burstStats, combined: combinedStats, excitation,
    })}`);
  }
  return output;
}

export function sourceFilterSynthesis({ f0, gains, pulseShift, burstGains, seed }) {
  const f0Values = f0 instanceof Float32Array ? f0 : Float32Array.from(f0 ?? []);
  if (f0Values.length < 4 || f0Values.length % 2 !== 0) throw new Error('Micro f0 vector must contain 2..2400 values.');
  const frames = f0Values.length / 2;
  if (frames > MAX_FRAMES) throw new Error('Micro predicted duration exceeds 1200 frames; no cropping is allowed.');
  if (!gains || !(gains.data instanceof Float32Array) || !Array.isArray(gains.dims)) throw new Error('Micro gains tensor is missing.');
  const expectedMainFrames = frames * 4 + 1;
  if (gains.dims[3] !== expectedMainFrames || pulseShift.length !== expectedMainFrames) throw new Error('Micro source-filter frame clocks differ.');
  const source = seededSource(f0Values, seed);
  return synthesizeMain(f0Values, source, { gains, pulseShift, burstGains }, frames, seed);
}
