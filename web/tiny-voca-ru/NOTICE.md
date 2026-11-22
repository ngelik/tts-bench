# tiny-voca-ru browser adapter notices

The browser profile uses `egnch/tiny-voca-ru` model revision
`2723b0e71fea216001bd4f6caf0866eb06879339`, `yilbegan/tiny-voca-ru` source
revision `aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784`, and Space revision
`bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e`.

The upstream model card and Space declare Apache-2.0 for the model/code. The
Space notice identifies the bundled Russian stress dictionary and the OOV
accent and contextual homograph assets as derived from `ruaccent`, distributed
under MIT. The verbatim upstream Apache `LICENSE` and `NOTICE`, and the
`ruaccent` MIT license, are kept in this directory.

The benchmark port adapts the demo to same-origin, SHA-256-pinned assets and the
benchmark worker RPC. It selects only the publisher-default M voice, initializes
the waveform graph before its two WASM stress graphs, and reports actual
waveform WebGPU dispatch separately. It does not change the FP32 graph, Russian
frontend, synthesis controls, or sample rate.
