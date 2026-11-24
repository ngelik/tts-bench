// The Luganda front end in plain JavaScript: text -> tiny-voca phoneme ids.
//
// A copy of the Python path `tiny_voca.text.phonemize` with the "lug" front end:
// `normalize_text` and `chunks` from text.py, the spelling rules of lug.py and
// `tokenize`. The model only understands the ids that Python would give, so the
// two must stay alike; tests/test_lug.py compares them sentence by sentence.
//
// Loaded with importScripts() in the worker, or with require() in node (tests).

const lug = (() => {
  // tiny_voca.text.SYMBOLS. Append-only: the ids are the positions in this list.
  const SPECIALS = ["<pad>", "<bos>", "<eos>", "<sp>", "<unk>"];
  const [, BOS, EOS, SP, UNK] = SPECIALS;
  const PUNCTUATION = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];
  const CONSONANTS = ["p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h",
                      "m", "n", "ŋ", "l", "ɹ", "j", "w", "tʃ", "dʒ", "ɾ", "ʔ"];
  const VOWELS = ["ə", "ɐ", "ɚ", "ᵻ", "ɪ", "i", "iː", "ɛ", "æ", "ʌ", "ɑː", "ɔ", "ɔː", "ʊ", "uː", "ɜː",
                  "eɪ", "aɪ", "ɔɪ", "oʊ", "aʊ", "iə", "oː",
                  "ɑːɹ", "ɔːɹ", "oːɹ", "ɪɹ", "ɛɹ", "ʊɹ", "aɪɚ", "aɪə", "əl", "n̩"];
  const PHONES = new Set([...CONSONANTS, ...VOWELS]);
  const SYMBOLS = [...SPECIALS, ...PUNCTUATION, ...CONSONANTS, ...VOWELS];
  const ID = new Map(SYMBOLS.map((symbol, index) => [symbol, index]));
  const MARKS = new Set(PUNCTUATION);

  // text.py: _QUOTES, ABBREVIATIONS, normalize_text, chunks.
  const QUOTES = { "‘": "'", "’": "'", "‚": "'", "‛": "'", "`": "'", "´": "'",
                   "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"',
                   "–": "—", "―": "—", "[": "(", "{": "(", "]": ")", "}": ")" };
  const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "prof", "st", "jr", "sr", "vs", "etc"]);
  const isAlnum = (c) => /^[\p{L}\p{N}]$/u.test(c);
  const isAlpha = (c) => /^\p{L}$/u.test(c);
  const isDigit = (c) => /^\p{Nd}$/u.test(c);

  function normalizeText(text) {
    text = Array.from(text.normalize("NFKC"), (c) => QUOTES[c] ?? c).join("");
    text = text.replace(/\.{3,}/g, "…");
    text = text.replace(/-{2,}|\s-\s/g, "—");
    return text.replace(/\s+/g, " ").trim();
  }

  // [isPunctuation, piece] pairs. Same cuts as text.chunks.
  function chunks(text) {
    const chars = Array.from(text);
    const pieces = [];
    let start = 0;
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (!MARKS.has(char)) continue;
      const previous = i ? chars[i - 1] : "";
      const following = i + 1 < chars.length ? chars[i + 1] : "";
      if (char === "'" && isAlnum(previous) && isAlnum(following)) continue;
      if (".,:".includes(char) && isDigit(previous) && isDigit(following)) continue;
      if (char === ".") {
        const word = chars.slice(0, i).join("").match(/([A-Za-z]+)$/);
        if (word && ABBREVIATIONS.has(word[1].toLowerCase())) continue;
        if (isAlpha(previous) && isAlpha(following)) continue;
      }
      const piece = chars.slice(start, i).join("").trim();
      if (piece) pieces.push([false, piece]);
      pieces.push([true, char]);
      start = i + 1;
    }
    const rest = chars.slice(start).join("").trim();
    if (rest) pieces.push([false, rest]);
    return pieces;
  }

  // lug.py: VOWELS, DIGRAPHS, LETTERS, clean, word_phones, words.
  const LUG_VOWELS = new Map([["a", ["ɐ", "ɑː"]], ["e", ["ɛ", "eɪ"]], ["i", ["i", "iː"]], ["o", ["ɔ", "oː"]], ["u", ["ʊ", "uː"]]]);
  const DIGRAPHS = new Map([["ng'", ["ŋ"]], ["ny", ["n", "j"]], ["ky", ["tʃ"]], ["gy", ["dʒ"]], ["sh", ["ʃ"]], ["ch", ["tʃ"]]]);
  const LETTERS = new Map([["b", ["b"]], ["c", ["tʃ"]], ["d", ["d"]], ["f", ["f"]], ["g", ["ɡ"]], ["h", ["h"]], ["j", ["dʒ"]],
                           ["k", ["k"]], ["l", ["l"]], ["m", ["m"]], ["n", ["n"]], ["p", ["p"]], ["q", ["k"]], ["r", ["ɾ"]],
                           ["s", ["s"]], ["t", ["t"]], ["v", ["v"]], ["w", ["w"]], ["x", ["k", "s"]], ["y", ["j"]], ["z", ["z"]],
                           ["ŋ", ["ŋ"]]]);

  function clean(text) {
    text = text.normalize("NFC").toLowerCase().replaceAll("’", "'").replaceAll("ʼ", "'").replaceAll("‘", "'");
    // Strip accents (é -> e) but keep ŋ, which has no decomposition.
    text = Array.from(text.normalize("NFD")).filter((c) => !/\p{Mn}/u.test(c)).join("");
    return text.replaceAll("ng'", "ŋ");
  }

  function wordPhones(word) {
    const phones = [];
    let i = 0;
    while (i < word.length) {
      const char = word[i];
      if (char === "'") { i += 1; continue; }
      if (LUG_VOWELS.has(char)) {
        const long = i + 1 < word.length && word[i + 1] === char;
        phones.push(LUG_VOWELS.get(char)[long ? 1 : 0]);
        i += long ? 2 : 1;
        continue;
      }
      const pair = word.slice(i, i + 2);
      // Geminate digraph: kky, ggy, nny -> the digraph twice.
      const next = word.slice(i + 1, i + 3);
      if (i + 2 < word.length && word[i + 1] === char && DIGRAPHS.has(next)) {
        phones.push(...(next !== "ny" ? [...DIGRAPHS.get(next), ...DIGRAPHS.get(next)] : ["n", "n", "j"]));
        i += 3;
        continue;
      }
      if (DIGRAPHS.has(pair)) {
        phones.push(...DIGRAPHS.get(pair));
        i += 2;
        continue;
      }
      if (LETTERS.has(char)) phones.push(...LETTERS.get(char));
      i += 1; // anything else (digits, symbols) is skipped
    }
    return phones;
  }

  function words(piece) {
    return (clean(piece).match(/[a-zŋ']+/g) || []).map(wordPhones).filter((phones) => phones.length);
  }

  // text.tokenize, for words that carry no stress. null when there is nothing to pronounce.
  function phonemize(text) {
    const symbols = [BOS];
    for (const [punctuation, piece] of chunks(normalizeText(text))) {
      if (punctuation) {
        if (symbols[symbols.length - 1] !== piece) symbols.push(piece); // collapse repeats such as "!!"
        continue;
      }
      for (const word of words(piece)) {
        const last = symbols[symbols.length - 1];
        if (PHONES.has(last) || last === UNK) symbols.push(SP);
        for (const phone of word) symbols.push(PHONES.has(phone) ? phone : UNK);
      }
    }
    symbols.push(EOS);
    if (!symbols.some((symbol) => PHONES.has(symbol) || symbol === UNK)) return null;
    return { ids: symbols.map((symbol) => ID.get(symbol)), stress: symbols.map(() => 0), text: symbols.join(" ") };
  }

  return { SYMBOLS, normalizeText, chunks, clean, wordPhones, words, phonemize };
})();

if (typeof module !== "undefined") module.exports = lug;
export { lug };
