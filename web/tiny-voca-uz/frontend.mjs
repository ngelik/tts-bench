// Port of Inomjonov's Apache-2.0 Uzbek Navoiy inference normalizer,
// phonemizer and sentence splitting from tiny_voca.infer (revision 3d960bd0).
import {tables} from './uzbek-tables.mjs';

const apostrophes = new Set(tables.apostrophes);
const vowels = new Set(tables.vowels);
const phones = new Set(tables.phones);
const punctuation = new Set(tables.punctuation);
const ids = new Map(tables.symbols.map((symbol,index) => [symbol,index]));
const abbreviations = new RegExp('(?<![\\p{L}\\p{N}_])('+Object.keys(tables.abbreviations).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}_])','gu');

function integerWords(n) {
  if(n===0n) return 'nol';
  const words=[];
  for(const [value,name] of tables.scales){
    const scale=BigInt(value);
    if(n<scale) continue;
    const count=n/scale;
    if(scale!==1000n || count!==1n) words.push(integerWords(count));
    words.push(name);
    n%=scale;
  }
  if(n>=10n) words.push(tables.tens[Number(n/10n)]);
  if(n%10n) words.push(tables.ones[Number(n%10n)]);
  return words.join(' ');
}
const word=value=>integerWords(BigInt(value));
function ordinal(value){
  const words=word(value).split(' ');
  words[words.length-1]=tables.ordinals[words.at(-1)]??(words.at(-1)+'inchi');
  return words.join(' ');
}
function decimal(value){
  const [whole,fraction]=value.split(/[.,]/u);
  if(fraction===undefined) return word(whole);
  return word(whole)+' butun '+[...fraction].map(word).join(' ');
}
const decimalDigit=char=>{
  if(char>='0'&&char<='9') return char;
  const point=char.codePointAt(0);
  let start=point;
  while(start>0 && /\p{Nd}/u.test(String.fromCodePoint(start-1))) start--;
  return String((point-start)%10);
};

export function normalizeInput(text) {
  let value=Array.from(text.normalize('NFC'),char=>{
    if(apostrophes.has(char))return "'";
    const lower=char.toLowerCase();
    if(Object.hasOwn(tables.cyrillic,lower)){
      const replacement=tables.cyrillic[lower];
      return char!==lower?replacement.toUpperCase():replacement;
    }
    return char;
  }).join('');
  value=value.replace(/\p{Nd}/gu,decimalDigit);
  value=value.replace(/(?<![\p{L}\p{N}_])(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?![\p{L}\p{N}_])/gu,(_,d,m,y)=>[word(d),tables.months[Number(m)]||word(m),word(y)].join(' '));
  value=value.replace(/(?<![\p{L}\p{N}_])(\d{1,2}):(\d{2})(?![\p{L}\p{N}_])/gu,(_,h,m)=>Number(m)===0?word(h):word(h)+' '+(Number(m)<10?'nol ':'')+word(m));
  value=value.replace(/(?<![\p{L}\p{N}_])(\d+)[-\u2010-\u2015]?(?:inchi|nchi|chi)(?![\p{L}\p{N}_])/giu,(_,n)=>ordinal(n));
  value=value.replace(abbreviations,key=>tables.abbreviations[key]);
  value=value.replace(/(?<=\d)[ \u00a0](?=\d{3}(?![\p{L}\p{N}_]))/gu,'');
  value=value.replace(/(?<![\p{L}\p{N}_])(\d+)-(?=[A-Za-zʻ'])/gu,(_,n)=>ordinal(n)+' ');
  return value.replace(/\d+[.,]\d+|\d+/gu,decimal).replace(/dokumentatsiya/giu,'dokumyentatsiya')
    .replace(/\p{C}/gu,char=>char==='\t'||char==='\n'?char:'').replace(/[ \t]+/gu,' ').trim();
}

export function phonemize(text) {
  const source=text.normalize('NFKC').replace(/[‘’ʻʼ\u0060´ʹ]/gu,"'")
    .toLowerCase().replaceAll('–','—').replace(/[«»“”]/gu,'"').replace(/\s+/gu,' ').trim();
  if(/\p{Nd}/u.test(source))throw Error('Uzbek input contains an unexpanded number');
  const tokens=['<bos>'],stress=[0],unknown=[];
  function append(symbol,level=0){ tokens.push(symbol);stress.push(level); }
  for(const match of source.matchAll(/[a-z]+(?:'[a-z]*)*|[^\p{L}\p{N}_\s]/gu)){
    const piece=match[0];
    if(punctuation.has(piece)){
      if(tokens.at(-1)!==piece)append(piece);
      continue;
    }
    if(piece==='-'){
      if(phones.has(tokens.at(-1)))append('<sp>');
      continue;
    }
    if(!/^[a-z]+(?:'[a-z]*)*$/u.test(piece)){
      unknown.push(piece);append('<unk>');continue;
    }
    if(phones.has(tokens.at(-1)))append('<sp>');
    const sequence=[];
    for(let i=0;i<piece.length;){
      const pair=piece.slice(i,i+2);
      const unit=Object.hasOwn(tables.map,pair)?pair:piece[i];
      const sound=tables.map[unit];
      if(!sound)unknown.push(unit);
      sequence.push(sound??'<unk>');
      i+=unit.length;
    }
    const stressed=sequence.findLastIndex(phone=>vowels.has(phone));
    sequence.forEach((phone,index)=>append(phone,index===stressed?1:0));
  }
  if(/[^\u0000-\u007f]/u.test(source)&&Array.from(source).some(c=>/[\p{L}\p{Nl}\p{No}]/u.test(c)&&!/[a-z]/u.test(c)))unknown.push('unsupported alphabet');
  if(!tokens.some(token=>phones.has(token)))throw Error('No Uzbek Latin words to pronounce');
  append('<eos>');
  return {ids:tokens.map(token=>ids.get(token)),stress,unknown};
}

export function sentenceList(text) {
  const body=text.trimEnd();
  if(!body)return [];
  const last=body.split(/\s+/u).at(-1);
  const marked=/[\p{L}\p{N}]/u.test(last)?/[.!?…,;:]["'”’)\]»]*$/u.test(last):/[.!?…]/u.test(last)||/^[,;:]$/u.test(last);
  const utterances=[];
  let current='';
  for(const piece of (marked?body:body+'.').trim().replace(/\s+/gu,' ').split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/u)){
    current=current?current+' '+piece:piece;
    if(!/(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/iu.test(current)){
      utterances.push(current);current='';
    }
  }
  if(current)utterances.push(current);
  return utterances.filter(sentence=>/[\p{L}\p{N}]/u.test(sentence));
}
