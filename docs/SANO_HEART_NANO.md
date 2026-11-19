# sanoTTS heart-nano 294k · Kokopop F32

This is a separate benchmark configuration from the official heart-nano Q8
browser profile. It uses the same upstream voice and 294,279-parameter network,
but converts the two pinned Q8 tensors to an F32 GGUF and runs them through the
Kokopop C++/WebAssembly runtime. The benchmark does not claim that the two
profiles have the same numerical output.

## Pinned inputs and generated assets

The model source is Ampixa `sanoTTS` revision
[`4a8194aa1dd958033ee449b3ad30c37e536b216e`](https://huggingface.co/ampixa/sanoTTS/tree/4a8194aa1dd958033ee449b3ad30c37e536b216e/heartnano).
Its `front_q8.bin` is 109,296 bytes with SHA-256
`5553ae5abf37c18d31c0b64ea791785b30e7a08cc32c07bff8bb2ab4aae0b94b`; `model_q8.bin`
is 235,936 bytes with SHA-256
`4a6cdf0d0bf1996aa2c056298265ea8dd0c200c9025cba4a9b04e0e987bea88c`.
The pinned `meta.json` reports 294,279 total parameters: duration 22,858,
acoustic 65,299 and decoder 206,122.

The build uses Kokopop commit
[`73ed5710cb37ca0384bc4bfdd7138d13605c9a88`](https://github.com/tterrasson/kokopop/tree/73ed5710cb37ca0384bc4bfdd7138d13605c9a88)
and the repository command `bash tools/build-sano-kokopop-webgpu.sh`. The
`sano-kokopop-smoke.yml` workflow produces the runtime, F32 GGUF, retained
license sidecars and a `BUILD-MANIFEST.json` with dependency revisions, source
hashes and build output digests. Its build artifact is passed directly to the
browser job. The model and runtime are not publicly rehosted.

The asset lock marks those files as generated and binds each output by SHA-256
and byte count. `assets fetch` does not substitute a URL with different bytes.
After obtaining the workflow build artifact, stage it into the ignored local
cache with:

```sh
npm run assets -- import --model sano-heart-nano-gguf-f32 \
  --source /path/to/extracted-build-artifact --accept-license
npm run assets -- verify --model sano-heart-nano-gguf-f32 --accept-license
```

The import path consumes the artifact's named files and verifies every file
against the lock before staging. Weights, runtime and license files stay under
`.cache/`; they are not checked into Git.

## Browser configuration

The benchmark selects the fixed `heartnano` US English voice at 24,000 Hz and
speed 1. Each canonical fixture span is passed as one request, with deterministic
unsigned seed `(42 + chunk.id) >>> 0`. Kokopop applies the pinned
Misaki-normalized eSpeak IPA frontend. Synthesis returns a complete span before
the first PCM callback; this configuration does not provide token-level streamed
audio. CPU uses `cpu/wasm`; WebGPU uses `webgpu+wasm`, with eSpeak and allowed
operators on WASM/CPU. WebGPU measurements require the scored browser to prove
actual hardware dispatch; adapter availability alone is insufficient.

The generated runtime closure is 5,166,171 bytes; the converted GGUF is
1,462,248 bytes. Runtime license and notice sidecars add 39,198 bytes. These
are locked setup assets, not a measured network transfer time.

## Terms and limits

Ampixa's repository is GPL-3.0-or-later. The heartnano metadata does not state a
separate voice-package license, so the project does not describe its weights as
MIT-only. The Kokopop runtime, GGML and yyjson retain MIT terms; eSpeak NG and
the bundled English dictionary data retain GPL-3.0-or-later. See
[`docs/LICENSING.md`](LICENSING.md) and the generated license sidecars.

The result is for the specific F32 conversion and Kokopop implementation. It
does not inherit the upstream Python streaming speed claim, and a successful
finite-PCM or CPU/WebGPU parity check does not establish pronunciation quality.
