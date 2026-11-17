// Small in-place radix-2 complex FFT used by the SupraTTS iSTFT and DC blocker.
// This is original benchmark glue; the model still receives the upstream
// FP32 spectra and its Hann-windowed overlap-add convention.
export function fft(real, imag, inverse = false) {
  const n = real.length;
  if (n !== imag.length || n < 2 || (n & (n - 1)) !== 0) throw new Error('SupraTTS FFT requires equal power-of-two arrays.');

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const theta = (inverse ? 2 : -2) * Math.PI / size;
    const stepReal = Math.cos(theta);
    const stepImag = Math.sin(theta);
    for (let base = 0; base < n; base += size) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < half; j++) {
        const even = base + j;
        const odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextReal = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal;
        wr = nextReal;
      }
    }
  }

  if (inverse) {
    const scale = 1 / n;
    for (let i = 0; i < n; i++) {
      real[i] *= scale;
      imag[i] *= scale;
    }
  }
}

export function inverseStft(spectrum, frameCount, { fftSize = 1024, hop = 256 } = {}) {
  const bins = fftSize / 2 + 1;
  if (spectrum.length !== bins * frameCount * 2) throw new Error('SupraTTS decoder returned an unexpected spectrum shape.');
  const fullReal = new Float64Array(fftSize);
  const fullImag = new Float64Array(fftSize);
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / fftSize);

  const length = (frameCount - 1) * hop + fftSize;
  const output = new Float64Array(length);
  const norm = new Float64Array(length);
  for (let frame = 0; frame < frameCount; frame++) {
    for (let bin = 0; bin < bins; bin++) {
      const offset = (bin * frameCount + frame) * 2;
      fullReal[bin] = spectrum[offset];
      fullImag[bin] = spectrum[offset + 1];
    }
    for (let bin = 1; bin < fftSize / 2; bin++) {
      fullReal[fftSize - bin] = fullReal[bin];
      fullImag[fftSize - bin] = -fullImag[bin];
    }
    fft(fullReal, fullImag, true);
    const start = frame * hop;
    for (let i = 0; i < fftSize; i++) {
      output[start + i] += fullReal[i] * window[i];
      norm[start + i] += window[i] * window[i];
    }
  }

  const pad = fftSize / 2;
  const samples = length - fftSize;
  const pcm = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const source = i + pad;
    pcm[i] = norm[source] > 1e-11 ? output[source] / norm[source] : 0;
  }
  return pcm;
}

const impulseSpectra = new Map();

function dcImpulseSpectrum(size, r, taps) {
  const key = size + '/' + r + '/' + taps;
  const cached = impulseSpectra.get(key);
  if (cached) return cached;
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  real[0] = 1;
  for (let n = 1; n < taps; n++) real[n] = (r - 1) * Math.pow(r, n - 1);
  fft(real, imag, false);
  const value = { real, imag };
  impulseSpectra.set(key, value);
  return value;
}

export function dcBlock(pcm, r = 0.9973, taps = 4096) {
  if (!(pcm instanceof Float32Array) || pcm.length === 0) throw new Error('SupraTTS DC blocker received empty PCM.');
  const linearLength = pcm.length + taps - 1;
  const size = 2 ** Math.ceil(Math.log2(linearLength));
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  for (let i = 0; i < pcm.length; i++) real[i] = pcm[i];
  fft(real, imag, false);

  const impulse = dcImpulseSpectrum(size, r, taps);
  for (let i = 0; i < size; i++) {
    const a = real[i];
    const b = imag[i];
    real[i] = a * impulse.real[i] - b * impulse.imag[i];
    imag[i] = a * impulse.imag[i] + b * impulse.real[i];
  }
  fft(real, imag, true);
  const result = new Float32Array(pcm.length);
  for (let i = 0; i < result.length; i++) result[i] = real[i];
  return result;
}
