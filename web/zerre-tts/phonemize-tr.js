// Turkish phonemization for the browser demo: lexicon first, rules for the rest.
// Loaded with importScripts() in worker.js and exercised by scripts/check_web_phonemes.js.

(function () {
  const VOWEL_PHONE = new Set(["a", "e", "i", "o", "u", "y", "ø", "œ", "ɯ"]);
  const BACK = new Set(["a", "ı", "o", "u"]);
  const BASE = { a: "a", b: "b", c: "dʒ", ç: "tʃ", d: "d", e: "e", f: "f", g: "g",
    h: "h", ı: "ɯ", i: "i", j: "ʒ", k: "k", l: "l", m: "m", n: "n", o: "o", ö: "œ",
    p: "p", r: "ɾ", s: "s", ş: "ʃ", t: "t", u: "u", ü: "y", v: "v", y: "j", z: "z" };

  function fallbackPhones(word) {
    const phones = [];
    const stress = [];
    for (let index = 0; index < word.length; index++) {
      const letter = word[index];
      if (letter === "ğ") {
        if (phones.length && /[aeıioöuü]/.test(word[index - 1])) phones[phones.length - 1] += "ː";
        continue;
      }
      if (!(letter in BASE)) continue;
      const following = word[index + 1];
      const front = following && /[eiöü]/.test(following);
      let phone = BASE[letter];
      if (letter === "k" && front) phone = "c";
      if (letter === "g" && front) phone = "ɟ";
      if (letter === "l" && word[index - 1] && BACK.has(word[index - 1])) phone = "ɫ";
      phones.push(phone);
      stress.push(0);
    }
    for (let index = phones.length - 1; index >= 0; index--) {
      if (VOWEL_PHONE.has(phones[index].replace("ː", ""))) {
        stress[index] = 1;
        break;
      }
    }
    return { phones, stress };
  }

  function phonemize(text, lexicon, symbols) {
    const index = new Map(symbols.map((symbol, position) => [symbol, position]));
    const ids = [];
    const stress = [];
    const push = (symbol, level) => {
      const id = index.get(symbol);
      if (id === undefined) return;
      ids.push(id);
      stress.push(level || 0);
    };
    push("<bos>", 0);
    let lastWasWord = false;
    for (const token of text.match(/[\p{L}]+|[.,!?;:—…]/gu) || []) {
      if (/^[\p{L}]+$/u.test(token)) {
        if (lastWasWord) push("<sp>", 0);
        const key = token.toLocaleLowerCase("tr");
        const entry = lexicon.words[key];
        let phones;
        let levels;
        if (entry) {
          phones = entry[0].split(" ").filter(Boolean);
          levels = entry[1].split("").map(Number);
        } else {
          ({ phones, stress: levels } = fallbackPhones(key));
        }
        phones.forEach((phone, position) => push(phone, levels[position]));
        lastWasWord = true;
      } else {
        push(token, 0);
        lastWasWord = false;
      }
    }
    push("<eos>", 0);
    return { ids, stress, symbols: ids.map((id) => symbols[id]) };
  }

  globalThis.zerre = { phonemize, fallbackPhones };
})();
