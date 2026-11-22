# Korean TTS benchmark profile

This local browser adapter follows the pinned upstream source at
[`ooodev/korean-tts` revision `c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c`](https://github.com/ooodev/korean-tts/tree/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c).
The benchmark uses the upstream Pyodide frontend and FP32 graph without weights
checked into this repository. Its local asset manifest records each input's
size and SHA-256 digest.

The worker adapts the upstream Apache-2.0 browser implementation. It loads
assets from the benchmark server, adds the WebGPU provider and an untimed
dispatch probe, and connects the published text planner and graph to the
benchmark's fixture and receipt interfaces. [Apache License 2.0](LICENSE-APACHE-2.0.txt) ·
[Pinned upstream worker](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/tiny-voca/web/public/worker.js).

The shared graph's KSS voice and weights inherit the KSS corpus's
CC BY-NC-SA 4.0 noncommercial condition, including when the F2 voice is selected
for English. Review [the license summary](../../docs/LICENSING.md) and the
[pinned final report](https://github.com/ooodev/korean-tts/blob/c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c/FINAL_REPORT_v2.md)
before staging assets. Do not use the assets commercially under the available
grant, and do not infer a separate blanket license for generated audio.
