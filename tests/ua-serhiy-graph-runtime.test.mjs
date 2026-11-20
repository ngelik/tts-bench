import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUaSerhiyDurationFeatures,
  buildUaSerhiyFrameFeatures,
  buildUaSerhiyTokenFeatures,
  createUaSerhiyGraphRuntime,
  validateUaSerhiyIds,
} from '../web/ua-serhiy-0p58m/graph-runtime.mjs';

test('Ukrainian Serhiy frame features preserve context and all three reference hints', () => {
  const contexts = new Float32Array(48 * 2);
  for (let channel = 0; channel < 48; channel++) {
    contexts[channel * 2] = channel + 1;
    contexts[channel * 2 + 1] = 100 + channel;
  }
  const { data, frameCount } = buildUaSerhiyFrameFeatures(contexts, 2, [2, 1]);
  assert.equal(frameCount, 3);
  assert.deepEqual([...data.slice(0, 3)], [1, 1, 100]);
  assert.deepEqual([...data.slice(48 * 3, 48 * 3 + 3)], [0, 0.5, 1]);
  assert.deepEqual([...data.slice(49 * 3, 49 * 3 + 3)], [0, 0, 1]);
  assert.deepEqual([...data.slice(50 * 3, 50 * 3 + 3)], [0, 1, 0]);
  const durationFeatures = buildUaSerhiyDurationFeatures(2);
  assert.deepEqual([...durationFeatures.slice(0, 2)], [0, 1]);
  assert.ok(Math.abs(durationFeatures[2] - Math.log1p(2) / Math.log1p(255)) < 1e-7);
  assert.ok(Math.abs(durationFeatures[3] - Math.log1p(2) / Math.log1p(255)) < 1e-7);
  assert.deepEqual([...durationFeatures.slice(4)], [1, 1]);
  const tokenFeatures = buildUaSerhiyTokenFeatures(2, [1, 2]);
  assert.deepEqual([...tokenFeatures.slice(0, 2)], [0, 1]);
  assert.ok(Math.abs(tokenFeatures[2] - Math.log1p(1) / Math.log1p(2)) < 1e-7);
  assert.equal(tokenFeatures[3], 1);
});

test('Ukrainian Serhiy graph runtime runs the four pinned stages and returns full PCM', async () => {
  const created = [];
  class Tensor {
    constructor(type, data, dims) { this.type = type; this.data = data; this.dims = dims; created.push(this); }
    async getData() { return this.data; }
    dispose() { this.disposed = true; }
  }
  const order = [];
  const output = (data, dims) => ({ dims, async getData() { return data; }, dispose() { this.disposed = true; } });
  const sessions = {
    duration: { async run(feeds, names) {
      order.push(['duration', names, feeds.ids.dims, feeds.features.dims]);
      return { durations: output(new BigInt64Array([1n, 1n]), [1, 2]) };
    } },
    acousticToken: { async run(feeds, names) {
      order.push(['acousticToken', names, feeds.ids.dims, feeds.token_features.dims]);
      return { contextual_tokens: output(new Float32Array(48 * 2), [1, 48, 2]) };
    } },
    acousticFrame: { async run(feeds, names) {
      order.push(['acousticFrame', names, feeds.frame_features.dims]);
      return { codes: output(new Float32Array(40 * 2), [1, 40, 2]) };
    } },
    decoder: { async run(feeds, names) {
      order.push(['decoder', names, feeds.codes.dims]);
      return { spectral_params: output(new Float32Array(1_539 * 2), [1, 1_539, 2]) };
    } },
  };
  const runtime = createUaSerhiyGraphRuntime({ ort: { Tensor }, sessions });
  const pcm = await runtime.synthesizeUnit([1, 10]);
  assert.equal(pcm.length, 2 * 256);
  assert.ok(pcm.every(value => value === 0));
  assert.deepEqual(order.map(item => item[0]), ['duration', 'acousticToken', 'acousticFrame', 'decoder']);
  assert.deepEqual(order[0][3], [1, 3, 2]);
  assert.deepEqual(order[1][3], [1, 2, 2]);
  assert.deepEqual(order[2][2], [1, 51, 2]);
  assert.deepEqual(order[3][2], [1, 40, 2]);
  assert.ok(created.every(tensor => tensor.disposed), 'every created input tensor was disposed');
});

test('Ukrainian Serhiy graph runtime rejects malformed IDs and dimensions, accepts exact frame ceiling', () => {
  assert.throws(() => validateUaSerhiyIds([]), /1..255/);
  assert.throws(() => validateUaSerhiyIds(new Array(256).fill(1)), /1..255/);
  assert.throws(() => validateUaSerhiyIds([1, 256]), /1..255/);
  assert.throws(() => buildUaSerhiyFrameFeatures(new Float32Array(47), 1, [1]), /dimensions/);
  assert.throws(() => buildUaSerhiyFrameFeatures(new Float32Array(48), 1, [81]), /\[1,80\]/);
  const ceiling = buildUaSerhiyFrameFeatures(new Float32Array(48 * 255), 255, new Array(255).fill(80));
  assert.equal(ceiling.frameCount, 20_400);
  assert.equal(ceiling.data.length, 51 * 20_400);
});
