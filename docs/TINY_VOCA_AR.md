# Abdullah Tiny Voca Arabic M2

This profile pins Abdullah’s FP32 checkpoint at
`dcdf56c10c536d4df74576f036b512c0d212e17f`. The stock demo served the same graph
and configuration. Its 9,243-byte worker had SHA-256
`b95d09456a02b25d5afbea716b4ec9ea0b5c3c12908cf8c259fd9f0fe5189962`.
[Pinned release](https://huggingface.co/abdullah/tiny-voca-ar/tree/dcdf56c10c536d4df74576f036b512c0d212e17f) · [Publisher demo](https://tiny-voca-ar-site.pages.dev/)

- The ONNX graph is 21,388,681 bytes with SHA-256
  `e15b25eb8164fc5e575472f58c6edf4fa141245cf8faa254427c232a449944e9`.
  Its 1,764-byte metadata has SHA-256
  `d32e39061e02b6879412bc7f6aa10ae7a93b3d5f0d37d4f205cc2701ad55d6af`.
- Upstream reports 4,537,867 parameters and 79,955 training steps. Audio is
  24 kHz mono with a hop of 256 samples. The graph accepts up to 512 tokens
  and 3,000 frames. The release worker fits utterances to 500 tokens.
- The checkpoint has two speaker slots. It trains M2 at index 1 and leaves
  F2 untrained. The benchmark uses the demo’s default speed 1.0 with pitch
  shift 0 and pitch range 1. The publisher recommends speed 1.3 for natural
  pacing.
- The 49,809-byte `tiny_voca/text.py` member has SHA-256
  `d623f77fd78c53def6908edba580a0f04962097cdb70cd1fbffcea917db22b22`.
  It is extracted unchanged from the pinned 0.2.0 wheel, whose SHA-256 is
  `6962f6d33fa473d496be928ca8e3e88ae7a42056be861b3b5c8294c11f5234c4`.
- The worker runs that frontend in Pyodide 0.26.4. It reads the vowel marks
  supplied by the input and uses its own NFKC and structured-number rules.
  The adapter keeps the stock sentence fitting and applies one 0.99 peak cap
  to each completed source span.
- Both providers use ONNX Runtime Web 1.20.1 and one WASM thread. WebGPU uses
  the locked JSEP files and requests `[webgpu, wasm]`. The browser observed
  hardware dispatch. Frontend work and operators without WebGPU support run
  on CPU.

The fixed `ar-article-v1` fixture has SHA-256
`3421fd109af55f52743b89b377a81e55e9ed524bd717f334d81638fc091f94d5`.
The browser matched all 129 spans and 340 utterance plans. The longest plan
has 189 tokens. The audit found zero unknown token IDs or words and matched
token/stress SHA-256
`aff88555e8f3b33e73656fbdc38cbc8fca3b345d3128a1a0d1316be5e03ffc0d`.
Use fully vowel-marked Modern Standard Arabic. English-only and
punctuation-only controls produced no PCM.

The publisher credits upstream Tiny Voca, the SILMA TTS teacher, the CC BY 4.0
ClArTTS transcripts and the Arabic Speech Corpus speaker reference. It states
that clearance for client use of the reference voice remains unresolved.
[Release notice](../web/tiny-voca-ar/NOTICE.md) · [Model card and reference voice](https://huggingface.co/abdullah/tiny-voca-ar/blob/dcdf56c10c536d4df74576f036b512c0d212e17f/README.md#reference-voice)

## Reproduction

```sh
npm run assets -- fetch --model tiny-voca-ar
npm run assets -- verify --model tiny-voca-ar
```

The asset lock fetches the graph and metadata from the immutable Hugging Face
revision and stages the verified wheel member from `web/tiny-voca-ar/text.py`.
