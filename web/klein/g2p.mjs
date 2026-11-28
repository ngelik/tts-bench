// Modified from @kleinml/kleintts 0.2.0 src/g2p.js under Apache-2.0. Changes:
// Load the English lexicon and both WebAssembly frontends from pinned local
// assets. The English browser phonemizer omits eSpeak's optional tie marks.
import { phonemize as browserEspeak } from '/runtimes/phonemizer/1.2.1/phonemizer.js';

const LEXICON_URL = '/models/klein-tts-x1.5-pro/en_us_lexicon.json.gz';
const ESPEAK_ROOT = '/runtimes/espeak-ng/npm-1.0.2/';

const PRIMARY = "ˈ";
const SECONDARY = "ˌ";
const STRESSES = PRIMARY + SECONDARY;
const VOWELS = new Set("AIOQWYaiuæɑɒɔəɛɜɪʊʌᵻ");
const US_TAUS = new Set("AIOWYiuæɑəɛɪɹʊʌ");
const PUNCT = new Set(";:,.!?—…\"“”");
const SYMBOLS = { "%": "percent", "&": "and", "+": "plus", "@": "at" };

// ------------------------------------------------------------------------------------------------ espeak -> misaki
const EN_E2M = Object.entries({
  "ʔˌn̩": "tn", "ʔn̩": "tn", "ʔn": "tn", "ʔ": "t",
  "a^ɪ": "I", "aɪ": "I", "a^ʊ": "W", "aʊ": "W",
  "d^ʒ": "ʤ", "dʒ": "ʤ",
  "e^ɪ": "A", "eɪ": "A", "e": "A",
  "t^ʃ": "ʧ", "tʃ": "ʧ",
  "ɔ^ɪ": "Y", "ɔɪ": "Y",
  "ə^l": "ᵊl",
  "ʲo": "jo", "ʲə": "jə", "ʲ": "",
  "ɚ": "əɹ",
  "r": "ɹ",
  "x": "k", "ç": "k",
  "ɐ": "ə",
  "ɬ": "l",
  "̃": "",
}).sort((a, b) => b[0].length - a[0].length);

const OTHER_E2M = Object.entries({
  "a^ɪ": "I", "aɪ": "I", "a^ʊ": "W", "aʊ": "W",
  "d^z": "ʣ", "d^ʒ": "ʤ", "dʒ": "ʤ",
  "e^ɪ": "A", "eɪ": "A",
  "o^ʊ": "O", "oʊ": "O", "ə^ʊ": "Q", "əʊ": "Q",
  "s^s": "S",
  "t^s": "ʦ", "t^ʃ": "ʧ", "tʃ": "ʧ",
  "ɔ^ɪ": "Y",
}).sort((a, b) => (a[0] < b[0] ? -1 : 1)); // misaki applies these in sorted order

const replaceAll = (s, pairs) => pairs.reduce((acc, [a, b]) => acc.split(a).join(b), s);

function enFromEspeak(ps) {
  ps = replaceAll(ps.trim(), EN_E2M);
  ps = ps.replace(/(\S)̩/gu, "ᵊ$1").split("̩").join("");
  ps = ps.split("o^ʊ").join("O").split("oʊ").join("O").split("ɜːɹ").join("ɜɹ").split("ɜː").join("ɜɹ").split("ɪə").join("iə").split("ː").join("");
  ps = ps.split("o").join("ɔ");
  return ps.split("^").join("");
}

// ------------------------------------------------------------------------------------------------ English lexicon
let LEX = null;
let lexiconPromise = null;
async function loadLexicon() {
  if (LEX) return LEX;
  if (!lexiconPromise) lexiconPromise = (async () => {
    if (typeof DecompressionStream !== 'function') throw new Error('Klein browser G2P requires gzip decompression support.');
    const response = await fetch(LEXICON_URL);
    if (!response.ok) throw new Error(`Klein English lexicon fetch failed: HTTP ${response.status}`);
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    LEX = JSON.parse(await new Response(stream).text());
    if (!LEX?.gold || !LEX?.silver) throw new Error('Klein English lexicon has an unexpected schema.');
    return LEX;
  })();
  return lexiconPromise;
}

function lexicon() {
  if (!LEX) throw new Error('Klein English lexicon is not loaded.');
  return LEX;
}

async function espeakIPA(text, voice) {
  const lines = await browserEspeak(text, voice);
  return lines.map(line => String(line).trim()).filter(Boolean);
}

let multilingualEspeak;
async function multilingualIPA(text, voice) {
  multilingualEspeak ??= Promise.all([
    import(ESPEAK_ROOT + 'espeak-ng.js'),
    WebAssembly.compileStreaming(fetch(ESPEAK_ROOT + 'espeak-ng.wasm')),
  ]);
  const [{ default: createEspeak }, compiled] = await multilingualEspeak;
  const engine = await createEspeak({
    arguments: ['--phonout', 'out', '-q', '--ipa', '--tie=^', '-v', voice, text],
    instantiateWasm(imports, receive) {
      const instance = new WebAssembly.Instance(compiled, imports);
      receive(instance, compiled);
      return instance.exports;
    },
    print() {},
    printErr() {},
  });
  return engine.FS.readFile('out', { encoding: 'utf8' }).split('\n').map(line => line.trim()).filter(Boolean);
}

function restress(ps) {
  const chars = [...ps];
  const items = chars.map((c, i) => [i, c]);
  for (let i = 0; i < chars.length; i++) {
    if (STRESSES.includes(chars[i])) {
      const j = chars.findIndex((c, k) => k >= i && VOWELS.has(c));
      if (j >= 0) items[i] = [j - 0.5, chars[i]];
    }
  }
  return items.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join("");
}

function applyStress(ps, stress) {
  if (ps == null || stress == null) return ps;
  const has = (s) => ps.includes(s);
  const noStress = !has(PRIMARY) && !has(SECONDARY);
  const noVowel = ![...ps].some((c) => VOWELS.has(c));
  if (stress < -1) return ps.split(PRIMARY).join("").split(SECONDARY).join("");
  if (stress === -1 || ((stress === 0 || stress === -0.5) && has(PRIMARY)))
    return ps.split(SECONDARY).join("").split(PRIMARY).join(SECONDARY);
  if ([0, 0.5, 1].includes(stress) && noStress) return noVowel ? ps : restress(SECONDARY + ps);
  if (stress >= 1 && !has(PRIMARY) && has(SECONDARY)) return ps.split(SECONDARY).join(PRIMARY);
  if (stress > 1 && noStress) return noVowel ? ps : restress(PRIMARY + ps);
  return ps;
}

const isAlpha = (w) => /^[A-Za-z]+$/.test(w);
const LEX_CHARS = /^[A-Za-z'-]+$/;

function isKnown(word) {
  const { gold, silver } = lexicon();
  if (word in gold || word in SYMBOLS || word in silver) return true;
  if (!isAlpha(word) || !LEX_CHARS.test(word)) return false;
  if (word.length === 1) return true;
  if (word === word.toUpperCase() && word.toLowerCase() in gold) return true;
  return word.slice(1) === word.slice(1).toUpperCase();
}

function getNNP(word) {
  const { gold } = lexicon();
  const parts = [...word].filter((c) => /[A-Za-z]/.test(c)).map((c) => gold[c.toUpperCase()]);
  if (parts.some((p) => p == null || typeof p !== "string")) return null;
  const ps = applyStress(parts.join(""), 0);
  const k = ps.lastIndexOf(SECONDARY);
  return k < 0 ? ps : ps.slice(0, k) + PRIMARY + ps.slice(k + 1);
}

function lookup(word, stress, futureVowel) {
  const { gold, silver } = lexicon();
  let isNNP = false;
  if (word === word.toUpperCase() && !(word in gold)) {
    word = word.toLowerCase();
    isNNP = false;
  }
  let ps = gold[word];
  if (ps == null && !isNNP) ps = silver[word];
  if (ps != null && typeof ps === "object") {
    if (futureVowel === null && "None" in ps) ps = ps.None;
    else ps = ps.DEFAULT;
  }
  if (ps == null) {
    const n = getNNP(word);
    if (n != null) return n;
  }
  return applyStress(ps, stress);
}

function suffixS(stem) {
  if (!stem) return null;
  const last = stem.at(-1);
  if ("ptkfθ".includes(last)) return stem + "s";
  if ("szʃʒʧʤ".includes(last)) return stem + "ᵻz";
  return stem + "z";
}

function suffixEd(stem) {
  if (!stem) return null;
  const last = stem.at(-1);
  if ("pkfθʃsʧ".includes(last)) return stem + "t";
  if (last === "d") return stem + "ᵻd";
  if (last !== "t") return stem + "d";
  if (stem.length < 2) return stem + "ɪd";
  if (US_TAUS.has(stem.at(-2))) return stem.slice(0, -1) + "ɾᵻd";
  return stem + "ᵻd";
}

function suffixIng(stem) {
  if (!stem) return null;
  if (stem.length > 1 && stem.at(-1) === "t" && US_TAUS.has(stem.at(-2))) return stem.slice(0, -1) + "ɾɪŋ";
  return stem + "ɪŋ";
}

function specialCase(word, futureVowel) {
  const { gold } = lexicon();
  if (word in SYMBOLS) return lookup(SYMBOLS[word], null, futureVowel);
  if (word === "a") return "ɐ";
  if (word === "an" || word === "An") return "ɐn";
  if (word === "I") return SECONDARY + "I";
  if (word === "to" || word === "To") return futureVowel == null ? gold.to : futureVowel ? "tʊ" : "tə";
  if (word === "the" || word === "The") return futureVowel === true ? "ði" : "ðə";
  if (word === "am" || word === "Am") return futureVowel == null ? gold.am : "ɐm";
  return null;
}

/** Phonemes for one English word, or null if it needs the espeak fallback. */
function enWord(word, futureVowel) {
  let ps = specialCase(word, futureVowel);
  if (ps != null) return ps;
  if (isKnown(word)) return lookup(word, null, futureVowel);
  if (word.endsWith("s'") && isKnown(word.slice(0, -2) + "'s")) return lookup(word.slice(0, -2) + "'s", null, futureVowel);
  if (word.endsWith("'") && isKnown(word.slice(0, -1))) return lookup(word.slice(0, -1), null, futureVowel);
  // -s
  let stem = null;
  if (word.length > 2 && word.endsWith("s") && !word.endsWith("ss") && isKnown(word.slice(0, -1))) stem = word.slice(0, -1);
  else if ((word.endsWith("'s") || (word.length > 4 && word.endsWith("es"))) && isKnown(word.slice(0, -2))) stem = word.slice(0, -2);
  else if (word.length > 4 && word.endsWith("ies") && isKnown(word.slice(0, -3) + "y")) stem = word.slice(0, -3) + "y";
  if (stem) return suffixS(lookup(stem, null, futureVowel));
  // -ed
  stem = null;
  if (word.endsWith("d") && !word.endsWith("dd") && isKnown(word.slice(0, -1))) stem = word.slice(0, -1);
  else if (word.endsWith("ed") && !word.endsWith("eed") && isKnown(word.slice(0, -2))) stem = word.slice(0, -2);
  if (stem) return suffixEd(lookup(stem, null, futureVowel));
  // -ing
  stem = null;
  if (word.endsWith("ing") && isKnown(word.slice(0, -3))) stem = word.slice(0, -3);
  else if (word.endsWith("ing") && isKnown(word.slice(0, -3) + "e")) stem = word.slice(0, -3) + "e";
  else if (/([bcdgklmnprstvxz])\1ing$|cking$/.test(word) && isKnown(word.slice(0, -4))) stem = word.slice(0, -4);
  if (stem) return suffixIng(lookup(stem, 0.5, futureVowel));
  // lower-cased sentence-initial / title-case words
  if (word !== word.toLowerCase() && word.slice(1) === word.slice(1).toLowerCase()) {
    const low = word.toLowerCase();
    if (low in lexicon().gold || low in lexicon().silver) return lookup(low, null, futureVowel);
  }
  return null;
}

// words (with inner apostrophes / hyphens), numbers, punctuation, anything else
const TOKEN_RE = /[A-Za-z]+(?:['][A-Za-z]+)*'?(?:-[A-Za-z]+(?:['][A-Za-z]+)*'?)*|\d+(?:[.,]\d+)*(?:st|nd|rd|th|s)?|[;:,.!?—…"“”]|\S/gu;
const CONSONANTS = new Set("bdfhjklmnpstvwzðŋɡɹɾʃʒʤʧθ");
const CLAUSE_PUNCT = new Set(";:,.!?—…");

/** misaki's look-ahead: does the next sound start with a vowel (true/false), or is there a clause break (null)? */
function nextVowel(ps, current) {
  if (!ps) return current;
  for (const c of ps) {
    if (CLAUSE_PUNCT.has(c)) return null;
    if (VOWELS.has(c)) return true;
    if (CONSONANTS.has(c)) return false;
  }
  return current;
}

function capStress(word) {
  if (word === word.toLowerCase()) return null;
  return word === word.toUpperCase() && word.length > 1 ? 2 : 0.5;
}

/** One dictionary word in context (null -> needs espeak). */
function enWordCtx(word, fv) {
  if (/^vs\.?$/i.test(word)) return lookup("versus", null, fv);
  if (word === "A") return "ɐ";
  const stress = capStress(word);
  let ps = specialCase(word, fv);
  if (ps != null) return ps;
  ps = enWord(word, fv);
  if (ps == null && word !== word.toLowerCase()) ps = enWord(word.toLowerCase(), fv);
  return ps == null ? null : applyStress(ps, stress);
}

/** A hyphenated compound: parts joined without spaces, then misaki's stress demotion. */
function compound(parts) {
  const tagged = parts.map((ps, i) => ({ ps, i }));
  const withPs = tagged.filter((t) => t.ps);
  const primaries = withPs.filter((t) => t.ps.includes(PRIMARY)).length;
  if (withPs.length >= 2 && primaries > Math.floor((withPs.length + 1) / 2)) {
    const order = [...withPs].sort((a, b) =>
      (a.ps.includes(PRIMARY) - b.ps.includes(PRIMARY)) || (a.ps.length - b.ps.length) || (a.i - b.i));
    for (const t of order.slice(0, Math.floor(withPs.length / 2))) t.ps = applyStress(t.ps, -0.5);
  }
  return tagged.map((t) => t.ps || "").join("");
}

async function englishG2P(text) {
  await loadLexicon();
  text = text.replace(/[’‘]/g, "'");
  let open = true;
  const toks = (text.match(TOKEN_RE) || []).map((t) => {
    if (t === '"') { t = open ? "“" : "”"; open = !open; }
    return { t };
  });
  // espeak for everything the dictionary can't do (numbers, unknown words); context does not matter for these
  const unknown = [];
  for (const tok of toks) {
    if (PUNCT.has(tok.t)) { tok.punct = true; continue; }
    const parts = /^[A-Za-z]/.test(tok.t) ? tok.t.split("-") : [tok.t];
    tok.parts = parts.map((w) => ({ w, ps: /^[A-Za-z']+$/.test(w) ? enWordCtx(w, false) : null }));
    for (const p of tok.parts) if (p.ps == null && /[A-Za-z0-9]/.test(p.w)) unknown.push(p);
    if (!tok.parts.some((p) => /[A-Za-z0-9]/.test(p.w))) tok.skip = true;
  }
  if (unknown.length) {
    let lines = await espeakIPA(unknown.map(u => u.w).join(', '), 'en-us');
    if (lines.length !== unknown.length) lines = await Promise.all(unknown.map(async u => (await espeakIPA(u.w, 'en-us')).join(' ')));
    unknown.forEach((u, i) => { u.ps = enFromEspeak(lines[i] || ""); u.fallback = true; });
  }
  // right to left, as misaki: each word sees whether the next sound is a vowel or a clause break
  let fv = null;
  for (let i = toks.length - 1; i >= 0; i--) {
    const tok = toks[i];
    if (tok.skip) continue;
    if (tok.punct) { fv = nextVowel(tok.t, fv); tok.ps = tok.t; continue; }
    for (let k = tok.parts.length - 1; k >= 0; k--) {
      const p = tok.parts[k];
      if (!p.fallback && /^[A-Za-z']+$/.test(p.w)) p.ps = enWordCtx(p.w, fv) ?? p.ps;
    }
    tok.ps = compound(tok.parts.map((p) => p.ps));
    fv = nextVowel(tok.ps, fv);
  }
  // join: spaces between words, punctuation on the previous word, a space before an opening quote
  let out = "";
  let glue = false;
  for (const tok of toks) {
    if (tok.skip || !tok.ps) continue;
    if (tok.t === "“") { out += (out ? " " : "") + "“"; glue = true; continue; }
    if (tok.punct) { out += tok.ps; continue; }
    out += (out && !glue ? " " : "") + tok.ps;
    glue = false;
  }
  return out.trim();
}

// ------------------------------------------------------------------------------------------------ espeak languages
const CLAUSE_RE = /([^;:,.!?—…]+)([;:,.!?—…]*)/gu;

async function espeakG2P(text, voice) {
  text = text.replace(/«/g, "“").replace(/»/g, "”").replace(/[()]/g, ",");
  const clauses = [...text.matchAll(CLAUSE_RE)].map((m) => ({ words: m[1].trim(), punct: m[2] })).filter((c) => c.words);
  let lines = await multilingualIPA(clauses.map(c => c.words + (c.punct || ',')).join(' '), voice);
  if (lines.length !== clauses.length) {
    lines = [];
    for (const { words } of clauses) lines.push((await multilingualIPA(words, voice)).join(' '));
  }
  return clauses
    .map((clause, index) => {
      if (!lines[index] && /[\p{L}\p{N}]/u.test(clause.words)) {
        throw new Error('eSpeak produced no phones for a clause containing spoken text.');
      }
      let ipa = replaceAll(lines[index], OTHER_E2M).split("^").join("").split("-").join("");
      // eSpeak marks the d in the loanword “Hardware” as dental. Klein
      // encodes its base /d/ but has no token for this place diacritic.
      if (voice === 'it') ipa = ipa.replaceAll('d̪', 'd');
      return ipa + clause.punct;
    })
    .join(" ")
    .trim();
}

// ------------------------------------------------------------------------------------------------ public
export const LANGUAGES = { en: "en-us", fr: "fr-fr", it: "it", es: "es" };

/** Phonemes for `text` in `lang` ("en", "fr", "it", "es"). */
export async function phonemize(text, lang = "en") {
  if (!(lang in LANGUAGES)) throw new Error(`unsupported language "${lang}" (use one of ${Object.keys(LANGUAGES).join(", ")})`);
  return lang === "en" ? englishG2P(text) : espeakG2P(text, LANGUAGES[lang]);
}
