import test from 'node:test';
import assert from 'node:assert/strict';
import { uaSerhiySpectralToPcm } from '../web/ua-serhiy-0p58m/dsp.mjs';

test('Ukrainian Serhiy spectral postprocess returns requested centered iSTFT length', () => {
  const frameCount = 2;
  const params = new Float32Array(1_539 * frameCount);
  params.fill(-12);
  params.fill(0, 513 * frameCount);
  // One unit-magnitude DC component; phase vectors at all other bins stay zero.
  params[0] = 0;
  params[513 * frameCount] = 1;
  const pcm = uaSerhiySpectralToPcm(params, frameCount);
  assert.equal(pcm.length, frameCount * 256);
  assert.ok(pcm.every(Number.isFinite));
  assert.ok(Math.abs(pcm[0] - 1 / 1280) < 1e-7);
  assert.ok(pcm.subarray(256).every(value => value === 0), 'the requested final centered hop is zero padded');
});

test('Ukrainian Serhiy one-frame output preserves the explicit requested length', () => {
  const params = new Float32Array(1_539);
  const pcm = uaSerhiySpectralToPcm(params, 1);
  assert.equal(pcm.length, 256);
  assert.ok(pcm.every(value => value === 0));
});

test('Ukrainian Serhiy spectral postprocess rejects invalid structure and returns PCM for runner validation', () => {
  assert.throws(() => uaSerhiySpectralToPcm(new Float32Array(1), 1), /expected 1539/);
  // One frame consists exclusively of the final padded hop. Two frames
  // include decoded samples inside the centered reconstruction.
  const params = new Float32Array(1_539 * 2);
  params[0] = Number.NaN;
  const pcm = uaSerhiySpectralToPcm(params, 2);
  assert.equal(pcm.length, 512);
  assert.ok(pcm.some(value => !Number.isFinite(value)), 'the benchmark runner validates every sample after the timing boundary');
  assert.throws(() => uaSerhiySpectralToPcm(new Float32Array(1_539), 0), /frame count/);
});
