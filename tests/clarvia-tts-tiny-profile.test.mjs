import test from 'node:test';
import assert from 'node:assert/strict';
import { getAssetLock } from '../lib/catalog.mjs';
import { assetDigests, defaultVoice, defaultVoiceIndex, fixtureOracle, frontendRevision, modelRevision, validateMetadata } from '../web/clarvia-tts-tiny/profile.mjs';

test('Clarvia Tiny profile pins the Turkish checkpoint, frontend and smoke oracle', () => {
  const model = getAssetLock().models['clarvia-tts-tiny'];
  assert.equal(model.modelRevision, modelRevision);
  assert.equal(model.browserSourceRevision, frontendRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['tr']);
  assert.equal(model.support.voiceCount, 10);
  assert.equal(model.support.bundledVoiceCount, 10);
  assert.equal(model.assets.find(asset => asset.kind === 'model-weights').sha256,
    assetDigests['model.onnx'][1]);
  assert.equal(defaultVoice, 'female_1');
  assert.equal(defaultVoiceIndex, 2);
  assert.equal(fixtureOracle.spans, 94);
  assert.equal(fixtureOracle.utterances, 304);
  assert.equal(fixtureOracle.tokenStressSha256, 'd2f501f0fc31ebe553c7c605f4ea36fb5b4a05e0a635108743c9e5dde13559db');
});

test('Clarvia Tiny model metadata contract preserves exact voices, tensors and dimensions', async () => {
  const voices = ['male_1', 'male_2', 'female_1', 'female_2', 'female_3', 'female_4', 'female_5', 'male_3', 'male_4', 'male_5'];
  const modelConfig = {
    sample_rate: 24000, hop: 256, max_tokens: 512, max_frames: 3000, step: 190000,
    frontend: 'clarvia-phonemizer 0.1.0', voices: [...voices, 'unused'], public_voices: voices,
    symbols: Array.from({ length: 56 }, (_, index) => 'symbol-' + index),
    inputs: ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range'],
    outputs: ['audio', 'durations'],
  };
  assert.equal(validateMetadata(modelConfig), modelConfig);
  assert.throws(() => validateMetadata({ ...modelConfig, hop: 512 }), /does not match/);
});
