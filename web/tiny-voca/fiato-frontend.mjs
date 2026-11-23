// Sentence and punctuation rules from Fiato's Apache-2.0 browser worker. See NOTICE.md.
import { FIATO } from '../adapters/fiato-profile.mjs';

const config = { expressions: FIATO.expressions };
function sentences(text) {
  const abbreviation = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc)|\b[A-Z])\.$/i;
  const parts = [];
  let current = "";
  for (const piece of text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/)) {
    current = current ? current + " " + piece : piece;
    if (!abbreviation.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts;
}
function finished(sentence) {
  const words = sentence.split(" ");
  let last = words.length - 1;
  while (last > 0 && config.expressions.includes(words[last])) last--;
  if (config.expressions.includes(words[last])) return sentence;
  return /[.!?…,;:]["')\]]*$/.test(words[last]) ? sentence : sentence + ".";
}
export { sentences, finished };
