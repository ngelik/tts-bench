import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readResult,sha256} from './results.mjs';
import {getModel} from '../lib/catalog.mjs';
import {verifySource} from './provenance.mjs';
import {fixtureLanguage} from './fixture-language.mjs';
export function verifyAudioLanguage(entry,result){if(entry.language!==fixtureLanguage(result))throw new Error('Audio language does not match scored fixture');}
const sourceCache=new Map();
const playbackNotices = {'tiny-voca-ja-tsukuyomi-chan': 'Tsukuyomi-chan Corpus (CV Rei Yumesaki, © Rei Yumesaki). Listening only. Secondary use is prohibited.'};
export function verifyAudioAttribution(entry) {
  const model = getModel(entry.model);
  const notice = playbackNotices[entry.model];
  if (entry.playbackNotice !== notice || (notice && entry.full?.url != null)) {
    throw new Error('Audio playback terms differ from verified model catalog');
  }
  if (entry.modelTerms !== model.license.model || entry.attribution !== (attribution[entry.model] ?? model.displayName) ||
      JSON.stringify(entry.sourceUrls) !== JSON.stringify(model.support.sources)) {
    throw new Error('Audio attribution differs from verified model catalog');
  }
}
export const MAX_CLIP_BYTES=3000000; // 30 seconds of mono PCM16 at up to 48 kHz.
const BASE='https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/';
export function wavInfo(b){
 if(b.length<44||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.toString('ascii',12,16)!=='fmt '||b.readUInt32LE(16)!==16||b.readUInt16LE(20)!==1||b.readUInt16LE(22)!==1||b.readUInt16LE(34)!==16||b.toString('ascii',36,40)!=='data'||b.readUInt32LE(4)!==b.length-8||b.readUInt32LE(40)!==b.length-44||(b.length-44)%2)throw new Error('Expected canonical mono PCM16 WAV');
 const sampleRate=b.readUInt32LE(24);if(sampleRate<8000||sampleRate>48000||b.readUInt32LE(28)!==sampleRate*2||b.readUInt16LE(32)!==2)throw new Error('Invalid WAV format');
 return {sampleRate,samples:(b.length-44)/2,seconds:(b.length-44)/2/sampleRate};
}
export function makeClip(b){const w=wavInfo(b);const samples=Math.min(w.samples,w.sampleRate*30);const clip=Buffer.from(b.subarray(0,44+samples*2));clip.writeUInt32LE(clip.length-8,4);clip.writeUInt32LE(clip.length-44,40);return clip;}
export function verifyFullAudioReference(full,key){
 if(!full||!/^[a-f0-9]{64}$/.test(full.sha256)||!Number.isSafeInteger(full.bytes)||full.bytes<44)throw new Error('Missing full recording digest or size');
 if(full.url!==undefined&&full.url!==null&&full.url!==BASE+key+'-full.wav')throw new Error('Unexpected audio release URL');
}
async function manifest(){try{return JSON.parse(await readFile('audio/manifest.json','utf8'));}catch(e){if(e.code==='ENOENT')return {schemaVersion:1,entries:[]};throw e;}}
const attribution={"lfm3-audio-2b-gguf":"LFM3-Audio-2B by Liquid AI; official GGUF WebGPU runtime. American English female prompted style. LFM Open License v1.0; noncommercial benchmark evaluation.","lfm3-audio-2b-fusor-q7-cpu":"LFM3-Audio-2B by Liquid AI; Fusor q7 CPU browser bundle. American English female prompted style. LFM Open License v1.0; noncommercial benchmark evaluation.","lfm3-omni-2b-gguf":"LFM3-Omni-2B by Liquid AI; official GGUF WebGPU runtime. American English female prompted style. LFM Open License v1.0; noncommercial benchmark evaluation.","lfm3-omni-2b-fusor-q7-cpu":"LFM3-Omni-2B by Liquid AI; Fusor q7 CPU browser bundle. American English female prompted style. LFM Open License v1.0; noncommercial benchmark evaluation.",'inflect-micro-v2':'Inflect Micro v2 by Owen Song; fixed synthetic English voice. Official ONNX packaging from Robert Bak conversion. Apache-2.0 model.','inflect-micro-v3':'Inflect Micro v3 by Owen Song; Cassidy (voice 2) fixed English preset. Apache-2.0 identified model weights; browser path uses a Klein 0.2.0 G2P adaptation and a custom source-filter implementation.','sano-amy':'SanoTTS by Ampixa; Amy English checkpoint. GPL-3.0 model and GPL-3.0-or-later browser runtime; evaluation recording.','kokoro-82m':'Kokoro 82M by hexgrad; af_heart voice. Apache-2.0 model.','kitten-nano-0.8':'Kitten Nano 0.8 by KittenML; Bella voice. Apache-2.0 model.','mms-english':'MMS English by Facebook/Meta; Xenova ONNX export. CC BY-NC 4.0 model; noncommercial benchmark evaluation.','supertonic-3':'Supertonic 3 by Supertone Inc.; M3 preset voice. OpenRAIL-M model terms and use-based restrictions apply.',paradee:'Paradee by Sahil Mahendrakar; distilled from Kokoro-82M by hexgrad.',phonon:'Phonon by Gradium; based on Pocket TTS and Mimi by Kyutai.','leokani-7m':'Leokani by Milliwatt Labs; synthetic training speech from Kokoro-82M by hexgrad.','leokani-4.5m':'Leokani by Milliwatt Labs; synthetic training speech from Kokoro-82M by hexgrad.','pivo-curated':'PiVo by Leon Lehmann, Empero Research; FARGAN-derived vocoder.','woof':'Voice by Underdog Woof. Non-commercial benchmark evaluation.','piper-en-gb-southern-english-female-low':'Piper / rhasspy Southern English Female low; OpenSLR 83 dataset; Ryan low checkpoint ancestry.',
 'ming-3.0-tts-0.5b-fusor-mix-cpu':'Synthetic speech by Ming 3.0 TTS (inclusionAI), Fusor mixed-quantization browser runtime. US_James English preset. Model and runtime under MIT.',
 'ming-3.0-tts-0.5b-gguf':'Ming 3.0 TTS by inclusionAI, Q8_0 GGUF conversion for audio.cpp. US_James English preset. MIT model terms.',
 'fun-cosyvoice3-0.5b-2512':'Fun-CosyVoice3-0.5B-2512 by FunAudioLLM. ONNX export by Danyal Malik. The English preset derives from LibriTTS-R speaker 4446, Koizumi et al., licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Generated evaluation recording.',
 'audio8-realistic-0.6b-int4':'Audio8 TTS Realistic Air by Edge0. INT4 ONNX conversion by stephvax. Reference-free English synthesis. Apache-2.0.',
 'mach-boom':'Mach Boom by SyzygyResearch; Zoey English voice. The pinned Apache-2.0 checkpoint notice credits Gradium Phonon and Kyutai Pocket TTS/Mimi. Experimental Chrome WebAssembly port; noncommercial benchmark evaluation.',
 'sopro-v2-turbo':'Sopro v2 Turbo by Samuel Vitorino, Apache-2.0. English reference from the published Tiny Voca synthetic F2 recording by this benchmark.',
 'supratts-1.0-preview':'SupraTTS 1.0 Preview by SupraLabs; fixed single English voice. MIT checkpoint/runtime and browser ONNX conversion; bundled G2P dictionary and OOV fallback are Apache-2.0. The voice performer is not separately named in the pinned card.',
 'tiny-voca':'Tiny Voca by Muhammed Nazeem (n4ze3m), Apache-2.0. Synthetic F2 voice, English.',
 'pocket-tts-100m-english-int8':'Pocket TTS by Kyutai; KevinAHM public ONNX export and browser frontend, alba English preset. CC-BY-4.0 with upstream prohibited-use conditions; noncommercial benchmark evaluation.'};
attribution['silencio-2']='Silencio-2 by BlueRose Labs; model and converted graphs CC-BY-4.0. Fine-tuned from Kyutai Pocket TTS with Basis Global Emotions data; bundled synthetic voice 260. Noncommercial benchmark evaluation.';
attribution['klein-tts-x1.5-pro']='Klein-TTS X1.5 Pro by Klein ML; Sarah (af_heart) English voice. Pinned model is Apache-2.0. Browser implementation is a disclosed port of @kleinml/kleintts 0.2.0.';
attribution['linnet-en-35m']='Linnet model weights by VoxRT, licensed under the Linnet Weights License 1.0. Powered by Linnet (VoxRT). Fixed f1 voice; benchmark evaluation only.';
attribution['ua-serhiy-0p58m']='Synthetic Ukrainian speech generated with dmytro-m’s Serhiy 0.58M, distilled from the Serhiy Piper teacher. Student weights/reference GPL-3.0; sanoTTS by Ampixa. Teacher Apache-2.0; training corpus MIT. Attribution only; not an output-license grant.';
attribution['kale-tts-1-nano-int8']='AI-generated English speech in the synthetic Kenzie voice (s057b), from Kale TTS 1 Nano by KaleComputer. Official INT8 CPU/WASM export, Apache-2.0 model, based on Maya-1 by Maya Research. Noncommercial benchmark evaluation.';
attribution['kale-tts-1-nano-fp32']='AI-generated English speech in the synthetic Kenzie voice (s057b), from Kale TTS 1 Nano by KaleComputer. Official FP32 WebGPU export, Apache-2.0 model, based on Maya-1 by Maya Research. Noncommercial benchmark evaluation.';
attribution['apptor-tiny-tts']='Apptor Tiny TTS Standard German M2; synthetic voice. Tiny-voca architecture and training recipe; speech training data generated with Qwen3-TTS and Common Voice German text lineage. Apache-2.0 checkpoint; MIT Vocos. Benchmark evaluation sample.';
attribution['apptor-tiny-tts-at']='Apptor Tiny TTS Austrian Standard German M2 with accent set to 1.0. Synthetic voice derived from Qwen3-TTS, with accent conditioning trained on Common Voice Austrian German recordings. The checkpoint uses the Tiny Voca architecture and Apache-2.0 terms. Vocos is MIT. Benchmark evaluation sample.';
attribution['tiny-voca-de-en']='Synthetic speech generated with Fraunhofer IEM Tiny Voca DE/EN Voca64. The German and English presets are fictional voices trained with synthetic Qwen3-TTS supervision. Apache-2.0 model. Benchmark evaluation sample.';
attribution['tiny-voca-it']='Synthetic Italian speech from carbogninalberto/tiny-voca-it v0.3.0 in the Lorenzo (EM4) preset, a Qwen3-TTS VoiceDesign voice. Apache-2.0 model. Benchmark evaluation sample.';
attribution['vocina-it']='Synthetic Italian speech from OfficinePixel Vocina v1.0 in the I1 (Femminile) preset, designed with Qwen3-TTS VoiceDesign. Apache-2.0 model. Benchmark evaluation sample.';
attribution['zerre-tts']='Generated Turkish speech from erkinemreta1 Zerre TTS tr-v1 INT8 in the released SES-A voice. The Apache-2.0 model credits the tiny-voca architecture. Benchmark evaluation sample.';
attribution['clarvia-tts-tiny']='AI-generated Turkish speech from Wite Clarvia TTS Tiny FP32 in the released synthetic female_1 voice. Apache-2.0 model and clarvia-phonemizer. Benchmark evaluation sample.';
attribution['korean-tts']='AI-generated benchmark narration from ooodev Korean TTS v2, built on tiny-voca. Korean uses the KSS voice and English uses the synthetic F2 voice. The shared checkpoint inherits CC BY-NC-SA 4.0 conditions from the Korean Single Speaker Speech Dataset. Noncommercial benchmark evaluation.';
attribution['tiny-voca-ja-tsukuyomi-chan']='AI-generated, non-official benchmark narration from Ayousanz Tiny Voca Japanese P1. Tsukuyomi-chan Corpus (CV Rei Yumesaki, © Rei Yumesaki). Listening only. Secondary use is prohibited.';
attribution['tiny-voca-ja-v3']='AI-generated Japanese or English benchmark narration in the synthetic F2 voice from Satoshi Fujimoto’s Tiny Voca JA v3. Based on Muhammed Nazeem’s Tiny Voca, with synthetic training speech from Qwen3-TTS. Pinned model and recipe Apache-2.0; frontend components retain their own licenses. Benchmark evaluation sample.';
attribution['slyszeglosy-v1']='AI-generated Polish benchmark narration from Damian Trojnar’s Słyszegłosy V1 in its synthetic F voice. Based on Muhammed Nazeem’s Tiny Voca, with synthetic training speech from OmniVoice. The released weights are CC BY-NC 4.0. Noncommercial benchmark evaluation.';
attribution['tiny-voca-ru']='AI-generated Russian benchmark narration from Evgeniy Chetvertkov’s Tiny Voca Russian in its synthetic M voice. Based on Muhammed Nazeem’s Tiny Voca, with Qwen3-TTS VoiceDesign training speech. Model Apache-2.0, stress assets from ruaccent under MIT, and training dataset CC BY 4.0. Benchmark evaluation sample.';
attribution['tiny-voca-gr']='AI-generated Modern Greek benchmark narration from Konstantinos Perifanos’s Tiny Voca Greek in the fixed M voice. Based on Muhammed Nazeem’s Tiny Voca and trained on STOMA by Michail Raptakis, Yannis Pantazis, and Alexandros Angelakis. CC BY 4.0 checkpoint. The benchmark used an FP32 ONNX conversion of the released weights.';
attribution['mini-voz']='AI-generated Castilian Spanish benchmark narration in Mini Voz’s synthetic F1 voice. Mini Voz contributors adapted Muhammed Nazeem’s Tiny Voca and trained the released profiles on synthetic Qwen3-TTS speech. Apache-2.0 model and source. Benchmark evaluation sample.';
attribution['tiny-voca-es']='AI-generated Castilian Spanish benchmark narration in tiny-voca-es’s synthetic F2 voice. Marcos (marcosmaceo) adapted Muhammed Nazeem’s tiny-voca and trained the Castilian voices on synthetic Qwen3-TTS VoiceDesign speech. Apache-2.0 weights and code.';
attribution['alpa-es']='AI-generated Rioplatense Spanish benchmark narration in Alpa-es’s fixed female voice. Alpa-es by Francisco Carlos Erra adapts Alpa by 77ethers and tiny-voca by Muhammed Nazeem. The model card credits the OpenSLR 61 Argentinian Spanish corpus by Guevara-Rukoz et al. (CC BY-SA 4.0). Model and code are released under Apache-2.0.';
attribution['tiny-voca-fr']='AI-generated Standard French benchmark narration in the synthetic FR_F1 voice from Daniel Suncost’s Tiny Voca French, adapted from Muhammed Nazeem’s Tiny Voca. The model and source are Apache-2.0. Training speech is synthetic and credits Qwen3-TTS and Common Voice text. Benchmark evaluation sample.';
attribution['tiny-voca-ptbr']='AI-generated Brazilian Portuguese benchmark narration in the synthetic F_s4 voice with tiny-voca-ptbr by SemFence (Gustavo Toledo), CC BY 4.0. Based on Muhammed Nazeem’s tiny-voca. The frontend uses SemFence Dizione and an adapted Brazilian Portuguese MFA dictionary by Michael McAuliffe and Morgan Sonderegger, CC BY 4.0.';
attribution['tiny-voca-ptbr-kokoro']='AI-generated Brazilian Portuguese benchmark narration in synthetic voice F using Aleph Santos’s Apache-2.0 tiny-voca-ptbr-kokoro checkpoint. The student model is based on Muhammed Nazeem’s Tiny Voca and trained on speech generated by Kokoro-82M. The F teacher blends pf_dora and af_heart.';
attribution['tiny-broca']='AI-generated Brazilian Portuguese benchmark narration using brenorb’s Apache-2.0 Tiny Broca checkpoint and fixed F1 voice. The student was trained on synthetic speech generated by Qwen3-TTS using CC0 Common Voice reference clips.';
export async function addAudio({result,wav,model,backend,clipOnly=false}){
 const playbackNotice = playbackNotices[model];
 if (playbackNotice && !clipOnly) throw new Error('This recording is restricted to clip-only listening');
 const d=await readResult(resolve(result),{publication:true});verifySource(d,process.cwd(),sourceCache);const c=d.cells.find(c=>c.model===model&&c.backendRequested===backend&&c.status==='measured');if(!c)throw new Error('No measured source cell');
 const b=await readFile(wav),digest=sha256(b),w=wavInfo(b);const t=c.trials.find(t=>t.audio?.sha256===digest&&t.audio.bytes===b.length);if(!t||t.samples!==w.samples||t.sampleRate!==w.sampleRate)throw new Error('Full audio does not match a scored receipt');
 const m=getModel(model),language=fixtureLanguage(d),clip=makeClip(b),key=`${d.id}--${model}--${backend}`,path=`audio/samples/${key}.wav`;if(key.length>230)throw new Error('Audio asset name too long');
 const data=await manifest();if(data.entries.some(a=>a.resultId===d.id&&a.model===model&&a.backend===backend))throw new Error('Audio already registered; do not overwrite');
 await mkdir(dirname(path),{recursive:true});await writeFile(path,clip,{flag:'wx'});
 data.entries.push({resultId:d.id,model,backend,trialIndex:t.index,voice:c.voice,language,attribution:attribution[model]??m.displayName,modelTerms:m.license.model,...(playbackNotice?{playbackNotice}:{}),sourceUrls:m.support.sources,clip:{path,sha256:sha256(clip),bytes:clip.length,startSample:0,...wavInfo(clip)},full:{url:clipOnly?null:BASE+key+'-full.wav',sha256:digest,bytes:b.length}});
 data.entries.sort((a,b)=>(a.model+'/'+a.backend+'/'+a.resultId).localeCompare(b.model+'/'+b.backend+'/'+b.resultId));await writeFile('audio/manifest.json',JSON.stringify(data,null,2)+'\n');return data.entries.find(a=>a.clip.path===path);
}
export async function checkAudio(){
 const d=await manifest();if(d.schemaVersion!==1||!Array.isArray(d.entries))throw new Error('Invalid audio manifest');const seen=new Set(),paths=new Set();
 for(const a of d.entries){
  if(!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(a.resultId)||!/^[a-z0-9][a-z0-9.-]*$/.test(a.model)||!['cpu','webgpu'].includes(a.backend))throw new Error('Invalid audio source identity');
  const key=a.resultId+'/'+a.model+'/'+a.backend;if(seen.has(key))throw new Error('Duplicate audio source');seen.add(key);
  if(!/^audio\/samples\/[a-z0-9][a-z0-9._-]{0,239}\.wav$/.test(a.clip?.path)||paths.has(a.clip.path))throw new Error('Invalid audio path');paths.add(a.clip.path);
  if(typeof a.attribution!=='string'||!a.attribution.trim()||typeof a.modelTerms!=='string'||!a.modelTerms.trim()||!Array.isArray(a.sourceUrls)||!a.sourceUrls.length||a.sourceUrls.some(u=>!/^https:\/\//.test(u)))throw new Error('Missing audio attribution');
  verifyAudioAttribution(a);
  const result=await readResult(`results/${a.resultId}/result.json`,{publication:true});verifySource(result,process.cwd(),sourceCache);const c=result.cells.find(c=>c.model===a.model&&c.backendRequested===a.backend&&c.status==='measured');const t=c?.trials.find(t=>t.index===a.trialIndex);verifyAudioLanguage(a,result);if(!t||a.full.sha256!==t.audio?.sha256||a.full.bytes!==t.audio.bytes||a.voice!==c.voice)throw new Error('Audio provenance does not match scored receipt');
  verifyFullAudioReference(a.full,`${a.resultId}--${a.model}--${a.backend}`);
  const b=await readFile(a.clip.path),w=wavInfo(b);if(b.length>MAX_CLIP_BYTES||b.length!==a.clip.bytes||sha256(b)!==a.clip.sha256||a.clip.startSample!==0||w.samples!==Math.min(t.samples,t.sampleRate*30)||w.sampleRate!==t.sampleRate||['samples','sampleRate','seconds'].some(k=>a.clip[k]!==w[k]))throw new Error('Invalid audio clip or digest');
 }
 for(const f of await readdir('audio/samples'))if(!paths.has('audio/samples/'+f))throw new Error('Unregistered audio sample: '+f);
 return paths;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [action,...args]=process.argv.slice(2);if(action==='check')console.log('PASS audio samples:',(await checkAudio()).size);else if(action==='add'){const o={};for(let i=0;i<args.length;i++){if(args[i]==='--clip-only'){o.clipOnly=true;continue;}if(!['--result','--wav','--model','--backend'].includes(args[i])||!args[i+1])throw new Error('Usage: audio add --result JSON --wav WAV --model ID --backend cpu|webgpu [--clip-only]');o[args[i].slice(2)]=args[++i];}console.log(await addAudio(o));}else throw new Error('Use audio add or audio check');
}
