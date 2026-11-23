// JavaScript port of tiny_voca_ptbr/normalize_ptbr.py from
// https://github.com/Haple/tiny-voca-ptbr-kokoro/tree/1e7ed993260ecdd91552762f7403c00632bf5dab.
// See adjacent LICENSE and NOTICE for Apache-2.0 attribution.
// Keep transformation order and spelling tables aligned with the released file.

const UNITS = `zero um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete dezoito dezenove`.split(" ");
const TENS = `_ _ vinte trinta quarenta cinquenta sessenta setenta oitenta noventa`.split(" ");
const HUNDREDS = `_ cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos`.split(" ");
const MONTHS = `janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro`.split(" ");
const ORDINAL_UNITS = `_ primeiro segundo terceiro quarto quinto sexto sétimo oitavo nono`.split(" ");
const ORDINAL_TENS = `_ décimo vigésimo trigésimo quadragésimo quinquagésimo sexagésimo septuagésimo octogésimo nonagésimo`.split(" ");
const ORDINAL_HUNDREDS = `_ centésimo ducentésimo trecentésimo quadringentésimo quingentésimo sexcentésimo septingentésimo octingentésimo noningentésimo`.split(" ");

const FEMININE = new Set(`
pessoa pessoas hora horas vez vezes semana semanas casa casas criança crianças mulher mulheres coisa coisas
página páginas palavra palavras cidade cidades empresa empresas opção opções pergunta perguntas resposta
respostas vaga vagas unidade unidades tonelada toneladas caixa caixas garrafa garrafas xícara xícaras colher
colheres fatia fatias maçã maçãs laranja laranjas banana bananas noite noites manhã manhãs tarde tardes aula
aulas nota notas estrela estrelas linha linhas letra letras música músicas foto fotos vida vidas parte partes
mesa mesas cadeira cadeiras porta portas janela janelas rua ruas escola escolas loja lojas moeda moedas conta
contas dica dicas ideia ideias história histórias frase frases etapa etapas família famílias filha filhas
amiga amigas menina meninas aluna alunas vitória vitórias derrota derrotas camisa camisas peça peças pizza
pizzas cerveja cervejas libra libras milha milhas volta voltas rodada rodadas fase fases temporada temporadas
edição edições questão questões regra regras lição lições hora-aula horas-aula receita receitas viagem viagens
mensagem mensagens chamada chamadas reunião reuniões tentativa tentativas mão mãos perna pernas folha folhas
cópia cópias sessão sessões consulta consultas parcela parcelas prestação prestações camiseta camisetas
caneta canetas empada empadas coxinha coxinhas vela velas bola bolas fruta frutas árvore árvores flor flores
praia praias bicicleta bicicletas moto motos semana-feira prova provas festa festas cama camas sala salas
`.trim().split(/\s+/));

const ABBREVIATIONS = new Map(Object.entries({
  "sr.": "senhor", "sra.": "senhora", "srta.": "senhorita", "dr.": "doutor", "dra.": "doutora",
  "prof.": "professor", "profa.": "professora", "av.": "avenida", "etc.": "etcétera", "p.ex.": "por exemplo",
  "ltda.": "limitada", "pág.": "página", "págs.": "páginas", "tel.": "telefone", "cel.": "celular",
  "obs.": "observação", "aprox.": "aproximadamente", "vs.": "versus", "jr.": "júnior", "sto.": "santo",
  "sta.": "santa", "exmo.": "excelentíssimo", "exma.": "excelentíssima", "v.ex.ª": "vossa excelência",
}));
const UNIT_WORDS = new Map(Object.entries({
  "km": ["quilômetro", "quilômetros"], "kg": ["quilo", "quilos"], "g": ["grama", "gramas"],
  "mg": ["miligrama", "miligramas"], "ml": ["mililitro", "mililitros"], "l": ["litro", "litros"],
  "m": ["metro", "metros"], "cm": ["centímetro", "centímetros"], "mm": ["milímetro", "milímetros"],
  "min": ["minuto", "minutos"], "s": ["segundo", "segundos"], "km/h": ["quilômetro por hora", "quilômetros por hora"],
  "gb": ["gigabyte", "gigabytes"], "mb": ["megabyte", "megabytes"], "°c": ["grau", "graus"], "°": ["grau", "graus"],
}));
const SYMBOLS = new Map([["&", " e "], ["+", " mais "], ["=", " igual a "], ["@", " arroba "], ["§", " parágrafo "], ["#", " hashtag "]]);

const FRACTIONS = new Map([["1/2", "meio"], ["1/3", "um terço"], ["2/3", "dois terços"], ["1/4", "um quarto"], ["3/4", "três quartos"]]);
const MEASURES = new Map(Object.entries({
  xícara: "f", xícaras: "f", colher: "f", colheres: "f", hora: "f", pizza: "f", dúzia: "f", porção: "f", lata: "f",
  copo: "m", copos: "m", kg: "m", quilo: "m", litro: "m", pacote: "m", tablete: "m", cebola: "f", maçã: "f",
  laranja: "f", limão: "m", pão: "m", metro: "m",
}));

const W = String.raw`[\p{L}\p{N}_]`;
const D = String.raw`[0-9]`;
const NUMBER = String.raw`(?:${D}{1,3}(?:\.${D}{3})+|${D}+)`;
// Python `str.isdecimal` and `re\d` accept decimal digits from every script.
// Normalize those code points to ASCII before the ordered numeric passes.
const DECIMAL_ZEROES = [0x0030,0x0660,0x06f0,0x07c0,0x0966,0x09e6,0x0a66,0x0ae6,0x0b66,0x0be6,0x0c66,0x0ce6,0x0d66,0x0de6,0x0e50,0x0ed0,0x0f20,0x1040,0x1090,0x17e0,0x1810,0x1946,0x19d0,0x1a80,0x1a90,0x1b50,0x1bb0,0x1c40,0x1c50,0xa620,0xa8d0,0xa900,0xa9d0,0xa9f0,0xaa50,0xabf0,0xff10,0x104a0,0x10d30,0x11066,0x110f0,0x11136,0x111d0,0x112f0,0x11450,0x114d0,0x11650,0x116c0,0x11730,0x118e0,0x11950,0x11c50,0x11d50,0x11da0,0x11f50,0x16a60,0x16ac0,0x16b50,0x1d7ce,0x1e140,0x1e2f0,0x1e4f0,0x1e5f1,0x1e950,0x1fbf0];
function pythonText(text) {
  return [...text].map(char => {
    const cp = char.codePointAt(0);
    if (/\p{Nd}/u.test(char)) {
      const start = DECIMAL_ZEROES.find(value => cp >= value && cp < value + 10);
      if (start !== undefined) return String(cp - start);
    }
    return /[\u001c-\u001f\u0085]/u.test(char) ? " " : char;
  }).join("");
}
const MONEY = new RegExp(String.raw`R\$\s?(${NUMBER})(?:,(${D}{1,2}))?(?:\s?(milhões|milhão|bilhões|bilhão|mil)(?!${W}))?`, "gu");
const FRACTION = /(?<![0-9/])(1\/2|1\/3|2\/3|1\/4|3\/4)(?![0-9/])(?=\s+([\p{L}\p{N}_]+))/gu;
const DATE = new RegExp(String.raw`(?<!${W})(\d{1,2})/(\d{1,2})(?:/(\d{4}|\d{2}))?(?!${W})`, "gu");
const TIME = new RegExp(String.raw`(?<!${W})(\d{1,2})(?::(\d{2})|h(\d{2})?(?:min)?)(?!${W})`, "gu");
const PHONE = new RegExp(String.raw`(?:\(?(?<!${W})(\d{2})\)?\s?)?(?<!${W})(\d{4,5})-(\d{4})(?!${W})`, "gu");
const CEP = new RegExp(String.raw`(?<!${W})(\d{5})-(\d{3})(?!${W})`, "gu");
const PERCENT = new RegExp(String.raw`(?<!${W})(\d+(?:,\d+)?)\s?%`, "gu");
const ORDINAL = new RegExp(String.raw`(?<!${W})(\d+)\s?([ºª°])(?![CcFf])`, "gu");
const UNIT = new RegExp(String.raw`(?<!${W})(${NUMBER})(?:,(\d+))?\s?(km/h|°c|km|kg|mg|ml|cm|mm|min|gb|mb|°|g|l|m|s)(?![\p{L}\p{N}_º])`, "giu");
const TIMES = new RegExp(String.raw`(?<!${W})(\d+)\s?x\s?(\d+)(?!${W})`, "gu");

function integer(text) { return BigInt(text.replaceAll(".", "")); }
function belowThousand(n, feminine = false) {
  if (n < 20) { const word = UNITS[n]; return feminine ? ({ um: "uma", dois: "duas" }[word] ?? word) : word; }
  if (n < 100) { const tens = Math.floor(n / 10), unit = n % 10; return TENS[tens] + (unit ? ` e ${belowThousand(unit, feminine)}` : ""); }
  if (n === 100) return "cem";
  const hundreds = Math.floor(n / 100), rest = n % 100;
  let word = HUNDREDS[hundreds];
  if (feminine && word.endsWith("entos")) word = word.slice(0, -5) + "entas";
  return word + (rest ? ` e ${belowThousand(rest, feminine)}` : "");
}
export function cardinal(input, feminine = false) {
  let n = typeof input === "bigint" ? input : BigInt(input);
  if (n < 0n) return `menos ${cardinal(-n, feminine)}`;
  if (n < 1000n) return belowThousand(Number(n), feminine);
  const parts = [];
  for (const [size, one, many] of [[1000000000000n, "um trilhão", "trilhões"], [1000000000n, "um bilhão", "bilhões"], [1000000n, "um milhão", "milhões"], [1000n, "mil", "mil"]]) {
    const count = n / size; n %= size;
    if (count) parts.push([count, count === 1n ? one : `${cardinal(count, feminine && size === 1000n)} ${many}`]);
  }
  if (n) parts.push([n, belowThousand(Number(n), feminine)]);
  if (parts.length === 1) return parts[0][1];
  const last = parts.at(-1)[0], joiner = last < 100n || last % 100n === 0n ? " e " : " ";
  return parts.slice(0, -1).map(([, words]) => words).join(" ") + joiner + parts.at(-1)[1];
}
export function ordinal(input, feminine = false) {
  const n = typeof input === "bigint" ? input : BigInt(input);
  if (n <= 0n || n >= 1000n) return cardinal(n, feminine);
  const value = Number(n), parts = [], hundreds = Math.floor(value / 100), rest = value % 100, tens = Math.floor(rest / 10), unit = rest % 10;
  if (hundreds) parts.push(ORDINAL_HUNDREDS[hundreds]);
  if (tens) parts.push(ORDINAL_TENS[tens]);
  if (unit) parts.push(ORDINAL_UNITS[unit]);
  return parts.map(p => feminine ? p.slice(0, -1) + "a" : p).join(" ");
}
export function digits(text) { return [...text].map(d => UNITS[Number(d)]).join(" "); }
export function decimal(text, feminine = false) {
  const [whole, fraction = ""] = text.split(","), lead = fraction.length - fraction.replace(/^0+/, "").length;
  let words = cardinal(integer(whole), feminine);
  if (fraction) {
    words += " vírgula " + Array(lead).fill("zero").join(" ");
    if (lead && fraction.replaceAll("0", "")) words += " ";
    words += fraction.replaceAll("0", "") ? cardinal(Number(fraction)) : lead ? "" : "zero";
  }
  return words.replace(/\s+/g, " ").trim();
}
export function money(whole, cents) {
  const reais = whole ? integer(whole) : 0n, centavos = cents ? Number((cents + "0").slice(0, 2)) : 0, parts = [];
  if (reais) { let unit = reais === 1n ? "real" : "reais"; if (reais >= 1000000n && reais % 1000000n === 0n) unit = "de reais"; parts.push(`${cardinal(reais)} ${unit}`); }
  if (centavos) parts.push(`${cardinal(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return parts.join(" e ") || "zero real";
}
function belowMeasureFraction(match) {
  const gender = MEASURES.get(match[2].toLowerCase());
  if (!gender) return match[0];
  const words = FRACTIONS.get(match[1]);
  return words === "meio" && gender === "f" ? "meia" : words;
}
export function clock(hours, minutes) {
  const h = Number(hours), m = Number(minutes || 0), words = h ? cardinal(h, true) : "zero";
  if (!minutes || m === 0) return words + (h === 1 || h === 0 ? " hora" : " horas");
  if (m === 30) return words + " e meia";
  return words + " e " + cardinal(m);
}
export function date(day, month, year) {
  const d = Number(day), mo = Number(month);
  if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12)) return null;
  let words = (d === 1 ? "primeiro" : cardinal(d)) + " de " + MONTHS[mo - 1];
  if (year) { let y = Number(year); if (year.length === 2) y += y < 50 ? 2000 : 1900; words += " de " + cardinal(y); }
  return words;
}

function nextWord(text, end) { return (/^\s*([A-Za-zÀ-ÿ-]+)/u.exec(text.slice(end))?.[1] ?? "").toLowerCase(); }
function numbers(text) {
  return text.replace(new RegExp(String.raw`(?<!${W})(${NUMBER})(?:,(\d+))?(?!${W})`, "gu"), (wholeMatch, whole, fraction, offset, input) => {
    const feminine = FEMININE.has(nextWord(input, offset + wholeMatch.length));
    if (fraction !== undefined) return decimal(`${whole},${fraction}`, feminine);
    if (whole.length > 1 && whole.startsWith("0")) return digits(whole);
    return cardinal(integer(whole), feminine);
  });
}
function abbreviations(text) {
  return text.replace(/(?<![\p{L}\p{N}_.])(?:[A-Za-zÀ-ÿ]+\.)+(?:ª)?/gu, (word, offset, input) => {
    const expansion = ABBREVIATIONS.get(word.toLowerCase());
    if (expansion === undefined) return word;
    const spoken = offset === 0 && /\p{Lu}/u.test(word[0]) ? expansion[0].toUpperCase() + expansion.slice(1) : expansion;
    return spoken + (input.slice(offset + word.length).trim() ? "" : ".");
  });
}

/** Same ordered normalization passes as released normalize_ptbr.normalize(). */
export function normalizePtbr(input) {
  let text = pythonText(String(input).normalize("NFC")).replaceAll(" ", " ").replaceAll("–", "-").replaceAll("—", " — ");
  text = abbreviations(text);
  text = text.replace(/(?<![\p{L}\p{N}_])n[º°]\s?(?=\d)/giu, "número ");
  text = text.replace(MONEY, (_m, whole, cents = "", scale = "") => {
    if (!scale) return money(whole, cents);
    let count = cardinal(integer(whole));
    if (cents === "5" || cents === "50") count += ` ${scale} e meio`;
    else if (cents) count = `${decimal(`${whole},${cents}`)} ${scale}`;
    else count += ` ${scale}`;
    return count + (scale === "mil" ? " reais" : " de reais");
  });
  text = text.replace(CEP, (_m, a, b) => `${digits(a)} ${digits(b)}`);
  text = text.replace(PHONE, (_m, ddd = "", first, last) => `${ddd ? cardinal(Number(ddd)) + ", " : ""}${digits(first)}, ${digits(last)}`);
  text = text.replace(FRACTION, (...args) => belowMeasureFraction(args));
  text = text.replace(DATE, (_m, day, month, year) => date(day, month, year) ?? _m);
  text = text.replace(TIME, (_m, hours, colonMinutes, hMinutes) => Number(hours) < 24 ? clock(hours, colonMinutes ?? hMinutes) : _m);
  text = text.replace(PERCENT, (_m, value) => decimal(value) + " por cento");
  text = text.replace(ORDINAL, (_m, value, mark) => ordinal(Number(value), mark === "ª"));
  text = text.replace(UNIT, (_m, whole, fraction, unit) => {
    const [one, plural] = UNIT_WORDS.get(unit.toLowerCase());
    const value = fraction === undefined ? cardinal(integer(whole)) : decimal(`${whole},${fraction}`);
    const isOne = fraction === undefined && integer(whole) === 1n;
    return value + " " + (isOne ? one : plural);
  });
  text = text.replace(TIMES, (_m, a, b) => `${cardinal(Number(a))} por ${cardinal(Number(b))}`);
  text = numbers(text);
  for (const [symbol, words] of SYMBOLS) text = text.replaceAll(symbol, words);
  return text.replace(/\s+/gu, " ").trim();
}
