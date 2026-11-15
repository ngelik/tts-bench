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
`.cache/nov14/release/audio-cpp-browser-v3/THIRD-PARTY-NOTICES.txt`. Verify an existing artifact
without changing it with:

```sh
node tools/build-audio-cpp-notices.mjs --check
```

The generator requires the exact audio.cpp and Emscripten source revisions
listed in the notice. `AUDIO_CPP_CACHE=/path/to/nov14-cache` can select another
cache root containing `audio-cpp/` and `emsdk/`. The generator includes the
pinned component license texts, the v2 Ming patch notice, the v3 speech FFT
patch notice, and the BSD-3-Clause notice for the extracted speech FFT code.

The benchmark wrapper, worker and C++ bridge use the repository’s MIT license.
The v2 Ming patch modifies audio.cpp's `src/models/ming3_tts/session.cpp` under
Apache-2.0; the v3 patch modifies the extracted speech FFT header under its
original BSD-3-Clause license. Their attribution notices are included in the
release notice. [Upstream license at the pinned commit](https://github.com/0xShug0/audio.cpp/blob/d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac/LICENSE) · [Bundled Apache-2.0 license](LICENSE-audio.cpp.txt) · [Ming patch notice](ming-session-threadpool.patch.license) · [Speech FFT patch notice](ming-speechfft-pool-cap.patch.license)

The generated runtime's components retain their own licenses, and the Ming,
Audio8, and other model files retain model-specific terms documented
separately in `docs/LICENSING.md`.

## Rebuilding audio-cpp-browser-v3

The v3 build carries forward the v2 patch (`ming-session-threadpool.patch`,
SHA-256 `7530977805eb0b259c62712f852de77199dece587fc9d25534f583f32b4da0db`)
that shares one six-thread GGML pool between a pthread-enabled Ming CPU
session's generator and codec. It adds `ming-speechfft-pool-cap.patch`, SHA-256
`79d33646d8974e1cccbc2f83a17afa5c3ca0477c819a647471d7b5d6db9af649`, which
caps the separate speech FFT pool's reserved workers at six in this Wasm build.
The FFT tasks still use the configured task count; any excess tasks are queued
and drained by the bounded pool. The diagnostic runtime logs its worker
capacity and host `hardware_concurrency` once when that pool is created. With
six GGML threads and six reserved FFT workers, the native M1 Pro diagnostic
should use at most eleven of Emscripten's twelve pthread workers. These counts
refer to reserved workers in separate, sequential compute stages.

The failed v2 capability diagnostic is retained as
`ming-q8-cpu-persistent-pool-2026-11-15t10-48-32-574z`; it returned no score.
It opened a CPU session, then Emscripten reported that its pthread pool was
exhausted during capability synthesis. Source tracing found the independent
speech FFT pool created with `std::thread::hardware_concurrency()` capacity;
the v3 diagnostic records that value and the effective pool size directly.
Historical v1 receipts and recordings retain their original runtime and
checksum, and the failed v1 and v2 attempts remain diagnostic evidence only.

The worker’s `tts-bench-audio-cpp-gguf-v1` prefix names the GGUF weight-range
cache format. Runtime JS, Wasm and release notices use their separate
versioned paths.

From the repository root, install CMake, Ninja, Node.js 22+, Git and the pinned
Emscripten 6.0.13 SDK at `.cache/nov14/emsdk/`. Install the SDK from emsdk
commit `708dcbcc9ee23bc7d2dad44fc90db377e38b771c`. A local `audio-cpp/` clone
in the same cache is optional. Set `AUDIO_CPP_CACHE` to use another populated
cache. Then run

```sh
bash tools/build-audio-cpp-browser.sh
```

Each invocation builds in a new directory under `.cache/builds/`. The final line
identifies the verified output directory. It contains JavaScript, Wasm and
third-party notices. The build checks all three files against [the release
lock](../../assets.lock.json) and scans the runtime for absolute local paths.
To verify files downloaded separately, run `node tools/check-audio-cpp-build.mjs DIRECTORY`.
