import test from 'node:test';
import assert from 'node:assert/strict';
import { createInferenceSessionsSequentially } from '../web/supratts/session-loader.mjs';

test('Supra initializes ONNX graphs one at a time and keeps successful sessions available for cleanup', async () => {
  const events = [];
  const sessions = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const models = ['duration', 'acoustic-token', 'acoustic-frame', 'decoder'];

  await createInferenceSessionsSequentially(models, async model => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    events.push('start:' + model);
    await new Promise(resolve => setTimeout(resolve, 1));
    events.push('finish:' + model);
    inFlight--;
    return { model };
  }, sessions);

  assert.equal(maxInFlight, 1);
  assert.deepEqual(events, models.flatMap(model => ['start:' + model, 'finish:' + model]));
  assert.deepEqual(sessions.map(session => session.model), models);
});

test('Supra retains already-created sessions when a later graph fails initialization', async () => {
  const sessions = [];
  const first = { model: 'duration' };

  await assert.rejects(createInferenceSessionsSequentially(
    ['duration', 'acoustic-token', 'acoustic-frame', 'decoder'],
    async model => {
      if (model === 'duration') return first;
      throw new Error('simulated graph creation failure');
    },
    sessions,
  ), /simulated graph creation failure/);

  assert.deepEqual(sessions, [first]);
});
