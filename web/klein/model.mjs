// Modified from @kleinml/kleintts 0.2.0 src/model.js and src/index.js under
// Apache-2.0. This browser adaptation preserves all source text: strict
// vocabulary checks replace upstream's unknown-symbol skips, and overlong
// inputs split at source word boundaries instead of silent 510-token clipping.
// See NOTICE.md and docs/LICENSING.md for source and runtime details.
export const MAX_TOKENS = 510;
export const PAUSE_SECONDS = 0.12;

export const VOICE_NAMES = Object.freeze({
  af_heart: 'Sarah', af_aoede: 'Lyra', af_bella: 'Maya', af_nicole: 'Ivy', af_sarah: 'Bella',
  am_fenrir: 'Owen', am_michael: 'Caleb', bf_emma: 'Isabella', bf_isabella: 'Harriet',
  bm_fable: 'Edmund', bm_george: 'Arthur', ef_dora: 'Lucia', em_alex: 'Mateo', em_santa: 'Diego',
  ff_siwis: 'Camille', if_sara: 'Giulia', im_nicola: 'Marco',
});

// Match the upstream package's sentence-first, <=250-character grouping.
export function splitText(text, max = 250) {
  const sents = String(text).split(/\s+/).join(' ').trim().split(/(?<=[.!?…])\s+/);
  const chunks = [];
  let cur = '';
  for (const sentence of sents) {
    if (cur && cur.length + 1 + sentence.length > max) {
      chunks.push(cur);
      cur = sentence;
    } else cur = (cur + ' ' + sentence).trim();
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function tokenizeStrict(phonemes, vocab, max = MAX_TOKENS) {
  const ids = [];
  for (const symbol of phonemes) {
    if (Object.hasOwn(vocab, symbol)) ids.push(vocab[symbol]);
    else if (!/\s/u.test(symbol)) {
      const cp = symbol.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      throw new Error(`Klein G2P emitted a symbol outside model.json vocab: ${JSON.stringify(symbol)} (U+${cp}).`);
    }
  }
  if (!ids.length) throw new Error('Klein G2P produced no model tokens.');
  if (ids.length > max) return null;
  return ids;
}

// Preserve the complete source while keeping the upstream 510-token model
// limit. Re-run G2P at a source word boundary rather than silently truncating.
export async function fitPhoneChunks(text, phonemize, vocab, depth = 0) {
  const normalized = String(text).trim();
  if (!normalized) return [];
  if (depth > 12) throw new Error('Klein could not split text to fit its 510-token decoder limit.');
  const phonemes = await phonemize(normalized);
  const ids = tokenizeStrict(phonemes, vocab);
  if (ids) return [{ text: normalized, phonemes, ids }];
  const words = normalized.split(/(\s+)/u).filter(Boolean);
  const boundaries = [];
  for (let i = 1; i < words.length; i++) if (/^\s+$/u.test(words[i])) boundaries.push(i + 1);
  if (!boundaries.length) throw new Error('A single Klein source token exceeds the 510-token decoder limit.');
  const target = words.length / 2;
  const cut = boundaries.reduce((best, at) => Math.abs(at - target) < Math.abs(best - target) ? at : best, boundaries[0]);
  const left = words.slice(0, cut).join('').trim();
  const right = words.slice(cut).join('').trim();
  if (!left || !right || left === normalized || right === normalized) throw new Error('Klein could not find a safe word boundary for its decoder token limit.');
  return [
    ...await fitPhoneChunks(left, phonemize, vocab, depth + 1),
    ...await fitPhoneChunks(right, phonemize, vocab, depth + 1),
  ];
}

// Upstream's deterministic mulberry32 + Box-Muller standard-normal noise.
export function gaussian(length, seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 2) {
    const u = Math.max(random(), 1e-12);
    const v = random();
    const radius = Math.sqrt(-2 * Math.log(u));
    output[i] = radius * Math.cos(2 * Math.PI * v);
    if (i + 1 < length) output[i + 1] = radius * Math.sin(2 * Math.PI * v);
  }
  return output;
}
