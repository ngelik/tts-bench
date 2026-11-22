import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { G2P, Voice, makeFrontEnd, usesAustrianReadings } from '../web/apptor-at/frontend.mjs';

const root = new URL('../web/apptor-at/', import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));

test('Austrian inventory, conditioning ABI and public speaker mapping match the pinned source', async () => {
  const [tts, g2p, frontend, exceptions, austrian] = await Promise.all([
    json('tts-config.json'), json('g2p-config.json'), json('frontend-de.json'), json('exceptions-de.json'), json('austrian-de.json'),
  ]);
  assert.deepEqual(frontend.symbols, tts.symbols);
  assert.deepEqual(g2p.inputs, ['chars']);
  assert.deepEqual(g2p.outputs, ['logp']);
  assert.deepEqual(tts.inputs, ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'accent']);
  assert.deepEqual(tts.outputs, ['audio', 'durations']);
  assert.equal(tts.voices.indexOf('M2'), 1);
  assert.equal(tts.accent_style, 'AT');
  assert.ok(Object.hasOwn(exceptions, 'Sauce'));
  for (const word of ['Kaffee', 'Tabak', 'Mathematik', 'Chemie', 'China']) assert.ok(Object.hasOwn(austrian, word));
});

test('Austrian phrase overrides take precedence at accent >= 0.5 and retain stress in tokens', async () => {
  const [frontend, g2pConfig, austrian] = await Promise.all([
    json('frontend-de.json'), json('g2p-config.json'), json('austrian-de.json'),
  ]);
  const ort = { Tensor: class { constructor(type, data, dims) { Object.assign(this, {type, data, dims}); } dispose() {} } };
  const g2p = new G2P(ort, {}, g2pConfig, { Tabak: 't ɑ b ɑː k' }, austrian);
  const phonemize = makeFrontEnd(frontend, g2p);
  assert.equal(usesAustrianReadings(0.499), false);
  assert.equal(usesAustrianReadings(0.5), true);
  assert.equal(usesAustrianReadings(1), true);
  assert.equal(usesAustrianReadings(Number.NaN), false);
  const neutral = await phonemize('Tabak.', { austrian: usesAustrianReadings(0.499) });
  const at = await phonemize('Tabak.', { austrian: usesAustrianReadings(0.5) });
  assert.notDeepEqual(at.ids, neutral.ids);
  assert.notDeepEqual(at.stress, neutral.stress);
  assert.ok(at.stress.includes(1), 'primary Austrian dictionary stress reaches a token');
  assert.ok(neutral.stress.every(value => value === 0));
  assert.deepEqual(await g2p.word('Tabak', true), G2P.units(austrian.Tabak));
  assert.deepEqual(await g2p.word('Tabak', false), G2P.units('t ɑ b ɑː k'));
});

test('representative Austrian readings and systematic rules differ from Standard German as sourced', async () => {
  const [frontend, g2pConfig, austrian] = await Promise.all([
    json('frontend-de.json'), json('g2p-config.json'), json('austrian-de.json'),
  ]);
  const ort = { Tensor: class { constructor(type, data, dims) { Object.assign(this, {type, data, dims}); } dispose() {} } };
  const standard = {
    Tabak: 't ˈɑ b ɑː k',
    Mathematik: 'm a t eː m a t ˈiː k',
    Chemie: 'ç eː m ˈiː',
    China: 'ç ˈiː n ɑː',
    Kaffee: 'k a f ˈeː',
  };
  const g2p = new G2P(ort, {}, g2pConfig, standard, austrian);
  const phonemize = makeFrontEnd(frontend, g2p);
  let stressChanged = false;
  for (const word of ['Tabak', 'Mathematik', 'Chemie', 'China']) {
    const de = await phonemize(word, {austrian: false});
    const at = await phonemize(word, {austrian: true});
    assert.notDeepEqual(at.ids, de.ids, `${word} changes token IDs under the Austrian dictionary`);
    stressChanged ||= JSON.stringify(at.stress) !== JSON.stringify(de.stress);
    assert.ok(at.stress.includes(1), `${word} retains the Austrian primary stress`);
  }
  assert.ok(stressChanged, 'Austrian overrides change stress on representative words');
  assert.deepEqual(await g2p.word('Kaffee', true), await g2p.word('Kaffee', false),
    'Kaffee remains shared because the author applies its long-ee rule in both modes');
  assert.deepEqual(G2P.austrianRules('König', G2P.units('k øː n ˈɪ ç')), G2P.units('k øː n ˈɪ k'));
  assert.deepEqual(G2P.austrianRules('Sonne', G2P.units('z ˈɔ n ə')), G2P.units('s ˈɔ n ə'));
  assert.deepEqual(G2P.austrianRules('Rose', G2P.units('r ˈoː z ə')), G2P.units('r ˈoː s ə'));
});

test('Austrian G2P fails closed for empty words and compounds and disposes ORT tensors', async () => {
  const meta = await json('g2p-config.json');
  const disposed = [];
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, {type, data, dims}); }
    dispose() { disposed.push(this); }
  }
  const ort = { Tensor };
  const session = { async run() {
    const classes = meta.units.length + 1, frames = 3, data = new Float32Array(frames * classes);
    for (let frame = 0; frame < frames; frame++) data[frame * classes + meta.units.length] = 1;
    return { logp: new Tensor('float32', data, [1, frames, classes]) };
  } };
  const g2p = new G2P(ort, session, meta, {}, {});
  await assert.rejects(g2p.words('qzx', true), /no phonemes for speakable word/);
  assert.equal(disposed.length, 2, 'the input and output tensors were disposed after the empty G2P result');
  await assert.rejects(g2p.word1('unknownSauce', true), /no G2P reading for its head/);
  await assert.rejects(g2p.word('x'.repeat(meta.max_len + 1), true), /unreadable part/);
});

test('Austrian Voice.parts rejects one oversized word without recurring on identical text', async () => {
  let calls = 0;
  const voice = new Voice({}, null, {max_tokens: 512}, async () => {
    calls++;
    return {ids: Array.from({length: 513}, () => 1), stress: Array.from({length: 513}, () => 0)};
  });
  await assert.rejects(voice.parts('zusammengesetzt', true), /single Austrian word exceeds/);
  assert.equal(calls, 1);
});

test('Austrian M2 synthesis feeds the checked ONNX tensor types and shapes', async () => {
  const meta = await json('tts-config.json');
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, {type, data, dims}); }
    dispose() { this.disposed = true; }
  }
  const ort = { Tensor };
  let feedsSeen, outputsSeen;
  const tts = { async run(feeds) {
    feedsSeen = feeds;
    const output = {
      audio: new Tensor('float32', Float32Array.from({length: meta.hop}, (_, index) => index === 50 ? 0.2 : 0), [1, meta.hop]),
      durations: new Tensor('int64', BigInt64Array.of(1n), [1, 1]),
    };
    outputsSeen = output;
    return output;
  } };
  const voice = new Voice(ort, tts, meta, async () => null);
  const audio = await voice.speakParts([{ids: [17, 18, 19], stress: [0, 1, 0]}],
    {voice: 'M2', accent: 1.0, speed: 1.0, gap: 0.12});
  assert.equal(audio.length, meta.hop);
  assert.deepEqual(Object.fromEntries(Object.entries(feedsSeen).map(([key, tensor]) => [key, [tensor.type, tensor.dims]])), {
    tokens: ['int64', [1, 3]], stress: ['int64', [1, 3]], voice: ['int64', [1]],
    speed: ['float32', [1]], pitch_shift: ['float32', [1]], pitch_range: ['float32', [1]], accent: ['float32', [1]],
  });
  assert.equal(feedsSeen.voice.data[0], 1n);
  assert.equal(feedsSeen.accent.data[0], 1.0);
  assert.ok(Object.values(feedsSeen).every(tensor => tensor.disposed));
  assert.ok(Object.values(outputsSeen).every(tensor => tensor.disposed));
});
