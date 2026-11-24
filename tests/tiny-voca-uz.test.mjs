import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { normalizeInput, phonemize, sentenceList } from '../web/tiny-voca-uz/frontend.mjs';
import { mergeSpanAudio, noiseIndexForUtterance } from '../web/tiny-voca-uz/playback.mjs';
import { TINY_VOCA_UZ } from '../web/adapters/tiny-voca-uz-profile.mjs';
import { verifyAudioAttribution } from '../tools/audio.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

test('pinned Python inference controls match Uzbek browser normalization, sentence splitting and phones', async () => {
  const controls = JSON.parse(await readFile(new URL('./fixtures/tiny-voca-uz-python-controls.json', import.meta.url), 'utf8'));
  const article = await readFile(new URL('../fixtures/uz-article-v1.txt', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../fixtures/uz-article-v1.chunks.json', import.meta.url), 'utf8'));
  assert.equal(controls.length, TINY_VOCA_UZ.fixtureOracle.spans + 11);
  assert.equal(digest(article), TINY_VOCA_UZ.fixtureSha256);
  const completeRows = [];
  let utterances = 0, maximumTokens = 0;
  for (const [index, row] of controls.entries()) {
    const source = index < manifest.chunks.length
      ? article.slice(manifest.chunks[index].start, manifest.chunks[index].end)
      : row.text;
    assert.equal(normalizeInput(source), row.normalized, `normalized control ${index}`);
    const sentences = sentenceList(row.normalized);
    assert.deepEqual(sentences, row.sentences, `sentence control ${index}`);
    const plans = sentences.map(phonemize);
    assert.deepEqual(plans, row.plans, `phoneme control ${index}`);
    assert.ok(plans.every(plan => plan.unknown.length === 0), `unknown symbols in control ${index}`);
    if (index < manifest.chunks.length) {
      utterances += plans.length;
      maximumTokens = Math.max(maximumTokens, ...plans.map(plan => plan.ids.length));
      completeRows.push([index, plans.map(plan => [plan.ids, plan.stress])]);
    }
  }
  assert.equal(utterances, TINY_VOCA_UZ.fixtureOracle.utterances);
  assert.equal(maximumTokens, TINY_VOCA_UZ.fixtureOracle.maximumTokens);
  assert.equal(digest(JSON.stringify(completeRows)), TINY_VOCA_UZ.fixtureOracle.completeFrontendSha256);
});

test('per-utterance noise indexes stay distinct and follow the pinned seed order', () => {
  assert.deepEqual(TINY_VOCA_UZ.noiseIndexes.map(item => item.index), [42, 43, 44, 45, 46]);
  assert.deepEqual(TINY_VOCA_UZ.noiseIndexes.map(item => item.asset), [
    'noise-42.f32le', 'noise-43.f32le', 'noise-44.f32le', 'noise-45.f32le', 'noise-46.f32le',
  ]);
  for (let index = 0; index < 5; index++) assert.equal(noiseIndexForUtterance(index, TINY_VOCA_UZ.noiseIndexes), 42 + index);
  assert.throws(() => noiseIndexForUtterance(5, TINY_VOCA_UZ.noiseIndexes), /pinned per-utterance/);
});

test('source-span playback preserves actual sample duration and caps each span peak only when needed', () => {
  const hot = mergeSpanAudio([Float32Array.of(1.5, -0.75), Float32Array.of(0.25)], 0.99);
  assert.equal(hot.length, 3);
  assert.ok(Math.abs(Math.max(...hot.map(Math.abs)) - 0.99) < 1e-6);
  assert.ok(Math.abs(hot[1] + 0.495) < 1e-6);
  assert.deepEqual(mergeSpanAudio([Float32Array.of(0.2, -0.1)], 0.99), Float32Array.of(0.2, -0.1));
  assert.throws(() => mergeSpanAudio([Float32Array.of(Number.NaN)], 0.99), /finite, nonempty/);
});

test('profile, generated import entries and fixture registration agree on one CPU/WebGPU model identity', async () => {
  const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('../fixtures/registry.json', import.meta.url), 'utf8'));
  const model = lock.models[TINY_VOCA_UZ.id];
  assert.equal(model.modelRevision, TINY_VOCA_UZ.modelRevision);
  assert.equal(model.sourceRevision, TINY_VOCA_UZ.sourceRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.equal(model.parameterCount, 4531531);
  assert.equal(registry.modelRequiredFixtures[TINY_VOCA_UZ.id], 'uz-article-v1');
  assert.equal(registry.modelFrontendLanguages[TINY_VOCA_UZ.id][0], 'uz');
  for (const asset of model.assets) {
    assert.equal(asset.generated?.artifactPath !== undefined || asset.sourcePath !== undefined, true, `import source for ${asset.id}`);
    assert.equal(asset.bytes > 0, true);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(model.assets.filter(asset => asset.kind === 'model-input').map(asset => asset.id),
    [42, 43, 44, 45, 46].map(index => `tiny-voca-uz-navoiy-noise-${index}-f32le`));
});

test('recording attribution is fixed to the registered model and rejects altered credits', async () => {
  const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url), 'utf8'));
  const model = lock.models[TINY_VOCA_UZ.id];
  const entry = { model: TINY_VOCA_UZ.id, modelTerms: model.license.model,
    attribution: 'AI-generated Uzbek benchmark narration using Inomjonov’s M2 checkpoint and this project’s local ONNX export. The Apache-2.0 student model is based on Muhammed Nazeem’s Tiny Voca and trained on Navoiy-generated synthetic speech; credit Aisha AI, Mozilla Common Voice Uzbek and project-authored training prompts where applicable. Attribution is not a recording redistribution grant.',
    sourceUrls: model.support.sources };
  assert.doesNotThrow(() => verifyAudioAttribution(entry));
  assert.throws(() => verifyAudioAttribution({ ...entry, attribution: 'Inomjonov model' }), /differs from verified model catalog/);
});

test('worker rejects backend names outside the explicit harness contract before asset access', async () => {
  const sent = [];
  globalThis.self = { location: { origin: 'http://localhost' }, postMessage: (...args) => sent.push(args) };
  await import('../web/workers/tiny-voca-uz.mjs');
  await globalThis.self.onmessage({ data: { id: 1, action: 'initialize', options: { backend: 'cuda' } } });
  assert.match(sent.at(-1)[0].error, /explicit cpu or webgpu/);
  delete globalThis.self;
});
