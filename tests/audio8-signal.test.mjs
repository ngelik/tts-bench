import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateResult } from '../tools/results.mjs';
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
  const { waveform } = validateAudio8Article(pcm, 44100, [2, 2]);
  assert.equal(waveform.passed, true);
  assert.deepEqual(waveform.spans.map(s => [s.id, s.samples, s.longestConstantSamples]), [[0, 2, 1], [1, 2, 1]]);
  assert.throws(() => validateAudio8Article(pcm, 44100, [2]), /do not cover/);
  pcm.fill(0.02, 2);
  assert.throws(() => validateAudio8Article(pcm, 44100, [2, 2]), /source span 2:.*collapsed/);
});

test('a native routing policy asset independently requires matching settings and per-span proof', async () => {
  const id = '2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694';
  const result = JSON.parse(await readFile(new URL('../results/' + id + '/result.json', import.meta.url)));
  const [cell] = result.cells;
  const policy = { id: 'audio8-realistic-provider-policy-v2', bytes: 111,
    sha256: '340c0a5e706f3029febd1600181a6b7cf88a2fd65fd181d81d7388160ba02b33' };
  assert.doesNotThrow(() => validateResult(result));
  result.assets.push(policy);
  assert.throws(() => validateResult(result), /matching graph provider settings/);
  Object.assign(cell.settings, { providerPolicyVersion: 2, codecExecutionProviders: ['wasm'] });
  assert.throws(() => validateResult(result), /waveform/);
  policy.sha256 = '0'.repeat(64);
  assert.throws(() => validateResult(result), /pinned routing policy/);
});
