import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {phonemize, phonemizeText, splitSentenceSpans, SWAHILI_SYMBOLS} from '../web/adapters/tiny-voca-swahili-frontend.mjs';
import {TINY_VOCA_SWAHILI} from '../web/adapters/tiny-voca-swahili-profile.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const repoRoot = resolve(process.env.TTS_BENCH_ROOT ?? resolve(here, '..'));
const hash = value => createHash('sha256').update(value).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));

test('frontend source and symbol IDs are pinned', async () => {
  const source = await readFile(resolve(here, '../web/adapters/tiny-voca-swahili-frontend.mjs'));
  assert.equal(hash(source), TINY_VOCA_SWAHILI.frontendFingerprint);
  assert.equal(SWAHILI_SYMBOLS.length, 76);
  assert.equal(hash(Buffer.from(JSON.stringify(SWAHILI_SYMBOLS))), TINY_VOCA_SWAHILI.symbolArrayFingerprint);
});

test('all four published text/token/stress vectors match the pinned digest', () => {
  const texts = [
    'Habari za asubuhi!',
    'Karibu Kenya.',
    'Leo ni Jumatatu, tarehe kumi na tisa Novemba.',
    'Bei ya unga ni shilingi elfu moja na mia tano.',
  ];
  const rows = texts.map(text => {
    const {tokens, stress} = phonemize(text);
    return [text, tokens, stress];
  });
  assert.equal(hash(Buffer.from(JSON.stringify(rows))), TINY_VOCA_SWAHILI.publishedVectorDigest);
});

test('registered sw-article-v1 consumes all source spans within the graph token limit', async () => {
  const registry = await json(resolve(repoRoot, 'fixtures/registry.json'));
  const fixture = registry.fixtures.find(entry => entry.id === 'sw-article-v1');
  assert.ok(fixture, 'the fixture must exist in the repository registry');
  assert.equal(fixture.language, 'sw');
  assert.equal(fixture.sha256, '7ad4f4839ffb808429c538e40b08e0e6c87655a150a1ceb0d52106cce9ecd4b1');
  const [text, manifest, metadata] = await Promise.all([
    readFile(resolve(repoRoot, 'fixtures', fixture.articleFile), 'utf8'),
    json(resolve(repoRoot, 'fixtures', fixture.chunksFile)),
    json(resolve(repoRoot, 'fixtures', fixture.metadataFile)),
  ]);
  assert.equal(hash(Buffer.from(text, 'utf8')), fixture.sha256);
  assert.equal(metadata.fixtureId, fixture.id);
  assert.equal(metadata.sha256, fixture.sha256);
  assert.equal(text.split('\n\n').length, 27);
  assert.equal(/[0-9]/u.test(text), false);
  assert.equal(manifest.chunks.length, 109);

  const rows = [], spanReport = [];
  let utterances = 0, maximumTokens = 0, minimumTokens = Infinity, unknownTokens = 0, nonzeroStress = 0, consumedNonWhitespace = 0;
  for (const [index, chunk] of manifest.chunks.entries()) {
    assert.equal(chunk.id, index, 'source span IDs remain fixed and ordered');
    const source = text.slice(chunk.start, chunk.end);
    assert.equal(hash(Buffer.from(source, 'utf8')), chunk.sha256);
    const sentences = splitSentenceSpans(source);
    const plans = phonemizeText(source);
    assert.equal(plans.length, sentences.length);
    let cursor = 0, spanMaxTokens = 0, spanUtterances = 0, spanCovered = 0;
    const tokenStress = [];
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      assert.ok(sentence.start >= cursor);
      assert.equal(/\S/u.test(source.slice(cursor, sentence.start)), false, `span ${index} skipped non-whitespace input`);
      assert.equal(sentence.text, source.slice(sentence.start, sentence.end));
      const plan = plans[sentenceIndex];
      assert.equal(plan.text, sentence.text);
      assert.equal(plan.tokens.length, plan.stress.length);
      assert.ok(plan.tokens.length <= TINY_VOCA_SWAHILI.maxTokens);
      assert.equal(plan.tokens.includes(4), false, `span ${index} emitted <unk>`);
      spanMaxTokens = Math.max(spanMaxTokens, plan.tokens.length);
      spanUtterances++;
      utterances++;
      maximumTokens = Math.max(maximumTokens, plan.tokens.length);
      minimumTokens = Math.min(minimumTokens, plan.tokens.length);
      unknownTokens += plan.tokens.filter(id => id === 4).length;
      nonzeroStress += plan.stress.filter(value => value !== 0).length;
      spanCovered += Array.from(sentence.text).filter(character => !/\s/u.test(character)).length;
      tokenStress.push([plan.tokens, plan.stress]);
      cursor = sentence.end;
    }
    assert.equal(/\S/u.test(source.slice(cursor)), false, `span ${index} skipped trailing non-whitespace input`);
    const sourceCovered = Array.from(source).filter(character => !/\s/u.test(character)).length;
    assert.equal(spanCovered, sourceCovered, `span ${index} full non-whitespace coverage`);
    consumedNonWhitespace += spanCovered;
    rows.push([chunk.id, tokenStress]);
    spanReport.push({id:chunk.id, sourceCharacters:chunk.characters, utterances:spanUtterances, maximumTokens:spanMaxTokens, nonWhitespaceCharacters:spanCovered, limit:TINY_VOCA_SWAHILI.maxTokens});
  }
  assert.equal(utterances, 341);
  assert.equal(minimumTokens, 4);
  assert.equal(maximumTokens, 212);
  assert.equal(unknownTokens, 0);
  assert.equal(nonzeroStress, 3682);
  assert.equal(consumedNonWhitespace, Array.from(text).filter(character => !/\s/u.test(character)).length);
  assert.equal(hash(Buffer.from(JSON.stringify(rows))), '09d261665d5a8bc87e279885380bc4c97213b15547bb3d92380b28d7cd85ca82');
  assert.equal(spanReport.length, 109);
});

test('unsupported graphemes fail closed; the preserved City name has one explicit override', () => {
  assert.deepEqual(phonemize('City').tokens.slice(1, 5), [27, 48, 19, 48]);
  assert.throws(() => phonemize('café'), /Unsupported Kiswahili grapheme/);
});
