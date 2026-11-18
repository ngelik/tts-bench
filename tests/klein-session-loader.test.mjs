import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createKleinSessionsSequentially } from '../web/klein/session-loader.mjs';

const workerSource = await readFile(new URL('../web/workers/klein.mjs', import.meta.url), 'utf8');

test('Klein keeps model fetches parallel but creates encoder and decoder sessions one at a time', async () => {
  assert.match(workerSource, /Promise\.all\(\[\s*fetch\(BASE \+ 'model\.json'\),\s*fetch\(BASE \+ 'encoder\.onnx'\),\s*fetch\(BASE \+ 'decoder\.onnx'\)/);
  assert.match(workerSource, /createKleinSessionsSequentially\(ort, encoderBytes, decoderBytes, options\)/);
  assert.doesNotMatch(workerSource, /Promise\.all\(\[\s*ort\.InferenceSession\.create/);

  const events = [];
  const sessions = new Map();
  let inFlight = 0;
  let maxInFlight = 0;
  const ort = { InferenceSession: { create: async (bytes, options) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    events.push(`start:${bytes}`);
    await new Promise(resolve => setTimeout(resolve, 1));
    const session = { bytes, options, release: async () => events.push(`release:${bytes}`) };
    sessions.set(bytes, session);
    events.push(`finish:${bytes}`);
    inFlight--;
    return session;
  } } };
  const options = { executionProviders: ['webgpu', 'wasm'] };
  const result = await createKleinSessionsSequentially(ort, 'encoder', 'decoder', options);

  assert.equal(maxInFlight, 1);
  assert.deepEqual(events, ['start:encoder', 'finish:encoder', 'start:decoder', 'finish:decoder']);
  assert.equal(result.encoder, sessions.get('encoder'));
  assert.equal(result.decoder, sessions.get('decoder'));
  assert.equal(result.encoder.options, options);
  assert.equal(result.decoder.options, options);
});

test('Klein releases the encoder session if decoder session initialization fails', async () => {
  const events = [];
  const encoder = { release: async () => events.push('release:encoder') };
  let createCount = 0;
  const ort = { InferenceSession: { create: async () => {
    createCount++;
    if (createCount === 1) return encoder;
    throw new Error('decoder setup failed');
  } } };

  await assert.rejects(createKleinSessionsSequentially(ort, 'encoder', 'decoder', {}), /decoder setup failed/);
  assert.deepEqual(events, ['release:encoder']);
});
