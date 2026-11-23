// Browser port of sentence/cap/recursion and ONNX call contract from
// https://github.com/Haple/tiny-voca-ptbr-kokoro/tree/1e7ed993260ecdd91552762f7403c00632bf5dab.
// See adjacent NOTICE for Apache-2.0 attribution and modifications.

import { NothingToPronounce, phonemize } from './frontend.mjs';

export const TRAINED_ESPEAK_RELEASE = '1.51';
export const DEFAULT_VOICE = 'F';
export const PEAK = 0.99;
export const SEMITONE = Math.log(2) / 12;
const SPACE = /[\s\uFEFF]+/gu;
const SENTENCE_END = /(?:(?<=[.!?…])|(?<=[.!?…]["')\]]))\s+(?=["'(\[—-]?[A-ZÀ-Ý0-9])/gu;
// Python's Unicode-aware `\b` uses letters, numbers and underscore. JavaScript
// `\b` remains ASCII-only even with /u, so spell the left boundary explicitly.
const NOT_AN_END = /(?:(?<![\p{L}\p{N}_])(?:sr|sra|srta|dr|dra|prof|profa|av|jr|vs|etc|pág|págs|tel|cel|obs|aprox|ltda|sto|sta|exmo|exma|p\.ex)|(?<![\p{L}\p{N}_])[A-ZÀ-Ý])\.$/iu;
const CLAUSE_END = /(?<=[,;:—])\s+/gu;
const CLOSING = new Set(['"', "'", '”', '’', ')', ']', '»']);

function isAlphaNumeric(char) { return !!char && /[\p{L}\p{N}]/u.test(char); }
function endsMark(last) { return '.!?…,;:'.includes(last); }

export function finished(text) {
  const body = text.replace(/[\s\uFEFF]+$/gu, '');
  if (!body) return text;
  const last = body.split(SPACE).at(-1);
  const chars = [...last];
  if (chars.some(isAlphaNumeric)) {
    let i = chars.length - 1;
    while (i >= 0 && CLOSING.has(chars[i])) i--;
    if (i >= 0 && endsMark(chars[i])) return text;
    return body + '.';
  }
  if (chars.some(char => '.!?…'.includes(char)) || last === ',' || last === ';' || last === ':') return text;
  return body + '.';
}

export function sentences(text) {
  const parts = [];
  let current = '';
  for (const piece of text.replace(SPACE, ' ').trim().split(SENTENCE_END)) {
    current = current ? `${current} ${piece}` : piece;
    if (!NOT_AN_END.test(current)) { parts.push(current); current = ''; }
  }
  if (current) parts.push(current);
  return parts.filter(part => [...part].some(isAlphaNumeric));
}

export function shorter(text) {
  const pieces = text.split(CLAUSE_END);
  if (pieces.length > 1) return pieces;
  const words = text.split(' ');
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

function joinFloat32(chunks) {
  const total = chunks.reduce((sum, item) => sum + item.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const item of chunks) { output.set(item, offset); offset += item.length; }
  return output;
}

/**
 * Replicates Voice.speak's whole-text path. `runUtterance` receives the exact
 * phonemized token/stress arrays and scalar conditioning, and must return
 * awaited CPU-readable Float32 PCM plus int64 frame durations.
 */
export async function speakText(text, {
  voice = DEFAULT_VOICE,
  voices = ['F', 'M'],
  speed = 1,
  semitones = 0,
  pitchRange = 1,
  peak = PEAK,
  maxTokens = 512,
  maxFrames = 3000,
  hop = 256,
  phonemizeText,
  runUtterance,
  onFirstPcm,
}) {
  if (!voices.includes(voice)) throw new TypeError(`voice must be one of ${JSON.stringify(voices)}`);
  if (typeof phonemizeText !== 'function' || typeof runUtterance !== 'function') throw new TypeError('phonemizeText and runUtterance callbacks are required');
  const limit = maxTokens - 12, waves = [], spoken = [];
  let firstReported = false;

  const read = async piece => {
    let phones;
    try { phones = await phonemizeText(piece); }
    catch (error) { if (error instanceof NothingToPronounce || error?.name === 'NothingToPronounce') return; throw error; }
    if (phones.ids.length <= limit) {
      const result = await runUtterance({
        ids: phones.ids,
        stress: phones.stress,
        voiceIndex: voices.indexOf(voice),
        speed,
        pitchShift: semitones * SEMITONE,
        pitchRange,
      });
      const samples = result.audio instanceof Float32Array ? result.audio : Float32Array.from(result.audio);
      const durations = Array.from(result.durations, Number);
      if (samples.length && durations.every(Number.isFinite)) {
        const frames = durations.reduce((sum, n) => sum + n, 0);
        if (frames <= maxFrames) {
          waves.push(samples);
          spoken.push(phones);
          if (!firstReported && samples.length) { firstReported = true; onFirstPcm?.(); }
          return;
        }
      }
    }
    const parts = shorter(piece);
    if (!parts.length) throw new RangeError(`one word is too long to speak: ${JSON.stringify(piece.slice(0, 40))}`);
    for (const part of parts) await read(part);
  };

  for (const sentence of sentences(finished(text))) await read(sentence);
  if (!waves.length) throw new NothingToPronounce('nothing in the text could be read: tiny-voca pt-BR só lê português');
  const audio = joinFloat32(waves);
  for (const sample of audio) if (!Number.isFinite(sample)) throw new Error('model produced non-finite audio');
  let loudest = 0;
  for (const sample of audio) loudest = Math.max(loudest, Math.abs(sample));
  if (peak !== null && loudest > peak) {
    const scale = peak / loudest;
    for (let i = 0; i < audio.length; i++) audio[i] *= scale;
  }
  return {audio, spoken, sampleRate: 24000, hop};
}

/** Token-limit-only text plan used by the immutable fixture frontend audit. */
export async function planText(text, {maxTokens = 512, phonemizeText} = {}) {
  if (typeof phonemizeText !== 'function') throw new TypeError('phonemizeText callback is required');
  const limit = maxTokens - 12, plans = [];
  const read = async piece => {
    let phones;
    try { phones = await phonemizeText(piece); }
    catch (error) { if (error instanceof NothingToPronounce || error?.name === 'NothingToPronounce') return; throw error; }
    if (phones.ids.length <= limit) { plans.push(phones); return; }
    const parts = shorter(piece);
    if (!parts.length) throw new RangeError(`one word is too long to speak: ${JSON.stringify(piece.slice(0, 40))}`);
    for (const part of parts) await read(part);
  };
  for (const sentence of sentences(finished(text))) await read(sentence);
  return plans;
}

function tensor(ort, type, data, dims) { return new ort.Tensor(type, data, dims); }

/** Exact one-utterance graph ABI. No hidden fallback or CPU-only provider rewrite. */
export async function runOnnxUtterance(ort, session, input) {
  const ids = BigInt64Array.from(input.ids, BigInt);
  const stress = BigInt64Array.from(input.stress, BigInt);
  const feeds = {
    tokens: tensor(ort, 'int64', ids, [1, ids.length]),
    stress: tensor(ort, 'int64', stress, [1, stress.length]),
    voice: tensor(ort, 'int64', BigInt64Array.of(BigInt(input.voiceIndex)), [1]),
    speed: tensor(ort, 'float32', Float32Array.of(input.speed), [1]),
    pitch_shift: tensor(ort, 'float32', Float32Array.of(input.pitchShift), [1]),
    pitch_range: tensor(ort, 'float32', Float32Array.of(input.pitchRange), [1]),
  };
  let outputs;
  try {
    outputs = await session.run(feeds);
    const [audio, durations] = await Promise.all([outputs.audio.getData(), outputs.durations.getData()]);
    const frameDurations = Array.from(durations, Number);
    if (frameDurations.length !== input.ids.length || frameDurations.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('tiny-voca-ptbr-kokoro returned invalid frame durations');
    }
    const frames = frameDurations.reduce((sum, value) => sum + value, 0);
    const samples = Float32Array.from(audio);
    if (!Number.isSafeInteger(frames * 256) || frames < 1 || samples.length !== frames * 256 ||
        !samples.every(Number.isFinite) || !samples.some(value => value !== 0)) {
      throw new Error('tiny-voca-ptbr-kokoro audio length or PCM differs from durations × hop');
    }
    return {audio: samples, durations: frameDurations};
  } finally {
    for (const value of Object.values(feeds)) value.dispose?.();
    for (const value of Object.values(outputs ?? {})) value.dispose?.();
  }
}

/** Build engine using a caller-supplied, same-origin eSpeak NG 1.51 provider. */
export function createVoice({ort, session, espeakRawIpa, metadata}) {
  if (!metadata || metadata.frontend !== 'espeak' || metadata.frontend_fingerprint !== '8fcf234a3759b90b7f8b3c399c6632a22a6bb3d50ce290636b3ab80936d09dee') {
    throw new Error('tiny-voca-ptbr-kokoro frontend metadata mismatch');
  }
  if (metadata.sample_rate !== 24000 || metadata.hop !== 256 || metadata.voices.join(',') !== 'F,M') throw new Error('unexpected tiny-voca-ptbr-kokoro graph metadata');
  const phonemizeText = text => phonemize(text, espeakRawIpa);
  return {
    speak(text, options = {}) {
      return speakText(text, {
        ...options,
        voices: metadata.voices,
        maxTokens: metadata.max_tokens,
        maxFrames: metadata.max_frames,
        hop: metadata.hop,
        phonemizeText,
        runUtterance: input => runOnnxUtterance(ort, session, input),
      });
    },
  };
}
