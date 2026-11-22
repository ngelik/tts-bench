import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { G2P, Voice, makeChunks, makeNormalizeGerman, makePrepare, makeTokenize, normalizeText } from '../web/apptor-de/frontend.mjs';

const root = new URL('../web/apptor-de/', import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));

test('Standard German frontend inventory and G2P metadata match the pinned acoustic config', async () => {
  const [tts, g2p, frontend, exceptions] = await Promise.all([
    json('tts-config.json'), json('g2p-config.json'), json('frontend-de.json'), json('exceptions-de.json'),
  ]);
  assert.equal(tts.symbols.length, 67);
  assert.deepEqual(frontend.symbols, tts.symbols);
  assert.deepEqual(g2p.inputs, ['chars']);
  assert.deepEqual(g2p.outputs, ['logp']);
  assert.ok(Object.hasOwn(exceptions, 'Sauce'));
  assert.ok(Object.hasOwn(exceptions, 'ChatGPT'));
});

test('German dates, times, money, percentages, abbreviations and punctuation normalize as the author frontend specifies', async () => {
  const frontend = await json('frontend-de.json');
  const prepare = makePrepare(frontend), normalizeGerman = makeNormalizeGerman(frontend), chunks = makeChunks(frontend);
  const normalize = text => normalizeText(normalizeGerman(normalizeText(prepare(text))));
  assert.equal(normalize('um 7:10 Uhr'), 'um sieben Uhr zehn');
  assert.equal(normalize('am 30. November'), 'am dreißigsten November');
  assert.equal(normalize('12,50 Euro'), 'zwölf Euro fünfzig');
  assert.equal(normalize('15 %'), 'fünfzehn Prozent');
  assert.equal(normalize('Dr. June Okafor; z. B.'), 'Doktor June Okafor; zum Beispiel');
  assert.deepEqual(chunks(normalize('Dr. June Okafor; z. B.')), [
    [false, 'Doktor June Okafor'], [true, ';'], [false, 'zum Beispiel'],
  ]);
});

test('neutral exceptions and suffix readings are case tolerant without Austrian rules', async () => {
  const [g2pConfig, exceptions] = await Promise.all([json('g2p-config.json'), json('exceptions-de.json')]);
  const g2p = new G2P({}, {}, g2pConfig, exceptions);
  assert.deepEqual(await g2p.word('SAUCE'), await g2p.word('Sauce'));
  assert.deepEqual(await g2p.word('ChatGPT'), await g2p.word('chatgpt'));
  assert.deepEqual(await g2p.word('Bye'), await g2p.word('BYE'));
  assert.deepEqual(G2P.SUFFIXES, [
    ['saucen', 'z oːˌ s ə n'], ['sauce', 'z oːˌ s ə'], ['datums', 'd ɑːˌ t ʊ m s'],
    ['datum', 'd ɑːˌ t ʊ m'], ['thesen', 't eːˈ z ə n'], ['these', 't eːˈ z ə'],
  ]);
  assert.equal('austrianRules' in G2P, false);
});

test('an empty G2P result cannot silently drop a word, compound head, or speakable piece', async () => {
  const [frontend, meta, exceptions] = await Promise.all([
    json('frontend-de.json'), json('g2p-config.json'), json('exceptions-de.json'),
  ]);
  class Tensor {
    constructor(type, data, dims) { this.data = data; this.dims = dims; }
    dispose() {}
  }
  const ort = { Tensor };
  const session = { async run() {
    const classes = meta.units.length + 1, frames = 3, data = new Float32Array(frames * classes);
    for (let frame = 0; frame < frames; frame++) data[frame * classes + meta.units.length] = 1;
    return { logp: new Tensor('float32', data, [1, frames, classes]) };
  } };
  const g2p = new G2P(ort, session, meta, exceptions);
  await assert.rejects(g2p.words('qzx'), /no phonemes for speakable word/);
  await assert.rejects(g2p.word('qzxunknownDatum'), /no G2P reading for its head/);
  assert.throws(() => makeTokenize(frontend)([[false, []]]), /piece with no words/);
});

test('silent acoustic segments fail before first-PCM notification', async () => {
  class Tensor {
    constructor(type, data, dims) { this.data = data; this.dims = dims; }
    dispose() {}
  }
  let firstPcm = false;
  const voice = new Voice({ Tensor }, { async run() {
    return { audio: new Tensor('float32', new Float32Array(256), [1, 256]),
      durations: new Tensor('int64', BigInt64Array.of(1n), [1, 1]) };
  } }, { voices: ['F2', 'M2'], sample_rate: 24000, hop: 256 }, null, null);
  await assert.rejects(voice.speakParts([]), /no speech segments/);
  await assert.rejects(voice.speakParts([{ ids: [], stress: [] }]), /empty or incomplete speech segment/);
  await assert.rejects(voice.speakParts([{ ids: [1, 2, 3], stress: [0, 0, 0] }], { onChunk() { firstPcm = true; } }), /silent PCM/);
  assert.equal(firstPcm, false);
});
