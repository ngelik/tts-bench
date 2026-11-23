// Port of the pinned semfence/tiny-voca-ptbr browser front end.
// Dizione and tokenizer implementations are copied verbatim from Space revision
// a456470df5589478e3fb3f1973457771f4c056bd; only the source worker's sentence
// fitting contract is adapted into this importable module.
export function createFrontend({ Dizione, symbols, makeTokenizer }, lexiconTsv, openTable, maxTokens = 512) {
  const dizione = new Dizione(lexiconTsv, openTable);
  const tokenize = makeTokenizer(symbols);
  const abbreviations = /(?:(?<![A-Za-zÀ-ÖØ-öø-ÿ0-9_])(?:dr|dra|prof|profa|sr|sra|srta|av|tel|obs|etc|ex|nº|vs)|(?<![A-Za-zÀ-ÖØ-öø-ÿ0-9_])[A-ZÀ-ÖØ-Ý])\.$/i;
  function sentences(text) {
    const parts = [];
    let current = '';
    for (const piece of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9À-ÖØ-Ý])/)) {
      current = current ? current + ' ' + piece : piece;
      if (!abbreviations.test(current)) {
        parts.push(current);
        current = '';
      }
    }
    if (current) parts.push(current);
    return parts.filter(part => /[\p{L}\p{N}]/u.test(part));
  }
  function finished(text) {
    const body = text.replace(/\s+$/, '');
    if (!body) return text;
    const last = body.split(/\s+/).pop();
    const marked = /[\p{L}\p{N}]/u.test(last)
      ? /[.!?…,;:]["'”’)\]»]*$/.test(last)
      : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
    return marked ? text : body + '.';
  }
  function fit(sentence) {
    const result = tokenize(dizione.pieces(sentence));
    if (!result) return [];
    if (result.ids.length <= maxTokens - 12) return [result];
    const pieces = sentence.split(/(?<=[,;:—])\s+/);
    if (pieces.length > 1) return pieces.flatMap(fit);
    const words = sentence.split(' ');
    if (words.length < 2) return [];
    const half = Math.ceil(words.length / 2);
    return [...fit(words.slice(0, half).join(' ')), ...fit(words.slice(half).join(' '))];
  }
  return {
    symbols: symbols.SYMBOLS,
    planText(text) { return sentences(finished(text)).flatMap(fit); },
  };
}
