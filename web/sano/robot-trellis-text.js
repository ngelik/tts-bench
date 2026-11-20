// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 Ampixa
// Derived from the splitChunks behavior in the pinned SanoTTS demo at
// Ampixa/sanoTTS c0584a51213721faba98135821faab71bae888f0.
(function (root) {
  'use strict';

  function splitChunks(text) {
    if (typeof text !== 'string') throw new TypeError('Sano Robot/Trellis source text must be a string.');
    const MAX = 120;
    const MIN = 40;
    const sents = text.match(/[^.!?।。！？]+[.!?।。！？]*\s*/g) || [text];
    for (let i = sents.length - 2; i >= 0; i--) {
      if (/\p{Nd}\.$/u.test(sents[i].trimEnd()) && /^\s*\p{Nd}/u.test(sents[i + 1])) {
        sents[i] = sents[i].trimEnd() + sents[i + 1];
        sents.splice(i + 1, 1);
      }
    }
    const chunks = [];
    for (let sentence of sents) {
      sentence = sentence.trim();
      if (!sentence) continue;
      while (sentence.length > MAX) {
        let cut = -1;
        for (const match of sentence.matchAll(/[,;:、，；：]\s*/g)) {
          const end = match.index + match[0].length;
          if (end >= MIN && end <= MAX) cut = end;
        }
        if (cut < 0) {
          const space = sentence.lastIndexOf(' ', MAX);
          cut = space > MIN ? space + 1 : MAX;
        }
        chunks.push(sentence.slice(0, cut).trim());
        sentence = sentence.slice(cut).trim();
      }
      if (sentence) chunks.push(sentence);
    }
    return chunks.length ? chunks : [text];
  }

  function nonWhitespace(text) {
    return Array.from(text).filter(char => !/\s/u.test(char)).join('');
  }

  function assertCoverage(text, pieces) {
    const actual = pieces.map(nonWhitespace).join('');
    const expected = nonWhitespace(text);
    if (actual !== expected) throw new Error('Sano Robot/Trellis split changed non-whitespace source characters.');
    return { sourceNonWhitespaceCharacters: Array.from(expected).length, pieces: pieces.length };
  }

  root.SanoRobotTrellisText = Object.freeze({ splitChunks, nonWhitespace, assertCoverage });
})(typeof globalThis !== 'undefined' ? globalThis : this);
