import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMicroFramePlan, microStyleRow } from '../web/inflect-micro-v3/contract.mjs';

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
