# Serhiy 0.58M — Ukrainian browser results

Four native cells use clean source `9870c198651481dfed69ece7dc7bb88d870edabd`, Apple M1 Pro (8 cores, 16 GiB), and Chrome 157.0.8103.40. The [plan](plan.json) runs CPU cached → CPU warm → GPU cached → GPU warm. Each warm cell has one excluded article and five scored articles; memory comes from a separate cached article.

The Ukrainian fixture has **19,980 characters, 36,364 UTF-8 bytes and 92 spans** ([text and provenance](../../../fixtures/uk-article-v1.meta.json)). It is an AI-assisted translation without independent human review. Ukrainian results remain separate from English tables.

CPU warm median: **8.923440 s**. Mixed WebGPU/WASM median: **9.358720 s**. CPU is **1.049× faster** in this full-pipeline pair. The [strict comparison rejection](strict-comparison.json) records GPU-only provider/thread metadata; the shared synthesis settings match. GPU capability separately verified 822 dispatches. This is an end-to-end implementation comparison, not an isolated kernel-speed claim.

- [CPU timing and memory report](../../../reports/ua-serhiy-uk-cpu/overview.md)
- [GPU timing and memory report](../../../reports/ua-serhiy-uk-webgpu/overview.md)
- [Timing chart](runtime-comparison.svg) · [Ukrainian memory chart](../../reference-memory-uk.svg)
- [Full recordings and hashes](public-audio.json) · [Native checkpoints and recording proofs](evidence/)

Both public recordings are unchanged **warm trial 5**, with exact 30-second PCM-prefix clips. CPU/GPU PCM hashes differ despite equal duration. Each unchanged WAV has eight negative full-scale PCM16 samples; neither has a constant run ≥100 ms. Integrity checks do not establish pronunciation or listening quality.

## Attribution

Original synthetic narration by dmytro-m’s Serhiy 0.58M (student/reference GPL-3.0, sanoTTS by Ampixa), distilled from the Serhiy Piper teacher (Apache-2.0), using a corpus identified as MIT. See the pinned [NOTICE](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/NOTICE.md) and [card](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/README.md). This is attribution, not an output-license grant or independent speaker-consent audit. No publisher demos, corpus recordings, weights or runtime bundles are included.

## Initial attempt

[Preserved evidence](original-attempt/) records two completed CPU cells and a GPU cached setup error on earlier source `1b44a949…`: Cache Storage failed before any GPU trial, and GPU warm never started. After the cache/timing-boundary fix, all four cells were rerun on the final source. Earlier scores are excluded from this cohort.
