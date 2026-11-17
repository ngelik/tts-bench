const TERMINAL = '.!?…';
const WEAK = ',;:-–—';
const CLOSERS = `"'”’)]»`;
const WORDS = /\s+/u;
const SOUND = /\[([^\]]*)\]/gu;
const EMOTION = /<([^>]*)>/gu;

function wordCount(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(WORDS).length : 0;
}

function tokenize(tokenizer, text) {
  const result = tokenizer(text, { add_special_tokens: false, truncation: false, padding: false });
  const tensor = result.input_ids;
  if (!tensor?.data) throw new Error('Silencio-2 tokenizer did not return input_ids.');
  return Array.from(tensor.data, Number);
}

function decode(tokenizer, ids) {
  return tokenizer.decode(ids, { skip_special_tokens: false, clean_up_tokenization_spaces: false });
}

export function prepareSilencioText(input, config, useShortPadding = true) {
  let text = String(input).trim();
  if (config.replaceCharacters && Object.keys(config.replaceCharacters).length) {
    for (const [from, to] of Object.entries(config.replaceCharacters)) text = text.split(from).join(to);
    text = text.trim().split(WORDS).filter(Boolean).join(' ');
  }
  if (!text) throw new Error('Silencio-2 cannot generate empty text.');
  text = text.replace(/\n/gu, ' ').replace(/\r/gu, ' ').replaceAll('  ', ' ');
  if (config.removeSemicolons) text = text.replaceAll(';', ',');
  const shortInput = wordCount(text) <= 4;
  const first = Array.from(text)[0];
  if (config.capitalizeFirstLetter && first && first !== first.toUpperCase()) {
    text = first.toUpperCase() + text.slice(first.length);
  }
  if (config.appendTerminalPunctuation) {
    let core = text;
    while (core && (CLOSERS.includes(Array.from(core).at(-1)) || Array.from(core).at(-1) === ' ')) {
      core = core.slice(0, -1);
    }
    const closers = text.slice(core.length).trim();
    if (core && !TERMINAL.includes(Array.from(core).at(-1))) {
      if (WEAK.includes(Array.from(core).at(-1))) {
        text = core.replace(/[,;:\-–— ]+$/u, '') + '.' + closers;
      } else {
        // The official helper appends to the original text, after closers.
        text += '.';
      }
    }
  }
  if (useShortPadding && config.padWithSpacesForShortInputs && wordCount(text) < 5) text = ' '.repeat(8) + text;
  return { text, framesAfterEosGuess: shortInput ? 3 : 1 };
}

function decodeSegments(tokenizer, ids, boundaries) {
  const segments = [];
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    segments.push({ count: end - start, text: decode(tokenizer, ids.slice(start, end)) });
  }
  return segments;
}

function boundaryIndices(ids, boundaryTokens, tokenizer, skipDecimalPeriods = false) {
  const boundarySet = new Set(boundaryTokens);
  const indices = [0];
  let previousBoundary = false;
  for (let index = 0; index < ids.length; index++) {
    if (boundarySet.has(ids[index])) previousBoundary = true;
    else if (previousBoundary) {
      if (skipDecimalPeriods && index > 0) {
        const before = decode(tokenizer, ids.slice(Math.max(0, index - 2), index));
        const after = decode(tokenizer, ids.slice(index - 1, index + 1));
        if (before.length >= 2 && before.at(-1) === '.' && /\d/u.test(before.at(-2)) && after.length >= 2 && /\d/u.test(after[1])) {
          previousBoundary = false;
          continue;
        }
      }
      indices.push(index);
      previousBoundary = false;
    } else previousBoundary = false;
  }
  indices.push(ids.length);
  return indices;
}

export function splitSilencioSentences(tokenizer, input, config) {
  const prepared = prepareSilencioText(input, config);
  const source = prepared.text.trim();
  const ids = tokenize(tokenizer, source);
  const sentenceIds = tokenize(tokenizer, '.!...?').slice(1);
  const sentenceEnds = boundaryIndices(ids, sentenceIds, tokenizer, true);
  const sentences = decodeSegments(tokenizer, ids, sentenceEnds);
  const fallbackIds = tokenize(tokenizer, ',;:').slice(1);
  const refined = [];
  for (const segment of sentences) {
    if (segment.count <= config.maxTokensPerChunk) refined.push(segment);
    else {
      const subIds = tokenize(tokenizer, segment.text.trim());
      const subEnds = boundaryIndices(subIds, fallbackIds, tokenizer);
      const subs = decodeSegments(tokenizer, subIds, subEnds);
      refined.push(...(subs.length > 1 ? subs : [segment]));
    }
  }
  const chunks = [];
  let current = '';
  let count = 0;
  for (const segment of refined) {
    if (!current) {
      current = segment.text;
      count = segment.count;
    } else if (count + segment.count > config.maxTokensPerChunk) {
      chunks.push(current.trim());
      current = segment.text;
      count = segment.count;
    } else {
      current += ' ' + segment.text;
      count += segment.count;
    }
  }
  if (current) chunks.push(current.trim());
  if (!chunks.length) throw new Error('Silencio-2 text frontend produced no chunks.');
  for (const chunk of chunks) {
    const count = tokenize(tokenizer, chunk).length;
    if (count > config.maxTokensPerChunk) throw new Error(`Silencio-2 split produced ${count} tokens; model limit is ${config.maxTokensPerChunk}.`);
  }
  return { chunks, sourceTokenCount: ids.length, normalizedText: source };
}

export function splitSilencioTaggedText(tokenizer, input, config) {
  const sounds = [...input.matchAll(SOUND)].map(match => match[1]);
  const unknownSound = sounds.find(tag => !config.sounds.includes(tag));
  if (unknownSound) throw new Error(`Unknown Silencio-2 sound tag [${unknownSound}].`);
  const parts = input.split(EMOTION);
  const result = [];
  let currentEmotion = null;
  for (let index = 0; index < parts.length; index += 2) {
    if (index) {
      currentEmotion = parts[index - 1];
      if (!config.emotions.includes(currentEmotion)) throw new Error(`Unknown Silencio-2 emotion tag <${currentEmotion}>.`);
    }
    const plain = parts[index];
    if (!plain.trim()) continue;
    const split = splitSilencioSentences(tokenizer, plain.trim(), config);
    for (const text of split.chunks) result.push({ text, emotion: currentEmotion });
  }
  if (!result.length) throw new Error('Silencio-2 cannot generate from tags without text.');
  return result;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSpanNoise(seed, latentDim, standardDeviation) {
  const random = mulberry32(seed);
  let spare = null;
  return () => {
    const values = new Float32Array(latentDim);
    for (let i = 0; i < latentDim; i++) {
      if (spare != null) {
        values[i] = spare * standardDeviation;
        spare = null;
      } else {
        const u1 = Math.max(Number.MIN_VALUE, random());
        const u2 = random();
        const radius = Math.sqrt(-2 * Math.log(u1));
        const angle = 2 * Math.PI * u2;
        values[i] = radius * Math.cos(angle) * standardDeviation;
        spare = radius * Math.sin(angle);
      }
    }
    return values;
  };
}

export function auditSilencioText(tokenizer, text, config) {
  const utterances = splitSilencioTaggedText(tokenizer, text, config);
  return {
    sourceCharacters: text.length,
    utteranceCount: utterances.length,
    utterances: utterances.map(({ text: utterance, emotion }) => ({
      tokenCount: tokenize(tokenizer, prepareSilencioText(emotion ? `<${emotion}> ${utterance}` : utterance, config).text).length,
      emotion,
    })),
  };
}
