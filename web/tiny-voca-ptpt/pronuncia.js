// pronuncia-pt em JavaScript (23 Nov 2026): a mesma passagem de texto em português europeu para fonemas que o
// pacote Python pronuncia-pt 0.2.0 (pronuncia-pt/pronuncia_pt/), regra a regra, para a demonstração correr no
// navegador sem Python. Os vectores de teste (test/vectores.json, feitos com o Python) conferem as duas, fonema a
// fonema: quem mudar uma, muda a outra e refaz os vectores.
//
// Serve como script clássico (importScripts no worker: fica em self.PronunciaPT) e como módulo do Node (require).
// As abertas medidas no áudio (abertas.txt) dão-se com definirAbertas(texto).
(function (raiz) {
  "use strict";

  const VERSAO = "0.2.0";
  const CONSOANTES = ["p", "b", "t", "d", "k", "ɡ", "f", "v", "s", "z", "ʃ", "ʒ",
    "m", "n", "ɲ", "l", "ʎ", "ɾ", "ʁ", "j", "w"];
  const VOGAIS = ["i", "e", "ɛ", "a", "ɐ", "ɔ", "o", "u", "ɨ", "ĩ", "ẽ", "ɐ̃", "õ", "ũ", "ɐ̃ʊ̃"];
  const PONTUACAO = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];

  const ACENTOS = {
    "á": ["a", "´"], "à": ["a", "`"], "â": ["a", "^"], "ã": ["a", "~"],
    "é": ["e", "´"], "ê": ["e", "^"], "í": ["i", "´"], "ó": ["o", "´"],
    "ô": ["o", "^"], "õ": ["o", "~"], "ú": ["u", "´"], "ü": ["u", "¨"], "è": ["e", "´"],
    "y": ["i", null],
  };
  const VOZEADAS = new Set("bdɡvzʒmnɲlʎɾʁ");
  const VOGAL_LETRA = new Set("aeiou");
  // «x in "abc"» do Python, com strings: é um teste de substring (e a string vazia está sempre lá)
  const em = (texto, x) => typeof x === "string" && texto.includes(x);
  const igual = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);

  const EXCECOES = {
    "quero": "k ˈɛ ɾ u", "quer": "k ˈɛ ɾ",
    "o": "u", "a": "ɐ", "os": "u S", "as": "ɐ S", "e": "i", "é": "ˈɛ", "de": "d ɨ",
    "do": "d u", "da": "d ɐ", "dos": "d u S", "das": "d ɐ S", "que": "k ɨ", "se": "s ɨ",
    "me": "m ɨ", "te": "t ɨ", "lhe": "ʎ ɨ", "lhes": "ʎ ɨ S", "nos": "n u S", "vos": "v u S",
    "no": "n u", "na": "n ɐ", "nas": "n ɐ S", "ao": "a w", "aos": "a w S", "à": "a", "às": "a S",
    "em": "ɐ̃ j", "com": "k õ", "por": "p u ɾ", "para": "p ɐ ɾ ɐ", "pelo": "p ɨ l u",
    "pela": "p ɨ l ɐ", "pelos": "p ɨ l u S", "pelas": "p ɨ l ɐ S", "mas": "m ɐ S",
    "nem": "n ɐ̃ j", "sem": "s ɐ̃ j", "um": "ˈũ", "uns": "ˈũ S", "num": "n ũ", "numa": "n ˈu m ɐ",
    "ou": "ˈo", "lo": "l u", "la": "l ɐ", "los": "l u S", "las": "l ɐ S", "no-lo": "n u l u",
    "muito": "m ˈũ j t u", "muita": "m ˈũ j t ɐ", "muitos": "m ˈũ j t u S", "muitas": "m ˈũ j t ɐ S",
    "ele": "ˈe l ɨ", "eles": "ˈe l ɨ S", "ela": "ˈɛ l ɐ", "elas": "ˈɛ l ɐ S",
    "este": "ˈe ʃ t ɨ", "esta": "ˈɛ ʃ t ɐ", "estes": "ˈe ʃ t ɨ S", "estas": "ˈɛ ʃ t ɐ S",
    "esse": "ˈe s ɨ", "essa": "ˈɛ s ɐ", "isto": "ˈi ʃ t u", "isso": "ˈi s u",
    "aquele": "ɐ k ˈe l ɨ", "aquela": "ɐ k ˈɛ l ɐ", "aquilo": "ɐ k ˈi l u",
    "hoje": "ˈo ʒ ɨ", "sete": "s ˈɛ t ɨ", "nove": "n ˈɔ v ɨ", "novo": "n ˈo v u", "nova": "n ˈɔ v ɐ",
    "novos": "n ˈɔ v u S", "novas": "n ˈɔ v ɐ S", "porta": "p ˈɔ ɾ t ɐ", "pedra": "p ˈɛ d ɾ ɐ",
    "festa": "f ˈɛ ʃ t ɐ", "certo": "s ˈɛ ɾ t u", "certa": "s ˈɛ ɾ t ɐ", "terra": "t ˈɛ ʁ ɐ",
    "guerra": "ɡ ˈɛ ʁ ɐ", "velho": "v ˈɐ ʎ u", "velha": "v ˈɐ ʎ ɐ", "mesmo": "m ˈe ʒ m u",
    "mesma": "m ˈe ʒ m ɐ", "fora": "f ˈɔ ɾ ɐ", "agora": "ɐ ɡ ˈɔ ɾ ɐ", "hora": "ˈɔ ɾ ɐ",
    "horas": "ˈɔ ɾ ɐ S", "cedo": "s ˈe d u", "perto": "p ˈɛ ɾ t u", "pé": "p ˈɛ", "café": "k ɐ f ˈɛ",
    "sexta": "s ˈɐ j ʃ t ɐ", "seis": "s ˈɐ j S", "dez": "d ˈɛ S", "três": "t ɾ ˈe S",
    "dois": "d ˈo j S", "doze": "d ˈo z ɨ", "treze": "t ɾ ˈe z ɨ", "dezasseis": "d ɨ z ɐ s ˈɐ j S",
    "táxi": "t ˈa k s i", "fixo": "f ˈi k s u", "fixa": "f ˈi k s ɐ", "sexo": "s ˈɛ k s u",
    "complexo": "k õ p l ˈɛ k s u", "reflexo": "ʁ ɨ f l ˈɛ k s u", "fluxo": "f l ˈu k s u",
    "tóxico": "t ˈɔ k s i k u", "próximo": "p ɾ ˈɔ s i m u", "próxima": "p ɾ ˈɔ s i m ɐ",
    "máximo": "m ˈa s i m u", "auxílio": "a w s ˈi l j u", "trouxe": "t ɾ ˈo s ɨ",
    "exame": "i z ˈɐ m ɨ", "exemplo": "i z ˈẽ p l u", "existe": "i z ˈi ʃ t ɨ",
    "existir": "i z i ʃ t ˈi ɾ", "êxito": "ˈɐ j z i t u", "exacto": "i z ˈa t u", "exacta": "i z ˈa t ɐ",
    "nunca": "n ˈũ k ɐ", "bom": "b ˈõ", "boa": "b ˈo ɐ", "boas": "b ˈo ɐ S", "bons": "b ˈõ S",
    "rio": "ʁ ˈi u", "dia": "d ˈi ɐ", "dias": "d ˈi ɐ S", "tia": "t ˈi ɐ", "tio": "t ˈi u",
    "rua": "ʁ ˈu ɐ", "lua": "l ˈu ɐ", "sua": "s ˈu ɐ", "suas": "s ˈu ɐ S", "tua": "t ˈu ɐ",
    "voo": "v ˈo u", "coelho": "k u ˈɐ ʎ u", "olho": "ˈo ʎ u", "olhos": "ˈɔ ʎ u S",
    "obra": "ˈɔ b ɾ ɐ", "onde": "ˈõ d ɨ", "homem": "ˈɔ m ɐ̃ j", "homens": "ˈɔ m ɐ̃ j S",
    "mulher": "m u ʎ ˈɛ ɾ", "flor": "f l ˈo ɾ", "flores": "f l ˈo ɾ ɨ S", "melhor": "m ɨ ʎ ˈɔ ɾ",
    "pior": "p j ˈɔ ɾ", "maior": "m ɐ j ˈɔ ɾ", "menor": "m ɨ n ˈɔ ɾ", "sol": "s ˈɔ l",
    "avó": "ɐ v ˈɔ", "avô": "ɐ v ˈo", "só": "s ˈɔ", "nós": "n ˈɔ S", "vós": "v ˈɔ S",
    "sobre": "s ˈo b ɾ ɨ", "depois": "d ɨ p ˈo j S", "também": "t ɐ̃ b ˈɐ̃ j",
    "porque": "p u ɾ k ˈe", "porquê": "p u ɾ k ˈe", "quando": "k w ˈɐ̃ d u",
  };

  const PRONUNCIADAS = /^(?:facto|pacto|compact|contact|intact|tact|impact|ficç|convicç|fricç|egípc|rapt|apt|inapt|adept|erupç|núpc|opç|opcion|eucalipt|cépt|conceptu|ruptur|corrupt|abrupt|bact|caract|dicç|seccion)/u;

  function mudas(p) {
    if (PRONUNCIADAS.test(p)) return p;
    return p.replace(/(?<=[iuáéíóúâêô])[cp](?=[cçt])/gu, "").replace(/([aeo])[cp](?=[cçt])/gu, (_, v) => v.toUpperCase());
  }

  // a palavra em unidades: vogais ["V", base, acento] e consoantes ["C", letra] (os dígrafos juntos)
  function unidades(p) {
    const u = [];
    let i = 0;
    while (i < p.length) {
      const c = p[i], d = p.slice(i, i + 2);
      if (["ch", "lh", "nh", "rr", "ss"].includes(d)) { u.push(["C", d]); i += 2; continue; }
      if (["qu", "gu", "qü", "gü"].includes(d) && i + 2 < p.length) {
        const seguinte = (ACENTOS[p[i + 2]] || [p[i + 2], null])[0];
        if (em("ei", seguinte) && d[1] === "u") { u.push(["C", c === "q" ? "k" : "ɡ"]); i += 2; continue; }
        if (em("aoei", seguinte)) { u.push(["C", c === "q" ? "k" : "ɡ"]); u.push(["C", "w"]); i += 2; continue; }
      }
      if (em("AEO", c)) { u.push(["V", c.toLowerCase(), "aberta"]); i += 1; continue; }
      if (VOGAL_LETRA.has(c) || c in ACENTOS) {
        const [base, acento] = ACENTOS[c] || [c, null];
        u.push(["V", base, acento]); i += 1; continue;
      }
      if (c === "h") { i += 1; continue; }
      u.push(["C", c]); i += 1;
    }
    return u;
  }

  function nucleos(u) {
    const nuc = [];
    u.forEach((x, k) => {
      if (x[0] !== "V") return;
      const ant = k ? u[k - 1] : null;
      if (ant && ant[0] === "V" && (x[2] === null || x[2] === "¨")) {
        if (ant[2] === "~" && em("oe", x[1])) return;
        if (em("iu", x[1])) {
          const seg = u.slice(k + 1, k + 3);
          const hiato = seg.length > 0 && (igual(seg[0], ["C", "nh"]) || (seg[0][0] === "C" && em("lmnrz", seg[0][1])
            && (seg.length === 1 || seg[1][0] === "C")));
          if (!hiato) return;
        }
      }
      nuc.push(k);
    });
    return nuc;
  }

  function tonica(p, u, nuc) {
    if (!nuc.length) return null;
    for (const k of nuc) if (u[k][2] === "´" || u[k][2] === "^") return k;
    for (const k of [...nuc].reverse()) if (u[k][2] === "~") return k;
    if (nuc.length === 1) return nuc[0];
    if (/(?:[aeoAEO]s?|am|em|ens)$/u.test(p)) return nuc[nuc.length - 2];
    return nuc[nuc.length - 1];
  }

  let ABERTAS = new Set();
  function definirAbertas(texto) {
    ABERTAS = new Set(texto.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  }

  function palavra(p) {
    let fora = palavraRegras(p);
    if (ABERTAS.has(p)) fora = fora.map(([f, a]) => (a ? [({ e: "ɛ", o: "ɔ" })[f] || f, a] : [f, a]));
    return fora;
  }

  function primeiroSom(x) {
    if (x[0] === "V") return "a";
    const m = { c: "k", g: "ɡ", "ç": "s", ch: "ʃ", lh: "ʎ", nh: "ɲ", rr: "ʁ", ss: "s", j: "ʒ", q: "k", r: "ɾ" };
    return x[1] in m ? m[x[1]] : x[1];
  }

  function palavraRegras(p0) {
    if (Object.prototype.hasOwnProperty.call(EXCECOES, p0))
      return EXCECOES[p0].split(" ").map((f) => (f.startsWith("ˈ") ? [f.slice(1), 1] : [f, 0]));
    const p = mudas(p0);
    const u = unidades(p), nuc = nucleos(u), ton = tonica(p, u, nuc);
    const fora = [], salta = new Set(), n = u.length;
    const vogalSeg = (k) => k + 1 < n && u[k + 1][0] === "V";
    for (let k = 0; k < n; k++) {
      if (salta.has(k)) continue;
      const x = u[k];
      const ant = k ? u[k - 1] : null, seg = k + 1 < n ? u[k + 1] : null, seg2 = k + 2 < n ? u[k + 2] : null;
      const fim = k === n - 1;
      if (x[0] === "V") {
        const base = x[1], acento = x[2], ehTonica = k === ton, t = ehTonica ? 1 : 0;
        if (!nuc.includes(k)) {
          if (base === "u" && ant && ant[1] === "o" && (ant[2] === null || ant[2] === "^")) continue;
          fora.push([em("ie", base) ? "j" : "w", 0]);
          continue;
        }
        const nasalMN = !!(seg && seg[0] === "C" && (seg[1] === "m" || seg[1] === "n") && (seg2 === null || seg2[0] === "C"));
        if (nasalMN) salta.add(k + 1);
        const nasal = acento === "~" || nasalMN;
        if (base === "e" && nasalMN && (seg2 === null || (igual(seg2, ["C", "s"]) && k + 3 === n))) {
          fora.push(["ɐ̃", t], ["j", 0]); continue;
        }
        if (base === "a" && nasalMN && seg2 === null && !ehTonica) { fora.push(["ɐ̃ʊ̃", 0]); continue; }
        if (base === "a" && acento === "~" && seg && seg[0] === "V" && seg[1] === "o") {
          fora.push(["ɐ̃ʊ̃", t]); salta.add(k + 1); continue;
        }
        if (nasal) {
          fora.push([{ a: "ɐ̃", e: "ẽ", i: "ĩ", o: "õ", u: "ũ" }[base], t]);
          if (acento === "~" && seg && seg[0] === "V" && seg[1] === "e") { fora.push(["j", 0]); salta.add(k + 1); }
          continue;
        }
        if (base === "e" && igual(seg, ["C", "x"]) && seg2 && seg2[0] === "C" && acento === null) {
          fora.push(["ɐ", t], ["j", 0], ["ʃ", 0]); salta.add(k + 1); continue;
        }
        if (base === "e" && seg && seg[0] === "V" && seg[1] === "i" && !nuc.includes(k + 1)) {
          fora.push([acento === "´" ? "ɛ" : "ɐ", t]); continue;
        }
        if (ehTonica) {
          let v;
          if (base === "a") {
            v = acento === "´" ? "a" : acento === "^" ? "ɐ"
              : (seg && seg[0] === "C" && ["m", "n", "nh"].includes(seg[1]) && seg2 && seg2[0] === "V" ? "ɐ" : "a");
          } else if (base === "e") {
            v = (acento === "´" || acento === "aberta") ? "ɛ" : acento === "^" ? "e"
              : (seg && seg[0] === "C" && ["lh", "nh", "ch", "j"].includes(seg[1]) ? "ɐ" : "e");
          } else if (base === "o") {
            v = (acento === "´" || acento === "aberta") ? "ɔ" : "o";
          } else v = base;
          fora.push([v, 1]); continue;
        }
        if (base === "o" && seg && seg[0] === "V" && seg[1] === "u" && !nuc.includes(k + 1)) { fora.push(["o", 0]); continue; }
        if (em("eiou", base) && vogalSeg(k) && nuc.includes(k + 1) && acento === null) {
          fora.push([em("ei", base) ? "j" : "w", 0]); continue;
        }
        if (acento === "`" || acento === "aberta") {
          const v = { a: "a", e: "ɛ", o: "ɔ" }[base];
          if (v === undefined) throw new Error("KeyError: " + base);
          fora.push([v, 0]); continue;
        }
        if (base === "e" && k === 0 && seg && igual(seg, ["C", "x"])) {
          if (seg2 && seg2[0] === "V") fora.push(["i", 0], ["z", 0]);
          else fora.push(["ɐ", 0], ["j", 0], ["ʃ", 0]);
          salta.add(k + 1); continue;
        }
        fora.push([{ a: "ɐ", e: "ɨ", i: "i", o: "u", u: "u" }[base], 0]); continue;
      }
      // consoantes
      const c = x[1];
      const proxV = !!(seg && seg[0] === "V");
      const frente = proxV && em("ei", seg[1]);
      if (c === "s" || c === "z") {
        if (c === "s" && k === 0) fora.push(["s", 0]);
        else if (proxV && ant && ant[0] === "V") fora.push(["z", 0]);
        else if (proxV) fora.push([c === "s" ? "s" : "z", 0]);
        else if (fim) fora.push(["S", 0]);
        else fora.push([VOZEADAS.has(primeiroSom(u[k + 1])) ? "ʒ" : "ʃ", 0]);
        continue;
      }
      if (c === "x") { if (fim) fora.push(["k", 0], ["s", 0]); else fora.push(["ʃ", 0]); continue; }
      if (c === "r") {
        fora.push([k === 0 || (ant && ant[0] === "C" && ["n", "l", "s"].includes(ant[1])) ? "ʁ" : "ɾ", 0]);
        continue;
      }
      const mapa = { c: frente ? "s" : "k", g: frente ? "ʒ" : "ɡ", "ç": "s", ch: "ʃ", lh: "ʎ", nh: "ɲ", rr: "ʁ",
        ss: "s", j: "ʒ", q: "k", k: "k", w: "w", "ɡ": "ɡ" };
      fora.push([c in mapa ? mapa[c] : c, 0]);
    }
    return fora;
  }

  // números por extenso (numeros.py), com BigInt para os números grandes darem o mesmo que no Python
  const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
  const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos",
    "setecentos", "oitocentos", "novecentos"];

  function ateMil(n) {
    n = Number(n);
    if (n < 20) return UNIDADES[n];
    if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return DEZENAS[d] + (u === 0 ? "" : " e " + UNIDADES[u]); }
    if (n === 100) return "cem";
    const c = Math.floor(n / 100), r = n % 100;
    return CENTENAS[c] + (r === 0 ? "" : " e " + ateMil(r));
  }

  function cardinal(n) {
    n = BigInt(n);
    if (n < 0n) return "menos " + cardinal(-n);
    if (n < 1000n) return ateMil(n);
    const grupos = [];
    for (const [um, varios, base] of [["bilião", "biliões", 10n ** 12n], ["milhão", "milhões", 10n ** 6n]]) {
      const q = n / base; n = n % base;
      if (q) grupos.push(cardinal(q) + " " + (q === 1n ? um : varios));
    }
    const q = n / 1000n; n = n % 1000n;
    if (q) grupos.push(q === 1n ? "mil" : cardinal(q) + " mil");
    if (n) grupos.push(ateMil(n));
    if (grupos.length > 1 && (n < 100n || n % 100n === 0n))
      return grupos.slice(0, -1).join(", ").split(", ").join(" ") + " e " + grupos[grupos.length - 1];
    return grupos.join(" ");
  }

  // \b e \d do Python, que contam letras e algarismos de qualquer escrita
  const W = "[\\p{L}\\p{N}\\p{M}_]";
  const B0 = `(?<!${W})`, B1 = `(?!${W})`, D = "\\p{Nd}";
  const re = (s) => new RegExp(s.replace(/\\b(?=\()/g, B0).replace(/\\bA/g, B1).replace(/\\d/g, D), "gu");
  function digito(c) {   // o valor de um algarismo de qualquer escrita (os blocos Nd do Unicode vêm em dezenas)
    const cp = c.codePointAt(0);
    if (cp >= 48 && cp <= 57) return cp - 48;
    for (let z = cp; z > cp - 10; z--) if (!/\p{Nd}/u.test(String.fromCodePoint(z - 1))) return cp - z;
    return 0;
  }
  const inteiro = (s) => BigInt([...s].map(digito).join(""));

  function porExtenso(texto) {
    texto = texto.replace(re("\\b(\\d{1,2})h(\\d{2})\\bA"), (_, a, b) => cardinal(inteiro(a)) + " e " + cardinal(inteiro(b)));
    texto = texto.replace(re("\\b(\\d{1,2})h\\bA"), (_, a) => cardinal(inteiro(a)) + " horas");
    texto = texto.replace(re("\\b(\\d{1,3}(?:\\.\\d{3})+)\\bA"), (m) => m.replace(/\./g, ""));
    texto = texto.replace(re("\\b(\\d+),(\\d{2})\\s*€"), (_, a, b) => cardinal(inteiro(a)) + (a === "1" ? " euro" : " euros")
      + (b === "00" ? "" : " e " + cardinal(inteiro(b)) + (b === "01" ? " cêntimo" : " cêntimos")));
    texto = texto.replace(re("\\b(\\d+),(\\d+)\\bA"), (_, a, b) => ([...b].length > 2
      ? cardinal(inteiro(a)) + " vírgula " + [...b].map((c) => cardinal(inteiro(c))).join(" ")
      : cardinal(inteiro(a)) + " vírgula " + cardinal(inteiro(b))));
    texto = texto.replace(re("(\\d+)\\s*%"), (_, a) => cardinal(inteiro(a)) + " por cento");
    texto = texto.replace(re("(\\d+)\\s*€"), (_, a) => cardinal(inteiro(a)) + (a === "1" ? " euro" : " euros"));
    return texto.replace(re("\\d+"), (m) => cardinal(inteiro(m)));
  }

  const ASPAS = { "‘": "'", "’": "'", "“": '"', "”": '"', "«": '"', "»": '"', "–": "—", "―": "—", "[": "(", "]": ")" };
  function normalizar(texto) {
    texto = texto.normalize("NFC").replace(/[‘’“”«»–―\[\]]/g, (c) => ASPAS[c]);
    texto = texto.replace(/\.{3,}/g, "…");
    texto = porExtenso(texto);
    return texto.replace(/\s+/gu, " ").trim();
  }

  const PARTE = /([,.?!;:"'()—…])/u;
  const palavrasDe = (parte) => parte.toLowerCase().split(/[\s\-]+/u).filter((w) => /[a-zà-ü]/u.test(w));
  const limpa = (w) => w.replace(/[^a-zà-üç]/gu, "");

  // O texto em peças: [true, pontuação] ou [false, [palavra, ...]], cada palavra uma lista de [fonema, acento].
  function pecas(texto) {
    const norm = normalizar(texto), pedacos = [];
    for (const parte of norm.split(PARTE)) {
      if (!parte.trim()) continue;
      if (PONTUACAO.includes(parte)) { pedacos.push([true, parte]); continue; }
      pedacos.push([false, palavrasDe(parte).map((w) => palavra(limpa(w)))]);
    }
    // «leste»: o ponto cardeal, depois destas palavras, é aberto
    const orto = norm.split(PARTE).filter((parte) => parte.trim() && !PONTUACAO.includes(parte)).flatMap((parte) => palavrasDe(parte).map(limpa));
    const seq = [];
    pedacos.forEach(([pont, v], i) => { if (!pont) v.forEach((_, j) => seq.push([i, j])); });
    seq.forEach(([i, j], n) => {
      if (n < orto.length && orto[n] === "leste" && n > 0 && ["a", "de", "do", "ao", "no", "para", "pelo", "o"].includes(orto[n - 1]))
        pedacos[i][1][j] = pedacos[i][1][j].map(([f, a]) => (f === "e" && a ? ["ɛ", a] : [f, a]));
    });
    // a sibilante final: z antes de vogal, ʒ antes de consoante vozeada, ʃ no resto
    seq.forEach(([i, j], n) => {
      const pal = pedacos[i][1][j];
      if (!pal.length || pal[pal.length - 1][0] !== "S") return;
      let seguinte = null;
      if (n + 1 < seq.length && seq[n + 1][0] === i) {
        const prox = pedacos[i][1][seq[n + 1][1]];
        seguinte = prox.length ? prox[0][0] : null;
      }
      let som;
      if (seguinte === null) som = "ʃ";
      else if (VOGAIS.includes(seguinte) || seguinte === "j" || seguinte === "w") som = "z";
      else som = VOZEADAS.has(seguinte) ? "ʒ" : "ʃ";
      pal[pal.length - 1] = [som, 0];
    });
    return pedacos;
  }

  function fonemas(texto) {
    const fora = [];
    for (const [pont, v] of pecas(texto)) {
      if (pont) { fora.push(v); continue; }
      for (const pal of v) fora.push(pal.map(([f, a]) => (a ? "ˈ" : "") + f).join(""));
    }
    return fora.join(" ");
  }

  // As peças em fichas para o modelo, como tiny_voca.text.tokenize com TINY_VOCA_FRONTEND=pt: <bos>, as palavras
  // separadas por <sp>, a pontuação (sem repetir), <eos>; o acento vai num vector à parte.
  const SPECIALS = ["<pad>", "<bos>", "<eos>", "<sp>", "<unk>"];
  const PONT_MODELO = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];
  const SIMBOLOS = [...SPECIALS, ...PONT_MODELO, ...CONSOANTES, ...VOGAIS];
  const ID = new Map(SIMBOLOS.map((s, i) => [s, i]));
  const FONES = new Set([...CONSOANTES, ...VOGAIS]);
  // um fonema fora do inventário (uma letra estrangeira, «ñ», «ö»): sem os sinais, se der um do inventário; senão <unk>
  function canonico(f) {
    if (FONES.has(f)) return [f];
    const sem = f.normalize("NFD").replace(/\p{M}/gu, "");
    for (const c of [sem, sem.replace(/ː/g, ""), sem + "ː"]) if (c !== f && FONES.has(c)) return [c];
    return null;
  }

  function fichas(texto) {
    if (typeof texto !== "string" || !texto.trim()) throw new Error("text must not be empty");
    const simbolos = ["<bos>"], acento = [0], desconhecidos = [];
    for (const [pont, v] of pecas(texto)) {
      if (pont) { if (simbolos[simbolos.length - 1] !== v) { simbolos.push(v); acento.push(0); } continue; }
      for (const pal of v) {
        const ult = simbolos[simbolos.length - 1];
        if (FONES.has(ult) || ult === "<unk>") { simbolos.push("<sp>"); acento.push(0); }
        for (const [f, a] of pal) {
          let m = canonico(f);
          if (m === null) { desconhecidos.push(f); m = ["<unk>"]; }
          simbolos.push(m[0]); acento.push(a);
        }
      }
    }
    simbolos.push("<eos>"); acento.push(0);
    if (!simbolos.some((s) => FONES.has(s) || s === "<unk>")) return null;   // nada para dizer
    return { simbolos, ids: simbolos.map((s) => ID.get(s)), acento, desconhecidos };
  }

  const API = { VERSAO, CONSOANTES, VOGAIS, SIMBOLOS, definirAbertas, pecas, fonemas, fichas, cardinal, porExtenso };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else raiz.PronunciaPT = API;
})(typeof self !== "undefined" ? self : this);
