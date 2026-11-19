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
  --source .cache/inflect-mini-v3-onnx --accept-license
npm run assets -- verify --model inflect-mini-v3-browser-port --accept-license
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
splitter with the Klein 0.2.0 English G2P adaptation, its pinned lexicon and
same-origin browser eSpeak fallback. Upstream Mini instead uses Misaki 0.9.4
with bundled eSpeak. The browser port also uses seeded Mulberry32 + Box-Muller
noise instead of PyTorch's generator and a standalone Float32 CPU source/STFT
port. These are recorded as configuration differences, not corrected native
behavior.

## Native waveform parity

The exporter compares the pinned native checkpoint and the browser graph at two
different token/frame lengths. Its strict thresholds remain max absolute error
`2e-3` and RMS error `2e-4`. The exact-reference workflow records the full
base/dynamic metrics and fails when either case exceeds either threshold. The
distinct browser-port build stores those same metrics in
`PARITY-DIAGNOSTIC.json` and marks native parity false; scores under this profile
must not be described as native-reference results.

The browser diagnostic runs the complete 20,000-character fixture through all
93 canonical spans on hosted Chrome CPU/WASM. It verifies frontend coverage,
phoneme limits, complete finite PCM, per-span samples and timing, and saves
small PCM16 listening clips for the first three exact span outputs. That
diagnostic is not a score. Hardware WebGPU is not registered for this profile
until a real hardware run proves compute dispatch and readable PCM.

See [`web/inflect-mini-v3/NOTICE.md`](../web/inflect-mini-v3/NOTICE.md) for
attribution and terms.
