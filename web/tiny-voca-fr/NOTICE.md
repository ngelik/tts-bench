# tiny-voca-fr source and notices

Daniel Suncost's Tiny Voca French checkpoint is pinned at model revision
`73f7700f514e70eef3b459aedcc49829d41945d4`; its browser source is pinned at
`4cc26ab23d934e3d33796eb06bf11f23f4c9ab34`. The Apache-2.0 model license and
French citation are retained here. The adapter uses the exact upstream
`frontend-fr.js` source bytes and changes no frontend behavior.

The browser phonemizer is the `espeak-ng` 1.0.2 npm browser package (GPL-3.0-or-later).
Its JavaScript and WASM are fetched into the ignored local asset cache and are
not committed. The package integrity, component hashes, and COPYING text are
retained in the asset lock and `LICENSE-ESPEAK-NG.txt`.

The upstream demo uses ONNX Runtime Web 1.20.1 on CPU/WASM. That release fails
on this model's `/Concat_6` node under WebGPU with a non-concat dimension
mismatch. The benchmark therefore uses the already pinned ONNX Runtime Web
1.31.1 runtime for the independently verified WebGPU+WASM path. Runtime versions
are recorded separately by backend, and the upstream demo's CPU-only behavior is
preserved in the profile notes. Both runtime licenses/notices are retained in the
asset/runtime documentation.

The upstream French eSpeak path receives text as released. In `17 h 40`, the `h`
is read as the letter name between 17 and 40. Its known liaison limit in
`comment‿allez` (the [t] liaison is absent) is also retained. The graph has no
seed input; generated waveform noise is unseeded. Model terms do not grant blanket
rights to generated recordings.

[Checkpoint](https://huggingface.co/DanielSuncost/tiny-voca-fr/tree/73f7700f514e70eef3b459aedcc49829d41945d4) ·
[Browser source](https://github.com/DanielSuncost/tiny-voca-fr/tree/4cc26ab23d934e3d33796eb06bf11f23f4c9ab34) ·
[eSpeak NG package](https://www.npmjs.com/package/espeak-ng/v/1.0.2).
