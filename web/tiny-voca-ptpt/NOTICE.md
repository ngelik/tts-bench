# Tiny Voca PT-PT browser benchmark notices

The model and Portuguese adaptation are by José Rui. The model is based on
Muhammed Nazeem's Tiny Voca. The pinned upstream `LICENSE` and `UPSTREAM-NOTICE.txt`
are retained with this source bundle.

The checkpoint is published under Apache-2.0. The pinned Portuguese frontend,
including `pronuncia.js` and `abertas.txt`, is from the Apache-2.0 upstream
repository. `abertas.txt` is the measured open-vowel exception list used by the
frontend; it is not a general-purpose Portuguese dictionary.

The two model voices, F3 and M1, are described upstream as invented synthetic
voices. Training text includes Common Voice under CC0; the synthetic training
speech was generated with Sopro and Qwen3-TTS. This source patch includes no
recordings. It does not grant separate rights to redistribute benchmark-generated
audio.
