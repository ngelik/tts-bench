// Apptor Standard German browser frontend, adapted from the author's Apache-2.0 browser source.
// Austrian conditioning and phonetic rules are deliberately removed for this profile.
// `ort` is onnxruntime-web (browser) or onnxruntime-node (tests), passed in by the caller.

// ------------------------------------------------------------------ German numbers (like num2words "de")
const ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf",
  "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

function below100(n, final) {
  if (n < 20) return n === 1 ? (final ? "eins" : "ein") : ONES[n];
  const u = n % 10, t = Math.floor(n / 10);
  return (u ? (u === 1 ? "ein" : ONES[u]) + "und" : "") + TENS[t];
}

function below1000(n, final) {
  const h = Math.floor(n / 100), r = n % 100;
  return (h ? (h === 1 ? "ein" : ONES[h]) + "hundert" : "") + (r ? below100(r, final) : "");
}

function below1e6(n) {
  const t = Math.floor(n / 1000), r = n % 1000;
  return (t ? below1000(t, false) + "tausend" : "") + (r ? below1000(r, true) : "");
}

export function cardinal(value) {
  let n = BigInt(value);
  if (n === 0n) return "null";
  const parts = [];
  const big = [[10n ** 12n, "Billion", "Billionen"], [10n ** 9n, "Milliarde", "Milliarden"], [10n ** 6n, "Million", "Millionen"]];
  for (const [unit, one, many] of big) {
    if (n >= unit) {
      const k = n / unit;
      n %= unit;
      parts.push(k === 1n ? `eine ${one}` : `${cardinal(k)} ${many}`);
    }
  }
  if (n > 0n) parts.push(below1e6(Number(n)));
  return parts.join(" ");
}

export function ordinal(value) {
  // used for days of the month (1-31); larger numbers follow the same rule
  const n = Number(value);
  const word = cardinal(n), last = n % 100;
  if (last === 0 || last >= 20) return word + "ste";
  for (const [end, repl] of [["eins", "erste"], ["drei", "dritte"], ["sieben", "siebte"], ["acht", "achte"]])
    if (word.endsWith(end) && !word.endsWith("zehn")) return word.slice(0, -end.length) + repl;
  return word + "te";
}

export function year(value) {
  const n = Number(value);
  const h = Math.floor(n / 100), r = n % 100;
  return below100(h, true) + "hundert" + (r ? below100(r, true) : "");
}

// ------------------------------------------------------------------ text normalisation (tiny_voca normalize_de/text)
const W = "[\\p{L}\\p{N}_]";            // Python's \w (Unicode)
const B0 = `(?<!${W})`, B1 = `(?!${W})`; // Python's \b at the start / end of a word

const QUOTES = {"‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'", "“": '"', "”": '"', "„": '"', "‟": '"',
  "«": '"', "»": '"', "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")"};

export function normalizeText(text) {
  text = text.normalize("NFKC").replace(/./gsu, c => QUOTES[c] ?? c);
  text = text.replace(/\.{3,}/g, "…");
  text = text.replace(/-{2,}|\s-\s/g, "—");
  return text.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- mathematics read aloud (math_de.py)
// formulas, LaTeX and symbols -> words, on the raw text: "ζ(s) = 1/2" -> "Zeta von ess gleich ein halb"
const M_GREEK = {alpha: "Alpha", beta: "Beta", gamma: "Gamma", delta: "Delta", epsilon: "Epsilon", varepsilon: "Epsilon",
  zeta: "Zeta", eta: "Eta", theta: "Theta", vartheta: "Theta", iota: "Iota", kappa: "Kappa", lambda: "Lambda", mu: "Mü",
  nu: "Nü", xi: "Xi", omicron: "Omikron", pi: "Pi", rho: "Rho", sigma: "Sigma", tau: "Tau", upsilon: "Ypsilon",
  phi: "Phi", varphi: "Phi", chi: "Chi", psi: "Psi", omega: "Omega"};
const M_GREEK_CHARS = Object.fromEntries([..."αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩϑϕϵ"].map((c, i) => [c, [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi",
  "omicron", "pi", "rho", "sigma", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega", "gamma", "delta", "theta",
  "lambda", "xi", "pi", "sigma", "phi", "psi", "omega", "theta", "phi", "epsilon"][i]]));
const M_WORDS = {
  "\\infty": "unendlich", "∞": "unendlich", "\\to": "gegen", "\\rightarrow": "gegen", "→": "gegen",
  "\\Rightarrow": "daraus folgt", "⇒": "daraus folgt", "\\Leftrightarrow": "genau dann wenn", "⇔": "genau dann wenn",
  "\\cdot": "mal", "·": "mal", "⋅": "mal", "\\times": "mal", "×": "mal", "\\div": "durch", "÷": "durch",
  "\\leq": "kleiner gleich", "\\le": "kleiner gleich", "≤": "kleiner gleich",
  "\\geq": "größer gleich", "\\ge": "größer gleich", "≥": "größer gleich",
  "\\neq": "ungleich", "\\ne": "ungleich", "≠": "ungleich", "\\approx": "ungefähr", "≈": "ungefähr",
  "\\equiv": "identisch", "≡": "identisch", "\\sim": "ungefähr", "\\pm": "plus minus", "±": "plus minus",
  "\\in": "Element von", "∈": "Element von", "\\notin": "nicht Element von", "∉": "nicht Element von",
  "\\subset": "Teilmenge von", "⊂": "Teilmenge von", "\\cup": "vereinigt mit", "∪": "vereinigt mit",
  "\\cap": "geschnitten mit", "∩": "geschnitten mit", "\\forall": "für alle", "∀": "für alle",
  "\\exists": "es gibt", "∃": "es gibt", "\\partial": "d", "∂": "d", "\\nabla": "Nabla",
  "\\ldots": "und so weiter", "\\dots": "und so weiter", "\\cdots": "und so weiter", "…": "und so weiter",
  "\\mathbb{N}": "die natürlichen Zahlen", "ℕ": "die natürlichen Zahlen", "\\mathbb{Z}": "die ganzen Zahlen",
  "ℤ": "die ganzen Zahlen", "\\mathbb{Q}": "die rationalen Zahlen", "ℚ": "die rationalen Zahlen",
  "\\mathbb{R}": "die reellen Zahlen", "ℝ": "die reellen Zahlen", "\\mathbb{C}": "die komplexen Zahlen",
  "ℂ": "die komplexen Zahlen", "\\Re": "Realteil", "\\Im": "Imaginärteil", "\\ln": "Logarithmus naturalis",
  "\\log": "Logarithmus", "\\exp": "e hoch", "\\sin": "Sinus", "\\cos": "Kosinus", "\\tan": "Tangens",
  "\\lim": "Limes", "\\max": "Maximum", "\\min": "Minimum", "\\gcd": "größter gemeinsamer Teiler", "√": "Wurzel aus",
  "∑": "Summe", "∏": "Produkt", "∫": "Integral", "−": "-", "≪": "viel kleiner als", "≫": "viel größer als"};
const M_WORDS_SORTED = Object.entries(M_WORDS).sort((a, b) => b[0].length - a[0].length);
const M_BIG = {sum: "Summe", prod: "Produkt", int: "Integral", lim: "Limes"};
const M_FUNCS = {Re: "Realteil", Im: "Imaginärteil", ln: "Logarithmus naturalis", log: "Logarithmus", exp: "e hoch",
  sin: "Sinus", cos: "Kosinus", tan: "Tangens", li: "Integrallogarithmus", Li: "Integrallogarithmus"};
const M_FRACTIONS = {"1/2": "ein halb", "1/3": "ein Drittel", "2/3": "zwei Drittel", "1/4": "ein Viertel",
  "3/4": "drei Viertel", "1/5": "ein Fünftel", "1/8": "ein Achtel", "1/10": "ein Zehntel"};
const M_LETTERS = {a: "a", b: "be", c: "ze", d: "de", e: "e", f: "eff", g: "ge", h: "ha", i: "i", j: "jott", k: "ka",
  l: "ell", m: "emm", n: "enn", o: "o", p: "pe", q: "ku", r: "err", s: "ess", t: "te", u: "u", v: "vau", w: "we",
  x: "iks", y: "üpsilon", z: "zett"};
const M_SUPER = Object.fromEntries([..."⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱ"].map((c, i) => [c, "0123456789+-ni"[i]]));
const M_SUB = Object.fromEntries([..."₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢ"].map((c, i) => [c, "0123456789+-ni"[i]]));
const M_ARG = "\\{((?:[^{}]|\\{[^{}]*\\})*)\\}";
const M_OPERAND = `(?:(?<=\\d)|(?<=\\))|(?<=(?<!${W})[A-Za-z]))`;
const M_TRIGGER = new RegExp(`[\\\\^_=+<>/$∑∏∫√∞≤≥≠≈±·×÷→⇒∈ℕℤℚℝℂ⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉${Object.keys(M_GREEK_CHARS).join("")}]`, "u");
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const R = (p, f = "gu") => new RegExp(p, f);

function mFraction(a, b) {
  a = a.trim(); b = b.trim();
  if (/^\d+$/.test(a) && /^\d+$/.test(b) && M_FRACTIONS[`${Number(a)}/${Number(b)}`]) return ` ${M_FRACTIONS[`${Number(a)}/${Number(b)}`]} `;
  const simple = x => /^[^\s+\-]+$/u.test(x);
  return ` ${simple(a) ? a : "( " + a + " )"} durch ${simple(b) ? b : "( " + b + " )"} `;
}

function mLatex(t) {
  t = t.replace(R(`\\\\(?:text|mathrm|mathit|operatorname|mathbf|textbf)\\s*${M_ARG}`), " $1 ");
  t = t.replace(R(`\\\\(?:left|right|big|Big|bigg|Bigg)(?![A-Za-z])\\s*`), "");
  t = t.replace(/\\[,;:!]|\\quad|\\qquad|~/g, " ");
  for (let k = 0; k < 3; k++) {
    t = t.replace(R(`\\\\[dt]?frac\\s*${M_ARG}\\s*${M_ARG}`), (_, a, b) => mFraction(a, b));
    t = t.replace(R(`\\\\sqrt\\s*\\[([^\\]]+)\\]\\s*${M_ARG}`), " $1-te Wurzel aus ( $2 ) ");
    t = t.replace(R(`\\\\sqrt\\s*${M_ARG}`), " Wurzel aus ( $1 ) ");
  }
  const lim = "(?:_\\s*(?:\\{([^{}]*)\\}|(\\S))\\s*)?(?:\\^\\s*(?:\\{([^{}]*)\\}|(\\S))\\s*)?";
  t = t.replace(R(`\\\\(sum|prod|int|lim)(?![A-Za-z])\\s*${lim}`), (_, cmd, l1, l2, h1, h2) => {
    const name = M_BIG[cmd], low = l1 || l2, high = h1 || h2;
    if (cmd === "lim") return low ? ` ${name} für ${low} ` : ` ${name} `;
    return ` ${name}` + (low ? ` von ${low}` : "") + (high ? ` bis ${high}` : "") + " über ";
  });
  for (const [cmd, word] of M_WORDS_SORTED) if (cmd.startsWith("\\")) t = t.replace(R(reEsc(cmd) + "(?![A-Za-z])"), ` ${word} `);
  return t.replace(/\\([A-Za-z]+)/g, (_, n) => ` ${M_GREEK[n] ?? n} `);
}

function mPower(base, e1, e2) {
  const exp = (e1 ?? e2).trim();
  if (exp === "2") return `${base} Quadrat`;
  if (exp === "3") return `${base} hoch drei`;
  return `${base} hoch ${exp}` + (exp.split(/\s+/).filter(Boolean).length <= 2 ? " " : " Ende Exponent ");
}

export function speakMath(text) {
  if (!M_TRIGGER.test(text)) return text;
  let t = text;
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => " " + mLatex(m) + " ");
  t = t.replace(R(`(?<![\\p{L}\\p{N}_$])\\$([^$\\n]{1,300}?)\\$(?!\\d)`), (_, m) => " " + mLatex(m) + " ");
  t = t.replace(/\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g, (_, a, b) => " " + mLatex(a ?? b) + " ");
  if (t.includes("\\")) t = mLatex(t);
  t = [...t].map(c => M_GREEK_CHARS[c] ? ` ${M_GREEK[M_GREEK_CHARS[c]]} ` : c).join("");
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱ]+/g, m => "^{" + [...m].map(c => M_SUPER[c]).join("") + "}");
  t = t.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢ]+/g, m => "_{" + [...m].map(c => M_SUB[c]).join("") + "}");
  for (const [sym, word] of M_WORDS_SORTED) if (!sym.startsWith("\\")) t = t.split(sym).join(` ${word} `);
  t = t.replace(R(`(${W}|\\))\\s*\\^\\s*(?:\\{([^{}]*)\\}|(-?${W}+))`), (_, b, e1, e2) => mPower(b, e1, e2));
  t = t.replace(R(`(?<=${W})_\\s*(?:\\{([^{}]*)\\}|(${W}))`), (_, a, b) => " " + (a ?? b) + " ");
  const names = [...Object.values(M_GREEK), ...Object.keys(M_FUNCS)].sort((a, b) => b.length - a.length).join("|");
  t = t.replace(R(`(?<!${W})(?:(${names})\\s*|([A-Za-z]))\\(([^()]{1,40})\\)`),
    (_, n1, n2, arg) => `${M_FUNCS[n1 || n2] ?? (n1 || n2)} von ${arg}`);
  t = t.replace(R(`(?<![\\p{L}\\p{N}_\\\\])(log|ln|sin|cos|tan|exp)(?!${W})`), (_, f) => M_FUNCS[f]);
  if (t.includes("Integral")) t = t.replace(R(`(?<!${W})d([a-z])(?!${W})`), "de $1");
  t = t.replace(/(?<![\d/])24\s*\/\s*7(?![\d/])/g, "vierundzwanzig sieben");
  t = t.replace(R(`(?:(?<=\\d)|(?<=(?<!${W})[A-Za-z]))!(?=\\s|$|[.,;:)])`), " Fakultät");
  t = t.replace(R(`(?<=[\\d\\s])([+-])\\s*i([a-z])(?!${W})`), " $1 i mal $2");
  t = t.replace(/(?<![\d/])(\d+)\s*\/\s*(\d+)(?![\d/])/g,
    (_, a, b) => M_FRACTIONS[`${Number(a)}/${Number(b)}`] ? ` ${M_FRACTIONS[`${Number(a)}/${Number(b)}`]} ` : ` ${a} durch ${b} `);
  t = t.replace(R(`${M_OPERAND}\\s*/\\s*(?=${W}|\\()`), " durch ");
  t = t.replace(/\s*=\s*/g, " gleich ");
  t = t.replace(R(`(?<=${W}|\\))\\s*\\+\\s*(?=${W}|\\()`), " plus ");
  t = t.replace(R(`(?<=[\\s(])\\+(?=${W})`), " plus ");
  t = t.replace(R(`${M_OPERAND}\\s*-\\s*(?=${W}|\\()(?![A-Za-zÄÖÜäöüß]{2})`), " minus ");
  t = t.replace(R(`${M_OPERAND}\\s*\\*\\s*(?=${W}|\\()`), " mal ");
  t = t.replace(R(`(?<=${W}|\\))\\s*<\\s*(?=${W}|[(-])`), " kleiner als ");
  t = t.replace(R(`(?<=${W}|\\))\\s*>\\s*(?=${W}|[(-])`), " größer als ");
  t = t.replace(R(`(?<=[\\s(])-(?=[A-Za-z](?!${W}))`), "minus ");
  t = t.replace(R(`\\(\\s*([^()]*?${B0}(?:plus|minus|mal|durch|hoch)${B1}[^()]*?)\\s*\\)`), " Klammer auf $1 Klammer zu ");
  t = t.replace(/[{}]/g, " ");
  t = t.replace(R(`(?<![\\p{L}\\p{N}_.\\-'])([A-Za-z])(?![\\p{L}\\p{N}_\\-']|\\.${W})`), (_, c) => M_LETTERS[c.toLowerCase()]);
  t = t.replace(/[ \t]+/g, " ");
  return t.replace(/ ([.,;:!?])/g, "$1").trim();
}

// abbreviations, then the formulas - on the raw text, before quotes and brackets are unified (normalize_de.prepare)
export function makePrepare(F) {
  return function prepare(text) {
    for (const [short, long] of F.abbreviations) text = text.split(short).join(long);
    return speakMath(text);
  };
}

export function makeNormalizeGerman(F) {
  const months = F.months.join("|");
  const time = (h, m) => (Number(h) === 1 ? "ein Uhr" : `${cardinal(h)} Uhr`) + (Number(m) ? ` ${cardinal(m)}` : "");
  const dative = new Set(["am", "vom", "zum", "im", "ab dem", "bis zum", "seit dem", "dem", "den"]);
  return function normalizeGerman(text) {
    for (const [short, long] of F.abbreviations) text = text.split(short).join(long);
    text = text.replace(new RegExp(`${B0}(\\d{1,2}):(\\d{2})\\s*Uhr${B1}`, "gu"), (_, h, m) => time(h, m));
    text = text.replace(new RegExp(`${B0}(\\d{1,2}):(\\d{2})${B1}`, "gu"), (_, h, m) => time(h, m));
    text = text.replace(new RegExp(`${B0}(\\d+),(\\d{2})\\s*Euro${B1}`, "gu"),
      (_, e, c) => `${cardinal(e)} Euro` + (Number(c) ? ` ${cardinal(c)}` : ""));
    text = text.replace(new RegExp(`${B0}((?:[Aa]m|[Vv]om|[Zz]um|[Bb]is zum|[Ss]eit dem|[Aa]b dem) )?(\\d{1,2})\\. (${months})${B1}`, "gu"),
      (_, prefix, d, month) => {
        prefix = prefix || "";
        let word = ordinal(d);
        if (dative.has(prefix.trim().toLowerCase())) word += "n";
        return `${prefix}${word} ${month}`;
      });
    text = text.replace(new RegExp(`${B0}(1[1-9]\\d\\d)${B1}`, "gu"), (_, y) => year(y));
    text = text.replace(/(\d+),(\d+)/g, (_, a, b) => `${cardinal(a)} Komma ${[...b].map(cardinal).join(" ")}`);
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_-])-(\\d+)`, "gu"), (_, d) => "minus " + d);
    text = text.replace(/\d+/g, d => cardinal(d));
    text = text.replace(new RegExp(`${B0}ein(hundert|tausend)`, "gu"), "$1");
    return text.replace(/\s+/g, " ").trim();
  };
}

const isDigit = c => /\p{N}/u.test(c);
const isAlpha = c => /\p{L}/u.test(c);
const isAlnum = c => /[\p{L}\p{N}]/u.test(c);

export function makeChunks(F) {
  const punct = new Set(F.punctuation);
  const abbrev = new Set(F.chunk_abbreviations);
  return function chunks(text) {
    const out = [];
    const chars = [...text];
    let start = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!punct.has(c)) continue;
      const prev = i ? chars[i - 1] : "", next = i + 1 < chars.length ? chars[i + 1] : "";
      if (c === "'" && prev && next && isAlnum(prev) && isAlnum(next)) continue;
      if (".,:".includes(c) && prev && next && isDigit(prev) && isDigit(next)) continue;
      if (c === "." && prev && isDigit(prev) && next === " " && i + 2 < chars.length && isAlnum(chars[i + 2])) continue;
      if (c === ".") {
        const m = chars.slice(0, i).join("").match(/([A-Za-z]+)$/);
        if (m && abbrev.has(m[1].toLowerCase())) continue;
        if (prev && next && isAlpha(prev) && isAlpha(next)) continue;
      }
      const piece = chars.slice(start, i).join("").trim();
      if (piece) out.push([false, piece]);
      out.push([true, c]);
      start = i + 1;
    }
    const rest = chars.slice(start).join("").trim();
    if (rest) out.push([false, rest]);
    return out;
  };
}

// ------------------------------------------------------------------ letter-to-sound model
export class G2P {
  constructor(ort, session, meta, exceptions = {}) {
    this.ort = ort; this.session = session; this.meta = meta; this.exceptions = exceptions;
    this.chars = new Map(meta.chars.map((c, i) => [c, i]));
    this.cache = new Map();
  }

  static async load(ort, url, metaUrl, {exceptions = {}, options} = {}) {
    const meta = await (await fetch(metaUrl)).json();
    const session = await ort.InferenceSession.create(url, options);
    return new G2P(ort, session, meta, exceptions);
  }

  static units(text) {
    return text.split(/\s+/).filter(Boolean).map(u => {
      let stress = 0;
      if (u.includes("ˈ")) stress = 1; else if (u.includes("ˌ")) stress = 2;
      return [u.replace(/[ˈˌ]/g, ""), stress];
    }).filter(([u]) => u);
  }

  // (a phone with ˈ = the main stress moves to this part: Hypothese, Synthese, Prothese)
  static SUFFIXES = [["saucen", "z oːˌ s ə n"], ["sauce", "z oːˌ s ə"], ["datums", "d ɑːˌ t ʊ m s"], ["datum", "d ɑːˌ t ʊ m"],
    ["thesen", "t eːˈ z ə n"], ["these", "t eːˈ z ə"]];

  // "Kaffee" always with a long, stressed "ee" (g2p_de.py _kaffee), also in compounds
  static kaffee(w, units) {
    if (!w.toLowerCase().includes("kaffee")) return units;
    const ph = units.map(u => u[0]);
    for (let i = 0; i + 3 < ph.length; i++) {
      if (ph[i] === "k" && ph[i + 1] === "a" && ph[i + 2] === "f" && ph[i + 3] === "eː") {
        const lead = w.toLowerCase().startsWith("kaffee");
        const out = units.map(([u, s]) => [u, lead && s === 1 ? 2 : s]);
        out[i + 1] = ["a", 0];
        out[i + 3] = ["eː", lead ? 1 : (units[i + 3][1] || 2)];
        return out;
      }
    }
    return units;
  }

  async word(w) {
    return G2P.prim(w, G2P.kaffee(w, await this.word1(w)));
  }

  // Primzahl, Primfaktor (and compounds) with a long i (g2p_de.py _prim)
  static prim(w, units) {
    const lw = w.toLowerCase();
    if ((lw.startsWith("primzahl") || lw.startsWith("primfaktor")) && units.length > 2 &&
        units[0][0] === "p" && units[1][0] === "ɾ" && units[2][0] === "ɪ") {
      units = units.slice(); units[2] = ["iː", units[2][1]];
    }
    return units;
  }

  async word1(w) {
    const explicit = this.exceptions[w] ?? this.exceptions[w.toLowerCase()];
    if (explicit) return G2P.units(explicit);
    if (this.cache.has(w)) return this.cache.get(w);
    // compounds ending in these words (Tomatensauce, Geburtsdatum): the first part as the model reads it, then this
    for (const [suffix, phones] of G2P.SUFFIXES) {
      if (w.toLowerCase().endsWith(suffix) && [...w].length > suffix.length + 1) {
        let first = await this.word1(w.slice(0, w.length - suffix.length));
        if (!first.length) throw new Error(`German compound has no G2P reading for its head: ${w}`);
        if (phones.includes("ˈ")) first = first.map(([u]) => [u, 0]);   // the main stress is on the last part
        const r = [...first, ...G2P.units(phones)];
        this.cache.set(w, r);
        return r;
      }
    }
    const letters = [...w];
    let result;
    if (letters.length > this.meta.max_len) {
      const half = Math.floor(letters.length / 2);
      const head = await this.word(letters.slice(0, half).join(""));
      const tail = await this.word(letters.slice(half).join(""));
      if (!head.length || !tail.length) throw new Error(`Long German compound has an unreadable part: ${w}`);
      result = [...head, ...tail];
    } else {
      const ids = BigInt64Array.from(letters.map(c => BigInt(this.chars.get(c) ?? 1)));
      const input = new this.ort.Tensor("int64", ids, [1, ids.length]);
      let out;
      try {
        out = await this.session.run({chars: input});
        const logp = out.logp, [, T, C] = logp.dims, data = logp.data;
        const blank = this.meta.units.length, units = [];
        let prev = -1;
        for (let t = 0; t < T; t++) {
          let best = 0, bv = -Infinity;
          for (let c = 0; c < C; c++) { const v = data[t * C + c]; if (v > bv) { bv = v; best = c; } }
          if (best !== prev && best !== blank) units.push(this.meta.units[best]);
          prev = best;
        }
        result = G2P.units(units.join(" "));
      } finally {
        input.dispose();
        for (const tensor of Object.values(out ?? {})) tensor.dispose();
      }
    }
    if (this.cache.size < 50000) this.cache.set(w, result);
    return result;
  }

  async words(piece) {
    const out = [];
    for (const w of piece.split(" ").filter(Boolean)) {
      const units = await this.word(w);
      if (!units.length) throw new Error(`German G2P returned no phonemes for speakable word: ${w}`);
      out.push(units);
    }
    return out;
  }
}

// ------------------------------------------------------------------ phonemes -> tokens (tiny_voca text.tokenize)
export function makeTokenize(F) {
  const ids = new Map(F.symbols.map((s, i) => [s, i]));
  const phones = new Set(F.phones), vowels = new Set(F.vowels);
  const {bos, eos, sp, unk} = F.specials;
  function canonical(phone) {
    if (phones.has(phone)) return [phone];
    if (F.fallback[phone]) return F.fallback[phone];
    const stripped = phone.normalize("NFD").replace(/\p{M}/gu, "");
    for (const cand of [stripped, stripped.replaceAll("ː", ""), stripped + "ː"]) {
      if (cand !== phone && phones.has(cand)) return [cand];
      if (cand !== phone && F.fallback[cand]) return F.fallback[cand];
    }
    return null;
  }
  return function tokenize(pieces) {
    const symbols = [bos], stress = [0];
    for (const [isPunct, value] of pieces) {
      if (isPunct) {
        if (symbols[symbols.length - 1] !== value) { symbols.push(value); stress.push(0); }
        continue;
      }
      if (!value.length) throw new Error("German tokenization received a speakable piece with no words");
      for (const word of value) {
        const last = symbols[symbols.length - 1];
        if (phones.has(last) || last === unk) { symbols.push(sp); stress.push(0); }
        for (const [phone, level] of word) {
          const mapped = canonical(phone) ?? [unk];
          let carrier = mapped.findIndex(p => vowels.has(p));
          if (carrier < 0) carrier = 0;
          mapped.forEach((p, i) => { symbols.push(p); stress.push(i === carrier ? level : 0); });
        }
      }
    }
    symbols.push(eos); stress.push(0);
    if (!symbols.some(s => phones.has(s) || s === unk)) throw new Error("nothing to pronounce");
    return {symbols, ids: symbols.map(s => ids.get(s)), stress};
  };
}

export function makeFrontEnd(F, g2p) {
  const normalizeGerman = makeNormalizeGerman(F), chunks = makeChunks(F), tokenize = makeTokenize(F), prepare = makePrepare(F);
  return async function phonemize(text) {
    const pieces = [];
    for (const [isPunct, piece] of chunks(normalizeText(normalizeGerman(normalizeText(prepare(text))))))
      pieces.push(isPunct ? [true, piece] : [false, await g2p.words(piece)]);
    return tokenize(pieces);
  };
}

// ------------------------------------------------------------------ Vocos kernels (vocos_export.py kernels())
export function vocosKernels(ort, nFft = 1024) {
  const bins = nFft / 2 + 1;
  const real = new Float32Array(bins * nFft), imag = new Float32Array(bins * nFft), synth = new Float32Array(2 * bins * nFft);
  const w = Float64Array.from({length: nFft}, (_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / nFft));
  for (let k = 0; k < bins; k++) {
    const c = (k === 0 || k === nFft / 2 ? 1 : 2) / nFft;
    for (let n = 0; n < nFft; n++) {
      const a = 2 * Math.PI * ((k * n) % nFft) / nFft, cs = Math.cos(a), sn = Math.sin(a);
      real[k * nFft + n] = w[n] * cs;
      imag[k * nFft + n] = -w[n] * sn;
      synth[k * nFft + n] = c * cs * w[n];
      synth[(bins + k) * nFft + n] = -c * sn * w[n];
    }
  }
  return {a_real: new ort.Tensor("float32", real, [bins, 1, nFft]), a_imag: new ort.Tensor("float32", imag, [bins, 1, nFft]),
          synth: new ort.Tensor("float32", synth, [2 * bins, 1, nFft])};
}

// ------------------------------------------------------------------ the voice
// Preserve the author's final 10 ms frame threshold and 40 ms cosine fade.
export function trimTail(audio, sr, floorDb = -30, fadeMs = 40) {
  const hop = Math.round(sr / 100), e = [];
  for (let s = 0; s + hop <= audio.length; s += hop) { let x = 0; for (let n = 0; n < hop; n++) x += audio[s + n] ** 2; e.push(x); }
  const peak = Math.max(0, ...e), floor = peak * 10 ** (floorDb / 10);
  let last = e.length - 1; while (last > 0 && e[last] < floor) last--;
  const fade = Math.round(fadeMs * sr / 1000), end = Math.min(audio.length, (last + 1) * hop + fade);
  if (!peak || end >= audio.length) return audio;
  const out = audio.slice(0, end);
  for (let i = 0; i < fade; i++) out[end - fade + i] *= 0.5 + 0.5 * Math.cos(Math.PI * (i + 1) / fade);
  return out;
}

export class Voice {
  constructor(ort, tts, meta, phonemize, vocos = null) {
    Object.assign(this, {ort, tts, meta, phonemize, vocos});
    this.kernels = vocos ? vocosKernels(ort) : null;
  }

  setVocos(vocos) { this.vocos = vocos; this.kernels = this.kernels || vocosKernels(this.ort); }

  // Preserve the author's Standard German sentence/clauses segmentation (no quick-start split).
  async parts(text) {
    const out = [];
    const sentences = text.trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      const p = await this.phonemize(sentence);
      if (!p.ids.length || p.ids.length < 3) throw new Error("German frontend returned empty or truncated speech input");
      if (p.ids.length <= this.meta.max_tokens) { out.push(p); continue; }
      let pieces = sentence.split(/(?<=[,;:—])\s+/);
      if (pieces.length === 1) {
        const w = sentence.split(/\s+/).filter(Boolean);
        if (w.length < 2) throw new Error("A German word exceeds the Standard model's 512-token limit");
        const h = w.length >> 1; pieces = [w.slice(0, h).join(" "), w.slice(h).join(" ")];
      }
      for (const piece of pieces) {
        if (!piece.trim()) continue;
        const children = await this.parts(piece);
        if (!children.length) throw new Error("German sentence splitting dropped speakable input");
        out.push(...children);
      }
    }
    if (text.trim() && !out.length) throw new Error("German sentence splitting produced no speech input");
    return out;
  }

  // -> Float32Array at meta.sample_rate. Standard German profile is fixed to M2, speed 1, neutral pitch.
  // onChunk reports each synthesized segment; voice, speed, neutral pitch and pause are profile constants.
  async speak(text, {onChunk = null} = {}) {
    return this.speakParts(await this.parts(text), {onChunk});
  }

  async speakParts(parts, {onChunk = null} = {}) {
    if (!Array.isArray(parts) || !parts.length) throw new Error("Standard German synthesis received no speech segments");
    for (const p of parts) {
      if (!p?.ids?.length || p.ids.length !== p.stress?.length) {
        throw new Error("Standard German synthesis received an empty or incomplete speech segment");
      }
    }
    const voice = "M2", speed = 1.0, gap = 0.12;
    const T = this.ort.Tensor, f = v => new T("float32", Float32Array.of(v), [1]);
    const chunks = [];
    let index = 0;
    for (const p of parts) {
      const n = p.ids.length;
      const feeds = {
        tokens: new T("int64", BigInt64Array.from(p.ids.map(BigInt)), [1, n]),
        stress: new T("int64", BigInt64Array.from(p.stress.map(BigInt)), [1, n]),
        voice: new T("int64", BigInt64Array.of(BigInt(this.meta.voices.indexOf(voice))), [1]),
        speed: f(speed), pitch_shift: f(0), pitch_range: f(1),
      };
      let ttsOutput, audio;
      try {
        ttsOutput = await this.tts.run(feeds);
        const expectedSamples = ttsOutput.durations.data.reduce((sum, frames) => sum + Number(frames), 0) * this.meta.hop;
        audio = Float32Array.from(ttsOutput.audio.data);
        if (!expectedSamples || audio.length !== expectedSamples) throw new Error("Standard German TTS audio length differs from its duration output");
      } finally {
        for (const tensor of Object.values(feeds)) tensor.dispose();
        for (const tensor of Object.values(ttsOutput ?? {})) tensor.dispose();
      }
      if (this.vocos) {
        // Copy the source samples and fixed kernels before ORT WASM proxy transfer.
        const n = audio.length, k = this.kernels, copy = t => new T("float32", t.data.slice(), t.dims);
        const feeds = {audio: new T("float32", audio.slice(), [1, n]),
          a_real: copy(k.a_real), a_imag: copy(k.a_imag), synth: copy(k.synth)};
        let output;
        try {
          output = await this.vocos.run(feeds);
          const filtered = output.output.data;
          if (filtered.length < n) throw new Error("Vocos returned truncated audio");
          audio = Float32Array.from(filtered.slice(0, n));
        } finally {
          for (const tensor of Object.values(feeds)) tensor.dispose();
          for (const tensor of Object.values(output ?? {})) tensor.dispose();
        }
      }
      audio = trimTail(audio, this.meta.sample_rate);
      let peak = 0; for (const v of audio) peak = Math.max(peak, Math.abs(v));
      if (!audio.length || !audio.every(Number.isFinite) || !audio.some(value => value !== 0)) {
        throw new Error("Standard German acoustic segment returned empty, nonfinite or silent PCM");
      }
      const g = peak > 0.95 ? 0.95 / peak : 1;
      const piece = g === 1 ? audio : audio.map(v => v * g);
      if (chunks.length) chunks.push(new Float32Array(Math.round(gap * this.meta.sample_rate)));
      chunks.push(piece);
      if (onChunk) onChunk(piece, index);
      index++;
    }
    const total = chunks.reduce((s, c) => s + c.length, 0), out = new Float32Array(total);
    let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
}
