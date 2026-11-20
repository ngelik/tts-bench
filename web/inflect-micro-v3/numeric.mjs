// JavaScript port of the pinned native_english_numeric_frontend_20261031.py.
// This is deliberately conservative: only explicit quantities/ranges and
// subtraction constructions are rewritten; protected identifiers stay intact.

const SMALL = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
const NUMBER = '[+\\-]?[0-9]{1,12}(?:\\.[0-9]{1,6})?';
const UNIT = '(?:degrees?[ \\t]+(?:Celsius|Fahrenheit|Kelvin)|millilit(?:er|re)s?|kilomet(?:er|re)s?|centimet(?:er|re)s?|millimet(?:er|re)s?|kilograms?|milligrams?|grams?|lit(?:er|re)s?|met(?:er|re)s?|seconds?|minutes?|hours?|days?|weeks?|months?|years?|degrees?|percent|million|billion|thousand|Celsius|Fahrenheit|Kelvin|kg|mg|km|cm|mm|ml|g|m|%|\\u00b0[CFK])';
const COMMON = '(?<![\\p{L}\\p{N}_./+\\-])(?<left>' + NUMBER + ')[ \\t]*(?<dash>[-\\u2013\\u2014])[ \\t]*(?<right>' + NUMBER + ')';
const BOUNDARY = '(?![\\p{L}\\p{N}_/+\\-]|\\.\\p{L})';
const RANGE = new RegExp(COMMON + '[ \\t]*(?<unit>' + UNIT + ')(?![\\p{L}\\p{N}_])' + BOUNDARY, 'giu');
const RANGE_SYMBOL = new RegExp(COMMON + '[ \\t]*(?<unit>%|\\u00b0[CFK])' + BOUNDARY, 'giu');
const EQUATION = new RegExp(COMMON + '(?:[ \\t]*(?<unit>' + UNIT + '))?[ \\t]*=[ \\t]*(?<result>' + NUMBER + ')(?:[ \\t]*(?<result_unit>' + UNIT + '))?' + BOUNDARY, 'giu');
const INSTRUCTION = new RegExp(COMMON + '(?:[ \\t]*(?<unit>' + UNIT + '))?' + BOUNDARY, 'giu');
const CLAUSE = /[!?;]|(?<![0-9])\.(?![0-9])/gu;
const MATH_END = /(?<![\p{L}\p{N}_])(?:calculate|compute|evaluate|subtract)\s*:?\s*$/iu;
const MATH_CONTEXT = /(?<![\p{L}\p{N}_])(?:calculate|compute|evaluate|subtract|subtraction|equation|expression|arithmetic|difference|minus|solve|what|how)(?![\p{L}\p{N}_])|[=<>]/iu;
const IDENTIFIER_END = /(?<![\p{L}\p{N}_])(?:version|build|model|sku|id|isbn|rfc|serial|part|phone|tel|fax|ip|ipv4|ipv6|address|date|release)\s*[:#]?\s*(?:[A-Z][A-Z0-9_.-]{0,24}\s+)?$/iu;
const PROTECTED = /```[\s\S]*?(?:```|$)|`[^`]*(?:`|$)|https?:\/\/\S+|www\.\S+|(?<![\p{L}\p{N}_])(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?:[/?#][^\s<>]*)?|(?<![\p{L}\p{N}_])[A-Za-z_][\w.]*\([^\n]*(?:\n|$)|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|!?\[[^\]]*\]\([^)]*\)|[A-Za-z]:[\\/]\S+|(?<!\w)\/(?:[\w.-]+\/)*[\w.-]+|(?<![0-9])[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(?![0-9])|(?<![\p{L}\p{N}_])[0-9]+(?:\.[0-9]+)?[eE][+-]?[0-9]+(?![\p{L}\p{N}_])|(?<!\w)[+-]?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?/giu;
const UNITS = new Map([
  ['kg', 'kilograms'], ['mg', 'milligrams'], ['g', 'grams'], ['km', 'kilometers'],
  ['cm', 'centimeters'], ['mm', 'millimeters'], ['m', 'meters'], ['ml', 'milliliters'],
  ['%', 'percent'], ['°c', 'degrees Celsius'], ['°f', 'degrees Fahrenheit'], ['°k', 'degrees Kelvin'],
]);

function integerWords(raw) {
  const value = BigInt(raw);
  if (value < 20n) return SMALL[Number(value)];
  if (value < 100n) return TENS[Number(value / 10n)] + (value % 10n ? ' ' + SMALL[Number(value % 10n)] : '');
  if (value < 1000n) return SMALL[Number(value / 100n)] + ' hundred' + (value % 100n ? ' ' + integerWords(String(value % 100n)) : '');
  for (const [scale, name] of [[1_000_000_000n, 'billion'], [1_000_000n, 'million'], [1000n, 'thousand']]) {
    if (value >= scale) return integerWords(String(value / scale)) + ' ' + name + (value % scale ? ' ' + integerWords(String(value % scale)) : '');
  }
  throw new Error('Unsupported integer.');
}

function say(raw, negative = 'minus') {
  let value = raw;
  let sign = '';
  if (value[0] === '+' || value[0] === '-') {
    sign = (value[0] === '+' ? 'plus' : negative) + ' ';
    value = value.slice(1);
  }
  const [whole, fraction] = value.split('.');
  if (whole.length > 1 && whole.startsWith('0')) throw new Error('Ambiguous leading-zero identifier.');
  return sign + integerWords(whole) + (fraction === undefined ? '' : ' point ' + [...fraction].map(digit => SMALL[Number(digit)]).join(' '));
}

function unit(value) {
  return value ? UNITS.get(value.toLowerCase()) ?? value : '';
}

function context(text, start, end) {
  const prefix = text.slice(0, start).split(CLAUSE).at(-1);
  const suffix = text.slice(end).split(CLAUSE, 2)[0];
  return [prefix, suffix];
}

function overlap(a, b) {
  return a[0] < b[1] && a[1] > b[0];
}

export function normalizeMicroNumbers(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 20_000) {
    throw new Error('Micro numeric normalization requires nonempty text of at most 20000 characters.');
  }
  const protectedSpans = [...text.matchAll(PROTECTED)].map(match => [match.index, match.index + match[0].length]);
  const edits = [];
  const eligible = match => {
    const span = [match.index, match.index + match[0].length];
    if (protectedSpans.some(protectedSpan => overlap(span, protectedSpan)) || edits.some(edit => overlap(span, [edit.start, edit.end]))) return false;
    const [prefix, suffix] = context(text, ...span);
    if (IDENTIFIER_END.test(prefix)) return false;
    if (['unit', 'result_unit'].some(key => ['M', 'G', 'MG', 'MM', 'ML', 'CM', 'KM'].includes(match.groups[key]))) return false;
    if (/(?<![\p{L}\p{N}_])[xyznm]\s*$/iu.test(prefix)) return false;
    if (match.groups.left?.startsWith('+') || match.groups.left?.startsWith('-')) {
      if (/[0-9]\s*$/u.test(prefix)) return false;
    }
    if (/^\s*[+\-*/^=<>]/u.test(text.slice(span[1])) || /[+\-*/^=<>]\s*$/u.test(text.slice(0, span[0]))) return false;
    return true;
  };
  const record = (match, replacement, kind) => edits.push({
    start: match.index,
    end: match.index + match[0].length,
    original: match[0],
    replacement,
    kind,
    operands: Object.fromEntries(['left', 'right', 'result'].filter(key => match.groups[key] !== undefined).map(key => [key, match.groups[key]])),
  });

  for (const match of text.matchAll(EQUATION)) {
    if (!eligible(match) || match.groups.dash !== '-') continue;
    try {
      let spoken = say(match.groups.left) + ' minus ' + say(match.groups.right, 'negative');
      if (match.groups.unit) spoken += ' ' + unit(match.groups.unit);
      spoken += ' equals ' + say(match.groups.result);
      if (match.groups.result_unit) spoken += ' ' + unit(match.groups.result_unit);
      record(match, spoken, 'subtraction_equation');
    } catch { /* Preserve unsupported or ambiguous notation. */ }
  }

  for (const match of text.matchAll(INSTRUCTION)) {
    if (!eligible(match) || match.groups.dash !== '-' || !MATH_END.test(context(text, match.index, match.index + match[0].length)[0])) continue;
    try {
      let spoken = say(match.groups.left) + ' minus ' + say(match.groups.right, 'negative');
      if (match.groups.unit) spoken += ' ' + unit(match.groups.unit);
      record(match, spoken, 'subtraction_instruction');
    } catch { /* Preserve unsupported or ambiguous notation. */ }
  }

  for (const pattern of [RANGE, RANGE_SYMBOL]) {
    for (const match of text.matchAll(pattern)) {
      if (!eligible(match)) continue;
      const [prefix, suffix] = context(text, match.index, match.index + match[0].length);
      if (MATH_CONTEXT.test(prefix + match[0] + suffix)) continue;
      const connector = /(?<![\p{L}\p{N}_])between\s*$/iu.test(prefix) ? ' and ' : ' to ';
      try { record(match, say(match.groups.left) + connector + say(match.groups.right) + ' ' + unit(match.groups.unit), 'quantity_range'); }
      catch { /* Preserve unsupported or ambiguous notation. */ }
    }
  }

  edits.sort((a, b) => a.start - b.start);
  let spokenText = text;
  for (const edit of edits.toReversed()) spokenText = spokenText.slice(0, edit.start) + edit.replacement + spokenText.slice(edit.end);
  if (spokenText.length > 20_000) throw new Error('Micro derived text exceeds 20000 characters; no truncation.');
  return { spokenText, edits };
}
