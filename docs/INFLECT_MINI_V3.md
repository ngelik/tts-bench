# Inflect Mini v3 browser-port configuration

This benchmark entry is the separately identified `inflect-mini-v3-browser-port`
profile. It uses the pinned 34,310,790-parameter Mini checkpoint, Cassidy
speaker 2, 24 kHz output and FP32 ONNX graphs. It is not a claim that the
browser pipeline is waveform-equivalent to upstream native Mini.

## Reproduction and assets

The source checkpoint is pinned in
[`tools/inflect-mini-v3-conversion.lock.json`](../tools/inflect-mini-v3-conversion.lock.json).
The exporter fetches only that allowlist, verifies file sizes and SHA-256, and
builds the three ONNX graphs, Cassidy style table, phoneme vocabulary and
40-byte source-linear parameter vector:

```sh
python -m pip install -r tools/inflect-mini-v3-export-requirements.txt
python tools/export-inflect-mini-v3.py --download --allow-waveform-drift
npm run assets -- import --model inflect-mini-v3-browser-port \
  --source .cache/inflect-mini-v3-onnx
npm run assets -- verify --model inflect-mini-v3-browser-port
```

Generated files are verified against `assets.lock.json` before use. No model
weights or runtime binaries are committed. The pinned export uses PyTorch
2.11.0+cpu, ONNX 1.17.0, opset 17 and ONNX Runtime 1.23.2. `--allow-waveform-drift`
does not change thresholds or mark parity successful; it permits building the
distinct browser-port profile while preserving `strictPassed: false` when the
native comparison exceeds its fixed limits.

## Browser execution

The profile runs duration prediction, text bridging and the waveform neural
graph through ONNX Runtime Web's one-thread WASM provider. Standalone Float32
CPU browser code generates the seeded harmonic source and STFT features that
feed the waveform graph. A canonical span is split with the pinned 220-character
source-preserving splitter, normalized and tokenized in Chrome, then each piece
is synthesized in order. The adapter rejects unknown symbols, empty text,
nonfinite audio, and the pinned 510-phoneme or 1,200-frame limits rather than
truncating. It inserts the pinned 120 ms pause between internal pieces. First
PCM is available only after the first full internal piece has completed and
been read back from ONNX Runtime.

The browser frontend combines the shared Micro v3 numeric normalization and
220-character source-preserving splitter with the Klein 0.2.0 English G2P
adaptation, its pinned lexicon and same-origin browser eSpeak fallback. These
shared frontend helpers were introduced from the pinned Micro v3 source in
commits `267bff695637bd98d181ce59cd3ac2638c5b00f4` and
`4419a0120fd175d21bc1812c78fc8afc6f893e33`; Mini calls the same helper API and
does not treat it as Mini-originated code. Upstream Mini instead uses Misaki
0.9.4 with bundled eSpeak. The browser port also uses seeded Mulberry32 +
Box-Muller noise instead of PyTorch's generator and a standalone Float32 CPU
source/STFT port. These are recorded as configuration differences, not
corrected native behavior. Full-article hosted Chrome diagnostics audit all 93
canonical spans and synthesize every span; this remains a diagnostic, not a
score.

## Native waveform parity

The exporter compares the pinned native checkpoint and the browser graph at two
different token/frame lengths. Its strict thresholds remain max absolute error
`2e-3` and RMS error `2e-4`. The exact-reference workflow records the full
base/dynamic metrics and fails when either case exceeds either threshold. The
One captured strict audit is the artifact built from source commit
`3aa0b423b8ba6c36fea0b6ab2db2c046bfb57c49` in the [hosted WebGPU diagnostic
run](https://github.com/ngelik/tts-bench/actions/runs/44496351275). Its
`BUILD-MANIFEST.json` SHA-256 is
`e1a00ccf5af64dc2bf11f6cf24e9d7365ee2b84f11e4ec3ef7606ad7eb08299c`; its
`PARITY-DIAGNOSTIC.json` SHA-256 is
`576edb344347f2ba29a182c8366afea129fc8d890a23fb9f379f2ef9cb243170`.

| Case | Tokens | Frames | Max absolute error | RMS error | Correlation | SNR | Spectral convergence | Log-spectral MAE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Base (`base-hello`), 3aa0 artifact | 9 | 53 | 0.01199115 | 0.0003751270 | 0.99996715 | 41.8183 dB | 0.00388793 | 0.092421 dB |
| Dynamic (`dynamic-24-vowel`), 3aa0 artifact | 26 | 78 | 0.04322302 | 0.0013899149 | 0.99945192 | 29.6001 dB | 0.01464870 | 0.416804 dB |
| Base (`base-hello`), earlier be9f artifact | 9 | 53 | 0.00602216 | 0.0003508475 | 0.99997122 | 42.3981 dB | 0.00333546 | 0.090323 dB |
| Dynamic (`dynamic-24-vowel`), earlier be9f artifact | 26 | 78 | 0.03302294 | 0.0012519321 | 0.99955537 | 30.5077 dB | 0.01432071 | 0.454914 dB |

The earlier be9f values came from the [strict export run](https://github.com/ngelik/tts-bench/actions/runs/44492100495), source commit `be9f9a9a50f5b613d64bef933f73dede1e735bee`. Both builds use the same pinned checkpoint and their six generated graph/style/vocabulary files have identical byte counts and SHA-256 hashes. Their parity metrics nevertheless differ; the cause has not been established, so identify results by artifact and do not treat these measurements as interchangeable or deterministic.

Both cases in both artifacts failed the unchanged strict max/RMS thresholds. The base source audit
also found one +2π phase-feature wrap at bin 8/frame 0, where the magnitude is
0.00156027 and tiny signed imaginary components differ. This is diagnostic
evidence, not a waiver of the waveform difference. The distinct browser-port
build stores artifact-specific metrics in `PARITY-DIAGNOSTIC.json` and marks
native parity false; scores under this profile must not be described as
native-reference results.

The browser diagnostic runs the complete 20,000-character fixture through all
93 canonical spans on hosted Chrome CPU/WASM. It verifies frontend coverage,
phoneme limits, complete finite PCM, per-span samples and timing, and saves
small PCM16 listening clips for the first three exact span outputs. That
diagnostic is not a score. The registered backend is CPU/WASM only; WebGPU is
not registered until a real hardware run proves compute dispatch and readable
PCM.

See [`web/inflect-mini-v3/NOTICE.md`](../web/inflect-mini-v3/NOTICE.md) for
attribution and terms.
