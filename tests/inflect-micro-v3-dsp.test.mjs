import test from 'node:test';
import assert from 'node:assert/strict';
import { fftComplex, harmonicSine, sourceFilterSynthesis } from '../web/inflect-micro-v3/dsp.mjs';

test('Micro mixed-radix FFT round-trips both pinned STFT lengths', () => {
  for (const size of [150, 600]) {
    const real = Float64Array.from({ length: size }, (_, index) => Math.sin(index * 0.17) + index * 0.0001);
    const imag = Float64Array.from({ length: size }, (_, index) => Math.cos(index * 0.07));
    const spectrum = fftComplex(real, imag);
    const reconstructed = fftComplex(spectrum.real, spectrum.imag, true);
    for (let index = 0; index < size; index++) {
      assert.ok(Math.abs(reconstructed.real[index] - real[index]) < 1e-11);
      assert.ok(Math.abs(reconstructed.imag[index] - imag[index]) < 1e-11);
    }
  }
});

test('Micro harmonic closed form matches the pinned 64-harmonic cutoff', () => {
  for (const [cycles, frequency] of [[0.001, 200], [0.1, 120], [0.4, 320], [0.75, 100]]) {
    const count = Math.min(64, Math.max(0, Math.ceil(11000 / frequency) - 1));
    let direct = 0;
    for (let harmonic = 1; harmonic <= count; harmonic++) direct += Math.sin(2 * Math.PI * harmonic * cycles);
    assert.ok(Math.abs(0.1 * direct - harmonicSine(cycles, frequency)) < 1e-12);
  }
});

test('Micro source-filter DSP returns finite exact-clock PCM for small synthetic coefficients', () => {
  const frames = 2;
  const mainFrames = frames * 4 + 1;
  const burstFrames = frames * 8 + 1;
  const gains = new Float32Array(8 * 301 * mainFrames);
  const setGain = (channel, frame, bin, value) => { gains[(channel * 301 + bin) * mainFrames + frame] = value; };
  for (let frame = 0; frame < mainFrames; frame++) {
    for (let bin = 0; bin < 301; bin++) {
      setGain(0, frame, bin, -3);
      setGain(1, frame, bin, 1);
      setGain(2, frame, bin, 0);
      setGain(3, frame, bin, -6);
      for (let channel = 4; channel < 8; channel++) setGain(channel, frame, bin, 0);
    }
  }
  const burst = new Float32Array(76 * burstFrames).fill(-7);
  const output = sourceFilterSynthesis({
    f0: Float32Array.of(110, 112, 114, 116),
    gains: { data: gains, dims: [1, 8, 301, mainFrames] },
    pulseShift: new Float32Array(mainFrames),
    burstGains: { data: burst, dims: [1, 76, burstFrames] },
    seed: 42,
  });
  assert.equal(output.length, frames * 600);
  assert.ok(output.length > 0 && output.every(Number.isFinite));
  assert.ok(Math.max(...output.slice(0, 100)) < 1);
});
