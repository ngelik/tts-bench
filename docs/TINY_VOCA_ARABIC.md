# Oddadmix Tiny Voca Arabic

The benchmark pins the released FP32 speech checkpoint
`e529f716965142f51835adc9e5661f224c3fa103`, the publisher’s Gradio Space
`64e3e2ae08f7553c38f280a58f05b955a0c296f4`, and the training dataset
`ace6ef2243b47f5152fa95c5c5a6b1db56a05ca2`. It selects the a000 synthetic
Modern Standard Arabic voice at index 0. The speech network predicts phoneme
durations and generates 24 kHz mono PCM with its source-filter waveform
generator. Upstream reports 4,531,723 speech parameters.
[Model](https://huggingface.co/oddadmix/tiny-voca-arabic/tree/e529f716965142f51835adc9e5661f224c3fa103) · [Space](https://huggingface.co/spaces/oddadmix/tiny-voca-arabic/tree/64e3e2ae08f7553c38f280a58f05b955a0c296f4)

## Browser pipeline

For each fixed source span, the adapter follows the Space’s 3,000-code-point
limit, terminal punctuation, number expansion, sentence and clause splitting,
and 500-token utterance limit. It runs the same Python rules and tokenizer in
Pyodide 0.26.4 with NumPy 1.26.4. CATT strips the source vowel marks and predicts
new marks for every uncached phrase, including vowel-marked input. The stock
text cache preserves the resulting diacritization within the active worker.

ONNX Runtime Web 1.20.1 runs both CATT v2 encoder-decoder graphs on single-thread
CPU/WASM. The acoustic graph uses CPU/WASM or WebGPU+WASM. The WebGPU probe
verifies actual hardware dispatch in that graph. The speech checkpoint is
21.364 MB and the two CATT graphs add 92.749 MB. The dashboard reports the three
graphs’ combined 114.113 MB.

The first-PCM event follows the first complete acoustic utterance. The adapter
joins successful utterances in source order with exactly 120 ms of silence
between them and applies one 0.99 peak cap per completed span. The benchmark
uses speed 1.0, pitch shift 0, and pitch range 1. English-only controls produce
no PCM.

## Benchmark boundary

The warm protocol runs one full article as the excluded warm-up. The same
worker retains that article’s phrase cache for all three scored repetitions.
The separate cached-resource protocol opens a fresh worker with cached model
assets. During its full article, CATT runs for each newly encountered phrase.

The headed Chrome frontend audit matched all 129 spans and 339 utterance plans.
The longest plan has 194 tokens, and the audit found zero unknown token IDs or
words. The token/stress digest is
`1f5bce0f95699c495b17ec67838ba5f3269bbd2fb631499ab40b26eebe8b3194`.
The full article used 339 encoder batches and 11,625 decoder steps for 586
unique phrases. The three-span smoke validates its own deterministic subset.

## Reproduction

```sh
model_revision=e529f716965142f51835adc9e5661f224c3fa103
space_revision=64e3e2ae08f7553c38f280a58f05b955a0c296f4
python3 tools/tiny-voca-arabic/extract-catt.py \
  ".cache/public/models/tiny-voca-arabic/$model_revision/$space_revision/assets/catt"
npm run assets -- fetch --model tiny-voca-arabic
npm run assets -- verify --model tiny-voca-arabic
npm run bench -- run --model tiny-voca-arabic --backend cpu --fixture ar-article-v1 --smoke
npm run bench -- run --model tiny-voca-arabic --backend webgpu --fixture ar-article-v1 --smoke
```

Pass `--archive PATH` to use the previously downloaded official CATT ZIP. The
extractor checks the archive and both ONNX members. Abjad AI’s Apache-2.0
relicensing statement and the historical v2 tag are recorded in the retained
notice.
[Asset provenance and license history](../web/tiny-voca-arabic/NOTICE.md)
