import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TINY_VOCA_HE } from '../web/adapters/tiny-voca-he-profile.mjs';
import { onnxMetadata } from '../web/tiny-voca-he/onnx-metadata.mjs';

function varint(value) {
  const out=[];let n=value;
  while(n>127){out.push((n&127)|128);n=Math.floor(n/128);}
  out.push(n);return out;
}
function bytesField(field, bytes) { return [...varint((field<<3)|2),...varint(bytes.length),...bytes]; }
function entry(key,value) {
  const enc=new TextEncoder();
  return Uint8Array.from([...bytesField(1,enc.encode(key)),...bytesField(2,enc.encode(value))]);
}

test('Tiny Voca Hebrew fixture and both source oracles are pinned', async () => {
  const registry=JSON.parse(await readFile(new URL('../fixtures/registry.json',import.meta.url)));
  const fixture=registry.fixtures.find(({id})=>id==='he-article-v1');
  assert.equal(TINY_VOCA_HE.fixtureSha256,fixture.sha256);
  assert.equal(TINY_VOCA_HE.fixtureSpans,fixture.chunks);
  assert.deepEqual(TINY_VOCA_HE.fixtureOracle,{spans:71,utterances:320,maximumTokens:140,unknownTokens:0,unknownWords:0,tokenStressSha256:'4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7'});
  assert.deepEqual(TINY_VOCA_HE.smokeOracle,{spans:3,utterances:16,maximumTokens:107,unknownTokens:0,unknownWords:0,tokenStressSha256:'78412e106e2a9df78c8669beed49f169b5c08ec55a34727d87b6695c162fd1f2'});
  assert.equal(TINY_VOCA_HE.assets['tiny-voca-he.onnx'].bytes+TINY_VOCA_HE.assets['renikud-plus-model-int8.onnx'].bytes,332967475);
});

test('ONNX metadata parser reads ModelProto field 14 and rejects malformed or duplicate entries', () => {
  const enc=new TextEncoder();
  const model=Uint8Array.from([...bytesField(14,entry('model_type','renikud')),...bytesField(14,entry('vocab_size','100'))]);
  assert.deepEqual({...onnxMetadata(model)},{model_type:'renikud',vocab_size:'100'});
  assert.throws(()=>onnxMetadata(Uint8Array.from(bytesField(14,entry('x','1')).concat(bytesField(14,entry('x','2'))))),/Duplicate/);
  assert.throws(()=>onnxMetadata(Uint8Array.from([0x72,0x08,0x0a])),/Truncated/);
});
