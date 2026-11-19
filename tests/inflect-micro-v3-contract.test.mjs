import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMicroTextFeatureDimensions, assertMicroTokenIdCount, buildMicroFramePlan, MICRO_MAX_PHONEME_IDS, microStyleRow } from '../web/inflect-micro-v3/contract.mjs';

test('Micro worker token budget accepts the maximum sequence and rejects invalid counts', () => {
  assert.equal(assertMicroTokenIdCount(3), 3);
  assert.equal(assertMicroTokenIdCount(MICRO_MAX_PHONEME_IDS), 512);
  for (const value of [2, 513, 3.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => assertMicroTokenIdCount(value), /padded token sequence/);
  }
});

test('Micro text-feature dimensions follow the exported token axes', () => {
  assert.doesNotThrow(() => assertMicroTextFeatureDimensions([1, 7], [1, 7, 256], [1, 512, 7], 7));
  assert.throws(() => assertMicroTextFeatureDimensions([1, 7], [1, 256, 7], [1, 512, 7], 7), /unexpected token dimensions/);
  assert.throws(() => assertMicroTextFeatureDimensions([1, 6], [1, 7, 256], [1, 512, 7], 7), /unexpected token dimensions/);
  assert.throws(() => assertMicroTextFeatureDimensions([1, 7], [1, 7, 256], [1, 7, 512], 7), /unexpected token dimensions/);
});

test('Micro frame alignment mirrors torch round-to-even and exact repeated token spans', () => {
  const plan = buildMicroFramePlan(Float32Array.of(1.5, 2.5, 0), 3);
  assert.deepEqual(plan.counts, [2, 2, 1]);
  assert.equal(plan.frameCount, 5);
  assert.deepEqual([...plan.alignment], [
    1, 1, 0, 0, 0,
    0, 0, 1, 1, 0,
    0, 0, 0, 0, 1,
  ]);
});

test('Micro duration plans reject nonfinite values and over-limit output instead of cropping', () => {
  assert.throws(() => buildMicroFramePlan(Float32Array.of(2, Number.NaN), 2), /malformed or nonfinite/);
  assert.throws(() => buildMicroFramePlan(Float32Array.of(1201), 1), /No crop is allowed/);
  assert.throws(() => buildMicroFramePlan(Float32Array.of(4), 1, { speed: 0 }), /settings are invalid/);
});

test('Micro fixed voice style row uses zero-based phone length and rejects empty input', () => {
  assert.equal(microStyleRow(1), 0);
  assert.equal(microStyleRow(510), 509);
  assert.throws(() => microStyleRow(0), /outside the exported speaker bank/);
  assert.throws(() => microStyleRow(511), /outside the exported speaker bank/);
});
