# audio.cpp GGUF browser runtime

The C++ bridge in this directory is benchmark-specific code compiled with the
pinned [audio.cpp](https://github.com/0xShug0/audio.cpp) source at
`d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac`. The bridge calls audio.cpp's C
API; it does not replace or relicense audio.cpp. The WebAssembly runtime also
contains GGML, SentencePiece and its bundled dependencies, cJSON, LibYAML,
LZ4, utf8proc, Emscripten system libraries, and Dawn's WebGPU C/C++ bindings.
Their original license texts and per-file SHA-256 values are included in the
release asset `THIRD-PARTY-NOTICES.txt`.

To regenerate that release notice from the pinned local source checkouts and
print its digest:

```sh
node tools/build-audio-cpp-notices.mjs
```

The command writes the ignored release artifact at
`.cache/nov14/release/audio-cpp-browser-v2/THIRD-PARTY-NOTICES.txt`. Verify an existing artifact
without changing it with:

```sh
node tools/build-audio-cpp-notices.mjs --check
```

The generator requires the exact audio.cpp and Emscripten source revisions
listed in the notice. `AUDIO_CPP_CACHE=/path/to/nov14-cache` can select another
cache root containing `audio-cpp/` and `emsdk/`. The generator combines the
13 pinned component license files and the v2 Ming modification notice.

The benchmark wrapper, worker and C++ bridge use the repository’s MIT license.
The Ming patch modifies audio.cpp’s `src/models/ming3_tts/session.cpp`. The patch
and modified session are distributed under Apache-2.0. The patch has an attribution
file alongside it, and the build includes that modification notice in the patched
source and the release’s third-party notices. [Upstream license at the pinned commit](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/LICENSE) · [Bundled Apache-2.0 license](LICENSE-audio.cpp.txt) · [Patch modification notice](ming-session-threadpool.patch.license)

The generated runtime's components retain their own licenses, and the Ming,
Audio8, and other model files retain model-specific terms documented
separately in `docs/LICENSING.md`.

## Rebuilding audio-cpp-browser-v2

The v2 build applies a [Ming-specific source patch](ming-session-threadpool.patch) to audio.cpp. Its SHA-256 is `7530977805eb0b259c62712f852de77199dece587fc9d25534f583f32b4da0db`. It gives each pthread-enabled Ming CPU session one GGML thread pool shared by its generator and codec. The benchmark requests six CPU threads. Historical v1 recordings and receipts retain their original runtime and checksum.

The worker’s `tts-bench-audio-cpp-gguf-v1` prefix names the GGUF weight-range cache format. Both runtime versions can reuse the same 16 MiB ranges, keyed by the complete model SHA-256 and byte bounds. JavaScript, Wasm and release notices are fetched by their separate versioned runtime paths.

The [v1 cached CPU receipt](../../results/2026-11-14t23-56-30-288z-ming-3.0-tts-0.5b-gguf-cpu-cached-a590a0df/summary.md) recorded a Wasm abort. A separate Chrome diagnostic completed the first canonical span. During span two, Emscripten reported thread-pool exhaustion, followed by GGML’s assertion on the return value from thread creation. The [pinned GGML implementation](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/external/ggml/src/ggml-cpu/ggml-cpu.c#L3468-L3473) shows this call.

From the repository root, install CMake, Ninja, Node.js 22+, Git and the pinned Emscripten 6.0.13 SDK at `.cache/nov14/emsdk/`. Install the SDK from emsdk commit `708dcbcc9ee23bc7d2dad44fc90db377e38b771c`. A local `audio-cpp/` clone in the same cache is optional. Set `AUDIO_CPP_CACHE` to use another populated cache. Then run

```sh
bash tools/build-audio-cpp-browser.sh
```

Each invocation builds in a new directory under `.cache/builds/`. The final line identifies the verified output directory. It contains the JavaScript, Wasm and third-party notices. The build checks all three files against [the release lock](../../assets.lock.json) and scans the runtime for absolute local paths. To verify files downloaded separately, run `node tools/check-audio-cpp-build.mjs DIRECTORY`.
