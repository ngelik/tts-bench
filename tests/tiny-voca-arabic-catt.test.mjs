import test from 'node:test';
import assert from 'node:assert/strict';
import { createCattEdOrchestrator, createPyodideCattBridge, __test } from '../web/workers/tiny-voca-arabic-catt.mjs';

class Tensor {
  constructor(type, data, dims) { this.type = type; this.data = data; this.dims = dims; this.disposed = false; }
  dispose() { this.disposed = true; }
}
const ort = { Tensor };

test('pad mask and causal mask match the CATT NumPy construction', () => {
  const query = [[1, 2, 0], [1, 3, 2]];
  assert.deepEqual([...__test.padMask(query, query, 0, 0)], [
    1,1,0, 1,1,0, 0,0,0,
    1,1,1, 1,1,1, 1,1,1,
  ]);
  assert.deepEqual([...__test.causalMask(3)], [1,0,0, 1,1,0, 1,1,1]);
});

test('first argmax keeps the first class when scores tie', () => {
  assert.equal(__test.firstArgmax([2, 7, 7, 1], 0, 4), 1);
});

test('Pyodide bridge marshals only JSON across the JS/Python boundary', async () => {
  const cache = new Map();
  const globals = new Map([
    ['encode_batch_json', text => JSON.stringify({ sourceIds: JSON.parse(text).map(() => [1, 2]), sourcePadId: 0 })],
    ['decode_batch_json', (src, trg) => JSON.stringify(JSON.parse(trg).map(() => 'ok'))],
    ['reset_text_cache', () => cache.clear()],
    ['missing_frontend_phrases_json', text => JSON.stringify({ instances: 1, phrases: cache.has(text) ? [] : [text] })],
    ['install_frontend_phrases_json', (phrases, diacritized) => {
      JSON.parse(phrases).forEach((phrase, i) => cache.set(phrase, JSON.parse(diacritized)[i]));
    }],
  ]);
  const bridge = createPyodideCattBridge({ globals: { get: name => globals.get(name) } });
  assert.deepEqual(await bridge.encodeBatch(['x', 'y']), { sourceIds: [[1, 2], [1, 2]], sourcePadId: 0 });
  assert.deepEqual(await bridge.decodeBatch([[1, 2]], [[1, 3]]), ['ok']);
  assert.deepEqual(await bridge.missingPhrases('phrase'), { instances: 1, phrases: ['phrase'] });
  await bridge.installDiacritized(['phrase'], ['مُخَرْج']);
  assert.deepEqual(await bridge.missingPhrases('phrase'), { instances: 1, phrases: [] });
});

test('ED loop batches in stock order, masks spaces every step, and returns Python-decoded output', async () => {
  const encoderCalls = [];
  const decoderCalls = [];
  const encoderSession = {
    outputNames: ['enc_src'],
    async run(inputs) {
      encoderCalls.push(inputs);
      const [batch, seq] = inputs.src.dims;
      return { enc_src: new Tensor('float32', new Float32Array(batch * seq * 512), [batch, seq, 512]) };
    },
  };
  const decoderSession = {
    outputNames: ['logits'],
    async run(inputs) {
      decoderCalls.push(inputs);
      const [batch, target] = inputs.trg.dims;
      const vocab = 18;
      const logits = new Float32Array(batch * target * vocab);
      for (let b = 0; b < batch; b++) {
        // class 2 wins except for the deliberate tied maximum (classes 1 and 2).
        const at = (b * target + target - 1) * vocab;
        logits[at] = 0; logits[at + 1] = 9; logits[at + 2] = 9; logits[at + 3] = 1;
      }
      return { logits: new Tensor('float32', logits, [batch, target, vocab]) };
    },
  };
  let decoded;
  const bridge = {
    async encodeBatch(phrases) {
      assert.deepEqual(phrases, ['one', 'two']);
      return { sourceIds: [[1, 3, 2], [1, 4]], sourcePadId: 0, targetBosId: 1,
        targetPadId: 0, spaceId: 3, targetNoTashkeelId: 2 };
    },
    async decodeBatch(source, target) {
      decoded = { source, target };
      return ['decoded one', 'decoded two'];
    },
  };
  const catt = createCattEdOrchestrator({ ort, encoderSession, decoderSession, bridge, batchSize: 32 });
  assert.deepEqual(await catt.diacritize(['one', 'two']), ['decoded one', 'decoded two']);

  assert.equal(encoderCalls.length, 1);
  assert.equal(encoderCalls[0].src.type, 'int64');
  assert.deepEqual(encoderCalls[0].src.dims, [2, 3]);
  assert.equal(encoderCalls[0].src_mask.type, 'bool');
  assert.deepEqual(encoderCalls[0].src_mask.dims, [2, 1, 3, 3]);
  assert.deepEqual([...encoderCalls[0].src_mask.data], [
    1,1,1, 1,1,1, 1,1,1,
    1,1,0, 1,1,0, 0,0,0,
  ]);

  assert.equal(decoderCalls.length, 2); // source width 3 -> source width - 1 decode steps
  assert.deepEqual(decoderCalls.map(x => x.trg.dims), [[2, 1], [2, 2]]);
  assert.deepEqual([...decoderCalls[1].trg.data], [1n, 2n, 1n, 1n]);
  assert.deepEqual([...decoderCalls[1].trg_mask.data], [1,0, 1,1, 1,0, 1,1]);
  assert.deepEqual([...decoderCalls[1].src_trg_mask.data], [
    1,1,1, 1,1,1, 1,1,0, 1,1,0,
  ]);
  assert.deepEqual(decoded.target, [[1, 2, 1], [1, 1, 1]]);
});

test('stock 32-phrase mini-batches preserve source order', async () => {
  const batchSizes = [];
  let nextIndex = 0;
  const encoderSession = { outputNames: ['h'], async run({ src }) {
    return { h: new Tensor('float32', new Float32Array(src.dims[0] * src.dims[1] * 512), [src.dims[0], src.dims[1], 512]) };
  } };
  const decoderSession = { outputNames: ['y'], async run({ trg }) {
    const [b, t] = trg.dims; const logits = new Float32Array(b * t * 18);
    for (let i = 0; i < b * t; i++) logits[i * 18] = 1;
    return { y: new Tensor('float32', logits, [b, t, 18]) };
  } };
  const bridge = {
    async encodeBatch(batch) { batchSizes.push(batch.length); return {
      sourceIds: batch.map(() => [1, 2]), sourcePadId: 0, targetBosId: 1,
      targetPadId: 0, spaceId: 3, targetNoTashkeelId: 2,
    }; },
    async decodeBatch(src, target) {
      const start = nextIndex;
      nextIndex += target.length;
      return target.map((_, i) => String(start + i));
    },
  };
  const catt = createCattEdOrchestrator({ ort, encoderSession, decoderSession, bridge, batchSize: 32 });
  const phrases = Array.from({ length: 65 }, (_, i) => `p${i}`);
  const result = await catt.diacritize(phrases);
  assert.deepEqual(batchSizes, [32, 32, 1]);
  assert.equal(result.length, phrases.length);
  assert.deepEqual(result, phrases.map((_, i) => String(i)));
});
