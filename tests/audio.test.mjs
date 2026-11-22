import test from 'node:test';import assert from 'node:assert/strict';import {wavInfo,makeClip,MAX_CLIP_BYTES,verifyFullAudioReference} from '../tools/audio.mjs';
function wave(seconds=31,rate=8000){const b=Buffer.alloc(44+rate*seconds*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=44;i<b.length;i+=2)b.writeInt16LE((i%100)-50,i);return b;}
test('listening excerpt preserves exact initial PCM and caps duration at 30 seconds',()=>{const source=wave(),clip=makeClip(source);assert.equal(wavInfo(clip).seconds,30);assert.deepEqual(clip.subarray(44),source.subarray(44,44+8000*30*2));assert.equal(wavInfo(source).seconds,31);assert.equal(wavInfo(makeClip(wave(2))).seconds,2);});
test('malformed or non-PCM16 recording is never accepted as a listening sample',()=>{for(const change of [b=>b.writeUInt16LE(3,20),b=>b.writeUInt32LE(1,40),b=>b.writeUInt32LE(123,4),b=>b.writeUInt16LE(2,22)]){const b=wave();change(b);assert.throws(()=>wavInfo(b));}});

import {verifyAudioAttribution,verifyAudioLanguage} from '../tools/audio.mjs';import {readFile} from 'node:fs/promises';import {getModel} from '../lib/catalog.mjs';
test('audio source terms, attribution and evidence links cannot be relabelled',async()=>{const m=JSON.parse(await readFile('audio/manifest.json'));const good=m.entries[0];assert.doesNotThrow(()=>verifyAudioAttribution(good));for(const changes of [{modelTerms:'MIT'},{attribution:'Unattributed'},{sourceUrls:['https://example.com/']}])assert.throws(()=>verifyAudioAttribution({...good,...changes}));});
test('Silencio-2 audio attribution preserves model, fine-tune, dataset and bundled voice credits',()=>{const model=getModel('silencio-2');const entry={model:'silencio-2',modelTerms:model.license.model,sourceUrls:model.support.sources,attribution:'Silencio-2 by BlueRose Labs; model and converted graphs CC-BY-4.0. Fine-tuned from Kyutai Pocket TTS with Basis Global Emotions data; bundled synthetic voice 260. Noncommercial benchmark evaluation.'};assert.doesNotThrow(()=>verifyAudioAttribution(entry));assert.throws(()=>verifyAudioAttribution({...entry,attribution:model.displayName}));});

test('30-second high sample rate clips fit publication bounds without resampling',()=>{for(const rate of [44100,48000]){const source=wave(31,rate),clip=makeClip(source),w=wavInfo(clip);assert.equal(w.sampleRate,rate);assert.equal(w.seconds,30);assert.ok(clip.length<=MAX_CLIP_BYTES);assert.deepEqual(clip.subarray(44),source.subarray(44,44+rate*30*2));}});

test('recording language binds to the actual fixture with legacy English compatibility',()=>{
 const english={fixture:{id:'english-20k-v1'}},ukrainian={fixture:{id:'uk-article-v1',language:'uk'}};
 assert.doesNotThrow(()=>verifyAudioLanguage({language:'en'},english));
 assert.doesNotThrow(()=>verifyAudioLanguage({language:'uk'},ukrainian));
 assert.throws(()=>verifyAudioLanguage({language:'en'},ukrainian),/language/);
 assert.throws(()=>verifyAudioLanguage({language:'uk'},english),/language/);
 assert.throws(()=>verifyAudioLanguage({language:'uk'},{fixture:{id:'uk-article-v1'}}),/explicit language/);
 assert.throws(()=>verifyAudioLanguage({language:'en'},{fixture:{id:'unregistered-text'}}),/explicit language/);
 assert.throws(()=>verifyAudioLanguage({language:'uk'},{fixture:{id:'unregistered-text',language:'uk'}}),/unknown fixture/);
 assert.throws(()=>verifyAudioLanguage({language:'uk'},{fixture:{id:'english-20k-v1',language:'uk'}}),/mismatch/);
});

test('clip-only full audio metadata keeps the scored source digest without publishing a full URL',()=>{
 const key='run-id--apptor-tiny-tts--cpu',full={sha256:'a'.repeat(64),bytes:62179244,url:null};
 assert.doesNotThrow(()=>verifyFullAudioReference(full,key));
 assert.doesNotThrow(()=>verifyFullAudioReference({sha256:full.sha256,bytes:full.bytes},key));
 assert.doesNotThrow(()=>verifyFullAudioReference({...full,url:`https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/${key}-full.wav`},key));
 assert.throws(()=>verifyFullAudioReference({...full,url:'https://example.com/full.wav'},key),/Unexpected/);
 assert.throws(()=>verifyFullAudioReference({...full,sha256:'bad'},key),/digest or size/);
 assert.throws(()=>verifyFullAudioReference({...full,bytes:0},key),/digest or size/);
});
