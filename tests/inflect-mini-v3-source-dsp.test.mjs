import test from 'node:test';
import assert from 'node:assert/strict';
import { inflectMiniSourceFeatures } from '../web/inflect-mini-v3/source-dsp.mjs';

test('Mini CPU source DSP preserves the pinned sample and STFT clocks', () => {
  const frameCount = 2;
  const harmonicCount = 9;
  const input = {
    f0: new Float32Array(frameCount * 2),
    frameCount,
    phaseUniform: new Float32Array(harmonicCount),
    harmonicNoise: new Float32Array(frameCount * 600 * harmonicCount),
    linearWeights: new Float32Array(harmonicCount),
    linearBias: 0,
  };
  const result = inflectMiniSourceFeatures(input);
  assert.equal(result.samples, frameCount * 600);
  assert.equal(result.bins, 11);
  assert.equal(result.stftFrames, (frameCount * 600) / 5 + 1);
  assert.equal(result.sourceSpec.length, 2 * result.bins * result.stftFrames);
  assert.ok(result.sourceSpec.every(Number.isFinite));
  assert.ok(result.sourceSpec.every(value => value === 0));
});

test('Mini CPU source DSP rejects inconsistent frame and noise clocks', () => {
  assert.throws(() => inflectMiniSourceFeatures({
    f0: new Float32Array(4), frameCount: 2,
    phaseUniform: new Float32Array(9), harmonicNoise: new Float32Array(8),
    linearWeights: new Float32Array(9), linearBias: 0,
  }), /invalid tensor dimensions/);
});
