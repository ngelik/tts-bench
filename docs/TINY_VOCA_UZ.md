# Tiny Voca Uzbek Navoiy

This profile uses Inomjonov's single-speaker M2 checkpoint at model revision
`3d960bd05c728b21fff4ec5154cada7f6b082df1`, with the parent Tiny Voca code
revision `62e2adef158bc997042cc6234f541f1e0e4cd55d`. The checkpoint is an Uzbek
Latin student trained from scratch at step 104,737. Its pinned card reports
4,531,531 learned parameters, matching the staged export receipt. The ONNX graph
is FP32, 21,357,838 bytes, and SHA-256
`7003f4334796dbc08d932cd00e08945d3285eb3b9d9df9c34da29b7b0e563052`.

## Source and reproducible export

The publisher provides the PyTorch checkpoint and model source; the ONNX graph
used here is a **local export**, generated from that checkpoint with Nazeem's
pinned `export.py`. `tools/tiny-voca-uz/build-inputs.json` pins the checkpoint
and Python/export source inputs by URL, byte size and SHA-256. The staged
one-off build script had SHA-256
`4d534226b89a44c56ba140a5038a3704da5f2e69af74df9c3e8d5a3a2b8d7994`; the
portable repository wrapper has SHA-256
`b20afff8dd92c9c491e90241d6751321de4263dc372290e2a22fcd96ce39e1a9`. The
retained `export-receipt.json` records PyTorch 2.8.0, ONNX 1.18.0, the pinned
parent exporter, exact graph hash, fixture hash and deterministic input-noise
files. It exports opset 17 with the publisher's checkpoint, checks the ONNX
graph, uses an explicit seventh `noise` input, and confirms that the graph has
no random operator. The model metadata preserves the trained 48-symbol
frontend fingerprint and graph ABI.

To prepare the source files, clone the exact Hugging Face model revision and the
separately pinned Tiny Voca source, then install the parent's exporter into the
model checkout. The build input manifest checks that file against the pinned
raw GitHub URL and SHA-256. ONNX Runtime Web is not part of the Python export;
`npm ci` installs the lockfile's `onnxruntime-web-pocket` alias at 1.31.1, which
the normal assets importer stages and verifies.

```sh
git clone https://huggingface.co/Inomjonov/tiny-voca-uzbek-navoiy /path/to/uzbek-source
git -C /path/to/uzbek-source checkout 3d960bd05c728b21fff4ec5154cada7f6b082df1
git clone https://github.com/n4ze3m/tiny-voca.git /path/to/tiny-voca-source
git -C /path/to/tiny-voca-source checkout 62e2adef158bc997042cc6234f541f1e0e4cd55d
cp /path/to/tiny-voca-source/src/tiny_voca/export.py /path/to/uzbek-source/src/tiny_voca/export.py
```

Then use the recorded dependency versions and run:

```sh
python tools/tiny-voca-uz/build-onnx.py \
  --source-root /path/to/uzbek-source \
  --inputs tools/tiny-voca-uz/build-inputs.json \
  --fixture-root fixtures \
  --out-dir /path/to/uzbek-m2-build
```

The author-owned weights are the PyTorch checkpoint; the ONNX model and five
noise tensors are locally generated outputs. The exact artifacts used for this
adapter were already exported and staged by the user. They were not rebuilt
during adapter implementation. To import a build directory into the harness
cache and verify it:

```sh
npm run assets -- import --model tiny-voca-uz-navoiy \
  --source /path/to/uzbek-m2-build --accept-license
npm run assets -- verify --model tiny-voca-uz-navoiy --accept-license
npm run bench -- models --language uz
```

The import command reads the locally exported ONNX graph, exported `config.json`
and all five noise streams from that build directory. Every generated asset has a
pinned size and SHA-256 in `assets.lock.json`; the runtime files come separately
from ONNX Runtime Web 1.31.1.

## Frontend and audio behavior

The worker ports the model's Python `normalize(..., mode="infer")`, `sentences`,
`finished`, `phonemize` and `shorter` behavior. It does not drop unknown symbols
or truncate text. The native Python controls match the browser port for all 105
ordered `uz-article-v1` spans and 11 normalization edge cases: 345 utterances,
maximum 191 tokens, zero unknowns, and complete token/stress digest
`e4be32f73dadb28f35412cdea215919e46cf81d6906bbf2a1fe389229b2741c0`.

Each span is normalized and split into sentences, then into token-budgeted
utterances using the publisher's 500-token fitting margin. It uses voice M2 at
index 0, speed 1, pitch shift 0, pitch range 1, 24 kHz mono, and no added
inter-utterance silence. The adapter feeds a separate 768,000-sample PyTorch
noise stream for each utterance index 42 through 46. These are the staged
`torch.randn` inputs generated with seeds 42 through 46; the index restarts at 42
for each source span, matching the publisher's `seed + utterance_number` call
pattern. Output samples are trimmed to the graph's actual duration vector and
concatenated in order. The only postprocessing is the publisher's per-span
peak limiter: reduce a span to 0.99 if its raw peak exceeds 0.99, and otherwise
leave its amplitude alone. Duration is not padded, trimmed or resampled.

The publisher's rule-based stress places baseline stress on the final vowel.
The parity audit proves that browser token/stress output matches the staged
Python controls; it does not establish pronunciation quality or model output
fidelity. No independent ASR, listener or MOS review is claimed.

## Backend qualification boundary

The lock and adapter configure explicit one-thread ONNX Runtime Web 1.31.1
CPU/WASM and WebGPU with WASM operator fallback. The WebGPU adapter rejects a
software adapter and requires an actual compute-dispatch probe in the harness.
Three source spans qualified in headed Chrome on the reference Apple M1 Pro. The one-thread WASM output matched independent seeded controls sample for sample after PCM16 conversion. Hardware WebGPU with WASM fallback matched all three span lengths and the reference audio energy envelopes.

```sh
npm run bench -- run --model tiny-voca-uz-navoiy --backend cpu --fixture uz-article-v1 --smoke --accept-license
npm run bench -- run --model tiny-voca-uz-navoiy --backend webgpu --fixture uz-article-v1 --smoke --accept-license
```

## License and generated-audio attribution

The pinned model card declares Apache-2.0 for the weights and bundled Tiny Voca
adaptation. It reports 7.695 hours of synthetic training speech generated by
Aisha AI's Navoiy TTS from Common Voice Uzbek sentences and project-written
scripts. Credit Inomjonov, Muhammed Nazeem for Tiny Voca, Aisha AI for Navoiy,
and Mozilla Common Voice Uzbek where applicable when publishing an authorized
audio example. These provenance notes do not establish a separate blanket
redistribution grant for generated audio or independent speaker consent.

[Pinned model release](https://huggingface.co/Inomjonov/tiny-voca-uzbek-navoiy/tree/3d960bd05c728b21fff4ec5154cada7f6b082df1) ·
[Pinned model card](https://huggingface.co/Inomjonov/tiny-voca-uzbek-navoiy/blob/3d960bd05c728b21fff4ec5154cada7f6b082df1/README.md) ·
[Tiny Voca source](https://github.com/n4ze3m/tiny-voca/tree/62e2adef158bc997042cc6234f541f1e0e4cd55d) ·
[Navoiy teacher](https://huggingface.co/aisha-org/navoiy-tts/tree/9445f41ee5f38bd3a34eb16b0279dc05f9997fc2) ·
[Common Voice datasets](https://commonvoice.mozilla.org/en/datasets) ·
[ONNX Runtime Web 1.31.1](https://github.com/microsoft/onnxruntime/tree/v1.31.1).
