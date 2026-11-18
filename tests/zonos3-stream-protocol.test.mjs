import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { failEngineResponses, finishEngineResponse } from '../web/zonos3/finish-engine-response.mjs';

const root = new URL('..', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('ZONOS3 preserves streamed PCM delivery and errors if generation fails before completion', async () => {
  let controller;
  const stream = new ReadableStream({ start(value) { controller = value; } });
  const reader = stream.getReader();
  const first = Uint8Array.of(1, 2, 3, 4);
  controller.enqueue(first);
  assert.deepEqual(await reader.read(), { value: first, done: false });

  finishEngineResponse({ controller }, 'generation failed after streaming PCM');
  await assert.rejects(reader.read(), /generation failed after streaming PCM/);
});

test('ZONOS3 cleanly closes successful streams and rejects pending calls on fatal worker errors', async () => {
  let controller;
  const stream = new ReadableStream({ start(value) { controller = value; } });
  const reader = stream.getReader();
  controller.enqueue(Uint8Array.of(8));
  assert.deepEqual(await reader.read(), { value: Uint8Array.of(8), done: false });
  finishEngineResponse({ controller }, undefined);
  assert.deepEqual(await reader.read(), { value: undefined, done: true });

  let rejectPending;
  const result = new Promise((_, reject) => { rejectPending = reject; });
  const pending = new Map([[4, { reject: rejectPending }]]);
  failEngineResponses(pending, 'GPU device lost');
  await assert.rejects(result, /GPU device lost/);
  assert.equal(pending.size, 0);
});

test('ZONOS3 benchmark request requires EOS and propagates terminal worker failures', async () => {
  const [client, api, router, worker, benchmarkWorker] = await Promise.all([
    read('web/zonos3/upstream/servers/web/src/client.ts'),
    read('web/zonos3/upstream/servers/web/src/api/generate.ts'),
    read('web/zonos3/upstream/servers/web/src/api/router.ts'),
    read('web/zonos3/upstream/servers/web/src/worker.ts'),
    read('web/workers/zonos3.mjs'),
  ]);
  assert.match(benchmarkWorker, /'x-benchmark-require-eos': '1'/);
  assert.match(benchmarkWorker, /loadVoicePreviews: false/);
  assert.match(benchmarkWorker, /engine\.onFatal\(message =>/);
  assert.match(benchmarkWorker, /if \(engineFatal\) throw engineFatal/);
  assert.match(api, /requireEos = false/);
  assert.match(api, /if \(requireEos && eosFrame < 0\) throw new Error/);
  assert.match(api, /sink\.end\(err instanceof Error \? err\.message : String\(err\)\);/);
  assert.match(worker, /error\?: string; probe\?:/);
  assert.match(worker, /const end = \(error\?: string\)/);
  assert.match(worker, /\? \{ error \} : \{\}/);
  assert.match(worker, /probe: probeHook\.stop\(\)/);
  assert.match(client, /finishEngineResponse\(pending\.get\(m\.id\), m\.error\)/);
  assert.match(client, /failEngineResponses\(pending, m\.message\)/);
  assert.match(client, /opts\.loadVoicePreviews === false \? \{\} : await defaultVoicesPcm/);
  assert.match(router, /end: error => sink\.end\(error\)/);
  assert.match(router, /sink\.end\(err instanceof Error \? err\.message : String\(err\)\)/);
});
