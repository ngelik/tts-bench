# Listening samples

These recordings are synthetic speech from the benchmark's registered article
fixtures. The original English fixture has 20,000 characters; translations retain
their own exact text and actual counts. They are actual scored outputs, not
upstream demo recordings.
All model/backend samples are linked in the root README **Reference results** section.

[**Open the listening room**](https://ngelik.github.io/tts-bench/audio/) to play all published clips directly in your browser. Each README **Listen** link selects its exact recording. GitHub strips audio controls from README previews, so the players live on GitHub Pages. No installation or sign-in is needed; clips load only when played. The hosted page serves existing recordings and performs no synthesis.

For local playback, clone the repository, run `npm ci`, then:

```sh
npm run listen
```

Open the printed loopback URL. Filter by model/backend and play clips in Chrome.
This serves static local files only; it performs no synthesis and sends no text
or audio to an external service. Playback does not enter timing measurements.
The clips can also be opened directly from `audio/samples/` after cloning.
When a full article WAV has been published, it is attached to this repository's
`benchmark-audio-v1` GitHub release and linked beside the clip. Clip-only entries
retain the source WAV digest and byte count in the manifest, while the full WAV
remains local and has no public URL.

## Publishing the listening page

`npm run listen:build` verifies every recording and prepares only the player,
manifest and approved clips in the ignored `.cache/listening-site/` directory.
The Pages workflow deploys this directory after changes reach `main` through a
reviewed PR. No model weights, browser profiles or raw runs enter the site.
Include authorized clips, the manifest and the regenerated README with the result
publication. Upload and link a full recording only when that release is authorized.
After deployment, play each example from its dashboard row and verify the clip
and receipt links, plus any authorized full recording link. To add an example to
an existing result, use the original scored WAV and the published receipt.

## Provenance and reproduction

`manifest.json` binds every clip to a published result, scored trial index, voice, language,
full WAV hash and byte count. A clip contains the first 30 seconds (or the entire
recording if shorter), copied as PCM16 with no normalization, editing, transcoding
or re-synthesis. Only its RIFF size fields change. The clip limit is 3 MB, sufficient for 30 seconds of mono PCM16 up to 48 kHz. The source full WAV must match
an actual scored receipt before the tool will create the clip.

Language comes from the scored fixture and is checked against the shared fixture
registry. Legacy English receipts remain compatible; a Ukrainian recording must
declare `uk`, not `en`. Do not infer the spoken language from a model's supported
language list. See [exact translated fixtures and comparability](../docs/MULTILINGUAL.md).

```sh
npm run audio -- add --result results/RUN/result.json --wav /path/to/full.wav --model MODEL --backend cpu
npm run audio -- add --result results/RUN/result.json --wav /path/to/full.wav --model MODEL --backend cpu --clip-only
npm run audio -- check
npm run reference
```

Use `--clip-only` when only the 30-second dashboard clip is authorized. The
manifest still records the complete scored WAV's SHA-256 and byte count to bind
the clip to its trial. With this flag, `full.url` is `null` and the full WAV stays
local. Use the default release-backed command when the full-WAV upload has been
separately authorized.

Audio publication requires authorization and review of the source terms. The tool
prepares files only; it does not upload automatically. For a separately authorized
full-WAV release, upload the exact file to the manifest's uniquely named release
asset, never overwrite a different file under that name, and verify its download
digest. Include the clip, manifest and updated Reference results in the result PR.
Model weights, runtimes and full article WAVs remain excluded from Git. CI verifies
clip integrity and its declared receipt binding; it does not download every large
release WAV or certify perceptual quality.

## Attribution and terms

The root MIT license does **not** relicense generated recordings, voice likenesses,
models or upstream datasets. Per-recording attribution, model terms and primary
source URLs are retained in `manifest.json` and displayed by the player. The
recordings are provided for non-commercial benchmark evaluation; this is not a
commercial-use clearance or a grant of rights in upstream voices.

- Phonon: Gradium; Pocket TTS and Mimi lineage by Kyutai. Pinned weights Apache-2.0.
- Paradee: Sahil Mahendrakar; Kokoro-82M teacher by hexgrad. Pinned model Apache-2.0.
- Leokani: Milliwatt Labs; Kokoro-generated synthetic training speech. CC BY-NC 4.0 model terms; synthetic outputs retain the model's watermark.
- PiVo: Leon Lehmann / Empero Research; Apache-2.0 acoustic component and BSD FARGAN-derived vocoder.
- **Voice by Underdog Woof.** Non-commercial terms and output attribution apply; see the pinned license/notice links in the asset manifest.
- Supertonic 3: Supertone Inc., M3 preset voice. OpenRAIL-M model terms include use-based restrictions and output responsibilities; the code license is separate.
- Piper: rhasspy/Piper Southern English Female low. The card names CC BY-SA 4.0 training data and Ryan low ancestry (whose card names CC BY-NC-SA 4.0 data). Neither card supplies a separate output license. These notices are retained without treating the code's MIT license as an output license.


- Kokoro 82M: hexgrad, `af_heart` English voice; Apache-2.0 model terms, with official JavaScript source attribution retained.
- Kitten Nano 0.8: KittenML, Bella preset; Apache-2.0 model terms, with the pinned frontend implementation attributed.
- Kale TTS 1 Nano: KaleComputer, synthetic Kenzie (`s057b`) English voice, based on Maya-1 by Maya Research. The INT8 CPU and FP32 WebGPU exports have separate scored recordings and Apache-2.0 model terms.
- Sano Amy: ampixa, Amy English checkpoint; GPL-3.0 model card and GPL-3.0-or-later browser runtime terms are documented separately.
- Inflect Micro v2: Owen Song, fixed synthetic English voice; Apache-2.0 model/export terms and MIT symbol-inventory attribution.
- MMS English: Meta, English single-speaker checkpoint; CC BY-NC 4.0 model terms. Broader MMS language coverage is not claimed for this checkpoint.
- Mach Boom: SyzygyResearch, tested Zoey voice; the Apache-2.0 checkpoint notice credits Gradium Phonon and Kyutai Pocket TTS/Mimi. This result uses an experimental Chrome Pyodide/NumPy WebAssembly port, not the upstream Linux/x86 optimized runtime. Its WebGPU path was unsupported in this campaign.
- Pocket TTS: Kyutai checkpoint through KevinAHM's public ONNX export and browser frontend, tested `alba` preset. CC-BY-4.0 and upstream prohibited-use conditions apply. Four of the five ONNX graphs are dynamically quantized; the text conditioner is FP32. CPU uses one-thread WASM; the experimental WebGPU path used explicit WebGPU/WASM providers, actual dispatch proof and awaited CPU-readable PCM. GPU timing is not GPU-exclusive.
- Klein-TTS X1.5 Pro: Klein ML's pinned Apache-2.0 checkpoint; Sarah (`af_heart`) English voice. The browser adapter is a disclosed port of `@kleinml/kleintts` 0.2.0; separate runtime and G2P licenses are documented in [`web/klein/NOTICE.md`](../web/klein/NOTICE.md).
- Silencio-2: BlueRose Labs checkpoint and converted graphs under CC-BY-4.0, with attribution to Kyutai Pocket TTS and the Basis Global Emotions dataset. This recording uses the bundled synthetic voice 260; model-card permission, anti-impersonation and synthetic-speech disclosure guidance apply. No separate output license is claimed.
- SupraTTS 1.0 Preview: SupraLabs, fixed single English voice. The pinned model/runtime are MIT; bundled G2P dictionary and OOV fallback data are Apache-2.0. ONNX Runtime Web, Pyodide, CPython and NumPy retain their own terms and notices. The pinned card does not separately identify a voice performer or grant voice/output rights.

See [component licensing](../docs/LICENSING.md) and the linked primary sources.
No listening quality score is inferred from speed, waveform hashes or file size.

- LFM3 Audio and Omni: Liquid AI; American English female prompted style. Official GGUF WebGPU and Fusor q7 CPU configurations are distinguished in every recording. LFM Open License v1.0 applies; runtime licenses do not relicense weights or recordings. Very short output spans, where observed, are disclosed with the results; audio validity does not verify complete reading.
- Serhiy 0.58M: synthetic Ukrainian speech generated with dmytro-m's student, distilled from the Serhiy Piper teacher; sanoTTS by Ampixa. Student weights/reference GPL-3.0, teacher Apache-2.0 and training corpus MIT. Retain the pinned [notice](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/NOTICE.md) and [model card](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/README.md) in the registered manifest. These are attributions, not an output-license grant or independent consent audit. Only the assessed original benchmark narration is eligible; upstream sample WAVs are not scored recordings. See [multilingual publication](../docs/MULTILINGUAL.md).
- Linnet en-35m: include the required notices “Linnet model weights by VoxRT, licensed under the Linnet Weights License 1.0” and “Powered by Linnet (VoxRT).” The fixed f1 voice is synthetic; the benchmark license permits distributing generated outputs. Model weights and tokenizer are not included.
