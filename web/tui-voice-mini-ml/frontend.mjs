export const FRONTEND_IDENTITY = Object.freeze({
  version: 'ml-frontend-1',
  language: 'ml',
  voice: 'ml',
  separator: '_',
  normalization: 'nfc-shallow-punctuation-v1',
  pausePunctuation: [',', ';', ':', '.', '?', '!'],
  vocabPlanSha256: '9d196209759785e7b6f904091601bbd1442ae8985163bbb266c4bd7379e3e302',
});
export const FRONTEND_FINGERPRINT = '0bf9eedb0246e654df39c1150e547209d19d7ccc42e55ebd82a52ef187091929';

const PAUSE_PUNCT = new Set(FRONTEND_IDENTITY.pausePunctuation);
const STRIP = /[\u200b\u200e\u200f\u2060\ufeff]/gu;
const LATIN = /[A-Za-z]/u;
const NUMBER = /\p{N}/u;
const MALAYALAM = /\p{Script=Malayalam}/u;
const EDGE_MARKS = /^[ˈˌ'ˑ.]+|[ˈˌ'ˑ.]+$/gu;
const STRESS_MARKS = new Set(['ˈ', 'ˌ']);
const PUNCT_MAP = new Map([
  ['“', '"'], ['”', '"'], ['‘', "'"], ['’', "'"], ['…', '.'],
  ['–', '-'], ['—', '-'], ['।', '.'],
]);
const DROP_TO_SPACE = /["'()[\]{}<>*_/\\|~^`#@$%&+=-]/gu;
const SPECIALS = Object.freeze({ bos: '<bos>', eos: '<eos>', wordBoundary: '<sp>', unknown: '<unk>' });

export async function frontendFingerprint(cryptoImpl = globalThis.crypto) {
  const bytes = new TextEncoder().encode(JSON.stringify(FRONTEND_IDENTITY));
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value, cryptoImpl = globalThis.crypto) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeText(value) {
  if (typeof value !== 'string') throw new TypeError('Malayalam frontend text must be a string');
  let text = value.normalize('NFC').replace(STRIP, '');
  for (const [from, to] of PUNCT_MAP) text = text.replaceAll(from, to);
  return text.replace(DROP_TO_SPACE, ' ').replace(/\s+/gu, ' ').trim();
}

export function validateMalayalamText(text, spanId = '?') {
  if (typeof text !== 'string' || !text) throw new Error(`Malayalam span ${spanId} is empty`);
  if (LATIN.test(text)) throw new Error(`Malayalam span ${spanId} contains Latin text`);
  if (NUMBER.test(text)) throw new Error(`Malayalam span ${spanId} contains a numeral`);
  let hasLetter = false;
  for (const char of text) {
    if (!/\p{L}/u.test(char)) continue;
    hasLetter = true;
    if (!MALAYALAM.test(char)) throw new Error(`Malayalam span ${spanId} contains a non-Malayalam letter`);
  }
  if (!hasLetter) throw new Error(`Malayalam span ${spanId} has no letters`);
}

export function splitPauseCues(text) {
  const cues = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const punctuation = text[index];
    if (!PAUSE_PUNCT.has(punctuation)) continue;
    const clause = text.slice(start, index).trim();
    if (clause) cues.push([clause, punctuation]);
    start = index + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) cues.push([tail, '']);
  return cues;
}

export function parseEspeakIpa(raw) {
  if (typeof raw !== 'string') throw new TypeError('eSpeak trace must be a string');
  const lines = raw.split(/\r?\n/u);
  return lines;
}

export function validateVocab(config, plan) {
  const vocab = config?.vocab;
  if (!vocab || typeof vocab !== 'object' || Array.isArray(vocab)) throw new Error('Pinned Malayalam config has no vocab table');
  const entries = Object.entries(vocab);
  const ids = new Set(entries.map(([, id]) => Number(id)));
  if (entries.length !== 76 || ids.size !== 76 || Math.min(...ids) !== 0 || Math.max(...ids) !== 75) {
    throw new Error('Pinned Malayalam vocabulary must have exactly 76 unique contiguous slots');
  }
  if (!Array.isArray(plan?.new_symbols) || plan.new_symbols.length !== 76) throw new Error('Pinned Malayalam vocab plan does not have 76 symbols');
  for (let id = 0; id < 76; id++) {
    if (Number(vocab[plan.new_symbols[id]]) !== id) throw new Error(`Malayalam config/plan symbol mismatch at ID ${id}`);
  }
  if (plan.unresolved?.length) throw new Error(`Malayalam vocab plan has unresolved phones: ${plan.unresolved.join(', ')}`);
  for (const [phone, id] of Object.entries(plan.mapping ?? {})) {
    if (!Number.isInteger(Number(id)) || Number(id) < 0 || Number(id) > 75) throw new Error(`Invalid published phone mapping for ${phone}`);
  }
  for (const phone of plan.merged ?? []) if (!Object.hasOwn(plan.mapping, phone)) throw new Error(`Published merge has no slot mapping: ${phone}`);
  for (const special of Object.values(SPECIALS)) if (!Object.hasOwn(vocab, special)) throw new Error(`Pinned config is missing ${special}`);
  const phoneIds = Object.create(null);
  const routes = Object.create(null);
  for (let id = 17; id < plan.new_symbols.length; id++) {
    const symbol = plan.new_symbols[id];
    phoneIds[symbol] = id;
    routes[symbol] = 'config-exact';
  }
  for (const [phone, value] of Object.entries(plan.mapping)) {
    phoneIds[phone] = Number(value);
    routes[phone] = plan.merged?.includes(phone) ? 'published-merge' : 'published-map';
  }
  const punctuationIds = Object.create(null);
  for (const mark of PAUSE_PUNCT) {
    if (!Object.hasOwn(vocab, mark)) throw new Error(`Pinned config is missing pause punctuation ${mark}`);
    punctuationIds[mark] = Number(vocab[mark]);
  }
  return Object.freeze({ vocab, plan, phoneIds, routes, punctuationIds });
}

function trimPhoneEdges(value) {
  return [...value.replace(EDGE_MARKS, '')]
    .filter(char => !/\p{Cf}/u.test(char) && char !== '(' && char !== ')').join('');
}

/** Create the model-facing frontend once after the pinned vocabulary is loaded. */
export function createFrontend(config, plan) {
  const tables = validateVocab(config, plan);
  const specialIds = {
    bos: Number(tables.vocab[SPECIALS.bos]),
    eos: Number(tables.vocab[SPECIALS.eos]),
    wordBoundary: Number(tables.vocab[SPECIALS.wordBoundary]),
  };
  return Object.freeze({
    async phonemize(text, rawEspeak, spanId = '?', diagnostics = false) {
      if (typeof rawEspeak !== 'function') throw new TypeError('Pinned eSpeak NG ml provider is required');
      const normalized = normalizeText(text);
      validateMalayalamText(normalized, spanId);
      const cues = splitPauseCues(normalized);
      const ids = [specialIds.bos], stress = [0];
      const tokenSymbols = diagnostics ? [SPECIALS.bos] : null;
      const routeCounts = diagnostics ? Object.create(null) : null;
      const phoneCounts = diagnostics ? Object.create(null) : null;
      let rawTraceCount = 0, stressMarksTrimmed = 0, emittedPhones = 0, priorWord = false;
      for (const [clause, punctuation] of cues) {
        const raw = await rawEspeak(`${clause.replace(/\n+$/u, '')}\n`, { voice: 'ml', separator: '_' });
        rawTraceCount++;
        for (const line of parseEspeakIpa(raw)) {
          for (const rawWord of line.trim().split(/\s+/u)) {
            if (!rawWord) continue;
            let wordHasPhone = false;
            for (const rawPhone of rawWord.split('_')) {
              if (!rawPhone) continue;
              if (rawPhone.includes('ˈ') || rawPhone.includes('ˌ')) stressMarksTrimmed++;
              const phone = trimPhoneEdges(rawPhone);
              if (!phone) continue;
              const id = tables.phoneIds[phone];
              if (id === undefined) throw new Error(`Unmapped Malayalam eSpeak phone ${JSON.stringify(phone)} in span ${spanId}; no fallback is allowed`);
              if (!Number.isInteger(id) || id < 17 || id > 75 || id === Number(tables.vocab[SPECIALS.unknown])) {
                throw new Error(`Invalid or unknown slot ${id} for Malayalam phone ${JSON.stringify(phone)} in span ${spanId}`);
              }
              if (priorWord && !wordHasPhone) {
                ids.push(specialIds.wordBoundary);
                stress.push(0);
                if (diagnostics) tokenSymbols.push(SPECIALS.wordBoundary);
              }
              ids.push(id);
              stress.push(0);
              emittedPhones++;
              if (diagnostics) {
                tokenSymbols.push(phone);
                const route = tables.routes[phone] ?? 'published-map';
                routeCounts[route] = (routeCounts[route] ?? 0) + 1;
                phoneCounts[phone] = (phoneCounts[phone] ?? 0) + 1;
              }
              wordHasPhone = true;
              priorWord = true;
            }
          }
        }
        if (punctuation) {
          const id = tables.punctuationIds[punctuation];
          ids.push(id);
          stress.push(0);
          if (diagnostics) tokenSymbols.push(punctuation);
          priorWord = false;
        }
      }
      if (emittedPhones === 0) throw new Error(`Malayalam span ${spanId} produced no phones`);
      ids.push(specialIds.eos);
      stress.push(0);
      if (ids.length !== stress.length || ids.length > Number(config.max_tokens ?? config.model?.max_tokens ?? 512) ||
          ids.some(id => !Number.isInteger(id) || id < 0 || id > 75) || stress.some(value => value !== 0)) {
        throw new Error(`Malformed token/stress output for Malayalam span ${spanId}`);
      }
      const result = { normalized, cues, ids, stress };
      if (diagnostics) Object.assign(result, { tokenSymbols, routeCounts, phoneCounts, rawTraceCount, stressMarksTrimmed });
      return result;
    },
  });
}

export async function auditFixture(spans, frontend, rawEspeak, expected) {
  if (!Array.isArray(spans) || spans.length !== expected.spans) throw new Error(`Malayalam frontend audit requires ${expected.spans} ordered spans`);
  const normalizedRows = [], tokenRows = [], combinedRows = [], phoneCounts = Object.create(null), routeCounts = Object.create(null);
  let maxTokens = 0, rawTraceCount = 0, stressMarksTrimmed = 0;
  for (let id = 0; id < spans.length; id++) {
    const span = spans[id];
    if (!span || span.id !== id || typeof span.text !== 'string' || !span.text.trim()) throw new Error(`Invalid/reordered Malayalam fixture span ${id}`);
    const result = await frontend.phonemize(span.text, rawEspeak, id, true);
    normalizedRows.push([id, result.normalized]);
    tokenRows.push([id, result.ids]);
    combinedRows.push([id, result.normalized, result.ids]);
    maxTokens = Math.max(maxTokens, result.ids.length);
    rawTraceCount += result.rawTraceCount;
    stressMarksTrimmed += result.stressMarksTrimmed;
    for (const [phone, count] of Object.entries(result.phoneCounts)) phoneCounts[phone] = (phoneCounts[phone] ?? 0) + count;
    for (const [route, count] of Object.entries(result.routeCounts)) routeCounts[route] = (routeCounts[route] ?? 0) + count;
  }
  const audit = {
    spans: spans.length,
    rawTraceCount,
    utterances: tokenRows.length,
    maximumTokens: maxTokens,
    unknownPhones: 0,
    fallbackPhones: 0,
    stressMarksTrimmed,
    stressNonZeroSentToGraph: 0,
    normalizedTextSha256: await sha256(JSON.stringify(normalizedRows)),
    tokenIdsSha256: await sha256(JSON.stringify(tokenRows)),
    combinedSha256: await sha256(JSON.stringify(combinedRows)),
    routeCounts,
    uniquePhones: Object.keys(phoneCounts).length,
    mergedPhoneEmissions: routeCounts['published-merge'] ?? 0,
    phoneCounts,
  };
  for (const key of ['spans', 'rawTraceCount', 'utterances', 'maximumTokens', 'unknownPhones', 'fallbackPhones', 'normalizedTextSha256', 'tokenIdsSha256', 'combinedSha256', 'uniquePhones', 'mergedPhoneEmissions']) {
    if (audit[key] !== expected[key]) throw new Error(`Malayalam frontend audit mismatch in ${key}: ${audit[key]} !== ${expected[key]}`);
  }
  return audit;
}
