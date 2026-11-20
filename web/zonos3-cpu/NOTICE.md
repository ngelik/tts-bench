# ZONOS3 CPU/WASM runtime

This is a small C ABI bridge around the community ZONOS3 implementation in
[audio.cpp](https://github.com/0xShug0/audio.cpp), built as CPU-only WebAssembly
with Emscripten. It does not use Zyphra's official WebGPU runtime. The model
files and the pinned Imogen speaker embedding have separate licenses and hashes
in `assets.lock.json` and `docs/LICENSING.md`.

The browser runtime is compiled from audio.cpp commit
`749fffec6ad4a763520388a4240cd24e08a0a2bf` and Emscripten 6.0.13 at commit
`708dcbcc9ee23bc7d2dad44fc90db377e38b771c`. The ZONOS3 model code in audio.cpp
is derived from the MIT-licensed browser implementation in
[Zyphra/ZONOS3-Mini](https://github.com/Zyphra/ZONOS3-Mini/tree/a50e14117d99181ba7f28047b451ba03ba1a09a9)
at source commit `a50e14117d99181ba7f28047b451ba03ba1a09a9`. The build excludes WebGPU and
compiles only the `zonos3` family with CPU/WASM execution.

The v3 build defines `ENGINE_SPEECHFFT_NO_MULTITHREADING` for this Wasm target.
This keeps audio.cpp's independent persistent speech FFT helper pool on the
calling thread while the six-thread GGML CPU pool uses the bounded Emscripten
pthread pool. The macro changes only this browser build; native builds retain the
upstream helper's normal threading behavior.

Rebuild on Linux with:

```sh
bash tools/build-zonos3-cpu-browser.sh .cache/public/runtimes/audio-cpp-zonos3-cpu-wasm-v3
```

The builder checks both source revisions, emits `bench_zonos3_cpu.js`,
`bench_zonos3_cpu.wasm`, and `THIRD-PARTY-NOTICES.txt`, then prints each output's
size and SHA-256. The release assets are the generated files, not model weights.

The browser adapter uses the pinned Q4_0-expert/Q8_0-projection GGUF backbone,
KEEP-2 decoder and speaker encoder. It supplies the separately pinned Imogen
speaker embedding, passes the canonical input text unchanged, and reports the
quantized runtime and CPU/WASM backend in its measurement metadata.

This community CPU path does not implement Zyphra's LACI short-text filler and
cut behavior. The fixed benchmark spans are sent unchanged. audio.cpp's offline
C API returns the complete span before the adapter emits its first-PCM event;
the metadata records that boundary instead of treating it as streaming output.
