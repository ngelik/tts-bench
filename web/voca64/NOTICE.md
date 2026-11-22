# Tiny Voca DE/EN (Voca64) browser profile

This profile uses `Fraunhofer-IEM/tiny-voca-de-en` at checkpoint revision
`57fe34dfc061e6cc58e27d186bf7ba16d82d2def` and the official static browser Space
at revision `a8ee94178a6f9b703e89e113a3354549d1bdc38d`. The Space's manifest and
each downloaded file are pinned by byte length and SHA-256 in
[`assets.lock.json`](../../assets.lock.json). The model is the 4,563,403
parameter Voca64 checkpoint (24 kHz, 256-sample hop, 88-token ABI). The fixed
benchmark presets are `fresh-de-f00` and `fresh-en-f00`.

The model code and weights declare Apache-2.0. The training data card declares
CC BY 4.0 and describes synthetic teacher-generated voice supervision; those
terms do not, by themselves, grant a separate license for generated audio.
The German lexicon derives from the MFA German dictionary under CC BY 4.0 and
must retain attribution to Michael McAuliffe and Morgan Sonderegger. The English
frontend uses Dizione material under its declared Apache terms, with separate
CMUdict and homograph-data notices. Phony is MIT; nrmlz is Apache-2.0; QuickJS
and its Emscripten bindings are MIT; ONNX Runtime Web is MIT with bundled
third-party notices. The pinned upstream attribution records are listed in the
asset lock's source URLs and the [official Space notices](https://huggingface.co/spaces/Fraunhofer-IEM/designed-voices-tts/tree/a8ee94178a6f9b703e89e113a3354549d1bdc38d/LICENSES).

The official Space worker enables English through its pinned `english.js`,
English lexicon and QuickJS WASM. Its separate `assets/frontend/NOTICE.md`
still says English production phonemization is not enabled. This profile keeps
the official English path and checks the full-fixture token/stress digest in
headed smoke diagnostics; the wording conflict remains disclosed here.

The benchmark adapter is an original integration. It localizes all inference
assets, verifies hashes, and retains the official sentence-plan output,
including punctuation-only pieces. The CPU path follows the official worker;
the benchmark also runs the pinned plan and wave graphs through ONNX Runtime
WebGPU with WASM fallback and observed hardware dispatch. No server inference
or prerecorded audio is used.

Headed Chrome verified the full German and English token/stress fingerprints
and matched all six CPU reference waveforms byte for byte, including numbers,
names and sentence-boundary cases. On Apple M1 Pro, the WebGPU probe observed
756 plan and 1,737 wave compute dispatches for each first fixture span. All six
WebGPU probes matched the CPU duration vectors and sample counts. Their float
PCM hashes differed, so each backend preserves its own recording provenance.
