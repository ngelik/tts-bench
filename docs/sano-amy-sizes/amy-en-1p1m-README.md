# Root A raw fp16 package

This package is the current duration + acoustic + decoder student stack as raw fp16 weights.
It is intended for a standalone runtime implementation, not PyTorch loading.

- Parameters: 1,084,972
- Weight blob: 2,169,944 bytes
- Asset bytes with phoneme config: 2,174,826
- Duration length scale: 1.08
- Runtime boundary: accepts Piper phoneme ID sequences, predicts durations, predicts Piper generator latents, then decodes waveform.
- Not complete arbitrary-text TTS yet: the Piper/eSpeak text frontend still has to be replaced or embedded.
