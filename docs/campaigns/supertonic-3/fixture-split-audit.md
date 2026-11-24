# How Supertonic splits each language’s article

Earlier multilingual receipts carry an English example in `settings.frontend`. Its 93 source spans, 111 internal utterances and 18 pauses describe the English article. For Italian the corresponding counts are 107, 133 and 26. Every Italian CPU timing round and the separate memory run produced audio for all 107 source spans. [Italian CPU timing receipt](../../../results/2026-11-24t12-50-55-910z-supertonic-3-cpu-warm-6fb947fe/summary.md)

The table uses the article and chunk hashes from the scoring revision. Each source span went through the official helper’s text splitter using its model language tag. These are text-processing counts. A source span may yield several utterances. The helper inserts 0.3 seconds of silence between successive utterances in that span. [Scoring source](https://github.com/ngelik/tts-bench/tree/448eba5382c28247e98d389e151a1983a109d8ce/web/supertonic)

The target is 120 UTF-16 code units for Korean and Japanese and 300 for the other languages. A sentence can exceed the target when the splitter finds no recognized sentence boundary. The longest Japanese piece was 249 code units.

| Language board | Source spans | Internal utterances | Inserted pauses |
|---|---:|---:|---:|
| [`ar`](https://ngelik.github.io/tts-bench/?lang=ar) | 129 | 153 | 24 |
| [`bg`](https://ngelik.github.io/tts-bench/?lang=bg) | 94 | 119 | 25 |
| [`cs`](https://ngelik.github.io/tts-bench/?lang=cs) | 85 | 110 | 25 |
| [`da`](https://ngelik.github.io/tts-bench/?lang=da) | 92 | 116 | 24 |
| [`de`](https://ngelik.github.io/tts-bench/?lang=de) | 109 | 135 | 26 |
| [`el`](https://ngelik.github.io/tts-bench/?lang=el) | 109 | 135 | 26 |
| [`en`](https://ngelik.github.io/tts-bench/?lang=en) | 93 | 111 | 18 |
| [`es-ES`](https://ngelik.github.io/tts-bench/?lang=es-ES) | 105 | 131 | 26 |
| [`et`](https://ngelik.github.io/tts-bench/?lang=et) | 87 | 110 | 23 |
| [`fi`](https://ngelik.github.io/tts-bench/?lang=fi) | 95 | 119 | 24 |
| [`fr`](https://ngelik.github.io/tts-bench/?lang=fr) | 108 | 133 | 25 |
| [`hi`](https://ngelik.github.io/tts-bench/?lang=hi) | 91 | 115 | 24 |
| [`hr`](https://ngelik.github.io/tts-bench/?lang=hr) | 92 | 118 | 26 |
| [`hu`](https://ngelik.github.io/tts-bench/?lang=hu) | 96 | 121 | 25 |
| [`id`](https://ngelik.github.io/tts-bench/?lang=id) | 101 | 127 | 26 |
| [`it`](https://ngelik.github.io/tts-bench/?lang=it) | 107 | 133 | 26 |
| [`ja`](https://ngelik.github.io/tts-bench/?lang=ja) | 38 | 61 | 23 |
| [`ko`](https://ngelik.github.io/tts-bench/?lang=ko) | 47 | 125 | 78 |
| [`lt`](https://ngelik.github.io/tts-bench/?lang=lt) | 90 | 116 | 26 |
| [`lv`](https://ngelik.github.io/tts-bench/?lang=lv) | 92 | 117 | 25 |
| [`nl`](https://ngelik.github.io/tts-bench/?lang=nl) | 101 | 126 | 25 |
| [`pl`](https://ngelik.github.io/tts-bench/?lang=pl) | 98 | 123 | 25 |
| [`pt-BR`](https://ngelik.github.io/tts-bench/?lang=pt-BR) | 101 | 127 | 26 |
| [`ro`](https://ngelik.github.io/tts-bench/?lang=ro) | 98 | 124 | 26 |
| [`ru`](https://ngelik.github.io/tts-bench/?lang=ru) | 95 | 119 | 24 |
| [`sk`](https://ngelik.github.io/tts-bench/?lang=sk) | 88 | 114 | 26 |
| [`sl`](https://ngelik.github.io/tts-bench/?lang=sl) | 93 | 118 | 25 |
| [`sv`](https://ngelik.github.io/tts-bench/?lang=sv) | 92 | 118 | 26 |
| [`tr`](https://ngelik.github.io/tts-bench/?lang=tr) | 94 | 118 | 24 |
| [`uk`](https://ngelik.github.io/tts-bench/?lang=uk) | 92 | 108 | 16 |
| [`vi`](https://ngelik.github.io/tts-bench/?lang=vi) | 91 | 116 | 25 |
