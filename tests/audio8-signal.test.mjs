import test from 'node:test';
import assert from 'node:assert/strict';
import { pcmSignal, checkSignal, validateAudio8Article } from '../web/audio8/signal.mjs';

test('detects nonzero DC tails even with an initially varying waveform', () => {
  const pcm = Float32Array.from([0.1, -0.2, 0.2, 0.3, ...Array(12).fill(-281.25 / 32768)]);
  const signal = pcmSignal(pcm);
  assert.deepEqual(signal, { samples: 16, longestConstantSamples: 12, constantValue: -281 });
  assert.throws(() => checkSignal(signal, 8), /waveform collapsed/);
  assert.throws(() => checkSignal(pcmSignal(Float32Array.of(0, 0)), 44100), /waveform collapsed/);
});

test('ignores short quiet pauses; rejects empty and nonfinite samples', () => {
  const pcm = Float32Array.from([0.1, 0.2, 0, 0, 0, 0, 0.3, -0.1]);
  assert.doesNotThrow(() => checkSignal(pcmSignal(pcm), 8));
  assert.throws(() => pcmSignal([]), /empty/);
  assert.throws(() => pcmSignal([0.1, NaN]), /nonfinite/);
  assert.throws(() => pcmSignal([0.1, Infinity]), /nonfinite/);
});

test('article validation records span boundaries and identifies a bad span after generation', () => {
  const pcm = Float32Array.from([0.1, -0.1, 0.2, -0.4]);
  assert.deepEqual(validateAudio8Article(pcm, 44100, [2, 2]), { samplesPerChunk: [2, 2] });
  assert.throws(() => validateAudio8Article(pcm, 44100, [2]), /do not cover/);
  pcm.fill(0.02, 2);
  assert.throws(() => validateAudio8Article(pcm, 44100, [2, 2]), /source span 2:.*collapsed/);
});
