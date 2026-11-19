import assert from 'node:assert/strict';
import test from 'node:test';
import { getAssetLock } from '../lib/catalog.mjs';
import catalog from '../lib/model-parameters.json' with { type: 'json' };
import { getModelParameters, validateModelParameterEvidence } from '../lib/model-parameters.mjs';

const models = getAssetLock().models;

test('parameter evidence has integer counts and an immutable source independent from asset size', () => {
  const threshold = 1_000_000_000;
  const qualifying = [];
  for (const id of Object.keys(catalog)) {
    assert.ok(Object.hasOwn(models, id), id);
    const evidence = getModelParameters(id);
    assert.ok(evidence, id);
    assert.ok(Number.isSafeInteger(evidence.parameterCount) && evidence.parameterCount > 0, id);
    assert.ok(['exact', 'lower-bound'].includes(evidence.countKind), id);
    assert.match(evidence.parameterCountSource, /^https:\/\/[^/]+\/.*[0-9a-f]{40}(?:\/|$)/, id);
    assert.ok(evidence.scope, id);
    if (evidence.parameterCount > threshold) qualifying.push(id);
    if (evidence.parameterCountUpperBound !== undefined) {
      assert.ok(Number.isSafeInteger(evidence.parameterCountUpperBound) && evidence.parameterCount <= evidence.parameterCountUpperBound, id);
    }
  }
  for (const id of [
    'lfm3-audio-2b-fusor-q7-cpu', 'lfm3-audio-2b-gguf',
    'lfm3-omni-2b-fusor-q7-cpu', 'lfm3-omni-2b-gguf',
    'ming-3.0-tts-0.5b-fusor-mix-cpu', 'ming-3.0-tts-0.5b-gguf',
    'zonos3-mini',
  ]) assert.ok(qualifying.includes(id), id);
  assert.equal(getModelParameters('unknown-99b'), null);
  assert.equal(getModelParameters('constructor'), null);
});

test('Ming counts the registered synthesis path and Audio8 includes its decoder in the upper bound', () => {
  const mingCore = 493_961_216 + 361_046_784 + 103_022_592 + 101_646_336;
  for (const id of ['ming-3.0-tts-0.5b-gguf', 'ming-3.0-tts-0.5b-fusor-mix-cpu']) {
    const evidence = getModelParameters(id);
    assert.equal(evidence.parameterCount, mingCore);
    assert.ok(evidence.parameterCountSource.includes(models[id].modelRevision));
  }
  const audio8 = getModelParameters('audio8-realistic-0.6b-int4');
  assert.equal(audio8.parameterCountUpperBound, audio8.parameterCount + 130_380_129 + 1_355);
  assert.ok(audio8.parameterCountUpperBound < 1_000_000_000);
  assert.equal(getModelParameters('tiny-voca').parameterCount, 4_537_291);
  assert.equal(getModelParameters('silencio-2').parameterCount, 27_928_626);
  assert.equal(getModelParameters('silencio-2').countKind, 'exact');
  const heartNano = getModelParameters('sano-heart-nano');
  assert.equal(heartNano.parameterCount, 294_279);
  assert.equal(heartNano.countKind, 'exact');
  assert.equal(getModelParameters('sano-heart').parameterCount, 2_272_145);
  assert.equal(getModelParameters('sano-hfc').parameterCount, 1_834_380);
  assert.equal(getModelParameters('sano-kristin').parameterCount, 1_396_151);
  assert.equal(getModelParameters('sano-amy-small').parameterCount, 1_084_972);
  assert.equal(getModelParameters('sano-amy-1p8m').parameterCount, 1_834_380);
  const zonos = getModelParameters('zonos3-mini');
  assert.equal(zonos.parameterCount, 1_029_247_872);
  assert.equal(zonos.parameterCountUpperBound, 1_070_816_040);
  assert.equal(zonos.countKind, 'lower-bound');
});

test('invalid evidence cannot convert an upper bound into a demonstrated qualifying count', () => {
  const small = getModelParameters('tiny-voca');
  for (const patch of [
    { countKind: 'upper-bound', parameterCount: 2_000_000_000 },
    { parameterCount: 0 }, { parameterCount: Infinity }, { parameterCount: '2000000000' },
    { parameterCount: Number.MAX_SAFE_INTEGER + 1 }, { parameterCountUpperBound: 1 },
    { parameterCountUpperBound: small.parameterCount + 1 }, { parameterCountSource: 'not a URL' },
  ]) assert.throws(() => validateModelParameterEvidence({ ...small, ...patch }));
  const uncertain = { ...small, countKind: 'lower-bound', parameterCountUpperBound: 2_000_000_000 };
  assert.equal(validateModelParameterEvidence(uncertain).parameterCount, small.parameterCount);
});
