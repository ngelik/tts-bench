/* Browser CATT ED orchestration. Tokenization, preprocessing and decoding use
 * the pinned Python bridge; the two neural sessions use local ORT Web assets.
 */

function boolTensor(ort, values, dims) {
  return new ort.Tensor('bool', Uint8Array.from(values, value => value ? 1 : 0), dims);
}

function int64Tensor(ort, values, dims) {
  return new ort.Tensor('int64', BigInt64Array.from(values, BigInt), dims);
}

function padMask(query, key, queryPad, keyPad) {
  const batch = query.length;
  const qLength = query[0].length;
  const kLength = key[0].length;
  const mask = new Uint8Array(batch * qLength * kLength);
  let at = 0;
  for (let b = 0; b < batch; b++) {
    for (let q = 0; q < qLength; q++) {
      for (let k = 0; k < kLength; k++) {
        mask[at++] = query[b][q] !== queryPad && key[b][k] !== keyPad ? 1 : 0;
      }
    }
  }
  return mask;
}

function causalMask(length) {
  const mask = new Uint8Array(length * length);
  for (let q = 0; q < length; q++) for (let k = 0; k <= q; k++) mask[q * length + k] = 1;
  return mask;
}

function firstArgmax(values, start, length) {
  let best = 0;
  let score = values[start];
  for (let i = 1; i < length; i++) {
    const candidate = values[start + i];
    if (candidate > score) { score = candidate; best = i; }
  }
  return best;
}

function dispose(value) { try { value?.dispose?.(); } catch {} }

/**
 * Create a CATT v2 encoder-decoder runner.
 *
 * `bridge` uses the exact pinned CATT tokenizer and Python `remove_non_arabic`
 * implementation. It must implement `encodeBatch(phrases)` ->
 * `{ sourceIds, sourcePadId, targetBosId, targetPadId, spaceId,
 *   targetNoTashkeelId }` and `decodeBatch(sourceIds, targetIds)`.
 * It is invoked once for each original CATT batch (32 phrases in the Space).
 */
export function createCattEdOrchestrator({ ort, encoderSession, decoderSession, bridge, batchSize = 32 }) {
  if (!ort?.Tensor || !encoderSession?.run || !decoderSession?.run || !bridge?.encodeBatch || !bridge?.decodeBatch) {
    throw new TypeError('CATT ED orchestration requires ORT sessions and the pinned Python tokenizer bridge');
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new RangeError('invalid CATT batch size');
  const counters = { phraseInstances: 0, encoderRuns: 0, decoderRuns: 0 };

  async function encodeOneBatch(phrases) {
    if (!phrases.length) return [];
    const prepared = await bridge.encodeBatch(phrases);
    const src = prepared.sourceIds;
    if (!Array.isArray(src) || src.length !== phrases.length || src.some(row => !Array.isArray(row) || !row.length)) {
      throw new Error('Pinned CATT tokenizer returned invalid source IDs');
    }
    const sourceWidth = Math.max(...src.map(row => row.length));
    const padId = prepared.sourcePadId;
    const padded = src.map(row => [...row, ...Array(sourceWidth - row.length).fill(padId)]);
    const batch = padded.length;
    const encoderMask = boolTensor(ort, padMask(padded, padded, padId, padId), [batch, 1, sourceWidth, sourceWidth]);
    const sourceTensor = int64Tensor(ort, padded.flat(), [batch, sourceWidth]);
    let encSrc;
    let encoded;
    try {
      counters.encoderRuns++;
      encoded = await encoderSession.run({ src: sourceTensor, src_mask: encoderMask });
      encSrc = encoded[encoderSession.outputNames?.[0]] ?? encoded[Object.keys(encoded)[0]];
    } finally {
      dispose(sourceTensor); dispose(encoderMask);
      if (encoded) for (const tensor of Object.values(encoded)) if (tensor !== encSrc) dispose(tensor);
    }
    if (!encSrc?.dims || encSrc.dims.length !== 3 || encSrc.dims[0] !== batch ||
        encSrc.dims[1] !== sourceWidth || encSrc.dims[2] !== 512) {
      dispose(encSrc);
      throw new Error('CATT encoder ABI mismatch: expected [batch, source width, 512]');
    }

    const targetRows = Array.from({ length: batch }, () => [prepared.targetBosId]);
    const maxSteps = sourceWidth - 1;
    try {
      for (let step = 0; step < maxSteps; step++) {
        const targetWidth = targetRows[0].length;
        const crossValues = padMask(targetRows, padded, prepared.targetPadId, padId);
        const targetPadValues = padMask(targetRows, targetRows, prepared.targetPadId, prepared.targetPadId);
        const noPeak = causalMask(targetWidth);
        for (let i = 0; i < targetPadValues.length; i++) targetPadValues[i] &= noPeak[i % (targetWidth * targetWidth)];

        const trg = int64Tensor(ort, targetRows.flat(), [batch, targetWidth]);
        const trgMask = boolTensor(ort, targetPadValues, [batch, 1, targetWidth, targetWidth]);
        const srcTrgMask = boolTensor(ort, crossValues, [batch, 1, targetWidth, sourceWidth]);
        let decoded;
        try {
          counters.decoderRuns++;
          decoded = await decoderSession.run({ trg, enc_src: encSrc, trg_mask: trgMask, src_trg_mask: srcTrgMask });
          const logits = decoded[decoderSession.outputNames?.[0]] ?? decoded[Object.keys(decoded)[0]];
          if (!logits?.dims || logits.dims.length !== 3 || logits.dims[0] !== batch ||
              logits.dims[1] !== targetWidth || logits.dims[2] !== 18) {
            throw new Error('CATT decoder ABI mismatch: expected [batch, target width, 18]');
          }
          const width = logits.dims[2];
          const values = logits.data;
          if (!values || values.length !== batch * targetWidth * width) throw new Error('CATT decoder logits data length mismatch');
          const nextAt = (targetWidth - 1) * width;
          for (let b = 0; b < batch; b++) {
            // NumPy argmax returns the first index on a tie. Keep that rule.
            const next = firstArgmax(values, b * targetWidth * width + nextAt, width);
            targetRows[b].push(next);
          }
        } finally {
          dispose(trg); dispose(trgMask); dispose(srcTrgMask);
          if (decoded) for (const tensor of Object.values(decoded)) dispose(tensor);
        }

        // Match CATT's per-step correction: spaces receive <NT> after every decode.
        for (let b = 0; b < batch; b++) {
          for (let i = 0; i < targetRows[b].length; i++) {
            if (padded[b][i] === prepared.spaceId) targetRows[b][i] = prepared.targetNoTashkeelId;
          }
        }
      }
      return await bridge.decodeBatch(padded, targetRows);
    } finally {
      dispose(encSrc);
    }
  }

  return {
    async populateTextCache(text) {
      const before = { ...counters };
      const request = await bridge.missingPhrases(text);
      const missing = request?.phrases;
      if (!Number.isSafeInteger(request?.instances) || request.instances < 0 || !Array.isArray(missing) || missing.some(phrase => typeof phrase !== 'string')) {
        throw new Error('Invalid phrase list from the pinned frontend');
      }
      if (!missing.length) return { phraseInstances: request.instances, cacheHits: request.instances, phraseMisses: 0,
        encoderRuns: 0, decoderRuns: 0 };
      counters.phraseInstances += missing.length;
      const output = await this.diacritize(missing);
      if (!Array.isArray(output) || output.length !== missing.length) throw new Error('CATT output count differs from missing phrase count');
      await bridge.installDiacritized(missing, output);
      return { phraseInstances: request.instances, cacheHits: request.instances - missing.length,
        phraseMisses: missing.length, encoderRuns: counters.encoderRuns - before.encoderRuns,
        decoderRuns: counters.decoderRuns - before.decoderRuns };
    },
    async diacritize(phrases) {
      if (!Array.isArray(phrases) || phrases.some(text => typeof text !== 'string')) throw new TypeError('CATT phrases must be strings');
      const result = [];
      // Keep stock order and its size-32 batches, independently per caller.
      for (let start = 0; start < phrases.length; start += batchSize) {
        result.push(...await encodeOneBatch(phrases.slice(start, start + batchSize)));
      }
      return result;
    },
    stats() { return { ...counters }; },
  };
}

/** Wrap the Python bridge functions after the pinned modules are loaded in Pyodide. */
export function createPyodideCattBridge(pyodide) {
  const encodeJson = pyodide.globals.get('encode_batch_json');
  const decodeJson = pyodide.globals.get('decode_batch_json');
  const resetCache = pyodide.globals.get('reset_text_cache');
  const missingJson = pyodide.globals.get('missing_frontend_phrases_json');
  const installJson = pyodide.globals.get('install_frontend_phrases_json');
  const functions = [encodeJson, decodeJson, resetCache, missingJson, installJson];
  if (functions.some(fn => typeof fn !== 'function')) {
    for (const fn of functions) fn?.destroy?.();
    throw new Error('Pinned CATT tokenizer bridge is not initialized in Pyodide');
  }
  resetCache();
  return {
    async encodeBatch(phrases) {
      return JSON.parse(encodeJson(JSON.stringify(phrases)));
    },
    async decodeBatch(sourceIds, targetIds) {
      return JSON.parse(decodeJson(JSON.stringify(sourceIds), JSON.stringify(targetIds)));
    },
    async missingPhrases(text) { return JSON.parse(missingJson(text)); },
    async installDiacritized(phrases, outputs) { installJson(JSON.stringify(phrases), JSON.stringify(outputs)); },
    dispose() { for (const fn of functions) fn.destroy?.(); },
  };
}

export const __test = { padMask, causalMask, firstArgmax };
