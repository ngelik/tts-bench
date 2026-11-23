# Tiny Swara Bengali profile

This profile uses the INT8 ONNX checkpoint from
[`Xeven7/tiny-swara`](https://huggingface.co/Xeven7/tiny-swara/tree/9432a340c46249c8acae4ff4b062d46b9cbd1991)
at revision `9432a340c46249c8acae4ff4b062d46b9cbd1991`. The checkpoint has two
bundled voices: BF (female, index 0) and BM (male, index 1). BF is the benchmark
default. It supports Bengali (`bn`) with a 24 kHz mono output. Defaults match
the released inference code: speed 1, pitch shift 0 and pitch range 1.

Run the `bn-article-v1` fixture. The frontend uses eSpeak NG 1.52.0 Bengali
(`bn`) phonemization. Known Latin words in the released lexicon are respelled
and phonemized in Bengali. Other Latin words use `en-us` phones projected
through the Bengali inventory and fallback table. This is a code-mix input
route, not an English voice or an English benchmark profile. The adapter only
registers `bn`; Romanized Bengali and English are not result routes.

The adapter ports the checkpoint's v3 frontend into JavaScript and passes a
raw eSpeak trace function into it. It retains source text splitting, the 77
symbol IDs, stress feature and fallback mappings. Unknown phones fail instead
of being dropped. The full Bengali fixture has 89 spans and 305 model plans;
the pinned source oracle reports a maximum of 220 tokens and no unknowns.
The browser worker checks those token/stress plans before smoke synthesis.

The upstream inference path normalizes each sentence independently to peak
0.9 when its peak is nonzero, then concatenates sentences without another
span-level cap. The ONNX graph includes `RandomNormalLike`; small differences
in generated durations and samples across repeated executions or CPU versus
WebGPU are expected. The adapter preserves this behavior and does not claim
bit-identical PCM.

The model card reports 4,537,483 parameters for the synthesis model, including
the waveform generator. This value selects the standard warm repetition
schedule. See [parameter evidence](../lib/model-parameters.json).

The JS frontend source, asset pins and separate component terms are recorded in
[`web/tiny-swara/NOTICE.md`](../web/tiny-swara/NOTICE.md) and
[`docs/LICENSING.md`](LICENSING.md). The code and checkpoint are Apache-2.0;
eSpeak NG and its data are GPL-3.0-or-later; ONNX Runtime Web is MIT. The model
card asks users to follow the CC BY 4.0 Rasa dataset terms for redistributed
derived audio. These terms do not grant blanket rights to publish benchmark
recordings.

The upstream config declares frontend fingerprint
`54cece4f400be1fbb56c30bbeedbcdcf5d432702e6d8c6389f44fbb79dc4c94b`, which
omits code-mix fallback entries present in the released inventory. Recomputing
with all pinned inventory mappings produces
`9b2e2c1495ada4f44cb6a52c1fb7811fb7756beda6ae20185d9b66ef6195bada`. The
fixture audit matches the native source oracle, and both values are retained
in adapter settings for provenance.
